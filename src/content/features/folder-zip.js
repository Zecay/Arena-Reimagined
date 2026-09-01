'use strict';
/* ArenaKit — hover "download as ZIP" on workspace FOLDER rows (Downloadable Folders).
   Walk one level at a time: expand this folder, take its direct files + nested
   folder buttons, recurse. Expanding everything first then scraping file links
   missed nested-only trees ("No readable files"). Same-level next tree-item is
   a sibling, never children of the previous folder. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

(function () {
  let scan = () => {};

      const SPIN_ICON =
        '<svg class="aext-zip-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="42 18"></circle>' +
        '</svg>';
      const DL_ICON =
    '<svg width="1.5em" height="1.5em" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor" aria-hidden="true">' +
    '<path d="M6 20L18 20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>' +
    '<path d="M12 4V16M12 16L15.5 12.5M12 16L8.5 12.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>' +
    '</svg>';

  window.__AEXT_FEATURES__['folder-zip'] = {
    id: 'folder-zip',
    label: 'Download folders as ZIP',
    init(ctx) {
      AextDom.addStyle(`
        /* React wipes injected nodes. Draw the icon with ::after and shrink
           the name so it stays inside the overflow-y-auto tree. */
        button[aria-expanded][aria-label*="folder" i]{
          padding-right:8px!important;
        }
        button[aria-expanded][aria-label*="folder" i] > span.truncate,
        button[aria-expanded][aria-label*="folder" i] > span.body-base,
        button[aria-expanded][aria-label*="folder" i] > span.body-sm{
          min-width:0!important;flex:1 1 0%!important;overflow:hidden!important;text-overflow:ellipsis!important;
        }
        button[aria-expanded][aria-label*="folder" i]::after{
          content:"";flex:none;width:16px;height:16px;margin-left:6px;
          background:center/14px 14px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 20h12'/%3E%3Cpath d='M12 4v12m0 0l3.5-3.5M12 16L8.5 12.5'/%3E%3C/svg%3E");
          opacity:0;pointer-events:none;transition:opacity .12s;
        }
        button[aria-expanded][aria-label*="folder" i]:hover::after,
        button[aria-expanded][aria-label*="folder" i]:focus-within::after{opacity:.9;}
        button.aext-zip-busy::after{
          opacity:1!important;background:none!important;border:2px solid hsl(var(--border-medium));
          border-top-color:hsl(var(--text-primary));border-radius:50%;
          animation:aext-spin .7s linear infinite;
        }
        @keyframes aext-spin{to{transform:rotate(360deg)}}
        html.aext-off-folder-zip button[aria-expanded][aria-label*="folder" i]::after{display:none!important;}
        #aext-zip-progress{position:fixed;right:16px;bottom:16px;z-index:2147483600;min-width:180px;max-width:280px;
          background:hsl(var(--surface-secondary));color:hsl(var(--text-primary));border:1px solid hsl(var(--border-medium));
          border-radius:12px;padding:10px 12px;font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif;
          box-shadow:0 12px 32px rgba(0,0,0,.28);}
        #aext-zip-progress b{display:block;font-weight:600;margin-bottom:6px;}
        #aext-zip-progress i{display:block;height:4px;border-radius:99px;background:hsl(var(--border-faint));overflow:hidden;}
        #aext-zip-progress i em{display:block;height:100%;width:0;background:hsl(var(--interactive-link));border-radius:99px;transition:width .15s;}
        html.aext-off-folder-zip #aext-zip-progress{display:none!important;}
      `, 'arenakit-zip-css');

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const live = () => !window.AextRuntime || AextRuntime.isEnabled('folder-zip');

      function padLeft(el) {
        if (!el) return 0;
        const inline = el.style && el.style.paddingLeft;
        if (inline) {
          const n = parseFloat(inline);
          if (!isNaN(n)) return n;
        }
        try { return parseFloat(getComputedStyle(el).paddingLeft) || 0; } catch (e) { return 0; }
      }

      function folderName(btn) {
        const label = (btn.getAttribute('aria-label') || '').trim();
        const m = /^(?:Expand|Collapse)\s+(.+?)\s+folder$/i.exec(label);
        if (m) return m[1].trim();
        const span = btn.querySelector('span:not(.aext-folder-zip)');
        const t = span && (span.textContent || '').trim();
        return t || 'folder';
      }

      function isFolderBtn(el) {
        if (!el || el.nodeType !== 1 || el.tagName !== 'BUTTON') return false;
        if (el.closest('#arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn')) return false;
        const label = el.getAttribute('aria-label') || '';
        if (!/folder/i.test(label)) return false;
        return el.hasAttribute('aria-expanded') || /^(Expand|Collapse)\b/i.test(label);
      }

      function isFileRow(el) {
        if (!el || el.nodeType !== 1) return false;
        if (isFolderBtn(el)) return false;
        const label = (el.getAttribute('aria-label') || '').trim();
        if (/\bfile$/i.test(label)) return true;
        if (el.querySelector && el.querySelector('a[href*="/api/chat/workspace/"][download], a[aria-label^="Download "], button[aria-label^="Copy file name"]')) return true;
        return false;
      }

      function workspaceHref(a) {
        if (!a) return '';
        const href = a.getAttribute('href') || a.href || '';
        if (/\/api\/chat\/workspace\//.test(href)) return a.href || href;
        if (a.hasAttribute('download') && href && href !== '#') return a.href || href;
        return '';
      }

      function revealLink(el) {
        /* Links are already in the DOM — don't hover-reveal (that was slow). */
        if (!el || !el.querySelector) return null;
        const a = el.querySelector('a[href*="/api/chat/workspace/"][download], a[aria-label^="Download "], a[download]');
        return a && workspaceHref(a) ? a : a;
      }

      function cleanName(s) {
        return String(s || '')
          .replace(/^\uFEFF/, '')
          .replace(/[/\\]+/g, '_')
          .replace(/[\u0000-\u001f\u007f]/g, '')
          .replace(/[<>:"|?*]+/g, '_')
          .replace(/^\.+$/, 'file')
          .trim()
          .slice(0, 180) || 'file';
      }

      function fileMeta(el) {
        const a = revealLink(el);
        let name = (a && a.getAttribute('download')) || '';
        if (!name && a) {
          const al = a.getAttribute('aria-label') || '';
          const m = /^Download\s+(.+)$/i.exec(al);
          if (m) name = m[1];
        }
        if (!name) {
          const label = (el.getAttribute('aria-label') || '').trim();
          const m = /^(.*?)\s+file$/i.exec(label);
          name = (m && m[1]) || '';
        }
        if (!name) {
          const span = el.querySelector && el.querySelector('span:not(.aext-folder-zip)');
          name = (span && span.textContent.trim()) || 'file';
        }
        return { name: cleanName(name), href: workspaceHref(a) };
      }

      function safePath(p) {
        return String(p || '')
          .replace(/\\/g, '/')
          .split('/')
          .map((s) => s.trim())
          .filter((s) => s && s !== '.' && s !== '..')
          .join('/') || 'file';
      }

      function firstRow(node) {
        if (!node || node.nodeType !== 1) return null;
        if (isFolderBtn(node) || isFileRow(node)) return node;
        for (const ch of node.children) {
          const r = firstRow(ch);
          if (r) return r;
        }
        return null;
      }

      function looksLikeTree(node) {
        return !!(node && node.querySelector && node.querySelector(
          'button[aria-expanded][aria-label*="folder" i],' +
          '[aria-label$=" file" i],' +
          'a[href*="/api/chat/workspace/"][download],' +
          'a[aria-label^="Download "],' +
          'button[aria-label^="Copy file name"]'
        ));
      }

      /* Indent = padding-left on the row (Arena's tree). Do NOT use
         getBoundingClientRect().left — rows are full-width, so parent and
         children share the same x and look like siblings (0 files). Do NOT
         mix pad px with viewport x either (src/ looked "too deep"). */
      function indentOf(el) {
        let n = el;
        for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
          const p = padLeft(n);
          if (p > 0.5) return p;
        }
        return 0;
      }

      function treeRoot(folderBtn) {
        let n = folderBtn && folderBtn.parentElement;
        let best = n;
        let scroll = null;
        while (n && n !== document.body && n !== document.documentElement) {
          let count = 0;
          try { count = n.querySelectorAll('button[aria-expanded][aria-label*="folder" i]').length; } catch (e) { count = 0; }
          if (count >= 1) best = n;
          try {
            const s = getComputedStyle(n);
            if (count > 1 && (s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 4) {
              scroll = n;
            }
          } catch (e) { /* ignore */ }
          n = n.parentElement;
        }
        return scroll || best || document.body;
      }

      function iterRows(root) {
        const out = [];
        const seen = new Set();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let n = walker.currentNode;
        while (n) {
          if (!seen.has(n) && (isFolderBtn(n) || isFileRow(n))) {
            seen.add(n);
            out.push(n);
          }
          n = walker.nextNode();
        }
        return out;
      }

      function retarget(btn) {
        if (btn && btn.isConnected) return btn;
        const name = folderName(btn);
        const nodes = document.querySelectorAll('button[aria-expanded][aria-label*="folder" i]');
        for (const el of nodes) {
          if (folderName(el) === name) return el;
        }
        return btn;
      }

      /* Arena wraps each nested folder in its own <div> after the parent
         button; files are sibling div[role=button][aria-label$=" file"]. */
      function onlyDirectLevel(folderBtn, files, folders) {
        const selfPad = indentOf(folderBtn);
        const nodes = folders.concat(files);
        if (!nodes.length) return { files: files, folders: folders };
        const deeper = nodes.filter((el) => indentOf(el) > selfPad + 6);
        const pool = deeper.length ? deeper : nodes;
        const minPad = Math.min.apply(null, pool.map(indentOf));
        return {
          files: files.filter((el) => Math.abs(indentOf(el) - minPad) <= 10),
          folders: folders.filter((el) => Math.abs(indentOf(el) - minPad) <= 10)
        };
      }

      function nestedFolderOrFile(node, depth) {
        if (!node || node.nodeType !== 1 || depth > 5) return { folder: null, file: null };
        if (isFolderBtn(node)) return { folder: node, file: null };
        if (isFileRow(node)) return { folder: null, file: node };
        let file = null;
        for (let j = 0; j < node.children.length; j++) {
          const r = nestedFolderOrFile(node.children[j], depth + 1);
          if (r.folder) return r;
          if (r.file && !file) file = r.file;
        }
        return { folder: null, file: file };
      }

      function getDirectChildren(folderBtn) {
        const files = [];
        const folders = [];
        if (!folderBtn) return { files: files, folders: folders };
        const parent = folderBtn.parentElement;
        const selfPad = indentOf(folderBtn);
        if (parent) {
          let seen = false;
          for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (child === folderBtn) { seen = true; continue; }
            if (!seen) continue;
            if (isFolderBtn(child)) {
              if (selfPad > 0.5 && indentOf(child) <= selfPad + 8) break;
              folders.push(child); continue;
            }
            if (isFileRow(child)) { files.push(child); continue; }
            /* A wrap with a nested folder is that folder — never steal its files. */
            const inner = nestedFolderOrFile(child, 0);
            if (inner.folder) {
              if (selfPad > 0.5 && indentOf(inner.folder) <= selfPad + 8) break;
              folders.push(inner.folder);
            } else if (inner.file) files.push(inner.file);
          }
        }
        const raw = (files.length || folders.length)
          ? { files: files, folders: folders }
          : getDirectChildrenByIndent(folderBtn);
        return onlyDirectLevel(folderBtn, raw.files, raw.folders);
      }

      function getDirectChildrenByIndent(folderBtn) {
        const files = [];
        const folders = [];
        const selfPad = indentOf(folderBtn);
        const rows = iterRows(treeRoot(folderBtn));
        let started = false;
        const deeper = [];
        for (const el of rows) {
          if (el === folderBtn) { started = true; continue; }
          if (!started) continue;
          const p = indentOf(el);
          if (isFolderBtn(el) && p <= selfPad + 8) break;
          if (p < selfPad - 2) break;
          deeper.push(el);
        }
        if (!deeper.length) return { files: files, folders: folders };
        const childFolders = deeper.filter((el) => isFolderBtn(el) && indentOf(el) > selfPad + 8);
        const folderPad = childFolders.length ? Math.min.apply(null, childFolders.map(indentOf)) : null;
        const childFiles = deeper.filter(isFileRow);
        const filePad = childFiles.length ? Math.min.apply(null, childFiles.map(indentOf)) : null;
        for (const el of deeper) {
          const p = indentOf(el);
          if (isFolderBtn(el)) {
            if (folderPad != null && Math.abs(p - folderPad) <= 10) folders.push(el);
          } else if (isFileRow(el)) {
            if (folderPad != null) {
              if (p < folderPad + 10) files.push(el);
            } else if (filePad != null && Math.abs(p - filePad) <= 10) {
              files.push(el);
            }
          }
        }
        return { files: files, folders: folders };
      }

      async function ensureExpanded(btn, expandedByUs) {
        btn = retarget(btn);
        if (!btn) return btn;
        const was = btn.getAttribute('aria-expanded');
        if (was !== 'true') {
          try { btn.click(); } catch (e) { /* ignore */ }
          if (was === 'false') expandedByUs.push(btn);
        }
        const t0 = Date.now();
        while (Date.now() - t0 < 1200) {
          await sleep(40);
          btn = retarget(btn);
          if (btn.getAttribute('aria-expanded') !== 'true') continue;
          const kids = getDirectChildren(btn);
          if (kids.files.length || kids.folders.length) return btn;
          if (Date.now() - t0 > 400) return btn;
        }
        return retarget(btn);
      }

      async function waitForStableKids(folderBtn) {
        const folderByName = new Map();
        const fileByHref = new Map();
        let prev = '';
        let stable = 0;
        let last = { files: [], folders: [] };
        function merge(kids) {
          last = kids;
          folderByName.clear();
          fileByHref.clear();
          for (const f of kids.folders) {
            const n = folderName(f);
            if (n) folderByName.set(n, f);
          }
          for (const row of kids.files) {
            const m = fileMeta(row);
            if (m.href) fileByHref.set(m.href, row);
          }
        }
        for (let i = 0; i < 6; i++) {
          folderBtn = retarget(folderBtn);
          merge(getDirectChildren(folderBtn));
          const sig = Array.from(folderByName.keys()).sort().join(',') + '#' + fileByHref.size;
          if (sig === prev && (folderByName.size || fileByHref.size)) {
            stable++;
            if (stable >= 1) break;
          } else {
            stable = 0;
            prev = sig;
          }
          await sleep(40);
        }
        folderBtn = retarget(folderBtn);
        merge(getDirectChildren(folderBtn));
        const files = fileByHref.size ? Array.from(fileByHref.values()) : last.files;
        const folders = folderByName.size ? Array.from(folderByName.values()) : last.folders;
        return { btn: folderBtn, kids: onlyDirectLevel(folderBtn, files, folders) };
      }

      function restoreExpanded(expandedByUs) {
        for (let i = expandedByUs.length - 1; i >= 0; i--) {
          const b = expandedByUs[i];
          try {
            if (b.isConnected && b.getAttribute('aria-expanded') === 'true') b.click();
          } catch (e) { /* ignore */ }
        }
      }

      async function collectFiles(folderBtn, prefix, expandedByUs, depth) {
        depth = depth || 0;
        if (depth > 40) return [];
        folderBtn = await ensureExpanded(folderBtn, expandedByUs);
        const got = await waitForStableKids(folderBtn);
        folderBtn = got.btn;
        const kids = got.kids;
        ctx.log('kids', folderName(folderBtn), 'files=' + kids.files.length, 'folders=' + kids.folders.map(folderName).join(','));
        const out = [];
        const seenHref = new Set();
        for (const row of kids.files) {
          const m = fileMeta(row);
          if (!m.href || seenHref.has(m.href)) continue;
          seenHref.add(m.href);
          out.push({ path: safePath(prefix + m.name), href: m.href });
        }
        const subNames = kids.folders.map(folderName).filter(Boolean);
        for (const name of subNames) {
          folderBtn = retarget(folderBtn);
          let sub = getDirectChildren(folderBtn).folders.find((f) => folderName(f) === name);
          if (!sub || !sub.isConnected) {
            const again = await waitForStableKids(folderBtn);
            folderBtn = again.btn;
            sub = again.kids.folders.find((f) => folderName(f) === name);
          }
          if (!sub) { ctx.log('lost subfolder', name); continue; }
          out.push(...await collectFiles(sub, prefix + cleanName(name) + '/', expandedByUs, depth + 1));
        }
        return out;
      }

      async function fetchEntry(entry) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
        try {
          const r = await fetch(entry.href, { credentials: 'include', cache: 'no-store', signal: ctrl.signal });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return { path: entry.path, data: new Uint8Array(await r.arrayBuffer()) };
        } finally {
          clearTimeout(t);
        }
      }

      function dedupeLongestPath(listed) {
        const byHref = new Map();
        for (const e of listed) {
          if (!e || !e.href) continue;
          const prev = byHref.get(e.href);
          if (!prev) { byHref.set(e.href, e); continue; }
          const a = e.path.split('/').length;
          const b = prev.path.split('/').length;
          if (a > b || (a === b && e.path.length > prev.path.length)) byHref.set(e.href, e);
        }
        return Array.from(byHref.values());
      }

      function progressBar(done, total, label) {
        let el = document.getElementById('aext-zip-progress');
        if (!el) {
          el = document.createElement('div');
          el.id = 'aext-zip-progress';
          (document.body || document.documentElement).appendChild(el);
        }
        const pct = total ? Math.round((done / total) * 100) : 0;
        el.innerHTML = '<b></b><i><em></em></i>';
        el.querySelector('b').textContent = (label || 'Zipping') + ' · ' + done + '/' + total;
        el.querySelector('em').style.width = pct + '%';
      }
      function hideProgress() {
        const el = document.getElementById('aext-zip-progress');
        if (el) el.remove();
      }

      async function mapPool(items, n, fn) {
        const out = new Array(items.length);
        let i = 0;
        async function worker() {
          while (i < items.length) {
            const idx = i++;
            out[idx] = await fn(items[idx], idx);
          }
        }
        const k = Math.max(1, Math.min(n, items.length || 1));
        const ws = [];
        for (let j = 0; j < k; j++) ws.push(worker());
        await Promise.all(ws);
        return out;
      }

      async function downloadFolder(btn) {
        if (btn.classList.contains('aext-zip-busy')) return;
        const expandedByUs = [];
        const name = cleanName(folderName(btn)).replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '') || 'folder';
        btn.classList.add('aext-zip-busy');
        btn.setAttribute('aria-busy', 'true');
        progressBar(0, 1, 'Listing');
        try {
          const listed = dedupeLongestPath(await collectFiles(btn, '', expandedByUs));
          ctx.log('collected', listed.length, 'paths', listed.map((f) => f.path));
          if (!listed.length) throw new Error('No readable files in this folder');
          progressBar(0, listed.length, 'Downloading');
          let done = 0;
          const packed = [];
          await mapPool(listed, 8, async (entry) => {
            try {
              packed.push(await fetchEntry(entry));
            } catch (err) {
              ctx.log('skip', entry.path, err && err.message);
            }
            done += 1;
            progressBar(done, listed.length, 'Downloading');
          });
          if (!packed.length) throw new Error('Could not download any files in this folder');
          progressBar(listed.length, listed.length, 'Building ZIP');
          AextZip.download(await AextZip.buildZip(packed, { store: true }), name + '.zip');
        } finally {
          restoreExpanded(expandedByUs);
          btn.classList.remove('aext-zip-busy');
          btn.removeAttribute('aria-busy');
          hideProgress();
        }
      }

      function zipHit(e, btn) {
        const r = btn.getBoundingClientRect();
        return (r.right - e.clientX) <= 32 && e.clientY >= r.top && e.clientY <= r.bottom;
      }

      const onZipPointer = (e) => {
        if (!live()) return;
        const btn = e.target && e.target.closest && e.target.closest('button[aria-expanded][aria-label*="folder" i]');
        if (!btn || !isFolderBtn(btn) || !zipHit(e, btn)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (e.type !== 'click') return;
        downloadFolder(btn).catch((err) => {
          ctx.log('folder download failed', err && err.message);
          try { btn.title = (err && err.message) || 'No readable files'; } catch (x) { /* ignore */ }
        });
      };
      document.addEventListener('pointerdown', onZipPointer, true);
      document.addEventListener('mousedown', onZipPointer, true);
      document.addEventListener('click', onZipPointer, true);

      ctx.log('ready');
      return true;
    },
    setEnabled(on) {
      if (!on) {
        document.querySelectorAll('button.aext-zip-busy').forEach((el) => el.classList.remove('aext-zip-busy'));
        const p = document.getElementById('aext-zip-progress');
        if (p) p.remove();
      }
    }
  };
})();
