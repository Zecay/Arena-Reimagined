'use strict';
/* ArenaKit — local Agent Mode send counter (X/100 per local day).
   Arena does not expose remaining quota; this counts sends this browser
   made today and resets at local midnight. Not the server's real remaining. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['agent-quota'] = {
  id: 'agent-quota',
  label: 'Agent send counter',
  init(ctx) {
    const STORE = 'arenakit.agentQuota';
    const limitOf = () => {
      const o = (window.AextSettings && AextSettings.optsOf) ? AextSettings.optsOf('agent-quota') : {};
      const n = parseInt(o.limit, 10);
      return (n >= 1 && n <= 999) ? n : 100;
    };
    let count = 0;
    let day = '';
    let badge = null;
    let lastBump = 0;

    const live = () => !window.AextRuntime || AextRuntime.isEnabled('agent-quota');

    AextDom.addStyle(`
      span.aext-quota{display:inline-flex;align-items:center;flex:none;margin:0 4px 0 0;padding:4px 8px;border-radius:8px;
        font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;
        color:hsl(var(--text-tertiary));background:hsl(var(--surface-tertiary));
        border:1px solid hsl(var(--border-faint));user-select:none;cursor:default;}
      span.aext-quota.aext-quota-hot{color:hsl(var(--interactive-negative));border-color:hsl(var(--interactive-negative));}
      html.aext-off-agent-quota span.aext-quota{display:none!important;}
    `, 'arenakit-quota-css');

    function todayKey() {
      const d = new Date();
      const m = String(d.getMonth() + 1);
      const dayN = String(d.getDate());
      return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dayN.length < 2 ? '0' + dayN : dayN);
    }

    function isAgentView() {
      const p = (location.pathname || '').toLowerCase();
      return p === '/agent' || p.indexOf('/agent/') === 0;
    }

    async function load() {
      try {
        const o = await chrome.storage.local.get(STORE);
        const v = o[STORE] || {};
        const today = todayKey();
        if (v.day === today) {
          day = v.day;
          count = v.count || 0;
        } else {
          day = today;
          count = 0;
          await chrome.storage.local.set({ [STORE]: { day: day, count: 0 } });
        }
      } catch (e) {
        day = todayKey();
        count = 0;
      }
    }

    async function save() {
      try { await chrome.storage.local.set({ [STORE]: { day: day, count: count } }); } catch (e) { /* ignore */ }
    }

    async function bump() {
      if (!live() || !isAgentView()) return;
      const now = Date.now();
      if (now - lastBump < 1500) return;
      lastBump = now;
      const today = todayKey();
      if (day !== today) { day = today; count = 0; }
      count += 1;
      await save();
      paint();
      ctx.log('send', count + '/' + limitOf());
    }

    function ensureBadge() {
      if (badge && badge.isConnected) return badge;
      badge = document.createElement('span');
      badge.className = 'aext-quota';
      badge.setAttribute('role', 'status');
      return badge;
    }

    function paint() {
      if (!live() || !isAgentView()) {
        if (badge && badge.remove) badge.remove();
        return;
      }
      const today = todayKey();
      if (day !== today) { day = today; count = 0; save(); }
      ensureBadge();
      badge.textContent = count + '/' + limitOf();
      badge.title = 'Agent sends today (local count, resets at midnight). Arena’s daily Agent Mode cap is about ' + limitOf() + ' — this is not the server remaining quota.';
      badge.classList.toggle('aext-quota-hot', count >= limitOf());
      const btn = document.getElementById('arenakit-settings-btn');
      if (btn && btn.parentElement) {
        if (badge.parentElement !== btn.parentElement || badge.nextElementSibling !== btn) {
          btn.parentElement.insertBefore(badge, btn);
        }
      } else if (!badge.isConnected && document.body) {
        document.body.appendChild(badge);
      }
    }

    function looksLikeSend(el) {
      if (!el || el.tagName !== 'BUTTON') return false;
      if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn')) return false;
      if (el.classList && el.classList.contains('aext-fu')) return false;
      const al = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
      return /^send(\s+message)?$/.test(al) || al === 'send';
    }

    document.addEventListener('click', (e) => {
      const b = e.target && e.target.closest && e.target.closest('button');
      if (looksLikeSend(b)) bump();
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
      const editor = AextDom.findPrompt();
      if (editor && (e.target === editor || (editor.contains && editor.contains(e.target)))) bump();
    }, true);

    load().then(paint);

    const start = () => {
      if (!document.body) return;
      paint();
      AextDom.observeSparse(paint, 500);
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
    setInterval(() => { if (live()) { const t = todayKey(); if (t !== day) { day = t; count = 0; save(); } paint(); } }, 30000);

    this.setEnabled = (on) => { if (on) paint(); else if (badge && badge.remove) badge.remove(); };
    ctx.log('ready');
    return true;
  }
};
