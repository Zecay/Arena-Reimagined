'use strict';
/* ArenaKit — pin chats locally. Arena already has Rename/Archive; we add Pin
   to the sidebar "More options" menu and a Pinned group at the top. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['pin-chats'] = {
  id: 'pin-chats',
  label: 'Pin chats',
  init(ctx) {
    const STORE = 'arenakit.pins';
    const PIN_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';

    let pins = []; // [{id, href, title}]
    let timer = 0;

    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('pin-chats');

    AextDom.addStyle(`
      .aext-pin-badge{display:inline-flex;flex:none;margin-left:4px;color:hsl(var(--interactive-link));opacity:.9;}
      .aext-pin-badge svg{width:12px;height:12px;display:block;}
      [data-aext-pinned]{margin-bottom:2px;}
      .aext-pin-item{position:relative;}
      .aext-pin-item a{display:flex;align-items:center;gap:8px;overflow:hidden;}
      html.aext-off-pin-chats .aext-pin-badge,
      html.aext-off-pin-chats [data-aext-pinned],
      html.aext-off-pin-chats .aext-pin-menuitem{display:none!important;}
    `, 'arenakit-pin-css');

    function chatIdFromHref(href) {
      const m = String(href || '').match(/\/(?:agent|chat|c)\/([a-z0-9-]+)/i);
      return m ? m[1] : '';
    }

    async function loadPins() {
      try {
        const o = await chrome.storage.local.get(STORE);
        const v = o[STORE];
        if (v && Array.isArray(v.ids)) pins = v.ids;
        else if (Array.isArray(v)) pins = v;
        else pins = [];
      } catch (e) { pins = []; }
      return pins;
    }

    async function savePins() {
      try { await chrome.storage.local.set({ [STORE]: { ids: pins } }); } catch (e) { /* ignore */ }
    }

    function isPinned(id) {
      return pins.some((p) => p.id === id);
    }

    async function togglePin(entry) {
      if (!entry || !entry.id) return;
      if (isPinned(entry.id)) pins = pins.filter((p) => p.id !== entry.id);
      else pins = [{ id: entry.id, href: entry.href, title: entry.title || entry.id }].concat(pins);
      await savePins();
      paint();
    }

    function findChatItems() {
      return Array.from(document.querySelectorAll('a[data-sidebar="menu-button"][href*="/agent/"], a[data-sidebar="menu-button"][href*="/chat/"]'));
    }

    function openMenuChat() {
      const btn = document.querySelector('button[data-sidebar="menu-action"][data-state="open"], button[aria-label="More options"][aria-expanded="true"]');
      if (!btn) return null;
      const item = btn.closest('[data-sidebar="menu-item"], li');
      const a = item && item.querySelector('a[href]');
      if (!a) return null;
      const titleEl = a.querySelector('span.body-sm, span.truncate, span');
      return {
        id: chatIdFromHref(a.getAttribute('href')),
        href: a.getAttribute('href'),
        title: ((titleEl && titleEl.textContent) || '').replace(/\s+/g, ' ').trim(),
        item: item
      };
    }

    function isChatMenu(menu) {
      if (!menu || menu.getAttribute('role') !== 'menu') return false;
      const t = menu.textContent || '';
      return /Rename/i.test(t) && /Archive/i.test(t);
    }

    function injectMenu(menu) {
      if (!live() || !isChatMenu(menu)) return;
      if (menu.querySelector('.aext-pin-menuitem')) return;
      const chat = openMenuChat();
      if (!chat || !chat.id) return;
      const pinned = isPinned(chat.id);
      const item = document.createElement('div');
      item.setAttribute('role', 'menuitem');
      item.className = 'aext-pin-menuitem relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-xs outline-none hover:bg-surface-tertiary';
      item.tabIndex = -1;
      item.innerHTML = PIN_SVG + '<span>' + (pinned ? 'Unpin' : 'Pin') + '</span>';
      item.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await togglePin(chat);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      const first = menu.querySelector('[role="menuitem"]');
      if (first) menu.insertBefore(item, first);
      else menu.appendChild(item);
    }

    function markOriginals() {
      findChatItems().forEach((a) => {
        if (a.closest('[data-aext-pinned]')) return;
        const id = chatIdFromHref(a.getAttribute('href'));
        const on = isPinned(id);
        let badge = a.querySelector(':scope > .aext-pin-badge');
        if (on && !badge) {
          badge = document.createElement('span');
          badge.className = 'aext-pin-badge';
          badge.innerHTML = PIN_SVG;
          const icon = a.querySelector(':scope > div');
          if (icon && icon.nextSibling) a.insertBefore(badge, icon.nextSibling);
          else a.appendChild(badge);
        } else if (!on && badge) {
          badge.remove();
        }
      });
    }

    const LABEL_CLASS = 'ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium outline-none transition-[margin,opacity] duration-150 ease-linear focus-visible:ring-2 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 body-xs text-text-tertiary font-book px-2';

    function chatListAnchor() {
      /* First date group (Today / Yesterday / …), not New Chat / Leaderboard. */
      const labels = document.querySelectorAll('[data-sidebar="group-label"]');
      for (const lab of labels) {
        if (lab.closest('[data-aext-pinned]')) continue;
        const text = (lab.textContent || '').trim();
        if (!text) continue;
        const g = lab.closest('[data-sidebar="group"]');
        if (g) return g;
      }
      return null;
    }

    function ensurePinnedGroup() {
      const anchor = chatListAnchor();
      if (!anchor || !anchor.parentElement) return null;
      let group = document.querySelector('[data-aext-pinned]');
      const srcLabel = anchor.querySelector('[data-sidebar="group-label"]');
      if (!group) {
        group = document.createElement('div');
        group.setAttribute('data-sidebar', 'group');
        group.setAttribute('data-aext-pinned', '1');
        group.className = anchor.className || 'relative flex w-full min-w-0 flex-col p-2';
        const label = document.createElement('div');
        label.setAttribute('data-sidebar', 'group-label');
        label.className = (srcLabel && srcLabel.className) || LABEL_CLASS;
        label.textContent = 'Pinned';
        const content = document.createElement('div');
        content.setAttribute('data-sidebar', 'group-content');
        content.className = 'w-full text-sm';
        const ul = document.createElement('ul');
        ul.setAttribute('data-sidebar', 'menu');
        ul.className = 'flex w-full min-w-0 flex-col gap-1';
        content.appendChild(ul);
        group.appendChild(label);
        group.appendChild(content);
        anchor.parentElement.insertBefore(group, anchor);
      } else {
        if (group.parentElement !== anchor.parentElement || group.nextElementSibling !== anchor) {
          anchor.parentElement.insertBefore(group, anchor);
        }
        const lab = group.querySelector('[data-sidebar="group-label"]');
        if (lab) {
          lab.className = (srcLabel && srcLabel.className) || LABEL_CLASS;
          lab.textContent = 'Pinned';
        }
      }
      return group.querySelector('ul');
    }

    function paintClones() {
      const ul = pins.length ? ensurePinnedGroup() : document.querySelector('[data-aext-pinned] ul');
      const group = document.querySelector('[data-aext-pinned]');
      if (!pins.length) {
        if (group) group.remove();
        return;
      }
      if (!ul) return;
      ul.innerHTML = '';
      pins.forEach((p) => {
        const orig = findChatItems().find((a) => chatIdFromHref(a.getAttribute('href')) === p.id);
        const href = (orig && orig.getAttribute('href')) || p.href || ('/agent/' + p.id);
        const title = (orig && ((orig.querySelector('span.body-sm, span.truncate') || {}).textContent || '')) || p.title || p.id;
        const li = document.createElement('li');
        li.setAttribute('data-sidebar', 'menu-item');
        li.className = 'aext-pin-item group/menu-item relative';
        const a = document.createElement('a');
        a.href = href;
        a.setAttribute('data-sidebar', 'menu-button');
        a.className = orig ? orig.className : 'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-text-secondary hover:bg-sidebar-accent hover:text-text-primary h-auto py-1.5';
        a.removeAttribute('data-active');
        if (orig && orig.getAttribute('data-active') === 'true') a.setAttribute('data-active', 'true');
        const badge = document.createElement('span');
        badge.className = 'aext-pin-badge';
        badge.innerHTML = PIN_SVG;
        const span = document.createElement('span');
        span.className = 'body-sm truncate';
        span.textContent = String(title).replace(/\s+/g, ' ').trim();
        a.appendChild(badge);
        a.appendChild(span);
        li.appendChild(a);
        ul.appendChild(li);
      });
    }

    function paint() {
      if (!live()) {
        const g = document.querySelector('[data-aext-pinned]');
        if (g) g.remove();
        document.querySelectorAll('.aext-pin-badge').forEach((el) => el.remove());
        return;
      }
      markOriginals();
      paintClones();
    }

    function scanMenus() {
      if (!live()) return;
      document.querySelectorAll('[role="menu"][data-radix-menu-content], [role="menu"][data-state="open"]').forEach(injectMenu);
    }

    const rescan = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { paint(); scanMenus(); }, 200);
    };

    loadPins().then(() => paint());

    const start = () => {
      if (!document.body) return;
      AextDom.observeSparse(rescan, 350);
      document.addEventListener('click', () => { if (live()) setTimeout(scanMenus, 60); }, true);
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    this.setEnabled = (on) => { if (on) paint(); else paint(); };

    ctx.log('ready');
    return true;
  }
};
