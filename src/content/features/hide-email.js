'use strict';
/* Arena Reimagined — cloak the account email in the sidebar (screenshots / share).
   Default: password-style dots. ⚙ sets a custom stand-in like lol@gmail.com.
   Never writes the real address to storage. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['hide-email'] = {
  id: 'hide-email',
  label: 'Hide account email',
  init(ctx) {
    const EMAIL = /^[^\s@]{1,80}@[^\s@]{1,120}\.[A-Za-z]{2,24}$/;
    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('hide-email');
    const optsOf = () => (typeof AextSettings !== 'undefined' && AextSettings.optsOf) ? (AextSettings.optsOf('hide-email') || {}) : {};
    const DOTS = '••••••••••';

    function coverText() {
      const t = String((optsOf().text || '')).trim().slice(0, 80);
      return t || DOTS;
    }

    function looksAccount(el) {
      if (!el || el.nodeType !== 1) return false;
      if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, .tiptap, [contenteditable="true"]')) return false;
      const row = el.closest('.flex.items-center') || el.parentElement;
      if (!row) return false;
      if (!row.querySelector('img, span.rounded-full, span.size-6, .size-6')) return false;
      const t = (el.dataset.aextReal || el.textContent || '').trim();
      return EMAIL.test(t);
    }

    function targets() {
      const out = [];
      const seen = new Set();
      const add = (el) => {
        if (!el || seen.has(el) || !looksAccount(el)) return;
        seen.add(el);
        out.push(el);
      };
      document.querySelectorAll('.font-heading.truncate, .truncate.text-sm, .truncate.text-left').forEach(add);
      document.querySelectorAll('img[src*="googleusercontent"], img[src*="lh3.google"]').forEach((img) => {
        const row = img.closest('.flex.items-center') || (img.parentElement && img.parentElement.parentElement);
        if (!row) return;
        row.querySelectorAll('div, span').forEach((n) => {
          if (n.childElementCount === 0) add(n);
        });
      });
      return out;
    }

    function apply() {
      if (!live()) {
        document.querySelectorAll('[data-aext-real]').forEach((el) => {
          el.textContent = el.dataset.aextReal;
          delete el.dataset.aextReal;
        });
        return;
      }
      const cover = coverText();
      targets().forEach((el) => {
        const now = (el.textContent || '').trim();
        if (!el.dataset.aextReal && EMAIL.test(now)) el.dataset.aextReal = now;
        if (el.dataset.aextReal && now !== cover) el.textContent = cover;
      });
    }

    AextDom.observeSparse(apply, 700);
    if (document.body) AextDom.later(apply, 600);
    else document.addEventListener('DOMContentLoaded', () => AextDom.later(apply, 600), { once: true });
    if (typeof AextSettings !== 'undefined' && typeof AextSettings.subscribe === 'function') {
      AextSettings.subscribe(() => apply());
    }

    this.setEnabled = (on) => apply();
    ctx.log('ready');
    return true;
  }
};
