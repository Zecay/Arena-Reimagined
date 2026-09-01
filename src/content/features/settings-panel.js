'use strict';
/* ArenaKit feature "settings-panel" — the single, always-visible in-toolbar
   control. Injects ONE clearly-visible button at the very START (the left) of
   arena's composer toolbar group — before all of arena's own buttons — so it is
   easy to find and can't be mistaken for arena UI. It opens a clean, TABBED
   settings panel styled with arena's own design tokens, so it matches every
   theme automatically.

   Tabs:  Theme  (switch + import/export custom themes)
          Features  (searchable, collapsible groups, isolated toggles)
          More  (run tracker, reset, health)

   Everything is prefixed aext-/arenakit- so it never leaks into the page. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['settings-panel'] = {
  id: 'settings-panel',
  label: 'Settings panel (toolbar)',
  init(ctx) {
    const BTN_ID = 'arenakit-settings-btn';
    const PAD = 14;

    /* ---- CSS: visible button + tabbed, token-styled panel ---- */
    AextDom.addStyle(`
      /* the in-toolbar button — ALWAYS visible, brand-tinted, a perfect square, LEFT of everything */
      #arenakit-settings-btn{position:static!important;display:inline-flex!important;align-items:center;justify-content:center;flex:0 0 auto!important;width:34px;height:34px;padding:0!important;border-radius:8px!important;cursor:pointer!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;border:0!important;box-shadow:none!important;background:linear-gradient(135deg,#3b82f6,#8b5cf6)!important;color:#fff!important;margin:0;font:inherit;}
      #arenakit-settings-btn:hover{filter:brightness(1.1);}
      #arenakit-settings-btn.aext-fallback{position:fixed!important;right:18px;bottom:18px;z-index:2147483001!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important;}
      #arenakit-settings-btn svg{width:20px;height:20px;display:block;}

      /* backdrop */
      #arenakit-settings-overlay{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:aext-fade .14s ease;}
      @keyframes aext-fade{from{opacity:0}to{opacity:1}}
      #arenakit-settings-panel{width:min(480px,94vw);max-height:88vh;overflow:auto;background:hsl(var(--surface-secondary));color:hsl(var(--text-primary));border:1px solid hsl(var(--border-medium));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.5);font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;animation:aext-pop .16s ease;}
      @keyframes aext-pop{from{transform:translateY(8px);opacity:.4}to{transform:none;opacity:1}}
      #arenakit-settings-panel *{box-sizing:border-box;}
      #arenakit-settings-panel button{font-family:inherit;}

      /* header */
      #arenakit-settings-panel .aext-sp-head{display:flex;align-items:center;gap:10px;padding:16px 18px 12px;}
      #arenakit-settings-panel .aext-sp-brand{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:16px;flex:none;}
      #arenakit-settings-panel .aext-sp-title{flex:1;min-width:0;}
      #arenakit-settings-panel .aext-sp-title b{display:block;font-size:15px;font-weight:700;color:hsl(var(--header-primary));}
      #arenakit-settings-panel .aext-sp-title span{display:block;font-size:11px;color:hsl(var(--text-tertiary));}
      #arenakit-settings-panel .aext-sp-close{width:30px;height:30px;border-radius:8px;border:0;background:transparent;color:hsl(var(--text-tertiary));cursor:pointer;font-size:16px;line-height:1;}
      #arenakit-settings-panel .aext-sp-close:hover{background:hsl(var(--surface-tertiary));color:hsl(var(--text-primary));}

      /* tabs */
      #arenakit-settings-panel .aext-sp-tabs{display:flex;gap:4px;padding:0 18px;border-bottom:1px solid hsl(var(--border-faint));}
      #arenakit-settings-panel .aext-sp-tab{flex:1;padding:10px 6px;background:none;border:0;border-bottom:3px solid transparent;color:hsl(var(--text-muted));font-size:12.5px;font-weight:700;cursor:pointer;border-radius:8px 8px 0 0;transition:color .12s;}
      #arenakit-settings-panel .aext-sp-tab:hover{color:hsl(var(--text-primary));}
      #arenakit-settings-panel .aext-sp-tab.is-active{color:hsl(var(--text-primary));border-bottom-color:hsl(var(--interactive-link));}

      /* content */
      #arenakit-settings-panel .aext-sp-view{padding:14px 18px 12px;display:none;}
      #arenakit-settings-panel .aext-sp-view.is-active{display:block;}
      #arenakit-settings-panel .aext-sp-sec{margin-bottom:14px;}
      #arenakit-settings-panel h3.aext-sp-h3{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:hsl(var(--text-muted));margin:0 0 8px;font-weight:700;}
      #arenakit-settings-panel .aext-sp-hint{font-size:11.5px;color:hsl(var(--text-tertiary));margin:-2px 0 8px;line-height:1.4;}

      /* theme cards */
      #arenakit-settings-panel .aext-sp-themes{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;}
      #arenakit-settings-panel button.aext-sp-theme{display:flex;align-items:center;gap:8px;background:hsl(var(--surface-tertiary));border:1px solid hsl(var(--border-faint));border-radius:10px;padding:8px 9px;cursor:pointer;color:hsl(var(--text-primary));font-size:12.5px;text-align:left;transition:border-color .12s;}
      #arenakit-settings-panel button.aext-sp-theme:hover{background:hsl(var(--surface-raised));}
      #arenakit-settings-panel button.aext-sp-theme.is-active{border-color:hsl(var(--interactive-link));background:hsl(var(--surface-raised));}
      #arenakit-settings-panel .aext-sp-swatch{width:16px;height:16px;border-radius:50%;flex:none;border:1px solid rgba(128,128,128,.35);}
      #arenakit-settings-panel button.aext-sp-theme .aext-sp-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #arenakit-settings-panel button.aext-sp-theme .aext-sp-check{color:hsl(var(--interactive-link));font-weight:700;font-size:13px;}
      #arenakit-settings-panel .aext-sp-del{width:18px;height:18px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:5px;background:transparent;color:hsl(var(--text-tertiary));cursor:pointer;font-size:12px;line-height:1;padding:0;}
      #arenakit-settings-panel .aext-sp-del:hover{background:hsl(var(--interactive-negative));color:hsl(var(--interactive-inverted));}
      #arenakit-settings-panel .aext-sp-theme-actions{display:flex;gap:8px;margin-top:12px;}
      #arenakit-settings-panel .aext-sp-btn{flex:1;padding:8px 10px;border-radius:9px;border:1px solid hsl(var(--border-medium));background:hsl(var(--surface-raised-alt));color:hsl(var(--text-primary));font-size:12px;font-weight:600;cursor:pointer;}
      #arenakit-settings-panel .aext-sp-btn:hover{background:hsl(var(--surface-tertiary));}
      #arenakit-settings-panel .aext-sp-btn.primary{background:hsl(var(--interactive-cta));color:hsl(var(--interactive-on-cta));border-color:transparent;}
      #arenakit-settings-panel .aext-sp-btn.primary:hover{filter:brightness(1.05);}

      /* feature rows */
      #arenakit-settings-panel .aext-sp-search{width:100%;margin:0 0 12px;padding:8px 10px;border-radius:9px;border:1px solid hsl(var(--border-medium));background:hsl(var(--surface-tertiary));color:hsl(var(--text-primary));font:13px/1.3 ui-sans-serif,system-ui,sans-serif;}
      #arenakit-settings-panel .aext-sp-search::placeholder{color:hsl(var(--text-muted));}
      #arenakit-settings-panel details.aext-sp-sec{margin-bottom:10px;border:1px solid hsl(var(--border-faint));border-radius:12px;padding:4px 10px 6px;background:hsl(var(--surface-raised));}
      #arenakit-settings-panel details.aext-sp-sec[hidden]{display:none!important;}
      #arenakit-settings-panel summary.aext-sp-h3{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;list-style:none;font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:hsl(var(--text-muted));margin:0;padding:8px 2px;font-weight:700;}
      #arenakit-settings-panel summary.aext-sp-h3::-webkit-details-marker{display:none;}
      #arenakit-settings-panel summary.aext-sp-h3::after{content:'';width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform .12s;margin-right:4px;}
      #arenakit-settings-panel details.aext-sp-sec[open] > summary.aext-sp-h3::after{transform:rotate(-135deg);}
      #arenakit-settings-panel .aext-sp-empty{font-size:12px;color:hsl(var(--text-tertiary));padding:8px 2px;}
      #arenakit-settings-panel .aext-sp-row{display:flex;align-items:center;gap:10px;padding:6px 2px;}
      #arenakit-settings-panel .aext-sp-row[hidden]{display:none!important;}
      #arenakit-settings-panel .aext-sp-ic{width:20px;text-align:center;font-size:15px;flex:none;}
      #arenakit-settings-panel .aext-sp-info{flex:1;min-width:0;}
      #arenakit-settings-panel .aext-sp-info b{display:block;font-size:12.5px;font-weight:600;color:hsl(var(--text-primary));}
      #arenakit-settings-panel .aext-sp-info span{display:block;font-size:11px;color:hsl(var(--text-tertiary));line-height:1.3;}
      #arenakit-settings-panel .aext-sp-switch{appearance:none;width:36px;height:20px;border-radius:99px;background:hsl(var(--border-medium));position:relative;cursor:pointer;flex:none;transition:background .15s;margin:0;}
      #arenakit-settings-panel .aext-sp-switch::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s;}
      #arenakit-settings-panel .aext-sp-switch:checked{background:hsl(var(--interactive-link));}
      #arenakit-settings-panel .aext-sp-switch:checked::after{left:19px;}

      /* import box */
      #arenakit-settings-panel .aext-sp-import{margin-top:10px;display:none;}
      #arenakit-settings-panel .aext-sp-import.open{display:block;}
      #arenakit-settings-panel .aext-sp-import textarea{width:100%;min-height:120px;background:hsl(var(--surface-tertiary));border:1px solid var(--border, hsl(var(--border-medium)));border-radius:10px;color:hsl(var(--text-primary));font:11px/1.5 ui-monospace,monospace;padding:9px;resize:vertical;}
      #arenakit-settings-panel .aext-sp-import .aext-sp-import-btns{display:flex;gap:8px;margin-top:8px;}
      #arenakit-settings-panel .aext-sp-err{color:hsl(var(--interactive-negative));font-size:11px;margin-top:6px;}

      /* more / footer */
      #arenakit-settings-panel .aext-sp-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;flex-wrap:wrap;}
      #arenakit-settings-panel .aext-sp-link{background:transparent;border:0;color:hsl(var(--interactive-link));cursor:pointer;font-size:12px;padding:6px 2px;border-radius:6px;}
      #arenakit-settings-panel .aext-sp-link:hover{background:hsl(var(--surface-tertiary));}
      #arenakit-settings-panel .aext-sp-reset{background:transparent;border:1px solid hsl(var(--interactive-negative));color:hsl(var(--interactive-negative));cursor:pointer;font-size:12px;padding:6px 12px;border-radius:8px;}
      #arenakit-settings-panel .aext-sp-reset:hover{background:hsl(var(--interactive-negative));color:hsl(var(--interactive-inverted));}
      #arenakit-settings-panel .aext-sp-health{display:flex;align-items:center;gap:7px;font-size:11.5px;color:hsl(var(--text-tertiary));margin-top:6px;}
      #arenakit-settings-panel .aext-sp-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;flex:none;}
      #arenakit-settings-panel .aext-sp-dot.bad{background:#f87171;box-shadow:0 0 6px #f87171;}
      #arenakit-settings-panel .aext-sp-discord{margin:12px 2px 4px;font-size:11.5px;color:hsl(var(--text-tertiary));line-height:1.45;}
      #arenakit-settings-panel .aext-sp-discord b{color:hsl(var(--text-secondary));font-weight:600;}
    `, 'arenakit-settings-css');

    /* Arena's logo mark (just the crest glyph, no "Arena" text) on a white fill. */
    const ARENA_LOGO = '<svg viewBox="0 0 122 94" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M42.0341 39.5754C38.0998 39.5754 34.9132 42.8134 34.9132 46.811V91.9553H39.448V46.811C39.448 45.3539 40.6124 44.1708 42.0464 44.1708C43.4804 44.1708 44.6447 45.3539 44.6447 46.811V91.9553H49.1795V46.811C49.1795 42.8134 45.9929 39.5754 42.0586 39.5754H42.0341Z" fill="currentColor"/><path d="M79.7105 39.5754C75.7762 39.5754 72.5896 42.8134 72.5896 46.811V91.9553H77.1244V46.811C77.1244 45.3539 78.2888 44.1708 79.7228 44.1708C81.1567 44.1708 82.3211 45.3539 82.3211 46.811V91.9553H86.8559V46.811C86.8559 42.8134 83.6693 39.5754 79.735 39.5754H79.7105Z" fill="currentColor"/><path d="M60.8785 39.5754C56.9443 39.5754 53.7576 42.8134 53.7576 46.811V91.9553H58.2925V46.811C58.2925 45.3539 59.4568 44.1708 60.8908 44.1708C62.3248 44.1708 63.4891 45.3539 63.4891 46.811V91.9553H68.0239V46.811C68.0239 42.8134 64.8373 39.5754 60.903 39.5754H60.8785Z" fill="currentColor"/><path d="M105.036 20.81L108.174 15.2681H115.466L121.754 0H0L6.28747 15.2681H13.58L16.7053 20.81C10.6139 22.9271 5.60112 28.3071 5.60112 36.4144C5.60112 44.5217 11.3616 51.3836 19.99 51.3836C21.8775 51.3836 23.6301 50.9851 25.1867 50.2877V91.9699H29.7092V46.6139C31.131 44.6586 31.9644 42.2177 32.0257 39.453C32.0257 39.4157 32.0379 39.3659 32.0379 39.316C32.0379 39.2787 32.0257 39.2538 32.0257 39.2164C32.0257 39.1915 32.0379 39.1666 32.0379 39.1417C32.0379 39.1043 32.0257 39.067 32.0257 39.0172C31.9766 37.1491 31.4864 35.4056 30.6284 33.9236H91.1255C90.2675 35.4056 89.7773 37.1491 89.7282 39.0172C89.7282 39.067 89.716 39.1043 89.716 39.1417V39.316C89.716 39.316 89.7282 39.4157 89.7282 39.453C89.7895 42.2177 90.6229 44.6586 92.0447 46.6139V91.9699H96.5672V50.2877C98.1238 50.9851 99.8642 51.3836 101.764 51.3836C110.38 51.3836 116.153 44.2228 116.153 36.4144C116.153 28.6059 111.128 22.9271 105.036 20.81ZM9.30252 10.6603L6.80224 4.60784H114.952L112.451 10.6603H9.30252ZM102.953 15.2681L100.44 19.7141H21.3137L18.8011 15.2681H102.953ZM101.764 46.7758C97.3394 46.7758 94.2998 43.7371 94.2508 39.2662C94.2753 36.103 96.2853 33.9859 99.2023 33.9485H99.2881C101.114 33.9485 102.61 35.4803 102.61 37.0868V37.1616C102.573 38.0956 101.837 38.8179 100.918 38.8179C99.6681 38.8179 98.6508 39.8515 98.6508 41.1218C98.6508 42.3921 99.6681 43.4257 100.918 43.4257C104.35 43.4257 107.157 40.5988 107.157 37.0868C107.157 36.9748 107.132 36.8627 107.12 36.7631C106.936 32.6409 103.615 29.3532 99.2269 29.3532H60.8647L60.5705 29.3407H60.2641L22.527 29.3532C18.1393 29.3532 14.8178 32.6409 14.634 36.7631C14.6217 36.8627 14.5972 36.9748 14.5972 37.0868C14.5972 40.5988 17.4039 43.4257 20.8357 43.4257C22.0858 43.4257 23.1031 42.3921 23.1031 41.1218C23.1031 39.8515 22.0858 38.8179 20.8357 38.8179C19.9165 38.8179 19.1811 38.0956 19.1321 37.1616C19.1321 37.1367 19.1443 37.1118 19.1443 37.0868C19.1443 35.4803 20.6273 33.9485 22.4658 33.9485H22.5393C25.4686 33.9859 27.4786 36.103 27.5031 39.2662C27.4541 43.7371 24.4023 46.7758 19.99 46.7758C14.1805 46.7758 10.1359 42.006 10.1359 36.4144C10.1359 28.8675 15.9577 24.3094 23.1521 24.3094H98.6018C105.796 24.3094 111.618 28.8675 111.618 36.4144C111.618 42.006 107.573 46.7758 101.764 46.7758Z" fill="currentColor"/></svg>';

    const vis = (el) => {
      if (!el || !el.getBoundingClientRect) return false;
      try {
        const st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        return r.width > 8 && r.height > 8 && r.bottom > 12 && r.top < vh - 8;
      } catch (e) { return false; }
    };

    /* Never mount on the justify-between row (left tools | send). That made
       our controls their own flex column and shoved Add files into the middle.
       Prefer the LEFT cluster that holds Add files but not Send. */
    const isSplitRow = (el) => {
      if (!el) return false;
      try {
        const cn = typeof el.className === 'string' ? el.className : String((el.className && el.className.baseVal) || '');
        if (/\bjustify-between\b/.test(cn)) return true;
        const jc = window.getComputedStyle(el).justifyContent;
        return jc === 'space-between' || jc === 'space-around' || jc === 'space-evenly';
      } catch (e) { return false; }
    };

    const isBattleComposer = (el) => {
      const prompt = AextDom.findPrompt();
      if (!prompt || prompt.tagName !== 'TEXTAREA') return false;
      const form = (el && el.closest && el.closest('form')) || (prompt.closest && prompt.closest('form'));
      return !!(form && form.contains(prompt));
    };

    const pickGroup = (anchor) => {
      /* Battle/direct textarea form: sit in the RIGHT cluster next to Send.
         Agent TipTap: sit in the LEFT cluster next to Add files. */
      if (isBattleComposer(anchor)) {
        let g = anchor.parentElement;
        if (g && isSplitRow(g)) {
          const add = g.querySelector('button[aria-label*="Add files" i]');
          if (add && add.parentElement && add.parentElement !== g && !isSplitRow(add.parentElement)) {
            return add.parentElement;
          }
        }
        return g;
      }
      const scope = (anchor.closest && (anchor.closest('form') || anchor.closest('[class*="flex"]'))) || anchor.parentElement;
      const add = scope && scope.querySelector(
        'button[aria-label="Add files and more"], button[aria-label*="Add files" i]'
      );
      if (add && add.parentElement && !isSplitRow(add.parentElement)) return add.parentElement;
      return anchor.parentElement;
    };

    const ANCHORS =
      'button[aria-label="Send message"], button[aria-label*="Stop" i],' +
      'button[aria-label="Add files and more"], button[aria-label*="Add files" i],' +
      'form button[type="submit"]';

    const rankAnchor = (b) => {
      const al = (b.getAttribute('aria-label') || '').toLowerCase();
      if (/^send(\s+message)?$/.test(al) || (b.type === 'submit' && /send/.test(al))) return 4;
      if (/\bstop\b/.test(al)) return 4;
      if (/add files/.test(al)) return 2;
      return 1;
    };

    const findToolbar = () => {
      const prompt = AextDom.findPrompt();
      let cands = [];
      if (prompt) {
        let n = prompt;
        for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
          if (!n.querySelectorAll) continue;
          const found = Array.from(n.querySelectorAll(ANCHORS)).filter((b) => !AextDom.isOurs(b) && vis(b));
          if (found.length) { cands = found; break; }
        }
      }
      if (!cands.length) {
        cands = Array.from(document.querySelectorAll(ANCHORS)).filter((b) => !AextDom.isOurs(b) && vis(b));
      }
      let best = null;
      let bestRank = -1;
      let bestTop = -Infinity;
      for (let i = 0; i < cands.length; i++) {
        const b = cands[i];
        const r = b.getBoundingClientRect();
        const rk = rankAnchor(b);
        if (rk > bestRank || (rk === bestRank && r.top >= bestTop)) {
          best = b;
          bestRank = rk;
          bestTop = r.top;
        }
      }
      if (!best || !best.parentElement) return null;
      return { send: best, group: pickGroup(best) };
    };

    let btnEl = null;
    const ensureButton = () => {
      if (AextDom.pageHidden()) return;
      const t = findToolbar();
      let btn = document.getElementById(BTN_ID);
      if (t && t.group && t.group.isConnected) {
        if (btn && t.group.contains(btn) && vis(btn)) {
          btn.classList.remove('aext-fallback');
          btnEl = btn;
          return;
        }
      } else if (btn && btn.parentElement && !btn.classList.contains('aext-fallback') && vis(btn)) {
        btnEl = btn;
        return;
      }
      if (!btn && document.body) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BTN_ID;
        btn.setAttribute('aria-label', 'Arena Reimagined settings');
        btn.title = 'Arena Reimagined — settings';
        btn.innerHTML = ARENA_LOGO;
        btn.addEventListener('click', (e) => { e.stopPropagation(); openPanel(); });
      }
      if (!btn) return;
      if (t && t.group && t.group.isConnected) {
        btn.classList.remove('aext-fallback');
        try { t.group.insertBefore(btn, t.group.firstChild); } catch (_) { return; }
      } else if (!btn.isConnected && document.body) {
        btn.classList.add('aext-fallback');
        document.body.appendChild(btn);
      }
      btnEl = btn;
    };

    // document_start can run before <body> exists. Never let that disable this feature.
    const startObserver = () => {
      if (!document.body) return;
      AextDom.observeSparse(ensureButton, 360);
      ensureButton();
    };
    if (document.body) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    try { AextSettings.load(); } catch (e) { /* warm cache */ }

    AextDom.addStyle(`
      #arenakit-settings-panel .aext-sp-gear{width:22px;height:22px;flex:none;border:0;border-radius:6px;background:transparent;
        color:hsl(var(--text-muted));cursor:pointer;font-size:13px;line-height:1;padding:0;}
      #arenakit-settings-panel .aext-sp-gear:hover{background:hsl(var(--surface-tertiary));color:hsl(var(--text-primary));}
      #aext-opt-overlay{position:fixed;inset:0;z-index:2147483400;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;}
      #aext-opt-dlg{width:min(420px,94vw);max-height:84vh;overflow:auto;background:hsl(var(--surface-secondary));color:hsl(var(--text-primary));
        border:1px solid hsl(var(--border-medium));border-radius:14px;padding:16px 16px 12px;font:13px/1.4 ui-sans-serif,system-ui,sans-serif;
        box-shadow:0 20px 50px rgba(0,0,0,.4);}
      #aext-opt-dlg h3{margin:0 0 8px;font-size:14px;}
      #aext-opt-dlg .aext-opt-row{display:flex;gap:6px;margin:6px 0;align-items:flex-start;}
      #aext-opt-dlg input[type=text],#aext-opt-dlg textarea,#aext-opt-dlg input[type=number]{width:100%;padding:6px 8px;border-radius:8px;
        border:1px solid hsl(var(--border-medium));background:hsl(var(--surface-tertiary));color:hsl(var(--text-primary));font:12px/1.3 ui-sans-serif,system-ui,sans-serif;}
      #aext-opt-dlg textarea{min-height:52px;resize:vertical;}
      #aext-opt-dlg label{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:12.5px;}
      #aext-opt-dlg .aext-opt-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;}
      #aext-theme-docs{margin-top:10px;display:none;}
      #aext-theme-docs.open{display:block;}
      #aext-theme-docs pre{max-height:240px;overflow:auto;padding:10px;border-radius:10px;background:hsl(var(--surface-tertiary));
        border:1px solid hsl(var(--border-faint));font:10.5px/1.45 ui-monospace,monospace;white-space:pre-wrap;color:hsl(var(--text-primary));margin:0 0 8px;}
    `, 'arenakit-settings-extra-css');


    function closePanel() {
      const o = document.getElementById('arenakit-settings-overlay');
      if (o) o.remove();
    }
    window.AextSettingsPanel = { open: openPanel, close: closePanel };


    const AEXT_FEATURE_OPTS = {
      'follow-ups': 1,
      'finish-notify': 1,
      'long-input-txt': 1,
      'agent-quota': 1,
      'hide-email': 1
    };

    function openFeatureOpts(feat) {
      const old = document.getElementById('aext-opt-overlay');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'aext-opt-overlay';
      const dlg = document.createElement('div');
      dlg.id = 'aext-opt-dlg';
      const h = document.createElement('h3');
      h.textContent = feat.name + ' settings';
      dlg.appendChild(h);
      const opts = (AextSettings.optsOf && AextSettings.optsOf(feat.id)) || {};
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button'; saveBtn.className = 'aext-sp-btn primary'; saveBtn.textContent = 'Save';
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'aext-sp-btn'; cancel.textContent = 'Close';
      cancel.addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      if (feat.id === 'follow-ups') {
        const hint = document.createElement('p');
        hint.className = 'aext-sp-hint';
        hint.textContent = 'Your chips (up to 12). Label is the button; text is what gets sent.';
        dlg.appendChild(hint);
        const list = document.createElement('div');
        const chips = (opts.chips && opts.chips.length ? opts.chips : (typeof AEXT_FOLLOWUP_DEFAULTS !== 'undefined' ? AEXT_FOLLOWUP_DEFAULTS : [])).slice();
        const draw = () => {
          list.innerHTML = '';
          chips.forEach((c, i) => {
            const row = document.createElement('div');
            row.className = 'aext-opt-row';
            const lab = document.createElement('input'); lab.type = 'text'; lab.placeholder = 'Label'; lab.value = c.label || '';
            lab.addEventListener('input', () => { chips[i].label = lab.value; });
            const tx = document.createElement('textarea'); tx.placeholder = 'Prompt to send'; tx.value = c.text || '';
            tx.addEventListener('input', () => { chips[i].text = tx.value; });
            const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'aext-sp-btn'; rm.textContent = '✕';
            rm.addEventListener('click', () => { chips.splice(i, 1); draw(); });
            const col = document.createElement('div'); col.style.flex = '1'; col.appendChild(lab); col.appendChild(tx);
            row.appendChild(col); row.appendChild(rm); list.appendChild(row);
          });
        };
        draw();
        dlg.appendChild(list);
        const add = document.createElement('button');
        add.type = 'button'; add.className = 'aext-sp-btn'; add.textContent = 'Add chip';
        add.addEventListener('click', () => { if (chips.length >= 12) return; chips.push({ id: 'c' + Date.now(), label: 'New', text: '' }); draw(); });
        dlg.appendChild(add);
        const alwaysLab = document.createElement('label');
        const always = document.createElement('input'); always.type = 'checkbox'; always.checked = !!opts.showWhenEmpty;
        alwaysLab.appendChild(always);
        alwaysLab.appendChild(document.createTextNode(' Show chips even when the chat has not started yet'));
        dlg.appendChild(alwaysLab);
        saveBtn.addEventListener('click', async () => {
          await AextSettings.setOpts('follow-ups', {
            chips: chips.filter((c) => (c.label || c.text)),
            showWhenEmpty: !!always.checked
          });
          overlay.remove();
        });
      } else if (feat.id === 'finish-notify') {
        function mkCheck(key, label, defOn) {
          const lab = document.createElement('label');
          const ck = document.createElement('input'); ck.type = 'checkbox';
          ck.checked = opts[key] !== false;
          if (defOn === false) ck.checked = !!opts[key];
          lab.appendChild(ck); lab.appendChild(document.createTextNode(' ' + label));
          dlg.appendChild(lab);
          return ck;
        }
        const ckToast = mkCheck('toast', 'Show a toast when the agent finishes', true);
        const ckSound = mkCheck('sound', 'Play a sound when the agent finishes', true);
        const ckCount = mkCheck('counter', 'Count runs today (shown on the toast)', true);
        saveBtn.addEventListener('click', async () => {
          await AextSettings.setOpts('finish-notify', {
            toast: !!ckToast.checked,
            sound: !!ckSound.checked,
            counter: !!ckCount.checked
          });
          overlay.remove();
        });
      } else if (feat.id === 'long-input-txt') {
        const lab = document.createElement('label');
        lab.textContent = 'Offer .txt after this many characters';
        const num = document.createElement('input'); num.type = 'number'; num.min = '500'; num.max = '20000'; num.step = '100';
        num.value = String(opts.limit || 3000);
        dlg.appendChild(lab); dlg.appendChild(num);
        saveBtn.addEventListener('click', async () => {
          const n = Math.max(500, Math.min(20000, parseInt(num.value, 10) || 3000));
          await AextSettings.setOpts('long-input-txt', { limit: n });
          overlay.remove();
        });
      } else if (feat.id === 'agent-quota') {
        const lab = document.createElement('label');
        lab.textContent = 'Daily send cap to display (local counter)';
        const num = document.createElement('input'); num.type = 'number'; num.min = '1'; num.max = '999';
        num.value = String(opts.limit || 100);
        dlg.appendChild(lab); dlg.appendChild(num);
        saveBtn.addEventListener('click', async () => {
          const n = Math.max(1, Math.min(999, parseInt(num.value, 10) || 100));
          await AextSettings.setOpts('agent-quota', { limit: n });
          overlay.remove();
        });
      } else if (feat.id === 'hide-email') {
        const hint = document.createElement('p');
        hint.className = 'aext-sp-hint';
        hint.textContent = 'Blank = password dots (••••••••••). Or type a fake address for screenshots.';
        dlg.appendChild(hint);
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = '••••••••••';
        inp.value = String(opts.text || '');
        inp.maxLength = 80;
        dlg.appendChild(inp);
        saveBtn.addEventListener('click', async () => {
          await AextSettings.setOpts('hide-email', { text: String(inp.value || '').trim().slice(0, 80) });
          overlay.remove();
        });
      }
      const actions = document.createElement('div');
      actions.className = 'aext-opt-actions';
      actions.appendChild(cancel); actions.appendChild(saveBtn);
      dlg.appendChild(actions);
      overlay.appendChild(dlg);
      document.body.appendChild(overlay);
    }

    async function openPanel() {
      if (document.getElementById('arenakit-settings-overlay')) return;
      const settings = await AextSettings.load();
      const status = (window.AextRuntime && AextRuntime.getStatus()) || {};

      const overlay = document.createElement('div');
      overlay.id = 'arenakit-settings-overlay';

      const panel = document.createElement('div');
      panel.id = 'arenakit-settings-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');

      /* ---- header ---- */
      const head = document.createElement('div');
      head.className = 'aext-sp-head';
      head.innerHTML =
        '<div class="aext-sp-brand">\u{1F3A8}</div>' +
        '<div class="aext-sp-title"><b>' + ((AEXT_META && AEXT_META.name) || 'Arena Reimagined') + ' <span style="font-weight:600;color:hsl(var(--text-tertiary));font-size:11px">v' + (AEXT_META && AEXT_META.version) + '</span></b>' +
        '<span>' + (AEXT_META && AEXT_META.tagline) + '</span></div>';
      const close = document.createElement('button');
      close.className = 'aext-sp-close';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '\u2715';
      close.addEventListener('click', closePanel);
      head.appendChild(close);
      panel.appendChild(head);

      /* ---- tabs ---- */
      const tabs = document.createElement('div');
      tabs.className = 'aext-sp-tabs';
      const views = {};
      const TAB_DEFS = [
        { id: 'theme', label: 'Theme', icon: '\u{1F3A8}' },
        { id: 'features', label: 'Features', icon: '\u{1F4E1}' },
        { id: 'more', label: 'More', icon: '\u{2699}' }
      ];
      const tabEls = {};
      for (const d of TAB_DEFS) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'aext-sp-tab';
        t.dataset.tab = d.id;
        t.textContent = d.label;
        tabEls[d.id] = t;
        t.addEventListener('click', () => showTab(d.id));
        tabs.appendChild(t);
      }
      panel.appendChild(tabs);

      const showTab = (id) => {
        for (const k of Object.keys(tabEls)) tabEls[k].classList.toggle('is-active', k === id);
        for (const k of Object.keys(views)) views[k].classList.toggle('is-active', k === id);
      };

      /* ================= THEME VIEW ================= */
      const themeView = document.createElement('div');
      themeView.className = 'aext-sp-view';
      views.theme = themeView;

      const mkThemes = (activeId) => {
        const grid = document.createElement('div');
        grid.className = 'aext-sp-themes';
        const all = AextGetAllThemes();
        for (const t of Object.values(all)) {
          if (!t || !t.id || !t.label) continue;
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'aext-sp-theme' + (t.id === activeId ? ' is-active' : '');
          const sw = document.createElement('span'); sw.className = 'aext-sp-swatch';
          sw.style.background = (AextThemeIO.safeSwatch ? AextThemeIO.safeSwatch(t.swatch) : t.swatch);
          const name = document.createElement('span'); name.className = 'aext-sp-name'; name.textContent = t.label;
          const check = document.createElement('span'); check.className = 'aext-sp-check'; check.textContent = t.id === activeId ? '\u2713' : '';
          card.appendChild(sw); card.appendChild(name); card.appendChild(check);
          // delete only custom (imported) themes
          const isCustom = String(t.id).indexOf('custom-') === 0;
          if (isCustom) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'aext-sp-del';
            del.title = 'Delete ' + t.label;
            del.setAttribute('aria-label', 'Delete ' + t.label);
            del.textContent = '\u2715';
            del.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!confirm('Delete the custom theme "' + t.label + '"?')) return;
              await AextTheme.removeCustom(t.id);
              const top = themeView.querySelector('.aext-sp-themes');
              if (top) { const fresh = mkThemes(AextTheme.current || 'default'); top.replaceWith(fresh); }
            });
            card.appendChild(del);
          }
          card.addEventListener('click', async () => {
            AextTheme.apply(t.id);
            try { await AextSettings.setTheme(t.id); } catch (e) { /* persist optional */ }
            const top = themeView.querySelector('.aext-sp-themes');
            if (top) { const fresh = mkThemes(t.id); top.replaceWith(fresh); }
          });
          grid.appendChild(card);
        }
        return grid;
      };
      themeView.appendChild(mkThemes(settings.theme));

      const hint = document.createElement('p');
      hint.className = 'aext-sp-hint';
      hint.textContent = 'Import a theme, or ask an AI to write one. Only import JSON you trust — a theme restyles arena.ai in this browser.';
      themeView.appendChild(hint);

      /* theme actions: Export current, Import */
      const actions = document.createElement('div');
      actions.className = 'aext-sp-theme-actions';
      const exportBtn = document.createElement('button');
      exportBtn.type = 'button'; exportBtn.className = 'aext-sp-btn';
      exportBtn.textContent = 'Export current theme';
      exportBtn.addEventListener('click', () => {
        const cur = AextGetAllThemes()[AextTheme.current] || AextGetAllThemes()[settings.theme] || AextGetAllThemes().default;
        const json = AextThemeIO.serialize(cur);
        const blob = new Blob([json], { type: 'application/json' });
        AextZip.download(blob, 'arenakit-theme-' + cur.id + '.json');
      });
      const importBtn = document.createElement('button');
      importBtn.type = 'button'; importBtn.className = 'aext-sp-btn primary';
      importBtn.textContent = 'Import theme\u2026';
      const docsBtn = document.createElement('button');
      docsBtn.type = 'button'; docsBtn.className = 'aext-sp-btn';
      docsBtn.textContent = 'Theme docs';
      docsBtn.title = 'All theme keys — copy and send to an AI';
      actions.appendChild(exportBtn);
      actions.appendChild(importBtn);
      actions.appendChild(docsBtn);
      themeView.appendChild(actions);
      const docsBox = document.createElement('div');
      docsBox.id = 'aext-theme-docs';
      const docsPre = document.createElement('pre');
      docsPre.textContent = (AextThemeIO.specText && AextThemeIO.specText()) || '';
      const copyDocs = document.createElement('button');
      copyDocs.type = 'button'; copyDocs.className = 'aext-sp-btn primary';
      copyDocs.textContent = 'Copy spec for AI';
      copyDocs.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(docsPre.textContent); copyDocs.textContent = 'Copied'; }
        catch (e) { copyDocs.textContent = 'Copy failed'; }
      });
      docsBox.appendChild(docsPre); docsBox.appendChild(copyDocs);
      docsBtn.addEventListener('click', () => docsBox.classList.toggle('open'));
      themeView.appendChild(docsBox);

      /* import box (paste) */
      const importBox = document.createElement('div');
      importBox.className = 'aext-sp-import';
      const ta = document.createElement('textarea');
      ta.placeholder = 'Paste a theme JSON here, or click Use a file\u2026';
      const ibtns = document.createElement('div');
      ibtns.className = 'aext-sp-import-btns';
      const fileBtn = document.createElement('button');
      fileBtn.type = 'button'; fileBtn.className = 'aext-sp-btn';
      fileBtn.textContent = 'Use a file\u2026';
      const doImportBtn = document.createElement('button');
      doImportBtn.type = 'button'; doImportBtn.className = 'aext-sp-btn primary';
      doImportBtn.textContent = 'Import & apply';
      const errEl = document.createElement('div');
      errEl.className = 'aext-sp-err';
      ibtns.appendChild(fileBtn); ibtns.appendChild(doImportBtn);
      importBox.appendChild(ta); importBox.appendChild(ibtns); importBox.appendChild(errEl);

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';
      fileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        ta.value = await f.text();
        doImport();
      });
      const doImport = async () => {
        errEl.textContent = '';
        try {
          const theme = AextThemeIO.parse(ta.value);
          await (AextTheme.registerCustom ? AextTheme.registerCustom(theme) : AextThemeIO.adopt(theme));
          importBox.classList.remove('open');
          ta.value = '';
          const top = themeView.querySelector('.aext-sp-themes');
          if (top) { const fresh = mkThemes(theme.id); top.replaceWith(fresh); }
        } catch (e) { errEl.textContent = e.message; }
      };
      doImportBtn.addEventListener('click', doImport);
      importBox.appendChild(fileInput);
      importBtn.addEventListener('click', () => importBox.classList.toggle('open'));
      themeView.appendChild(importBox);
      panel.appendChild(themeView);

      /* ================= FEATURES VIEW ================= */
      const featView = document.createElement('div');
      featView.className = 'aext-sp-view';
      views.features = featView;

      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'aext-sp-search';
      search.placeholder = 'Search features…';
      search.setAttribute('aria-label', 'Search features');
      featView.appendChild(search);

      const groups = {};
      for (const f of AEXT_FEATURES) {
        const g = f.cat && AEXT_FEATURE_GROUPS[f.cat] ? f.cat : 'chat';
        if (!groups[g]) groups[g] = [];
        groups[g].push(f);
      }
      const order = (g) => (AEXT_FEATURE_GROUPS[g] ? AEXT_FEATURE_GROUPS[g].order : 99);
      const groupEls = [];
      for (const g of Object.keys(groups).sort((a, b) => order(a) - order(b))) {
        const sec = document.createElement('details');
        sec.className = 'aext-sp-sec';
        sec.open = true;
        const h3 = document.createElement('summary');
        h3.className = 'aext-sp-h3';
        const title = document.createElement('span');
        title.textContent = AEXT_FEATURE_GROUPS[g] ? AEXT_FEATURE_GROUPS[g].title : 'Features';
        h3.appendChild(title);
        sec.appendChild(h3);
        const rows = [];
        for (const f of groups[g]) {
          const on = settings.features[f.id] !== false;
          const row = document.createElement('div');
          row.className = 'aext-sp-row';
          row.dataset.aextQ = (f.name + ' ' + f.desc + ' ' + f.id).toLowerCase();
          row.innerHTML = '<span class="aext-sp-ic"></span><span class="aext-sp-info"><b></b><span></span></span>';
          row.querySelector('.aext-sp-ic').textContent = f.icon;
          row.querySelector('.aext-sp-info b').textContent = f.name;
          row.querySelector('.aext-sp-info span').textContent = f.desc;
          const sw = document.createElement('input');
          sw.type = 'checkbox'; sw.className = 'aext-sp-switch'; sw.checked = on;
          sw.setAttribute('aria-label', f.name);
          const st = status[f.id];
          if (st && st.ok === false) { sw.disabled = true; row.style.opacity = '.55'; }
          sw.addEventListener('change', async () => {
            if (window.AextRuntime && typeof AextRuntime.setFeatureEnabled === 'function') {
              await AextRuntime.setFeatureEnabled(f.id, sw.checked);
            }
            await AextSettings.setFeature(f.id, sw.checked);
          });
          if (AEXT_FEATURE_OPTS[f.id]) {
            const gear = document.createElement('button');
            gear.type = 'button';
            gear.className = 'aext-sp-gear';
            gear.title = 'Customize ' + f.name;
            gear.setAttribute('aria-label', 'Customize ' + f.name);
            gear.textContent = '\u2699';
            gear.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openFeatureOpts(f); });
            row.appendChild(gear);
          }
          row.appendChild(sw);
          sec.appendChild(row);
          rows.push(row);
        }
        featView.appendChild(sec);
        groupEls.push({ sec: sec, rows: rows });
      }
      const empty = document.createElement('p');
      empty.className = 'aext-sp-empty';
      empty.hidden = true;
      empty.textContent = 'No features match that search.';
      featView.appendChild(empty);
      const discordFeat = document.createElement('p');
      discordFeat.className = 'aext-sp-discord';
      discordFeat.innerHTML = 'Want a feature that isn\'t here? Contact <b>zecayy</b> on Discord.';
      featView.appendChild(discordFeat);

      const applyFilter = () => {
        const q = (search.value || '').trim().toLowerCase();
        let any = false;
        for (const g of groupEls) {
          let vis = 0;
          for (const row of g.rows) {
            const hit = !q || row.dataset.aextQ.indexOf(q) !== -1;
            row.hidden = !hit;
            if (hit) vis++;
          }
          g.sec.hidden = vis === 0;
          if (q && vis) g.sec.open = true;
          if (vis) any = true;
        }
        empty.hidden = any;
      };
      search.addEventListener('input', applyFilter);
      panel.appendChild(featView);

      /* ================= MORE VIEW ================= */
      const moreView = document.createElement('div');
      moreView.className = 'aext-sp-view';
      views.more = moreView;

      // run tracker
      const runSec = document.createElement('div');
      runSec.className = 'aext-sp-sec';
      runSec.innerHTML = '<h3 class="aext-sp-h3">Run tracker</h3><p class="aext-sp-hint" id="aext-runs-line">Counting\u2026</p>';
      moreView.appendChild(runSec);
      (async () => {
        try {
          const o = await chrome.storage.local.get('arenakit.runs');
          const r = o['arenakit.runs'] || {};
          const line = runSec.querySelector('#aext-runs-line');
          if (line) line.textContent = r.count ? ('\u26A1 ' + r.count + ' run' + (r.count === 1 ? '' : 's') + ' today') : 'No runs counted yet today.';
        } catch (e) { /* ignore */ }
      })();

      // health
      const health = document.createElement('div');
      health.className = 'aext-sp-health';
      const dot = document.createElement('span');
      dot.className = 'aext-sp-dot';
      const bad = Object.values(status).filter((s) => s && s.ok === false);
      if (bad.length) dot.classList.add('bad');
      health.appendChild(dot);
      health.appendChild(document.createTextNode(
        bad.length ? bad.length + ' feature(s) failed' : 'All features running'
      ));
      moreView.appendChild(health);

      // footer action: reset (the "open full settings" link was removed)
      const foot = document.createElement('div');
      foot.className = 'aext-sp-foot';
      const reset = document.createElement('button');
      reset.type = 'button'; reset.className = 'aext-sp-reset';
      reset.textContent = 'Reset all settings';
      reset.addEventListener('click', async () => {
        if (!confirm('Reset all Arena Reimagined settings to defaults?')) return;
        await AextSettings.reset();
        AextTheme.apply('default');
        closePanel();
      });
      foot.appendChild(reset);
      moreView.appendChild(foot);
      const discordMore = document.createElement('p');
      discordMore.className = 'aext-sp-discord';
      discordMore.innerHTML = 'Want a feature that isn\'t here? Contact <b>zecayy</b> on Discord.';
      moreView.appendChild(discordMore);
      panel.appendChild(moreView);

      /* ---- mount + default tab ---- */
      overlay.appendChild(panel);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { closePanel(); document.removeEventListener('keydown', esc); }
      });
      document.body.appendChild(overlay);
      showTab('theme');
    }

    return true;
  }
};
