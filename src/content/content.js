'use strict';
/* ArenaKit — content script entry point (runs at document_start).
   Registers all features with the isolated runtime, then boots them.
   Feature modules self-register into window.__AEXT_FEATURES__ (loaded before this
   file via the manifest); we hand the WHOLE module to AextRuntime.register so
   live setEnabled() teardown stays attached. */

(function () {
  if (window.__arenakitLoaded) return;
  window.__arenakitLoaded = true;

  // 1) the core theme engine
  AextRuntime.register({
    id: 'theme',
    label: 'Theme & Colors',
    init: (ctx) => AextTheme.init(ctx)
  });

  // 2) every isolated feature module (scroll-lock, copy-code, folder-zip, ...)
  const modules = window.__AEXT_FEATURES__ || {};
  for (const [id, feat] of Object.entries(modules)) {
    if (feat && typeof feat.init === 'function') {
      if (!feat.id) feat.id = id;
      AextRuntime.register(feat);
    }
  }

  AextRuntime.initAll().then((status) => {
    console.log('[ArenaKit] initialized', status);
  });
})();
