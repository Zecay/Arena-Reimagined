'use strict';
/* ArenaKit — feature runtime.
   THE key architecture rule: every feature runs in isolation. If one feature
   throws during init, it is disabled for this session, logged, and reported in
   the settings UI — every other feature keeps working. A single bug can never
   take down the whole extension (or the arena.ai page).

   Feature toggles apply live (no refresh):
     - AextRuntime.isEnabled(id) is the in-memory source of truth
     - disabling STRIPS injected DOM (CSS-only hide is not enough: Arena rewrites
       <html class> and hover rules can beat an off-class)
     - enabling boots the feature if it has never run, then setEnabled(true) */

const AEXT_CORE_FEATURES = { theme: true, 'settings-panel': true };

const AextRuntime = {
  features: {},   // id -> { id, label, init(ctx), setEnabled?(on) }
  status: {},     // id -> { ok, disabled?, error? }
  _enabled: {},
  _booted: {},
  _settingsWatcher: false,

  register(feature) {
    if (!feature || !feature.id || typeof feature.init !== 'function') return;
    this.features[feature.id] = feature;
  },

  isEnabled(id) {
    if (AEXT_CORE_FEATURES[id]) return true;
    if (Object.prototype.hasOwnProperty.call(this._enabled, id)) return !!this._enabled[id];
    return true;
  },

  async initAll() {
    let settings;
    try {
      settings = await AextSettings.load();
    } catch (err) {
      console.error('[ArenaKit] settings unavailable, using defaults.', err);
      settings = { theme: 'default', fab: true, features: {} };
    }

    for (const [id, feature] of Object.entries(this.features)) {
      const enabled = AEXT_CORE_FEATURES[id] || (settings.features ? settings.features[id] !== false : true);
      this._enabled[id] = enabled;
      this._syncOffClass(id);
      if (!enabled) {
        this.status[id] = { ok: true, disabled: true };
        continue;
      }
      await this._bootOne(id, settings);
    }

    this._persistStatus();
    this._watchSettings();
    this._guardHtmlClass();
    return this.status;
  },

  async _bootOne(id, settings) {
    if (this._booted[id]) return;
    const feature = this.features[id];
    if (!feature) return;
    this._booted[id] = true;
    try {
      await feature.init({
        settings: settings,
        log: (...args) => console.log('[ArenaKit:' + id + ']', ...args)
      });
      this.status[id] = { ok: true, disabled: false };
    } catch (err) {
      this._booted[id] = false;
      const msg = (err && (err.message || String(err))) || 'unknown error';
      this.status[id] = { ok: false, disabled: false, error: msg };
      console.error('[ArenaKit:' + id + '] init failed — feature disabled for this session.', err);
    }
  },

  async setFeatureEnabled(id, on) {
    if (AEXT_CORE_FEATURES[id]) on = true;
    on = !!on;
    const was = this._enabled[id];
    this._enabled[id] = on;
    this._syncOffClass(id);
    if (on) {
      if (!this._booted[id]) {
        let settings = { features: {} };
        try { settings = await AextSettings.load(); } catch (e) { /* defaults */ }
        await this._bootOne(id, settings);
      }
      if (!(this.status[id] && this.status[id].ok === false)) {
        this.status[id] = { ok: true, disabled: false };
      }
    } else {
      this._stripInjected(id);
      if (!(this.status[id] && this.status[id].ok === false)) {
        this.status[id] = { ok: true, disabled: true };
      }
    }
    const feat = this.features[id];
    if (feat && typeof feat.setEnabled === 'function' && was !== on) {
      try { feat.setEnabled(on); } catch (e) {
        console.error('[ArenaKit:' + id + '] setEnabled failed', e);
      }
    }
    this._persistStatus();
  },

  /* Always remove our injected nodes when a feature turns off — don't trust CSS. */
  _stripInjected(id) {
    const sels = {
      'copy-code': '.aext-copy-wrap, button.aext-copy-btn',
      'folder-zip': 'span.aext-folder-zip',
      'long-input-txt': 'button.aext-txt-prompt',
      'finish-notify': '.aext-notify',
      'follow-ups': '.aext-followups',
      'pin-chats': '.aext-pin-badge, [data-aext-pinned], .aext-pin-menuitem',
      'agent-quota': 'span.aext-quota',
      'host-upload': '#aext-host-overlay',
      'workspace-search': '#aext-ws-search',
      novm: 'button.aext-novm'
    };
    const sel = sels[id];
    if (!sel || !document.querySelector) return;
    try { document.querySelectorAll(sel).forEach((el) => el.remove()); } catch (e) { /* ignore */ }
  },

  _syncOffClass(id) {
    try {
      document.documentElement.classList.toggle('aext-off-' + id, !this._enabled[id]);
    } catch (e) { /* ignore */ }
  },

  /* Arena/next-themes rewrites <html class> and would otherwise resurrect features. */
  _guardHtmlClass() {
    if (this._classGuard) return;
    this._classGuard = true;
    const sync = () => {
      for (const id of Object.keys(this._enabled)) this._syncOffClass(id);
    };
    try {
      const obs = new MutationObserver(sync);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (e) { /* ignore */ }
  },

  _persistStatus() {
    try { chrome.storage.local.set({ 'arenakit.status': this.status }); } catch (e) { /* non-fatal */ }
  },

  _watchSettings() {
    if (this._settingsWatcher) return;
    this._settingsWatcher = true;
    const apply = (features) => {
      features = features || {};
      for (const id of Object.keys(this.features)) {
        if (AEXT_CORE_FEATURES[id]) continue;
        const on = features[id] !== false;
        if (this._enabled[id] !== on) this.setFeatureEnabled(id, on);
      }
    };
    if (window.AextSettings && typeof AextSettings.subscribe === 'function') {
      AextSettings.subscribe((next) => apply((next && next.features) || {}));
    }
    // Backup: some contexts fire storage events without going through subscribe.
    try {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          try {
            if (area !== 'sync' || !changes[AEXT_STORE_KEY]) return;
            const next = (changes[AEXT_STORE_KEY].newValue || {}).features || {};
            apply(next);
          } catch (e) { /* context gone */ }
        });
      }
    } catch (e) { /* Extension context invalidated */ }
  },

  getStatus() { return this.status; }
};
