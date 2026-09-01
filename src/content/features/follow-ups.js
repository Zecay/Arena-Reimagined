'use strict';
/* ArenaKit feature 2.6 — one-click follow-ups after a run. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['follow-ups'] = {
  id: 'follow-ups',
  label: 'Follow-up chips',
  init(ctx) {
    const PROMPTS = (typeof AEXT_FOLLOWUP_DEFAULTS !== 'undefined' && AEXT_FOLLOWUP_DEFAULTS.slice)
      ? AEXT_FOLLOWUP_DEFAULTS.slice()
      : [
        { id: 'fix', label: 'Fix the errors', text: 'Please fix the errors from the last run. Keep working until they are gone.' },
        { id: 'pro', label: 'Make it more professional', text: 'Please make the result more professional: polish copy, layout, and visual quality without changing the core intent.' },
        { id: 'sum', label: 'Summarize what you did', text: 'Please summarize what you did in this run: key changes, files touched, and anything still unfinished.' },
        { id: 'export', label: 'Export everything', text: 'Please export everything from this run as downloadable files I can keep.' }
      ];

    function fuOpts() {
      return (window.AextSettings && AextSettings.optsOf) ? (AextSettings.optsOf('follow-ups') || {}) : {};
    }

    function chips() {
      const o = fuOpts();
      const list = (o && Array.isArray(o.chips) && o.chips.length) ? o.chips : PROMPTS;
      return list.slice(0, 12).filter((p) => p && (p.label || p.text));
    }

    let bar = null;
    let timer = 0;

    const live = () => !window.AextRuntime || AextRuntime.isEnabled('follow-ups');

    AextDom.addStyle(`
      .aext-followups{display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px 8px;align-items:center;
        flex:0 0 auto!important;width:100%;max-width:100%;box-sizing:border-box;align-self:stretch;
        position:relative;z-index:6;}
      html.aext-off-follow-ups .aext-followups{display:none!important;}
      button.aext-fu{appearance:none;border:1px solid hsl(var(--border-medium));
        background:hsl(var(--surface-raised-alt));color:hsl(var(--text-primary));
        font:500 12px/1.25 ui-sans-serif,system-ui,sans-serif;padding:6px 10px;border-radius:999px;
        cursor:pointer;transition:background .12s,border-color .12s,opacity .12s;flex:0 0 auto;}
      button.aext-fu:hover{background:hsl(var(--surface-tertiary));border-color:hsl(var(--interactive-link));}
      button.aext-fu:disabled{opacity:.45;cursor:not-allowed;}
    `, 'arenakit-followups-css');

    function looksLikeStop(el) {
      if (!el || el.tagName !== 'BUTTON') return false;
      const al = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
      const tid = (el.getAttribute('data-testid') || '').toLowerCase();
      return tid === 'stop-button' || tid === 'stop' || al === 'stop' || al === 'stop generating' || (/\bstop\b/.test(al) && !/stopped/.test(al));
    }

    function isStreaming() {
      if (document.querySelector('[data-testid="stop-button"]')) return true;
      const editor = AextDom.findPrompt();
      if (!editor) return false;
      let n = editor.parentElement;
      for (let i = 0; i < 12 && n; i++, n = n.parentElement) {
        const btns = n.querySelectorAll('button');
        for (const b of btns) if (looksLikeStop(b)) return true;
      }
      return false;
    }

    function selectAll(el) {
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function setEditorText(el, text) {
      if (!el) return;
      if ('value' in el && el.tagName === 'TEXTAREA') {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      selectAll(el);
      const ok = document.execCommand('insertText', false, text);
      if (!ok) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    }

    function findSend() {
      const send = AextDom.findSendButton();
      if (send && !looksLikeStop(send)) return send;
      const editor = AextDom.findPrompt();
      if (!editor) return null;
      let n = editor.parentElement;
      for (let i = 0; i < 12 && n; i++, n = n.parentElement) {
        const btns = n.querySelectorAll('button');
        for (const b of btns) {
          const al = (b.getAttribute('aria-label') || '').toLowerCase();
          if (looksLikeStop(b)) continue;
          if (b.offsetParent === null) continue;
          if (/send/.test(al)) return b;
        }
      }
      return send || null;
    }

    async function insertAndSend(text) {
      const editor = AextDom.findPrompt();
      if (!editor) throw new Error('Composer not found');
      setEditorText(editor, text);
      await new Promise((r) => setTimeout(r, 80));
      const send = findSend();
      if (send && !send.disabled) send.click();
      else ctx.log('send button not found');
    }

    function ensureBar() {
      if (bar && bar.isConnected) return bar;
      bar = document.createElement('div');
      bar.className = 'aext-followups';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Follow-up prompts');
      chips().forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'aext-fu';
        b.dataset.aextFu = p.id || ('c' + i);
        b.textContent = p.label || ('Chip ' + (i + 1));
        b.addEventListener('click', async () => {
          if (!live() || isStreaming()) return;
          b.disabled = true;
          try { await insertAndSend(p.text || p.label || ''); }
          catch (e) { ctx.log('follow-up failed', e && e.message); }
          finally { b.disabled = false; }
        });
        bar.appendChild(b);
      });
      return bar;
    }

    function isAgentPath() {
      const p = (location.pathname || '').toLowerCase();
      return p === '/agent' || p.indexOf('/agent/') === 0;
    }

    /* Show chips only in a thread that already has content — not empty
       landings like /agent, /, /text/direct. */
    function hasStartedThread() {
      if (document.getElementById('aext-ws-search')) return true;
      try {
        const nodes = document.querySelectorAll('button, [role="button"]');
        for (let i = 0; i < nodes.length; i++) {
          const t = (nodes[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (/^both are good$/i.test(t) || /^both are bad$/i.test(t)) return true;
        }
      } catch (e) { /* ignore */ }
      const editor = AextDom.findPrompt();
      const skip = (el) => !!(editor && el && (editor === el || (editor.contains && editor.contains(el))));
      if (isAgentPath()) {
        const folders = document.querySelectorAll('button[aria-expanded][aria-label*="folder" i]');
        for (const f of folders) {
          if (f.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn')) continue;
          return true;
        }
      }
      const root = document.querySelector('main') || document.body;
      if (!root) return false;
      const hits = root.querySelectorAll(
        '[data-role="assistant"], [data-role="user"], [data-message-id], [data-turn-id], [data-message-role], [data-aext-pinned]'
      );
      for (const el of hits) {
        if (skip(el)) continue;
        if ((el.textContent || '').trim().length > 20) return true;
      }
      return false;
    }

    /* Agent: after .editor-content (above the toolbar, inside the card).
       Battle/direct: immediately BEFORE the button row so chips sit above
       Add files / Send, not under the whole form. */
    function toolbarRow(editor) {
      const form = editor && editor.closest && editor.closest('form');
      if (!form) return null;
      const send = form.querySelector('button[aria-label="Send message"], button[aria-label*="Stop" i], button[type="submit"]');
      let n = send && send.parentElement;
      while (n && n !== form) {
        const cn = typeof n.className === 'string' ? n.className : '';
        if (/\bjustify-between\b/.test(cn) && n.contains(send)) return n;
        n = n.parentElement;
      }
      if (send && send.parentElement && send.parentElement.parentElement === form) {
        return send.parentElement.parentElement === form ? send.parentElement.parentElement : send.parentElement;
      }
      return null;
    }

    function mount() {
      const allowEmpty = !!(fuOpts().showWhenEmpty);
      if (!live() || (!allowEmpty && !hasStartedThread())) {
        if (bar && bar.remove) bar.remove();
        return;
      }
      const editor = AextDom.findPrompt();
      if (!editor) return;
      ensureBar();
      const row = toolbarRow(editor);
      if (row && row.parentElement) {
        if (bar.nextElementSibling !== row || bar.parentElement !== row.parentElement) {
          try { row.insertAdjacentElement('beforebegin', bar); } catch (e) { row.parentElement.insertBefore(bar, row); }
        }
      } else {
        const box = editor.closest('.editor-content') || editor;
        if (!box.parentElement) return;
        if (bar.previousElementSibling !== box || bar.parentElement !== box.parentElement) {
          try { box.insertAdjacentElement('afterend', bar); } catch (e) { box.parentElement.appendChild(bar); }
        }
      }
      const busy = isStreaming();
      bar.querySelectorAll('.aext-fu').forEach((b) => { b.disabled = busy; });
    }

    const rescan = () => {
      clearTimeout(timer);
      timer = setTimeout(mount, 150);
    };

    const start = () => {
      if (!document.body) return;
      const go = () => { mount(); AextDom.observeSparse(rescan, 280); };
      if (window.AextSettings && typeof AextSettings.load === 'function') {
        AextSettings.load().then(go).catch(go);
      } else go();
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    this.setEnabled = (on) => {
      if (on) mount();
      else if (bar && bar.remove) bar.remove();
    };

    let chipSig = '';
    if (window.AextSettings && typeof AextSettings.subscribe === 'function') {
      try {
        AextSettings.subscribe((next) => {
          const fu = (next && next.opts && next.opts['follow-ups']) || {};
          const sig = JSON.stringify({ chips: fu.chips || [], empty: !!fu.showWhenEmpty });
          if (sig === chipSig) return;
          chipSig = sig;
          if (bar && bar.remove) bar.remove();
          bar = null;
          if (live()) mount();
        });
      } catch (e) { /* storage watch is optional */ }
    }

    ctx.log('ready');
    return true;
  }
};
