'use strict';
/* ArenaKit feature 2.1 — toast when the agent run finishes + daily run count. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['finish-notify'] = {
  id: 'finish-notify',
  label: 'Run-complete alert',
  init(ctx) {
    const MIN_RUN_MS = 1200;
    const COOLDOWN_MS = 4000;
    const QUIET_MS = 350;
    let wasRunning = false;
    let armedAt = 0;
    let pendingSend = 0;
    let lastFire = 0;
    let quietTimer = 0;
    let toastEl = null;
    let toastTimer = 0;

    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('finish-notify');
    const optsOf = () => (typeof AextSettings !== 'undefined' && AextSettings.optsOf) ? (AextSettings.optsOf('finish-notify') || {}) : {};

    AextDom.addStyle(`
      .aext-notify{position:fixed;right:20px;bottom:20px;z-index:2147483600;max-width:min(320px,calc(100vw - 32px));
        background:hsl(var(--surface-floating));color:hsl(var(--text-primary));
        border:1px solid hsl(var(--border-medium));border-radius:12px;padding:10px 14px;
        font:600 13px/1.35 ui-sans-serif,system-ui,sans-serif;
        box-shadow:0 12px 32px rgba(0,0,0,.28);animation:aext-notify-in .16s ease;}
      .aext-notify small{display:block;font-weight:500;font-size:11px;color:hsl(var(--text-tertiary));margin-top:2px;}
      @keyframes aext-notify-in{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
      html.aext-off-finish-notify .aext-notify{display:none!important;}
    `, 'arenakit-notify-css');

    function looksLikeStop(el) {
      if (!el || el.tagName !== 'BUTTON') return false;
      if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn')) return false;
      const al = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
      const tid = (el.getAttribute('data-testid') || '').toLowerCase();
      if (tid === 'stop-button' || tid === 'stop') return true;
      if (al === 'stop' || al === 'stop generating' || al === 'stop generation' || al === 'cancel') return true;
      if (/\bstop\b/.test(al) && !/stopped|desktop/.test(al)) return true;
      return false;
    }

    function isRunning() {
      if (document.querySelector('[data-testid="stop-button"], button[aria-label="Stop" i], button[aria-label="Stop generating" i], button[aria-label="Stop generation" i]')) return true;
      const editor = AextDom.findPrompt();
      if (!editor) return false;
      let n = editor.parentElement;
      for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
        if (n.getAttribute && n.getAttribute('aria-busy') === 'true') return true;
        const stop = n.querySelector('[data-testid="stop-button"], button[aria-label="Stop" i], button[aria-label="Stop generating" i]');
        if (stop && looksLikeStop(stop)) return true;
      }
      return false;
    }

    function showToast(count) {
      const o = optsOf();
      if (o.toast === false) return;
      if (toastEl && toastEl.remove) toastEl.remove();
      toastEl = document.createElement('div');
      toastEl.className = 'aext-notify';
      toastEl.setAttribute('role', 'status');
      toastEl.textContent = 'Run complete';
      if (o.counter !== false && count) {
        const s = document.createElement('small');
        s.textContent = count + ' run' + (count === 1 ? '' : 's') + ' today';
        toastEl.appendChild(s);
      }
      (document.body || document.documentElement).appendChild(toastEl);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (toastEl && toastEl.remove) toastEl.remove();
        toastEl = null;
      }, 5000);
    }

    async function bumpRuns() {
      if (optsOf().counter === false) return 0;
      try {
        const key = 'arenakit.runs';
        const o = await chrome.storage.local.get(key);
        const r = o[key] || {};
        const today = new Date().toISOString().slice(0, 10);
        const count = r.day === today ? (r.count || 0) + 1 : 1;
        await chrome.storage.local.set({ [key]: { day: today, count: count } });
        return count;
      } catch (e) {
        return 0;
      }
    }

    async function fire() {
      if (!live()) return;
      const now = Date.now();
      if (now - lastFire < COOLDOWN_MS) return;
      lastFire = now;
      const count = await bumpRuns();
      showToast(count);
      playDoneSound();
      ctx.log('run complete, today=', count);
    }

    /* Three-note chime, ~1.2s, loud enough to hear from another tab. */
    function playChime(ac) {
      const t0 = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = 1;
      master.connect(ac.destination);
      function note(freq, start, dur, peak, type) {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0 + start);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(4200, t0 + start);
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.02);
        g.gain.exponentialRampToValueAtTime(peak * 0.55, t0 + start + dur * 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        osc.connect(f);
        f.connect(g);
        g.connect(master);
        osc.start(t0 + start);
        osc.stop(t0 + start + dur + 0.06);
      }
      note(784.0, 0.00, 0.42, 0.78, 'sine');
      note(784.0, 0.00, 0.42, 0.28, 'triangle');
      note(1046.5, 0.34, 0.48, 0.85, 'sine');
      note(1318.5, 0.70, 0.55, 0.90, 'sine');
      note(2637.0, 0.70, 0.40, 0.22, 'sine');
    }

    function unlockAudio() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = playDoneSound._ac || (playDoneSound._ac = new AC());
        if (c.state === 'suspended') c.resume();
      } catch (e) { /* ignore */ }
    }

    function playDoneSound() {
      const o = optsOf();
      if (o.sound === false) return;
      const hidden = (() => { try { return !!document.hidden; } catch (e) { return false; } })();
      if (hidden) {
        try { chrome.runtime.sendMessage({ type: 'aext-ding' }, () => { void chrome.runtime.lastError; }); }
        catch (e) { /* no sw */ }
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = playDoneSound._ac || (playDoneSound._ac = new AC());
        const go = () => { try { playChime(c); } catch (e) { /* closed */ } };
        if (c.state === 'suspended') c.resume().then(go).catch(go);
        else go();
      } catch (e) {
        try { chrome.runtime.sendMessage({ type: 'aext-ding' }, () => { void chrome.runtime.lastError; }); }
        catch (e2) { /* ignore */ }
      }
    }

    function tick() {
      if (!live()) {
        wasRunning = false;
        armedAt = 0;
        return;
      }
      const running = isRunning();
      if (running) {
        clearTimeout(quietTimer);
        quietTimer = 0;
        if (!wasRunning) armedAt = pendingSend || Date.now();
        wasRunning = true;
        pendingSend = 0;
        return;
      }
      if (wasRunning && armedAt && (Date.now() - armedAt) >= MIN_RUN_MS) {
        if (!quietTimer) {
          quietTimer = setTimeout(() => {
            quietTimer = 0;
            if (!isRunning() && wasRunning) {
              wasRunning = false;
              armedAt = 0;
              fire();
            }
          }, QUIET_MS);
        }
        return;
      }
      wasRunning = false;
    }

    document.addEventListener('click', (e) => {
      unlockAudio();
      if (!live()) return;
      const b = e.target && e.target.closest && e.target.closest('button');
      if (!b) return;
      const al = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
      if (/^send(\s+message)?$/.test(al) || al === 'send') {
        pendingSend = Date.now();
      }
    }, true);
    document.addEventListener('keydown', unlockAudio, true);

    /* Fast while a run is in flight; slow when idle (was 500ms forever). */
    let pollIv = 0;
    let pollFast = null;
    function armPoll(fast) {
      if (pollFast === fast && pollIv) return;
      pollFast = fast;
      clearInterval(pollIv);
      pollIv = setInterval(tick, fast ? 400 : 1600);
    }
    const _tick = tick;
    tick = function () {
      _tick();
      armPoll(!!(wasRunning));
    };
    armPoll(false);
    tick();

    this.setEnabled = (on) => {
      if (!on) {
        wasRunning = false;
        armedAt = 0;
        if (toastEl && toastEl.remove) toastEl.remove();
        toastEl = null;
      }
    };

    ctx.log('ready');
    return true;
  }
};
