'use strict';
/* ArenaKit — filter the Agent workspace file tree by name.
   The bar lives in the workspace column only (never the page scroller).
   Hiding is limited to folder/file rows inside that column. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['workspace-search'] = {
  id: 'workspace-search',
  label: 'Workspace file search',
  init(ctx) {
    const live = () => !window.AextRuntime || AextRuntime.isEnabled('workspace-search');
    let box = null;
    let input = null;
    let countEl = null;
    let toggleBtn = null;
    let filterTimer = 0;
    let q = '';
    let host = null;
    let allOpen = false;

    AextDom.addStyle(`
      #aext-ws-search{position:sticky;top:0;z-index:8;display:flex;align-items:center;gap:5px;
        width:100%;max-width:100%;box-sizing:border-box;
        padding:6px 8px 7px;margin:0;background:hsl(var(--surface-secondary));
        border-bottom:1px solid hsl(var(--border-faint));}
      #aext-ws-search input{flex:1;min-width:0;height:26px;padding:0 8px;border-radius:8px;
        border:1px solid hsl(var(--border-medium));background:hsl(var(--surface-tertiary));
        color:hsl(var(--text-primary));font:12px/1.2 ui-sans-serif,system-ui,sans-serif;}
      #aext-ws-search input::placeholder{color:hsl(var(--text-muted));}
      #aext-ws-search .aext-ws-count{flex:none;font:600 10px/1 ui-sans-serif,system-ui,sans-serif;
        color:hsl(var(--text-tertiary));min-width:1.2em;text-align:right;}
      #aext-ws-search button{flex:none;height:26px;padding:0 7px;border-radius:8px;cursor:pointer;
        border:1px solid hsl(var(--border-medium));background:hsl(var(--surface-raised));
        color:hsl(var(--text-primary));font:600 10px/1 ui-sans-serif,system-ui,sans-serif;}
      #aext-ws-search button:hover{background:hsl(var(--surface-tertiary));}
      .aext-ws-hide{display:none!important;}
      html.aext-off-workspace-search #aext-ws-search,
      html.aext-off-workspace-search .aext-ws-hide{display:none!important;}
    `, 'arenakit-ws-search-css');

    function isFolderBtn(el) {
      if (!el || el.nodeType !== 1 || el.tagName !== 'BUTTON') return false;
      if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #aext-ws-search, .editor-content, .tiptap')) return false;
      const label = el.getAttribute('aria-label') || '';
      if (!/folder/i.test(label)) return false;
      return el.hasAttribute('aria-expanded') || /^(Expand|Collapse)\b/i.test(label);
    }

    function isFileRow(el) {
      if (!el || el.nodeType !== 1) return false;
      if (el === host) return false;
      if (isFolderBtn(el)) return false;
      if (el.closest && el.closest('#aext-ws-search, .editor-content, .tiptap')) return false;
      /* Never treat a folder/column wrapper as a file — querySelector on
         ancestors matched the whole tree, so a 4+ letter miss hid everything. */
      if (el.querySelector && el.querySelector('button[aria-expanded][aria-label*="folder" i]')) return false;
      const label = (el.getAttribute('aria-label') || '').trim();
      if (/\bfile$/i.test(label) && !/folder/i.test(label)) return true;
      return false;
    }

    function folderName(btn) {
      const label = (btn.getAttribute('aria-label') || '').trim();
      const m = /^(?:Expand|Collapse)\s+(.+?)\s+folder$/i.exec(label);
      if (m) return m[1].trim();
      const span = btn.querySelector('span');
      return (span && span.textContent.trim()) || label || '';
    }

    function fileName(el) {
      const label = (el.getAttribute('aria-label') || '').trim();
      const m = /^(.*?)\s+file$/i.exec(label);
      if (m) return m[1].trim();
      const a = el.querySelector && el.querySelector('a[download]');
      if (a && a.getAttribute('download')) return a.getAttribute('download');
      const span = el.querySelector && el.querySelector('span.truncate, span.body-sm, span');
      return (span && span.textContent.trim()) || '';
    }

    function firstFolder() {
      const nodes = document.querySelectorAll('button[aria-expanded][aria-label*="folder" i]');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #aext-ws-search, .editor-content')) continue;
        return el;
      }
      return null;
    }

    /* Workspace column only — never main / the page scroller. */
    function findHost() {
      const btn = firstFolder();
      if (!btn) return findWorkspaceCard();
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) || 1200;
      let n = btn.parentElement;
      let slim = null;
      let overflowCol = null;
      while (n && n !== document.body && n !== document.documentElement) {
        const tag = (n.tagName || '').toUpperCase();
        if (tag === 'MAIN' || tag === 'HTML' || tag === 'BODY' || n.id === '__next' || n.id === 'root') {
          n = n.parentElement;
          continue;
        }
        let r;
        try { r = n.getBoundingClientRect(); } catch (e) { n = n.parentElement; continue; }
        const wide = r.width > Math.min(480, vw * 0.42);
        if (!wide && r.width >= 160 && r.height >= 80) {
          if (!slim) slim = n;
          try {
            const s = getComputedStyle(n);
            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && !overflowCol) overflowCol = n;
          } catch (e) { /* ignore */ }
        }
        n = n.parentElement;
      }
      if (overflowCol || slim) return overflowCol || slim;
      return findWorkspaceCard();
    }

    function findWorkspaceCard() {
      const skipSel = '#arenakit-settings-panel, #arenakit-settings-overlay, #aext-ws-search, .editor-content, .tiptap';
      const nodes = document.querySelectorAll('h1, h2, h3, h4, span, p, div, button');
      let heading = null;
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.closest && el.closest(skipSel)) continue;
        let text = '';
        for (let c = el.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 3) text += c.nodeValue;
        }
        if (/^\s*Workspace\s*$/.test(text)) { heading = el; break; }
      }
      if (!heading) return null;
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) || 1200;
      const maxW = Math.min(480, vw * 0.42);
      let n = heading.parentElement;
      while (n && n !== document.body && n !== document.documentElement) {
        const tag = (n.tagName || '').toUpperCase();
        if (tag === 'MAIN' || tag === 'HTML' || tag === 'BODY' || n.id === '__next' || n.id === 'root') break;
        let r;
        try { r = n.getBoundingClientRect(); } catch (e) { n = n.parentElement; continue; }
        if (r.width >= 160 && r.width <= maxW && r.height >= 80) return n;
        n = n.parentElement;
      }
      return null;
    }

    function isWorkspaceTitle(el) {
      if (!el || el.id === 'aext-ws-search') return false;
      let text = '';
      for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) text += c.nodeValue;
      }
      return /^\s*Workspace\s*$/.test(text);
    }

    function placeBox(tree) {
      if (!box || !tree) return;
      let after = null;
      const kids = tree.children;
      for (let i = 0; i < kids.length; i++) {
        if (kids[i] === box) continue;
        if (isWorkspaceTitle(kids[i])) { after = kids[i]; break; }
      }
      if (after) {
        if (box.parentElement === tree && box.previousElementSibling === after) return;
        tree.insertBefore(box, after.nextSibling);
        return;
      }
      if (box.parentElement === tree && tree.firstElementChild === box) return;
      tree.insertBefore(box, tree.firstChild);
    }

    function ensureBox(tree) {
      if (!tree) return null;
      if (box && box.isConnected && tree.contains(box)) return box;
      box = document.getElementById('aext-ws-search');
      if (box && tree.contains(box)) {
        input = box.querySelector('input');
        countEl = box.querySelector('.aext-ws-count');
        toggleBtn = box.querySelector('button');
        syncToggle(tree);
        return box;
      }
      if (box && box.remove) box.remove();
      box = document.createElement('div');
      box.id = 'aext-ws-search';
      input = document.createElement('input');
      input.type = 'search';
      input.placeholder = 'Filter files…';
      input.setAttribute('aria-label', 'Filter workspace files');
      input.addEventListener('input', () => {
        q = input.value || '';
        clearTimeout(filterTimer);
        filterTimer = setTimeout(applyFilter, 80);
      });
      toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.addEventListener('click', () => {
        const t = host || findHost();
        if (allOpen) collapseAll(t);
        else expandAll(t);
      });
      countEl = document.createElement('span');
      countEl.className = 'aext-ws-count';
      box.appendChild(input);
      box.appendChild(toggleBtn);
      box.appendChild(countEl);
      syncToggle(tree);
      placeBox(tree);
      return box;
    }

    function setHidden(el, hidden, tree) {
      if (!el || !tree || !tree.contains(el)) return;
      if (el.id === 'aext-ws-search' || (el.closest && el.closest('#aext-ws-search'))) return;
      if (el === tree || el === document.body || el === document.documentElement) return;
      if (hidden) {
        try {
          const r = el.getBoundingClientRect();
          if (r.width > 420 || r.height > 80) return;
        } catch (e) { return; }
        if (el.querySelector && el.querySelector('button[aria-expanded][aria-label*="folder" i]')) return;
      }
      el.classList.toggle('aext-ws-hide', !!hidden);
    }

    function collectFiles(tree) {
      const out = [];
      const seen = new Set();
      const add = (el) => {
        if (!el || el === tree || seen.has(el)) return;
        if (el.id === 'aext-ws-search' || (el.closest && el.closest('#aext-ws-search'))) return;
        if (el.querySelector && el.querySelector('button[aria-expanded][aria-label*="folder" i]')) return;
        seen.add(el);
        out.push(el);
      };
      tree.querySelectorAll('[aria-label]').forEach((el) => {
        const label = (el.getAttribute('aria-label') || '').trim();
        if (/\bfile$/i.test(label) && !/folder/i.test(label) && !isFolderBtn(el)) add(el);
      });
      tree.querySelectorAll('a[href*="/api/chat/workspace/"][download]').forEach((a) => {
        let row = a.closest('[aria-label]') || a.parentElement;
        if (row && row.querySelector && row.querySelector('button[aria-expanded][aria-label*="folder" i]')) {
          row = a.parentElement;
        }
        add(row);
      });
      return out;
    }

    function applyFilter() {
      if (!live()) { clearFilter(); return; }
      const tree = findHost();
      host = tree;
      if (!tree) return;
      ensureBox(tree);
      const query = (q || '').trim().toLowerCase();
      const folders = Array.from(tree.querySelectorAll('button[aria-expanded][aria-label*="folder" i]'))
        .filter((el) => !el.closest('#aext-ws-search'));
      const files = collectFiles(tree);
      if (!query) {
        folders.forEach((el) => setHidden(el, false, tree));
        files.forEach((el) => setHidden(el, false, tree));
        if (countEl) countEl.textContent = '';
        return;
      }
      const keep = new Set();
      let hits = 0;
      files.forEach((el) => {
        const name = fileName(el).toLowerCase();
        if (name.indexOf(query) !== -1) {
          keep.add(el);
          hits++;
          let p = el.parentElement;
          for (let i = 0; i < 12 && p && p !== tree; i++, p = p.parentElement) {
            if (isFolderBtn(p)) keep.add(p);
            const inner = p.querySelector && p.querySelector('button[aria-expanded][aria-label*="folder" i]');
            if (inner && isFolderBtn(inner)) keep.add(inner);
          }
        }
      });
      folders.forEach((el) => {
        const name = folderName(el).toLowerCase();
        if (name.indexOf(query) !== -1) keep.add(el);
      });
      files.forEach((el) => setHidden(el, !keep.has(el), tree));
      folders.forEach((el) => setHidden(el, !keep.has(el), tree));
      if (countEl) countEl.textContent = String(hits);
    }

    function clearFilter() {
      document.querySelectorAll('.aext-ws-hide').forEach((el) => el.classList.remove('aext-ws-hide'));
      if (countEl) countEl.textContent = '';
    }

    function syncToggle(tree) {
      const root = tree || host;
      allOpen = !!(root && root.querySelector('button[aria-expanded="true"][aria-label*="folder" i]'));
      if (!toggleBtn) return;
      toggleBtn.textContent = allOpen ? 'Collapse' : 'Expand';
      toggleBtn.title = allOpen
        ? 'Collapse all folders'
        : 'Expand folders so nested files can be filtered';
    }

    async function expandAll(tree) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const seen = new WeakSet();
      const root = tree || host;
      if (!root) return;
      for (let round = 0; round < 10; round++) {
        if (!live()) return;
        const btns = Array.from(root.querySelectorAll('button[aria-expanded="false"][aria-label*="folder" i]'));
        let n = 0;
        for (const b of btns) {
          if (seen.has(b)) continue;
          seen.add(b);
          try { b.click(); n++; } catch (e) { /* ignore */ }
          if (n >= 16) break;
        }
        if (!n) break;
        await sleep(70);
      }
      syncToggle(root);
      applyFilter();
    }

    async function collapseAll(tree) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const root = tree || host;
      if (!root) return;
      for (let round = 0; round < 10; round++) {
        if (!live()) return;
        const btns = Array.from(root.querySelectorAll('button[aria-expanded="true"][aria-label*="folder" i]'));
        if (!btns.length) break;
        for (let i = btns.length - 1; i >= 0; i--) {
          try { btns[i].click(); } catch (e) { /* ignore */ }
        }
        await sleep(50);
      }
      syncToggle(root);
      applyFilter();
    }

    function mount() {
      if (!live()) {
        if (box && box.remove) box.remove();
        clearFilter();
        return;
      }
      const tree = findHost();
      host = tree;
      if (!tree) return;
      ensureBox(tree);
      syncToggle(tree);
      if (q) applyFilter();
    }

    AextDom.observeSparse(mount, 400);
    if (document.body) AextDom.later(mount, 500);
    else document.addEventListener('DOMContentLoaded', () => AextDom.later(mount, 500), { once: true });

    this.setEnabled = (on) => {
      if (on) mount();
      else {
        if (box && box.remove) box.remove();
        box = null;
        clearFilter();
      }
    };
    ctx.log('ready');
    return true;
  }
};
