'use strict';
/* ArenaKit — shared DOM/content-script helpers used by feature modules.
   Everything here is fail-safe and prefixed arenakit- and aext- so nothing leaks
   into arena's own styles/inspectors. */

const AextDom = {
  _scroller: null,

  /* Inject a <style> into <head> (repeatedly-safe). Returns the element. */
  addStyle(css, id) {
    const key = id || ('arenakit-style-' + (AextDom.__n = (AextDom.__n || 0) + 1));
    if (document.getElementById(key)) return document.getElementById(key);
    const s = document.createElement('style');
    s.id = key;
    s.dataset.arenakit = '';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    return s;
  },

  later(fn, ms) { return setTimeout(fn, ms); },

  pageHidden() { try { return !!document.hidden; } catch (e) { return false; } },

  isOurs(el) {
    if (!el) return false;
    const n = el.nodeType === 1 ? el : el.parentElement;
    if (!n || !n.closest) return false;
    return !!n.closest(
      '#arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn,' +
      '#aext-opt-overlay, #aext-opt-dlg, #aext-host-overlay, #aext-host-dlg,' +
      '#aext-zip-progress, #aext-ws-search,' +
      '.aext-followups, .aext-notify, .aext-quota, .aext-txt-prompt, button.aext-novm'
    );
  },

  isEditor(el) {
    if (!el) return false;
    const n = el.nodeType === 1 ? el : el.parentElement;
    if (!n || !n.closest) return false;
    return !!n.closest('.tiptap, .ProseMirror, [contenteditable="true"]');
  },

  /* ONE body observer shared by every feature (9 separate subtree observers
     was a real lag source). Each subscriber still has its own debounce. */
  _sparseSubs: [],
  _sparseObs: null,
  observeSparse(cb, ms) {
    if (typeof cb !== 'function') return null;
    this._sparseSubs.push({ cb: cb, ms: ms == null ? 280 : ms, t: 0 });
    const kickAll = () => {
      if (AextDom.pageHidden()) return;
      const subs = AextDom._sparseSubs;
      for (let i = 0; i < subs.length; i++) {
        const s = subs[i];
        clearTimeout(s.t);
        s.t = setTimeout(s.cb, s.ms);
      }
    };
    const attach = () => {
      if (AextDom._sparseObs || !document.body) return AextDom._sparseObs;
      AextDom._sparseObs = new MutationObserver((muts) => {
        for (let i = 0; i < muts.length; i++) {
          const target = muts[i].target;
          if (AextDom.isOurs(target) || AextDom.isEditor(target)) continue;
          kickAll();
          return;
        }
      });
      AextDom._sparseObs.observe(document.body, { childList: true, subtree: true });
      return AextDom._sparseObs;
    };
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });
    return AextDom._sparseObs;
  },

  /* Best-effort: find the scrollable chat/message container.
     Never querySelectorAll('*') — that was a main source of client lag. */
  findChatScroller() {
    const cached = this._scroller;
    if (cached && cached.isConnected) {
      try {
        if (cached.scrollHeight > cached.clientHeight + 40) return cached;
      } catch (e) { /* recache */ }
    }
    const consider = (el, best) => {
      if (!el || el.nodeType !== 1) return best;
      if (this.isOurs(el)) return best;
      try {
        const s = getComputedStyle(el);
        if (s.overflowY !== 'auto' && s.overflowY !== 'scroll') return best;
        if (el.scrollHeight <= el.clientHeight + 50) return best;
        const h = el.getBoundingClientRect().height;
        if (h < 80) return best;
        const score = el.scrollHeight * h;
        if (!best || score > best.score) return { el: el, score: score };
      } catch (e) { /* ignore */ }
      return best;
    };
    let best = null;
    const hints = document.querySelectorAll(
      'main [class*="overflow-y-auto"], main [class*="overflow-y-scroll"],' +
      '[data-radix-scroll-area-viewport], [role="log"], main'
    );
    for (let i = 0; i < hints.length; i++) best = consider(hints[i], best);
    if (!best) {
      const roots = [document.querySelector('main'), document.body].filter(Boolean);
      for (let r = 0; r < roots.length; r++) {
        best = consider(roots[r], best);
        const kids = roots[r].children;
        for (let i = 0; i < kids.length; i++) best = consider(kids[i], best);
      }
    }
    const root = document.scrollingElement;
    if (root && root.scrollHeight > root.clientHeight + 50) {
      best = best || { el: root, score: 1 };
    }
    this._scroller = best ? best.el : null;
    return this._scroller;
  },

  /* Best-effort find the main prompt textarea/contenteditable.
     Arena Agent Mode uses a TipTap/ProseMirror editor (.tiptap.ProseMirror),
     not a <textarea> and not role=textbox.
     Prefer the *lowest visible* editor — querySelector's first match is often
     a header/title field at the top of the page. */
  findPrompt() {
    const nodes = document.querySelectorAll(
      '.editor-content [contenteditable="true"],' +
      '.tiptap.ProseMirror[contenteditable="true"],' +
      '[contenteditable="true"].ProseMirror,' +
      '[contenteditable="true"].tiptap,' +
      'textarea[name="message"],' +
      'form textarea,' +
      'textarea[placeholder],' +
      '[contenteditable="true"][role="textbox"]'
    );
    const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
    let best = null;
    let bestTop = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (this.isOurs(el)) continue;
      if (el.closest && el.closest('[role="dialog"]')) continue;
      try {
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > vh + 80) continue;
        if (r.top >= bestTop) { best = el; bestTop = r.top; }
      } catch (e) { /* ignore */ }
    }
    if (best) return best;
    return null;
  },

  /* Best-effort find the "send" button near the prompt. */
  findSendButton() {
    const p = AextDom.findPrompt();
    if (!p) return null;
    let n = p;
    for (let i = 0; i < 12 && n; i++) n = n.parentElement;
    const ctx = n || document;
    const btns = Array.from(ctx.querySelectorAll('button')).filter((b) => /send|submit|^>$/i.test(b.getAttribute('aria-label') || b.title || b.textContent || ''));
    return btns[0] || null;
  }
};

try { globalThis.AextDom = AextDom; } catch (e) { /* ignore */ }
