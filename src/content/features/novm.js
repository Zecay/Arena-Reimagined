'use strict';
/* Arena Reimagined — tiny NoVM square. Pastes a short note + the skill link. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__.novm = {
  id: 'novm',
  label: 'NoVM desktop',
  init(ctx) {
    const live = () => !window.AextRuntime || AextRuntime.isEnabled('novm');
    let btn = null;

    const DOC = 'Use NoVM for a remote Linux desktop. Read this skill, then give me the viewer link so I can connect:\n\nhttps://github.com/vroomjs/NoVM-Agent-Skill/blob/main/skill.md';

    const ICON =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="8.25" fill="none" stroke="#e11d48" stroke-width="2.4"/>' +
        '<line x1="17.4" y1="17.4" x2="6.6" y2="6.6" stroke="#e11d48" stroke-width="2.4" stroke-linecap="round"/>' +
      '</svg>';

    AextDom.addStyle(`
      button.aext-novm{appearance:none!important;box-sizing:border-box!important;
        display:inline-flex!important;align-items:center;justify-content:center;
        flex:0 0 28px!important;width:28px!important;height:28px!important;
        min-width:28px!important;max-width:28px!important;min-height:28px!important;
        padding:0!important;margin:0 4px 0 0!important;border-radius:8px!important;
        cursor:pointer;border:1px solid hsl(var(--border-medium));
        background:hsl(var(--surface-raised-alt));color:#e11d48;line-height:0;}
      button.aext-novm:hover{border-color:#e11d48;background:hsl(var(--surface-tertiary));}
      button.aext-novm svg{display:block;width:16px;height:16px;}
      html.aext-off-novm button.aext-novm{display:none!important;}
    `, 'arenakit-novm-css');

    function paste() {
      const el = AextDom.findPrompt();
      if (!el) { ctx.log('composer not found'); return; }
      el.focus();
      const ok = document.execCommand('insertText', false, DOC);
      if (!ok) {
        if ('value' in el && el.tagName === 'TEXTAREA') {
          el.value = (el.value || '') + ((el.value && !/\n$/.test(el.value)) ? '\n\n' : '') + DOC;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          try {
            document.execCommand('selectAll', false, null);
          } catch (e) { /* ignore */ }
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          if (!document.execCommand('insertText', false, DOC)) {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: DOC }));
          }
        }
      }
    }

    function makeBtn() {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'aext-novm';
      b.title = 'NoVM — paste docs and ask for the viewer link';
      b.setAttribute('aria-label', 'NoVM desktop');
      b.innerHTML = ICON;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        paste();
      });
      return b;
    }

    function ensure() {
      if (!live()) {
        if (btn && btn.remove) btn.remove();
        return;
      }
      if (!btn) btn = makeBtn();
      const gear = document.getElementById('arenakit-settings-btn');
      if (gear && gear.parentElement && gear.parentElement.isConnected) {
        if (btn.parentElement !== gear.parentElement || btn.previousSibling !== gear) {
          gear.insertAdjacentElement('afterend', btn);
        }
        return;
      }
      /* Toolbar not ready — park next to send, still a 28px square, never stretch. */
      const send = AextDom.findSendButton && AextDom.findSendButton();
      if (send && send.parentElement) {
        if (btn.parentElement !== send.parentElement) send.parentElement.insertBefore(btn, send);
        return;
      }
    }

    AextDom.observeSparse(ensure, 400);
    if (document.body) AextDom.later(ensure, 400);
    else document.addEventListener('DOMContentLoaded', () => AextDom.later(ensure, 400), { once: true });

    this.setEnabled = (on) => {
      if (on) ensure();
      else if (btn && btn.remove) btn.remove();
    };
    ctx.log('ready');
    return true;
  }
};
