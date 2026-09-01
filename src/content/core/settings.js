'use strict';
/* ArenaKit — settings store.
   Small flags live in chrome.storage.sync. Custom themes + feature options
   live in chrome.storage.local — sync's 8 KB per-item quota cannot hold a
   full theme (Resource::kQuotaBytesPerItem).

   chrome.* calls must never throw "Extension context invalidated" into the
   page. If the extension was reloaded, we keep working from cache/defaults
   until the tab is refreshed. */

const AEXT_STORE_KEY = 'arenakit.settings';
const AEXT_THEMES_KEY = 'arenakit.customThemes';
const AEXT_OPTS_KEY = 'arenakit.opts';

const AEXT_FOLLOWUP_DEFAULTS = [
  { id: 'fix', label: 'Fix the errors', text: 'Please fix the errors from the last run. Keep working until they are gone.' },
  { id: 'pro', label: 'Make it more professional', text: 'Please make the result more professional: polish copy, layout, and visual quality without changing the core intent.' },
  { id: 'sum', label: 'Summarize what you did', text: 'Please summarize what you did in this run: key changes, files touched, and anything still unfinished.' },
  { id: 'export', label: 'Export everything', text: 'Please export everything from this run as downloadable files I can keep.' }
];

const AEXT_DEFAULTS = Object.freeze({
  theme: 'default',
  focus: false,
  shortcuts: AEXT_SHORTCUT_DEFAULTS,
  customThemes: [],
  features: {
    theme: true,
    'settings-panel': true,
    'scroll-lock': true,
    'resume-latest': true,
    'copy-code': false,
    'folder-zip': true,
    'long-input-txt': true,
    'finish-notify': true,
    'follow-ups': true,
    'pin-chats': true,
    'reduce-lag': true,
    'agent-quota': true,
    'host-upload': true,
    'workspace-search': true,
    novm: true,
    'hide-email': false
  },
  opts: {
    'follow-ups': { chips: AEXT_FOLLOWUP_DEFAULTS.slice(), showWhenEmpty: false },
    'finish-notify': { sound: true, toast: true, counter: true },
    'hide-email': { text: '' },
    'long-input-txt': { limit: 3000 },
    'agent-quota': { limit: 100 }
  }
});

const AextSettings = {
  _subs: [],
  _watching: false,
  _cache: null,
  _pending: null,
  _dead: false,
  _warnedDead: false,

  _alive() {
    if (this._dead) return false;
    try {
      if (!chrome || !chrome.runtime || !chrome.runtime.id) {
        this._markDead();
        return false;
      }
      return true;
    } catch (e) {
      this._markDead();
      return false;
    }
  },

  _markDead() {
    this._dead = true;
    if (this._warnedDead) return;
    this._warnedDead = true;
    console.warn('[ArenaKit] Extension was reloaded — refresh this tab to reconnect.');
  },

  _isDeadErr(err) {
    const msg = (err && err.message) || String(err || '');
    return /context invalidated|extension context/i.test(msg);
  },

  async _areaGet(area, keys) {
    if (!this._alive()) return {};
    try {
      return await chrome.storage[area].get(keys);
    } catch (err) {
      if (this._isDeadErr(err)) this._markDead();
      else console.warn('[ArenaKit] storage.get failed', err);
      return {};
    }
  },

  async _areaSet(area, obj) {
    if (!this._alive()) return false;
    try {
      await chrome.storage[area].set(obj);
      return true;
    } catch (err) {
      if (this._isDeadErr(err)) {
        this._markDead();
        return false;
      }
      throw err;
    }
  },

  async load() {
    this._ensureWatch();
    if (this._cache) return this._merge(AEXT_DEFAULTS, this._cache);
    if (this._pending) return this._pending;
    this._pending = this._loadAll().then((merged) => {
      this._cache = merged;
      this._pending = null;
      return this._merge(AEXT_DEFAULTS, merged);
    }).catch((err) => {
      this._pending = null;
      if (this._isDeadErr(err)) this._markDead();
      else console.warn('[ArenaKit] settings load failed', err);
      this._cache = this._cache || {};
      return this._merge(AEXT_DEFAULTS, this._cache);
    });
    return this._pending;
  },

  async _loadAll() {
    const syncO = await this._areaGet('sync', AEXT_STORE_KEY);
    const localO = await this._areaGet('local', [AEXT_THEMES_KEY, AEXT_OPTS_KEY]);
    const slim = Object.assign({}, syncO[AEXT_STORE_KEY] || {});
    const syncThemes = Array.isArray(slim.customThemes) ? slim.customThemes : [];
    const localThemes = Array.isArray(localO[AEXT_THEMES_KEY]) ? localO[AEXT_THEMES_KEY] : [];
    const localOpts = localO[AEXT_OPTS_KEY] && typeof localO[AEXT_OPTS_KEY] === 'object' ? localO[AEXT_OPTS_KEY] : {};
    const themes = localThemes.length ? localThemes : syncThemes;
    if (syncThemes.length && !localThemes.length) {
      try { await this._areaSet('local', { [AEXT_THEMES_KEY]: syncThemes }); } catch (e) { /* ignore */ }
    }
    if (Object.prototype.hasOwnProperty.call(slim, 'customThemes')) {
      delete slim.customThemes;
      try { await this._areaSet('sync', { [AEXT_STORE_KEY]: slim }); } catch (e) { /* quota leftover */ }
    }
    slim.customThemes = themes;
    slim.opts = this._merge(AEXT_DEFAULTS.opts, localOpts);
    return slim;
  },

  _slim(next) {
    const slim = Object.assign({}, next);
    delete slim.customThemes;
    delete slim.opts;
    return slim;
  },

  async save(patch) {
    const current = await this.load();
    const next = this._merge(current, patch);
    this._cache = next;
    const wantThemes = Object.prototype.hasOwnProperty.call(patch, 'customThemes');
    const wantOpts = Object.prototype.hasOwnProperty.call(patch, 'opts');
    try {
      await this._areaSet('sync', { [AEXT_STORE_KEY]: this._slim(next) });
      if (wantThemes) await this._areaSet('local', { [AEXT_THEMES_KEY]: next.customThemes || [] });
      if (wantOpts) await this._areaSet('local', { [AEXT_OPTS_KEY]: next.opts || {} });
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (/quota/i.test(msg)) {
        await this._areaSet('local', {
          [AEXT_THEMES_KEY]: next.customThemes || [],
          [AEXT_OPTS_KEY]: next.opts || {}
        });
        try { await this._areaSet('sync', { [AEXT_STORE_KEY]: this._slim(next) }); }
        catch (e2) { console.warn('[ArenaKit] settings sync still over quota', e2); }
      } else if (this._isDeadErr(err)) {
        this._markDead();
      } else {
        console.warn('[ArenaKit] settings save failed', err);
      }
    }
    // Always notify subscribers (storage.onChanged is easy to miss).
    this._emit(next);
    return next;
  },

  setTheme(theme) { return this.save({ theme: theme }); },

  async setFeature(id, on) {
    const s = await this.load();
    s.features = Object.assign({}, s.features, { [id]: !!on });
    return this.save({ features: s.features });
  },

  async setOpts(id, patch) {
    const s = await this.load();
    const cur = (s.opts && s.opts[id]) || {};
    const next = Object.assign({}, s.opts || {}, { [id]: Object.assign({}, cur, patch) });
    return this.save({ opts: next });
  },

  optsOf(id) {
    const s = this._cache || AEXT_DEFAULTS;
    return (s.opts && s.opts[id]) || (AEXT_DEFAULTS.opts && AEXT_DEFAULTS.opts[id]) || {};
  },

  async reset() {
    this._cache = {};
    if (this._alive()) {
      try { await chrome.storage.sync.remove(AEXT_STORE_KEY); } catch (e) { /* ignore */ }
      try { await chrome.storage.local.remove([AEXT_THEMES_KEY, AEXT_OPTS_KEY]); } catch (e) { /* ignore */ }
    }
    const next = this._merge(AEXT_DEFAULTS, {});
    this._emit(next);
    return next;
  },

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._ensureWatch();
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter((f) => f !== fn); };
  },

  _emit(next) {
    this._cache = next;
    const merged = this._merge(AEXT_DEFAULTS, next);
    for (const fn of this._subs.slice()) {
      try { fn(merged); } catch (e) { console.error('[ArenaKit] settings subscriber failed', e); }
    }
  },

  _ensureWatch() {
    if (this._watching) return;
    if (!this._alive() || !chrome.storage || !chrome.storage.onChanged) return;
    this._watching = true;
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        try {
          if (area === 'sync' && changes[AEXT_STORE_KEY]) {
            const slim = Object.assign({}, changes[AEXT_STORE_KEY].newValue || {});
            delete slim.customThemes;
            delete slim.opts;
            const cur = this._cache || {};
            this._emit(Object.assign({}, cur, slim, {
              customThemes: cur.customThemes || [],
              opts: cur.opts || {}
            }));
            return;
          }
          if (area === 'local' && (changes[AEXT_THEMES_KEY] || changes[AEXT_OPTS_KEY])) {
            const cur = this._cache || {};
            const next = Object.assign({}, cur);
            if (changes[AEXT_THEMES_KEY]) next.customThemes = changes[AEXT_THEMES_KEY].newValue || [];
            if (changes[AEXT_OPTS_KEY]) next.opts = this._merge(AEXT_DEFAULTS.opts, changes[AEXT_OPTS_KEY].newValue || {});
            this._emit(next);
          }
        } catch (e) {
          if (this._isDeadErr(e)) this._markDead();
        }
      });
    } catch (e) {
      this._watching = false;
      if (this._isDeadErr(e)) this._markDead();
    }
  },

  _merge(base, patch) {
    const out = Object.assign({}, base);
    for (const k of Object.keys(patch || {})) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const v = patch[k];
      if (
        v && typeof v === 'object' && !Array.isArray(v) &&
        base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])
      ) {
        out[k] = this._merge(base[k], v);
      } else {
        out[k] = v;
      }
    }
    if (out.theme === 'matrix') out.theme = 'hyper';
    if (out.theme === 'synthwave') out.theme = 'solar';
    if (out.theme === 'chatgpt' || out.theme === 'gemini') out.theme = 'claude';
    return out;
  }
};
