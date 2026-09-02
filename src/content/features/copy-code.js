'use strict';
/* ArenaKit feature 1.3 — keep Arena's own code-block copy control on screen.
   CSS position:sticky fails (chat scroller + page header). We pin with
   position:fixed and re-measure on the *chat scroller* scroll, not window. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['copy-code'] = {
  id: 'copy-code',
  label: 'Sticky code copy',
  init(ctx) {
    AextDom.addStyle(`
      .aext-code-card{overflow:visible!important;}
      .aext-copy-spacer{display:none;flex:none;pointer-events:none;height:0;}
      .aext-copy-spacer.aext-copy-on{display:block;}
      .aext-sticky-copy.aext-copy-pinned{position:fixed!important;z-index:25!important;
        background:hsl(var(--surface-secondary))!important;
        backdrop-filter:blur(8px);box-sizing:border-box;}
      html.aext-off-copy-code .aext-sticky-copy{position:static!important;z-index:auto!important;backdrop-filter:none!important;}
    `, 'arenakit-copy-code-css');

    const live = () => !window.AextRuntime || AextRuntime.isEnabled('copy-code');
    let ticking = false;
    let boundScroller = null;

    function isCodeToolbar(el) {
      if (!el || el.nodeType !== 1 || el.tagName !== 'DIV') return false;
      if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay')) return false;
      const wrap = el.parentElement;
      if (!wrap || !wrap.querySelector) return false;
      if (!wrap.querySelector('pre, code')) return false;
      if (!el.querySelector('button')) return false;
      const cls = el.className || '';
      if (!/border-b/.test(cls) || !/flex/.test(cls) || !/items-center/.test(cls)) return false;
      return true;
    }

    function headerOffset() {
      let h = 0;
      const nodes = document.querySelectorAll('div.absolute.inset-x-0.top-0, [class*="inset-x-0"][class*="top-0"][class*="z-20"]');
      for (const el of nodes) {
        if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, .aext-code-card')) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 2 && r.height >= 36 && r.height <= 96 && r.width > 180) {
          h = Math.max(h, Math.round(r.bottom));
        }
      }
      return h || 52;
    }

    function scrollerOf(el) {
      let n = el;
      while (n && n !== document.body) {
        try {
          const s = getComputedStyle(n);
          if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 8) return n;
        } catch (e) { /* ignore */ }
        n = n.parentElement;
      }
      return (AextDom.findChatScroller && AextDom.findChatScroller()) || document.scrollingElement;
    }

    function unpin(header) {
      header.classList.remove('aext-copy-pinned');
      header.style.top = '';
      header.style.left = '';
      header.style.width = '';
      header.style.right = '';
      const sp = header.nextElementSibling;
      if (sp && sp.classList.contains('aext-copy-spacer')) {
        sp.classList.remove('aext-copy-on');
        sp.style.height = '0px';
      }
    }

    function pin(header, card, y) {
      const r = card.getBoundingClientRect();
      let sp = header.nextElementSibling;
      if (!sp || !sp.classList.contains('aext-copy-spacer')) {
        sp = document.createElement('div');
        sp.className = 'aext-copy-spacer';
        header.insertAdjacentElement('afterend', sp);
      }
      const hh = header.offsetHeight || 36;
      sp.style.height = hh + 'px';
      sp.classList.add('aext-copy-on');
      header.classList.add('aext-copy-pinned');
      header.style.top = Math.round(y) + 'px';
      header.style.left = Math.round(r.left) + 'px';
      header.style.width = Math.round(r.width) + 'px';
    }

    function flowMarker(header) {
      const sp = header.nextElementSibling;
      if (header.classList.contains('aext-copy-pinned') && sp && sp.classList.contains('aext-copy-spacer')) return sp;
      return header;
    }

    function sync() {
      ticking = false;
      if (!live()) return;
      const pageTop = headerOffset();
      document.querySelectorAll('.aext-sticky-copy').forEach((header) => {
        const card = header.parentElement;
        if (!card) return;
        const pre = card.querySelector('pre') || card;
        const marker = flowMarker(header);
        const flowTop = marker.getBoundingClientRect().top;
        const preBottom = pre.getBoundingClientRect().bottom;
        const hh = header.offsetHeight || 36;

        if (flowTop >= pageTop) {
          unpin(header);
          return;
        }
        if (preBottom <= pageTop + 10) {
          unpin(header);
          return;
        }
        let y = pageTop;
        if (preBottom < pageTop + hh + 8) y = preBottom - hh;
        if (y + hh < pageTop - 2) {
          unpin(header);
          return;
        }
        pin(header, card, y);
      });
    }

    function requestSync() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    }

    function bindScroller() {
      const sample = document.querySelector('.aext-sticky-copy');
      const s = (sample && scrollerOf(sample)) || (AextDom.findChatScroller && AextDom.findChatScroller());
      if (s === boundScroller) return;
      if (boundScroller) boundScroller.removeEventListener('scroll', requestSync);
      boundScroller = s || null;
      if (boundScroller) boundScroller.addEventListener('scroll', requestSync, { passive: true });
    }

    function decorate(header) {
      if (!live() || !isCodeToolbar(header)) return;
      header.classList.add('aext-sticky-copy');
      if (header.parentElement) header.parentElement.classList.add('aext-code-card');
    }

    function strip() {
      document.querySelectorAll('.aext-sticky-copy').forEach((el) => {
        unpin(el);
        el.classList.remove('aext-sticky-copy');
      });
      document.querySelectorAll('.aext-code-card').forEach((el) => el.classList.remove('aext-code-card'));
      document.querySelectorAll('.aext-copy-spacer').forEach((el) => el.remove());
      document.querySelectorAll('.aext-copy-wrap').forEach((el) => el.remove());
      if (boundScroller) {
        boundScroller.removeEventListener('scroll', requestSync);
        boundScroller = null;
      }
    }

    function scan() {
      if (!live()) { strip(); return; }
      document.querySelectorAll('div.border-b.flex.items-center, div.flex.items-center.justify-between.border-b').forEach(decorate);
      document.querySelectorAll('pre').forEach((pre) => {
        const wrap = pre.parentElement;
        if (!wrap) return;
        const header = Array.from(wrap.children).find(isCodeToolbar);
        if (header) decorate(header);
      });
      bindScroller();
      requestSync();
    }

    const start = () => {
      if (!document.body) return;
      scan();
      AextDom.observeSparse(scan, 400);
      document.addEventListener('scroll', requestSync, true);
      window.addEventListener('resize', requestSync);
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    this.setEnabled = (on) => { if (on) scan(); else strip(); };
    ctx.log('ready sticky copy');
    return true;
  }
};
