'use strict';
/* ArenaKit feature 1.5 — Long input → .txt (opt-in).
   At ≥ 3000 unsent chars, a button appears: "Message is long — turn into .txt?"
   Confirming attaches prompt.txt and clears the editor.

   Must NOT observe characterData or relocate DOM while typing — that made
   TipTap lag and broke selection / Ctrl+A. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['long-input-txt'] = {
  id: 'long-input-txt',
  label: 'Long input → .txt (opt-in)',
  init(ctx) {
    const limitOf = () => {
      const o = (window.AextSettings && AextSettings.optsOf) ? AextSettings.optsOf('long-input-txt') : {};
      const n = parseInt(o.limit, 10);
      return (n >= 500 && n <= 20000) ? n : 3000;
    };
    const PROMPT_FILE = 'prompt.txt';
    const fileCache = new Map();
    let promptBtn = null;
    let handledFor = null;
    let checkTimer = 0;

    const live = () => !window.AextRuntime || AextRuntime.isEnabled('long-input-txt');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function findEditor() {
      return AextDom.findPrompt();
    }

    function editorText(el) {
      if (!el) return '';
      if ('value' in el && el.tagName === 'TEXTAREA') return el.value || '';
      return (el.textContent || '').replace(/\u00a0/g, ' ');
    }

    function sigOf(v) { return v.slice(0, 40) + '#' + v.length; }

    function selectAll(el) {
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function setEditorText(el, text) {
      if (!el) return;
      if ('value' in el && el.tagName === 'TEXTAREA') {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      selectAll(el);
      const ok = document.execCommand('insertText', false, text);
      if (!ok) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    }

    function clearEditor(el) {
      if (!el) return;
      if ('value' in el && el.tagName === 'TEXTAREA') {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      selectAll(el);
      if (!document.execCommand('delete')) document.execCommand('insertText', false, '');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    }

    function findComposerFileInput() {
      const editor = findEditor();
      if (editor) {
        const box = editor.closest('.editor-content');
        const form = editor.closest('form');
        const scope = form || (box && box.parentElement) || editor.parentElement;
        if (scope && scope.querySelector) {
          const found = scope.querySelector('input[type="file"]');
          if (found) return found;
        }
      }
      return document.querySelector('.editor-content input[type="file"]');
    }

    function fireDrag(type, target, dt) {
      if (!target) return;
      let ev;
      try {
        ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      } catch (e) {
        ev = new Event(type, { bubbles: true, cancelable: true });
        try { Object.defineProperty(ev, 'dataTransfer', { value: dt, configurable: true }); } catch (err) { /* ignore */ }
      }
      target.dispatchEvent(ev);
    }

    function chipExists(name) {
      const buttons = document.querySelectorAll('button[aria-label^="Remove "]');
      for (const b of buttons) {
        const al = b.getAttribute('aria-label') || '';
        if (al.indexOf(name) !== -1) return true;
      }
      return false;
    }

    async function attachFile(file) {
      fileCache.set(file.name, file);
      const dt = new DataTransfer();
      dt.items.add(file);

      /* One composer input, then at most one drop. Spraying every file input
         and drop zone created 5–6 prompt.txt chips. */
      const input = findComposerFileInput();
      if (input) {
        try {
          input.files = dt.files;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          ctx.log('input.files failed', e && e.message);
        }
      }
      for (let i = 0; i < 12; i++) {
        if (chipExists(file.name)) return true;
        await sleep(80);
      }

      const editor = findEditor();
      const box = editor && (editor.closest('.editor-content') || editor);
      if (box) {
        fireDrag('dragenter', box, dt);
        fireDrag('dragover', box, dt);
        fireDrag('drop', box, dt);
      }
      for (let i = 0; i < 15; i++) {
        if (chipExists(file.name)) return true;
        await sleep(100);
      }
      throw new Error('Arena did not show the file as an attachment');
    }

    function findFileByName(name) {
      if (!name) return null;
      if (fileCache.has(name)) return fileCache.get(name);
      const input = findComposerFileInput();
      const files = input && input.files ? Array.from(input.files) : [];
      const exact = files.find((f) => f.name === name);
      if (exact) return exact;
      const base = name.replace(/\s*\(\d+\)(\.[^.]+)$/, '$1');
      return files.find((f) => f.name === base) || fileCache.get(base) || null;
    }

    function isTexty(file, name) {
      const n = String(name || (file && file.name) || '').toLowerCase();
      if (/\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|pdf|zip|gz|tgz|tar|woff2?|mp3|mp4|webm|mov|wav|docx?|xlsx?|pptx?)$/i.test(n)) return false;
      if (file && file.type && /^(image|audio|video|application\/pdf|application\/zip|application\/octet)/i.test(file.type)) return false;
      return true;
    }

    function ensureBtn() {
      if (promptBtn && document.body.contains(promptBtn)) return promptBtn;
      promptBtn = document.createElement('button');
      promptBtn.type = 'button';
      promptBtn.className = 'aext-txt-prompt';
      promptBtn.textContent = 'Message is long — turn into .txt?';
      promptBtn.addEventListener('click', onTurnToTxt);
      return promptBtn;
    }

    function placeBtn() {
      ensureBtn();
      promptBtn.style.display = 'inline-flex';
      if (document.body.contains(promptBtn)) return;
      const editor = findEditor();
      const box = editor && editor.closest('.editor-content');
      const host = (box && box.parentElement) || (editor && editor.parentElement);
      if (box) box.insertAdjacentElement('afterend', promptBtn);
      else if (host) host.appendChild(promptBtn);
      else (document.body || document.documentElement).appendChild(promptBtn);
    }

    function hideBtn() { if (promptBtn) promptBtn.style.display = 'none'; }
    function toggleBusy(b) {
      if (!promptBtn) return;
      promptBtn.disabled = !!b;
      promptBtn.textContent = b ? 'Attaching…' : 'Message is long — turn into .txt?';
    }

    function onTurnToTxt() {
      if (!live()) return;
      const el = findEditor();
      const v = editorText(el);
      if (!el || v.length < limitOf()) { hideBtn(); return; }
      const th = v.length < 12000 ? v.slice(0, 90) + '…' : v.slice(0, 60) + '…';
      if (!confirm('Turn this long message into a .txt file?\n\n"' + th + '"\n\nIt will be attached as ' + PROMPT_FILE + ' and the prompt will be cleared.')) return;
      toggleBusy(true);
      const file = new File([v], PROMPT_FILE, { type: 'text/plain' });
      attachFile(file).then(() => {
        handledFor = sigOf(v);
        clearEditor(el);
        hideBtn();
        toggleBusy(false);
      }).catch((e) => {
        toggleBusy(false);
        ctx.log('attach failed:', e && e.message);
        alert('Could not attach the .txt file: ' + (e && e.message || e));
      });
    }

    function check() {
      if (!live()) { hideBtn(); return; }
      const el = findEditor();
      if (!el) return;
      const v = editorText(el);
      if (v.length >= limitOf() && handledFor !== sigOf(v)) placeBtn();
      else hideBtn();
    }

    function scheduleCheck() {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(check, 280);
    }

    function chipName(chip) {
      const btn = chip.querySelector('button[aria-label^="Remove "]');
      const m = btn && /^Remove\s+(.+)$/i.exec(btn.getAttribute('aria-label') || '');
      if (m) return m[1].trim();
      const label = chip.querySelector('span.truncate, span[class*="truncate"]');
      return (label && label.textContent.trim()) || '';
    }

    function isChip(el) {
      if (!el || el.nodeType !== 1) return false;
      return !!el.querySelector('button[aria-label^="Remove "]');
    }

    async function convertChip(chip) {
      if (!live()) return;
      const name = chipName(chip);
      if (!name) return;
      const file = findFileByName(name);
      if (file && !isTexty(file, name)) {
        alert('"' + name + '" does not look like a text file, so it can\'t be turned into a chat message.');
        return;
      }
      if (!confirm('Turn "' + name + '" into a chat message?\n\nThe attachment will be removed and its text put in the prompt.')) return;
      let text = '';
      if (file) {
        try { text = await file.text(); } catch (e) { text = ''; }
      }
      if (!text) {
        alert('Could not read "' + name + '".');
        return;
      }
      const editor = findEditor();
      if (!editor) return;
      setEditorText(editor, text);
      hideBtn();
      const rm = chip.querySelector('button[aria-label^="Remove "]');
      if (rm) rm.click();
      fileCache.delete(name);
    }

    function hookChip(chip) {
      if (!chip || chip.__aextTxtHooked) return;
      chip.__aextTxtHooked = true;
      chip.style.cursor = chip.style.cursor || 'pointer';
      chip.addEventListener('click', (e) => {
        if (!live()) return;
        if (e.target.closest && e.target.closest('button[aria-label^="Remove "]')) return;
        e.preventDefault();
        e.stopPropagation();
        convertChip(chip);
      });
    }

    function scanChips() {
      if (!live()) return;
      document.querySelectorAll('button[aria-label^="Remove "]').forEach((btn) => {
        const chip = btn.closest('span.inline-flex, span.group, [class*="inline-flex"]') || btn.parentElement;
        if (isChip(chip)) hookChip(chip);
      });
    }

    AextDom.addStyle(`
      button.aext-txt-prompt{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;padding:5px 10px;border-radius:8px;
        border:1px solid hsl(var(--border-medium))!important;background:hsl(var(--surface-raised))!important;color:hsl(var(--interactive-cta))!important;
        font:12px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer!important;box-shadow:none!important;}
      button.aext-txt-prompt:hover{background:hsl(var(--surface-tertiary))!important;}
      button.aext-txt-prompt:disabled{opacity:.6;cursor:default!important;}
    `, 'arenakit-txt-css');

    const onEditorEvent = (e) => {
      const editor = findEditor();
      if (editor && (e.target === editor || (editor.contains && editor.contains(e.target)))) scheduleCheck();
    };
    document.addEventListener('input', onEditorEvent, true);

    const attachObserver = () => {
      if (!document.body) return;
      AextDom.observeSparse(scanChips, 400);
    };
    if (document.body) attachObserver();
    else document.addEventListener('DOMContentLoaded', attachObserver, { once: true });

    AextDom.later(check, 800);
    AextDom.later(scanChips, 800);

    this.setEnabled = (on) => {
      if (!on) hideBtn();
      else { check(); scanChips(); }
    };

    ctx.log('ready');
    return true;
  }
};
