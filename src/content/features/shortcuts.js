'use strict';
/* ArenaKit feature 1.6 — Keyboard shortcuts.
   Configurable (in Settings → Shortcuts) keybindings applied while on arena.ai.
   Defaults:
     /                    focus the prompt
     Ctrl/Cmd + Enter     send
     Escape               stop generation (best-effort)
   Every handler is a no-op (and harmless) if the target isn't present. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};
/* AEXT_SHORTCUT_DEFAULTS is declared in src/shared/meta.js (loaded first). */

window.__AEXT_FEATURES__['shortcuts'] = {
  id: 'shortcuts',
  label: 'Keyboard shortcuts',
  init(ctx) {
    let cfg = (ctx.settings.shortcuts) || AEXT_SHORTCUT_DEFAULTS;
    const live = () => !window.AextRuntime || AextRuntime.isEnabled('shortcuts');
    if (window.AextSettings && typeof AextSettings.subscribe === 'function') {
      AextSettings.subscribe((s) => { cfg = (s && s.shortcuts) || AEXT_SHORTCUT_DEFAULTS; });
    }

    const useMod = (ev, mod) => {
      if (mod === 'ctrl') return (ev.ctrlKey || ev.metaKey);
      if (mod === 'shift') return ev.shiftKey;
      if (mod === 'alt') return ev.altKey;
      return !ev.ctrlKey && !ev.metaKey && !ev.altKey;
    };

    const handler = (ev) => {
      if (!live() || ev.defaultPrevented) return;
      for (const s of cfg) {
        const mod = s.mod || 'none';
        if (ev.key.toLowerCase() !== String(s.key || '').toLowerCase()) continue;
        if (!useMod(ev, mod)) continue;
        if (mod !== 'none' && ev.key === 'Enter') return; // don't hijack plain Enter
        ev.preventDefault();
        const action = s.id;
        if (action === 'focus-prompt') {
          const p = AextDom.findPrompt();
          if (p) { p.focus(); }
        } else if (action === 'send') {
          const btn = AextDom.findSendButton();
          if (btn) btn.click();
        } else if (action === 'stop') {
          // best-effort: find the stop button (usually an aria-label)
          const stop = Array.from(document.querySelectorAll('button')).find((b) => /stop/i.test(b.getAttribute('aria-label') || b.title || b.textContent || ''));
          if (stop) stop.click();
        }
        break;
      }
    };

    document.addEventListener('keydown', handler, true);
    ctx.log('ready', cfg);
    return true;
  },

  // Exposed so the options/settings page can render the current combo list.
  defaults: AEXT_SHORTCUT_DEFAULTS
};
