'use strict';
/* ArenaKit — preserve the reader's position only while a response is streaming. */
window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};
window.__AEXT_FEATURES__['scroll-lock'] = {
  id: 'scroll-lock', label: 'Scroll lock while streaming',
  init(ctx) {
    let scroller = null, locked = false, savedTop = 0, observer = null, bound = null, restoring = false;
    const nearBottom = el => el.scrollHeight - el.scrollTop - el.clientHeight <= 16;
    const streaming = () => !!document.querySelector('[data-testid="stop-button"], button[aria-label="Stop" i], button[aria-label="Stop generating" i], button[aria-label="Stop generation" i]');
    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('scroll-lock');
    const restore = () => {
      if (!live() || !locked || !scroller || !streaming()) return;
      const next = Math.min(savedTop, Math.max(0, scroller.scrollHeight - scroller.clientHeight));
      if (Math.abs(scroller.scrollTop - next) > 1) {
        restoring = true; scroller.scrollTop = next;
        requestAnimationFrame(() => { restoring = false; });
      }
    };
    const onScroll = () => {
      if (!live() || !scroller || restoring) return;
      if (!streaming() || nearBottom(scroller)) { locked = false; return; }
      savedTop = scroller.scrollTop; locked = true;
    };
    const bind = () => {
      const next = AextDom.findChatScroller();
      if (!next || next === scroller) return;
      if (scroller && bound) scroller.removeEventListener('scroll', bound);
      if (observer) observer.disconnect();
      scroller = next;
      bound = onScroll;
      scroller.addEventListener('scroll', bound, { passive: true });
      observer = new MutationObserver(() => { if (locked && streaming()) requestAnimationFrame(restore); });
      observer.observe(scroller, { childList: true, subtree: true });
    };
    const start = () => {
      bind();
      AextDom.observeSparse(bind, 800);
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
    ctx.log('ready');
    return true;
  }
};
