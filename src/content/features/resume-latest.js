'use strict';
/* ArenaKit feature 1.2 — Resume at latest message.
   When opening (or re-opening) a chat, auto-scroll to the most recent message
   instead of the top. Runs once per chat container, does not fight the user. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['resume-latest'] = {
  id: 'resume-latest',
  label: 'Resume at latest message',
  init(ctx) {
    const done = new WeakSet();
    const live = () => !window.AextRuntime || AextRuntime.isEnabled('resume-latest');
    const scrollLatest = () => {
      if (!live()) return;
      const sc = AextDom.findChatScroller();
      if (!sc || done.has(sc)) return;
      // Only auto-scroll when scroller exists and there's overflow (a conversation).
      if (sc.scrollHeight > sc.clientHeight) {
        done.add(sc);
        sc.scrollTop = sc.scrollHeight;
        ctx.log('resumed to latest');
      }
    };

    const start = () => { AextDom.later(scrollLatest, 400); };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    // Cover SPA routes. document_start can run before <body> exists, so do not
    // call observe until a real Node is available.
    const attachObserver = () => {
      if (!document.body) return;
      AextDom.observeSparse(() => {
        const sc = AextDom.findChatScroller();
        if (sc && !done.has(sc)) start();
      }, 600);
    };
    if (document.body) attachObserver();
    else document.addEventListener('DOMContentLoaded', attachObserver, { once: true });

    return true;
  }
};
