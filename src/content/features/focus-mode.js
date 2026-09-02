'use strict';
/* ArenaKit feature 1.7 — Focus / work mode.
   Toggled from the ArenaKit settings panel (in the composer toolbar) or the
   Options page. Applied purely by toggling the class `aext-focus` on <html>;
   all styling is scoped under `html.aext-focus` and prefixed aext-, so it never
   leaks. Exposes AextFocus.set() so the panel can call it. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['focus-mode'] = {
  id: 'focus-mode',
  label: 'Focus / work mode',
  init(ctx) {
    AextDom.addStyle(`
      /* focus mode: wider + denser chat, hide voting/leaderboard chrome */
      html.aext-focus [aria-label*="vote" i],
      html.aext-focus [data-testid*="leaderboard" i]{
        display:none!important;
      }
      html.aext-focus main,
      html.aext-focus [role="main"]{max-width:100%!important;width:100%!important;}
      html.aext-focus [id*="chat"], html.aext-focus [class*="chat"]{
        max-width:1200px!important;margin-left:auto!important;margin-right:auto!important;
      }
    `, 'arenakit-focus-css');

    const live = () => !window.AextRuntime || AextRuntime.isEnabled('focus-mode');
    const applyClass = (on) => {
      document.documentElement.classList.toggle('aext-focus', !!on);
    };
    const setOn = (on) => {
      applyClass(!!on && live());
      AextSettings.save({ focus: !!on }).catch(() => {});
    };

    // restore saved state
    if (ctx.settings.focus) applyClass(true);

    if (window.AextSettings && typeof AextSettings.subscribe === 'function') {
      AextSettings.subscribe((s) => {
        applyClass(!!s.focus && live());
      });
    }

    this.setEnabled = (on) => {
      if (!on) applyClass(false);
      else AextSettings.load().then((s) => applyClass(!!s.focus)).catch(() => {});
    };

    // Expose a global so the settings panel can toggle it and stay in sync.
    window.AextFocus = {
      set: setOn,
      isOn: () => document.documentElement.classList.contains('aext-focus')
    };

    return true;
  }
};
