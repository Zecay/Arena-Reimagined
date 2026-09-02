'use strict';
/* ArenaKit — when Arena rejects a type (zip, binaries, …), offer Litterbox (1h)
   after a 5s confirm. If Litterbox is down, offer Catbox (permanent) with a
   second 5s confirm. The public URL is pasted into the composer. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['host-upload'] = {
  id: 'host-upload',
  label: 'Host unsupported files',
  init(ctx) {
    const MAX_BYTES = 60 * 1024 * 1024;
    /* Exact allow-list from Arena's reject toast. Anything else is hosted. */
    const ARENA_MIME = {
      'image/png': 1, 'image/webp': 1, 'image/jpeg': 1, 'image/jpg': 1, 'image/gif': 1,
      'text/plain': 1, 'text/markdown': 1, 'text/csv': 1, 'text/html': 1, 'text/xml': 1,
      'text/css': 1, 'text/javascript': 1, 'application/json': 1, 'application/xml': 1,
      'application/javascript': 1, 'application/pdf': 1
    };
    const ARENA_EXT = /\.(png|webp|jpe?g|gif|txt|md|markdown|csv|html?|xml|css|js|mjs|cjs|json|pdf)$/i;

    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('host-upload');

    AextDom.addStyle(`
      #aext-host-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px;}
      #aext-host-dlg{width:min(420px,94vw);background:#141414;color:#fff;
        border:1px solid #5c1515;border-radius:16px;padding:20px 20px 16px;
        font:13px/1.45 ui-sans-serif,system-ui,sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.55);}
      #aext-host-dlg h2{margin:0 0 10px;font-size:16px;font-weight:700;color:#fff;letter-spacing:-.01em;}
      #aext-host-dlg p{margin:0 0 10px;color:#f87171;font-size:13px;}
      #aext-host-dlg p.aext-host-warn{color:#fecaca;font-weight:600;}
      #aext-host-dlg ul{margin:0 0 14px;padding:8px 8px 8px 22px;color:#f5f5f5;background:#1c1c1c;border-radius:10px;border:1px solid #2a2a2a;}
      #aext-host-dlg li{margin:2px 0;}
      #aext-host-dlg .aext-host-limits{margin:-4px 0 12px;font-size:11px;color:#a3a3a3;font-weight:500;letter-spacing:.01em;}
      #aext-host-dlg .aext-host-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;}
      #aext-host-dlg button{font:600 12.5px/1.2 ui-sans-serif,system-ui,sans-serif;padding:9px 14px;border-radius:10px;cursor:pointer;}
      #aext-host-dlg .aext-host-cancel{background:transparent;border:1px solid #e5e5e5;color:#fff;}
      #aext-host-dlg .aext-host-cancel:hover{background:#222;}
      #aext-host-dlg .aext-host-go{background:#e11d48;color:#fff;border:0;}
      #aext-host-dlg .aext-host-go:hover{background:#be123c;}
      #aext-host-dlg .aext-host-go:disabled{opacity:.45;cursor:not-allowed;}
      #aext-host-dlg .aext-host-busy{display:none;align-items:center;gap:10px;margin-top:14px;color:#fff;font-weight:600;}
      #aext-host-dlg.is-busy .aext-host-busy{display:flex;}
      #aext-host-dlg.is-busy .aext-host-actions{display:none;}
      #aext-host-dlg .aext-host-busy i{width:18px;height:18px;border:2px solid rgba(255,255,255,.22);border-top-color:#fff;border-radius:50%;animation:aext-host-spin .7s linear infinite;flex:none;}
      #aext-host-dlg .aext-host-bar{display:none;height:4px;margin-top:10px;border-radius:99px;background:#2a2a2a;overflow:hidden;}
      #aext-host-dlg.is-busy .aext-host-bar{display:block;}
      #aext-host-dlg .aext-host-bar em{display:block;height:100%;width:42%;background:#e11d48;border-radius:99px;animation:aext-host-ind 1.15s ease-in-out infinite;}
      @keyframes aext-host-spin{to{transform:rotate(360deg)}}
      @keyframes aext-host-ind{0%{transform:translateX(-110%)}100%{transform:translateX(280%)}}
    `, 'arenakit-host-css');

    function needsHost(file) {
      if (!file) return false;
      const mime = (file.type || '').toLowerCase();
      if (mime && ARENA_MIME[mime]) return false;
      if (ARENA_EXT.test(file.name || '')) return false;
      return true;
    }

    function ours(el) {
      return !!(el && el.closest && el.closest('#aext-host-overlay, #arenakit-settings-panel, #arenakit-settings-overlay, #arenakit-settings-btn'));
    }

    function setBusy(on, text) {
      const dlg = document.getElementById('aext-host-dlg');
      if (!dlg) return;
      dlg.classList.toggle('is-busy', !!on);
      const span = dlg.querySelector('.aext-host-busy span');
      if (span && text) span.textContent = text;
    }

    function warnDialog(opts) {
      return new Promise((resolve) => {
        const old = document.getElementById('aext-host-overlay');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'aext-host-overlay';
        const dlg = document.createElement('div');
        dlg.id = 'aext-host-dlg';
        dlg.setAttribute('role', 'dialog');
        dlg.setAttribute('aria-modal', 'true');
        const h = document.createElement('h2');
        h.textContent = opts.title;
        const p = document.createElement('p');
        p.className = opts.danger ? 'aext-host-warn' : '';
        p.textContent = opts.body;
        dlg.appendChild(h);
        dlg.appendChild(p);
        const pub = document.createElement('p');
        pub.className = 'aext-host-warn';
        pub.textContent = 'Anyone with the link can download it.';
        dlg.appendChild(pub);
        if (opts.files && opts.files.length) {
          const ul = document.createElement('ul');
          opts.files.forEach((f) => {
            const li = document.createElement('li');
            li.textContent = f.name + ' (' + Math.max(1, Math.round((f.size || 0) / 1024)) + ' KB)';
            ul.appendChild(li);
          });
          dlg.appendChild(ul);
        }
        const lim = document.createElement('div');
        lim.className = 'aext-host-limits';
        lim.textContent = 'Litterbox max 1 GB · Catbox max 200 MB';
        dlg.appendChild(lim);
        const busy = document.createElement('div');
        busy.className = 'aext-host-busy';
        busy.innerHTML = '<i></i><span>Uploading…</span>';
        const bar = document.createElement('div');
        bar.className = 'aext-host-bar';
        bar.innerHTML = '<em></em>';
        dlg.appendChild(busy);
        dlg.appendChild(bar);
        const row = document.createElement('div');
        row.className = 'aext-host-actions';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'aext-host-cancel';
        cancel.textContent = 'Cancel';
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'aext-host-go';
        go.disabled = true;
        let left = 5;
        const label = opts.accept || 'Accept';
        go.textContent = label + ' (' + left + ')';
        const tick = setInterval(() => {
          left -= 1;
          if (left <= 0) {
            clearInterval(tick);
            go.disabled = false;
            go.textContent = label;
          } else go.textContent = label + ' (' + left + ')';
        }, 1000);
        let settled = false;
        const done = (v) => {
          if (settled) return;
          settled = true;
          clearInterval(tick);
          if (v && opts.keepOnAccept) {
            setBusy(true, opts.busyText || 'Uploading…');
            resolve(true);
            return;
          }
          overlay.remove();
          resolve(!!v);
        };
        cancel.addEventListener('click', () => done(false));
        go.addEventListener('click', () => { if (!go.disabled) done(true); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay && !dlg.classList.contains('is-busy')) done(false); });
        row.appendChild(cancel);
        row.appendChild(go);
        dlg.appendChild(row);
        overlay.appendChild(dlg);
        (document.body || document.documentElement).appendChild(overlay);
      });
    }

    function insertLine(text) {
      const el = AextDom.findPrompt();
      if (!el) return;
      el.focus();
      const ok = document.execCommand('insertText', false, text);
      if (!ok) {
        if ('value' in el && el.tagName === 'TEXTAREA') {
          el.value = (el.value || '') + text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        }
      }
    }

    /* chrome.runtime.sendMessage JSON-encodes the payload — ArrayBuffer
       arrives as {} and the SW throws "Missing file data". Base64 survives. */
    async function bufToB64(buf) {
      const u8 = new Uint8Array(buf);
      let binary = '';
      const step = 0x8000;
      for (let i = 0; i < u8.length; i += step) {
        binary += String.fromCharCode.apply(null, u8.subarray(i, i + step));
        if (i && (i % (step * 32) === 0)) await new Promise((r) => setTimeout(r, 0));
      }
      return btoa(binary);
    }

    async function sendToSw(host, file) {
      setBusy(true, 'Reading ' + file.name + '…');
      const buf = await file.arrayBuffer();
      setBusy(true, 'Encoding ' + file.name + '…');
      const b64 = await bufToB64(buf);
      setBusy(true, 'Uploading ' + file.name + '…');
      const res = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            type: 'aext-host-upload',
            host: host,
            name: file.name,
            mime: file.type || 'application/octet-stream',
            encoding: 'base64',
            data: b64
          }, (r) => {
            const err = chrome.runtime.lastError;
            if (err) reject(new Error(err.message));
            else resolve(r);
          });
        } catch (e) { reject(e); }
      });
      if (!res || !res.ok) throw new Error((res && res.error) || 'Upload failed');
      return res.url;
    }

    async function hostFiles(files) {
      if (!files.length) return;
      const tooBig = files.filter((f) => f.size > MAX_BYTES);
      const okFiles = files.filter((f) => f.size <= MAX_BYTES);
      if (tooBig.length) {
        alert('These files are over 60 MB and cannot be sent through the extension:\n' + tooBig.map((f) => f.name).join('\n'));
      }
      if (!okFiles.length) return;
      const litter = await warnDialog({
        title: 'Upload to Litterbox? (1 hour)',
        body: 'Arena does not accept this file type. If you continue, the file is uploaded to litterbox.catbox.moe and the public link is pasted into the chat. Litterbox deletes it after 1 hour.',
        accept: 'Upload for 1 hour',
        files: okFiles,
        keepOnAccept: true,
        busyText: 'Uploading…'
      });
      if (!litter) return;
      try {
        for (let i = 0; i < okFiles.length; i++) {
          const file = okFiles[i];
          try {
            setBusy(true, 'Uploading ' + file.name + ' (' + (i + 1) + '/' + okFiles.length + ')');
            const url = await sendToSw('litterbox', file);
            insertLine(file.name + ': ' + url + ' (Litterbox — expires in 1 hour)\n');
            ctx.log('litterbox', file.name, url);
          } catch (err) {
            ctx.log('litterbox failed', file.name, err && err.message);
            const overlay = document.getElementById('aext-host-overlay');
            if (overlay) overlay.remove();
            const cat = await warnDialog({
              title: 'Litterbox failed — use Catbox?',
              body: 'Litterbox returned an error (' + ((err && err.message) || 'unknown') + '). Catbox keeps files basically forever (public, not deleted after 1 hour). Only continue if you are OK with that.',
              accept: 'Upload forever to Catbox',
              danger: true,
              files: [file],
              keepOnAccept: true,
              busyText: 'Uploading to Catbox…'
            });
            if (!cat) continue;
            try {
              setBusy(true, 'Uploading ' + file.name + '…');
              const url = await sendToSw('catbox', file);
              insertLine(file.name + ': ' + url + ' (Catbox — stays online)\n');
              ctx.log('catbox', file.name, url);
            } catch (err2) {
              alert('Could not host "' + file.name + '": ' + ((err2 && err2.message) || err2));
            }
          }
        }
      } finally {
        const o = document.getElementById('aext-host-overlay');
        if (o) o.remove();
      }
    }

    function takeBad(list) {
      return Array.from(list || []).filter(needsHost);
    }

    document.addEventListener('change', (e) => {
      if (!live()) return;
      const input = e.target;
      if (!input || input.tagName !== 'INPUT' || input.type !== 'file') return;
      if (ours(input)) return;
      const bad = takeBad(input.files);
      if (!bad.length) return;
      ctx.log('intercept change', bad.map((f) => f.name).join(','));
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      try { input.value = ''; } catch (err) { /* ignore */ }
      hostFiles(bad);
    }, true);

    function itemLooksHost(item) {
      if (!item || item.kind !== 'file') return false;
      const t = (item.type || '').toLowerCase();
      if (t && ARENA_MIME[t]) return false;
      if (!t) return true;
      return true;
    }

    function onDragOver(e) {
      if (!live() || ours(e.target)) return;
      const items = e.dataTransfer && e.dataTransfer.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (itemLooksHost(items[i])) {
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* ignore */ }
          break;
        }
      }
    }

    function onDrop(e) {
      if (!live() || ours(e.target)) return;
      const bad = takeBad(e.dataTransfer && e.dataTransfer.files);
      if (!bad.length) return;
      ctx.log('intercept drop', bad.map((f) => f.name).join(','));
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      hostFiles(bad);
    }

    document.addEventListener('dragover', onDragOver, true);
    window.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);
    window.addEventListener('drop', onDrop, true);

    this.setEnabled = (on) => {
      if (!on) {
        const o = document.getElementById('aext-host-overlay');
        if (o) o.remove();
      }
    };
    ctx.log('ready');
    return true;
  }
};
