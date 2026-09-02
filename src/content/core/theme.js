'use strict';
/* ArenaKit — theme engine (feature id: "theme").
   Tokens are applied as INLINE styles with !important on <html>. Inline
   !important cannot be beaten by anything in arena's cascade (no selector
   specificity, order, or re-render race can touch it). Mode classes are
   NORMALIZED to one (the active one) and never on <body>; arena's own mode
   class is remembered so "Arena Default" can be restored exactly.

   The quick theme switcher is NOT a floating FAB anymore — it lives inside the
   arena.ai composer toolbar as a native-looking button (see the "settings-panel"
   feature module), so there are no random floating buttons on the page. */

/* Component tokens arena derives FROM the leaf tokens (:root/.dark block).
   Arena's `.dark` redeclares these to fixed shadcn values (e.g. `--primary:
   0 0% 98%` = near-white, while `--primary-foreground: var(--interactive-on-cta)`
   is our white) — that mismatch is EXACTLY the white-on-white "Connect" CTA.
   We re-derive them from our theme tokens so every component combo keeps
   contrast. Scoped per-theme, applied inline !important. */
const AEXT_DERIVED = {
  '--background': 'surface-primary',
  '--foreground': 'text-primary',
  '--card': 'surface-secondary',
  '--card-foreground': 'text-primary',
  '--popover': 'surface-tertiary',
  '--popover-foreground': 'text-primary',
  '--primary': 'interactive-cta',
  '--primary-foreground': 'interactive-on-cta',
  '--secondary': 'interactive-cta-secondary',
  '--secondary-foreground': 'text-primary',
  '--muted': 'surface-raised-alt',
  '--muted-foreground': 'text-muted',
  '--accent': 'surface-tertiary',
  '--accent-foreground': 'interactive-normal',
  '--destructive': 'interactive-negative',
  '--destructive-foreground': 'interactive-inverted',
  '--border': 'border-faint',
  '--input': 'text-placeholder',
  '--ring': 'interactive-link',
  '--sidebar-background': 'surface-primary',
  '--sidebar-foreground': 'text-primary',
  '--sidebar-primary': 'interactive-cta',
  '--sidebar-primary-foreground': 'interactive-on-cta',
  '--sidebar-accent': 'surface-tertiary',
  '--sidebar-accent-foreground': 'text-primary',
  '--sidebar-border': 'border-faint',
  '--sidebar-ring': 'interactive-active'
};

/* Per-theme "fixup" CSS layer: remaps arena components that use hardcoded text
   utilities (Tailwind .text-zinc-*, .text-gray-*, .text-neutral-* — tuned for
   arena's own dark surfaces) and surface-tokens-as-text (e.g.
   .text-surface-secondary) onto our theme text tokens, so they stay readable on
   our custom surfaces. Scoped under html[aext-theme] so it only ever applies to
   a custom theme (never Arena Default). */
function buildFixupCss(themeId, mode) {
  const sel = (cls) => 'html[aext-theme="' + themeId + '"] body ' + cls;
  const surfaceAsText = ['.text-surface-primary', '.text-surface-secondary',
                         '.text-surface-tertiary', '.text-surface-floating',
                         '.text-surface-raised', '.text-surface-raised-alt',
                         '.text-surface-highlight', '.text-surface-skeleton'].map(sel).join(',');

  if (mode === 'dark') {
    const muted = ['.text-gray-300', '.text-gray-400', '.text-gray-500',
                   '.text-zinc-400', '.text-zinc-500',
                   '.text-neutral-400', '.text-neutral-500'].map(sel).join(',');
    const tertiary = ['.text-gray-600', '.text-gray-700', '.text-gray-800', '.text-gray-900',
                      '.text-zinc-600', '.text-zinc-700', '.text-zinc-800', '.text-zinc-900',
                      '.text-neutral-600', '.text-neutral-700', '.text-neutral-800', '.text-neutral-900'].map(sel).join(',');
    return (muted ? muted + '{color:hsl(var(--text-muted))}\n' : '') +
           (tertiary ? tertiary + '{color:hsl(var(--text-tertiary))}\n' : '') +
           (surfaceAsText ? surfaceAsText + '{color:hsl(var(--text-secondary))}' : '');
  } else {
    const lighter = ['.text-gray-300', '.text-gray-400', '.text-gray-500', '.text-gray-600',
                     '.text-zinc-300', '.text-zinc-400', '.text-zinc-500',
                     '.text-neutral-300', '.text-neutral-400', '.text-neutral-500'].map(sel).join(',');
    return (lighter ? lighter + '{color:hsl(var(--text-tertiary))}\n' : '') +
           (surfaceAsText ? surfaceAsText + '{color:hsl(var(--text-secondary))}' : '');
  }
}

const AEXT_FIXUP = {
  midnight: buildFixupCss('midnight', 'dark'),
  hyper: buildFixupCss('hyper', 'dark'),
  solar: buildFixupCss('solar', 'dark'),
  sepia: buildFixupCss('sepia', 'light'),
  claude: buildFixupCss('claude', 'dark')
};

const AextTheme = {
  current: null,
  _observer: null,
  _appliedTokens: [],
  _appliedDerived: [],
  /* The mode class arena had on <html> before ArenaKit touched it. Captured at
     the first apply. NOTE: at document_start arena hasn't re-hydrated yet, so
     <html> usually has NO light/dark class — we fall back to the OS preference
     (arena's next-themes defaults to "system"), which is what arena *would* set.
     That's what makes "Arena Default" reliably restore the right mode. */
  _nativeMode: null,

  async init(ctx) {
    // Load any imported/registered custom themes so they resolve by id.
    AextCustomThemes.length = 0;
    const custom = ctx.settings.customThemes || [];
    for (const t of custom) {
      try {
        const parsed = AextThemeIO.parse(t);
        if (parsed && parsed.id && parsed.label) AextCustomThemes.push(parsed);
      } catch (e) { /* skip invalid stored theme */ }
    }

    this.apply(ctx.settings.theme || 'default');

    // Live updates: changing the theme in the popup/options applies instantly.
    try {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          try {
            if (area !== 'sync' || !changes[AEXT_STORE_KEY]) return;
            const s = changes[AEXT_STORE_KEY].newValue || {};
            if (s.theme && s.theme !== this.current) this.apply(s.theme);
          } catch (e) { /* context gone */ }
        });
      }
    } catch (e) { /* Extension context invalidated — theme still applied above. */ }

    this._watchDarkClass();
    ctx.log('ready. theme =', this.current);
    return true;
  },

  /* Register & persist a custom theme, then apply it. Returns the theme. */
  async registerCustom(theme) {
    const clean = AextThemeIO.parse(theme);
    // replace by id
    const i = AextCustomThemes.findIndex((t) => t.id === clean.id);
    if (i >= 0) AextCustomThemes[i] = clean; else AextCustomThemes.push(clean);
    const all = AextSettings.load ? await AextSettings.load().catch(() => ({})) : {};
    const current = all.customThemes || [];
    const j = current.findIndex((t) => t.id === clean.id);
    if (j >= 0) current[j] = clean; else current.push(clean);
    await AextSettings.save({ customThemes: current, theme: clean.id });
    this.apply(clean.id);
    return clean;
  },

  /* Delete a CUSTOM theme (id starts with "custom-"). Falls back to Arena Default
     if the deleted theme was active. Returns true if a custom theme was removed. */
  async removeCustom(themeId) {
    if (!themeId || String(themeId).indexOf('custom-') !== 0) return false;
    // drop from runtime registry + storage
    const i = AextCustomThemes.findIndex((t) => t.id === themeId);
    if (i >= 0) AextCustomThemes.splice(i, 1);
    const all = AextSettings.load ? await AextSettings.load().catch(() => ({})) : {};
    const current = (all.customThemes || []).filter((t) => t.id !== themeId);
    const patch = { customThemes: current };
    if (this.current === themeId) { patch.theme = 'default'; this.apply('default'); }
    await AextSettings.save(patch);
    return true;
  },

  apply(themeId) {
    const map = AextGetAllThemes();
    const theme = map[themeId] || AextThemes.default;
    const root = document.documentElement;

    // Remember arena's own mode class before we first touch it.
    if (this._nativeMode === null) {
      this._nativeMode = root.classList.contains('dark') ? 'dark'
        : root.classList.contains('light') ? 'light'
        : AextThemeIO.preferredMode();
    }

    this.current = theme.id;
    root.setAttribute('aext-theme', theme.id); // for debugging only

    // 1) clear previous inline overrides (base + derived) and color-scheme
    for (const k of this._appliedTokens) root.style.removeProperty('--' + k);
    for (const k of this._appliedDerived) root.style.removeProperty('--' + k);
    this._appliedTokens = [];
    this._appliedDerived = [];
    root.style.removeProperty('color-scheme');

    // 2) apply theme tokens as inline !important — unbeatable by arena's CSS
    if (theme.tokens && Object.keys(theme.tokens).length) {
      for (const [k, v] of Object.entries(theme.tokens)) {
        try {
          root.style.setProperty('--' + k, v, 'important');
          this._appliedTokens.push(k);
        } catch (e) {
          console.warn('[ArenaKit:theme] skipped token --' + k, v, e);
        }
      }
      // 2b) re-derive arena's component tokens so every shadcn combo keeps
      //     contrast (fixes the white-on-white "Connect" CTA, etc.)
      for (const [derived, base] of Object.entries(AEXT_DERIVED)) {
        if (!theme.tokens[base]) continue;
        try {
          root.style.setProperty(derived, 'var(--' + base + ')', 'important');
          this._appliedDerived.push(derived);
        } catch (e) { /* non-fatal */ }
      }
      root.style.setProperty('color-scheme', theme.mode, 'important');
    }

    // 3) class state. CRITICAL: only <html> may carry a mode class, and only
    //    the ACTIVE one. Rule:
    //      dark theme  -> <html> has `dark`, never `light`
    //      light theme -> <html> has no `dark` (leave `light` to arena)
    //      default     -> restore arena's OWN mode class
    if (theme.mode === 'light') {
      root.classList.remove('dark');
    } else if (theme.mode === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else if (theme.id === 'default') {
      // "Arena Default": put back the exact class arena had on load. This fixes
      // the bug where switching Light/Sepia -> Default left the page stuck (the
      // native class was removed during a previous dark theme transition).
      root.classList.remove('dark');
      root.classList.remove('light');
      if (this._nativeMode === 'dark') root.classList.add('dark');
      else if (this._nativeMode === 'light') root.classList.add('light');
    }
    // <body> must never carry .dark/.light while a custom theme is active —
    // arena's `.dark{...}` palette would apply directly on body and override
    // everything inherited from <html>.
    if (theme.id !== 'default' && document.body) {
      document.body.classList.remove('dark');
      document.body.classList.remove('light');
    }

    // 4) fixup CSS layer (hardcoded utilities / surface-as-text)
    this._applyFixup(theme);
    this._applyExtras(theme);
    this._applyReskin(theme);
  },

  /* Reject CSS breakout from imported extras (no ; { } @ \\ url()). */
  _cssVal(s, max) {
    if (typeof AextThemeIO !== 'undefined' && typeof AextThemeIO.safeCss === 'function') {
      return AextThemeIO.safeCss(s, max);
    }
    const t = String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max || 400);
    if (/[;{}@\\<>]|javascript:|expression\s*\(|url\s*\(/i.test(t)) return '';
    return t;
  },

  _applyExtras(theme) {
    const id = 'arenakit-extras';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    const x = (theme && theme.extras) || {};
    if (theme.id === 'default' || !theme.tokens) {
      style.textContent = '';
      const oldFx = document.getElementById('aext-theme-fx');
      if (oldFx) oldFx.remove();
      const oldFont = document.getElementById('arenakit-font');
      if (oldFont) oldFont.remove();
      return;
    }
    const sel = 'html[aext-theme="' + theme.id + '"]';
    const bits = [];
    if (x.font) bits.push(sel + '{font-family:' + this._cssVal(x.font, 180) + '!important;}');
    if (x.fontMono) bits.push(sel + ' pre,' + sel + ' code,' + sel + ' kbd{font-family:' + this._cssVal(x.fontMono, 180) + '!important;}');
    /* "0" / "0px" must count — `if (x.radius)` is false for numeric 0. */
    if (x.radius != null && String(x.radius).trim() !== '') {
      let r = this._cssVal(String(x.radius).trim(), 24);
      if (/^\d+(\.\d+)?$/.test(r)) r += 'px';
      bits.push(sel + '{--radius:' + r + '!important;--radius-sm:' + r +
        '!important;--radius-md:' + r + '!important;--radius-lg:' + r +
        '!important;--radius-xl:' + r + '!important;}');
      /* Tailwind rounded-* lives on DIVs (composer, menus, cards), not just
         button/input — and those utilities beat an un-important element rule. */
      bits.push(
        sel + ' button,' + sel + ' input,' + sel + ' textarea,' + sel + ' select,' +
        sel + ' a,' + sel + ' [role="button"],' + sel + ' [role="dialog"],' +
        sel + ' [role="menu"],' + sel + ' [role="listbox"],' + sel + ' [role="tooltip"],' +
        sel + ' [role="tab"],' + sel + ' [role="tabpanel"],' +
        sel + ' [data-radix-popper-content-wrapper],' +
        sel + ' [data-radix-popper-content-wrapper] > *,' +
        sel + ' [data-slot],' +
        sel + ' [class*="rounded"]' +
        '{border-radius:' + r + '!important;' +
        'border-top-left-radius:' + r + '!important;border-top-right-radius:' + r + '!important;' +
        'border-bottom-left-radius:' + r + '!important;border-bottom-right-radius:' + r + '!important;}'
      );
    }
    const selBg = x.selectionBg || '';
    const selFg = x.selectionFg || '';
    if (selBg || selFg) {
      bits.push(sel + ' ::selection{background:' + this._cssVal(selBg || 'hsl(var(--highlight-background))', 80) +
        ';color:' + this._cssVal(selFg || 'hsl(var(--highlight-text))', 80) + ';}');
    }
    if (x.scrollbarThumb || x.scrollbarWidth) {
      const w = this._cssVal(x.scrollbarWidth || '8px', 16);
      const thumb = this._cssVal(x.scrollbarThumb || 'hsl(var(--border-strong))', 80);
      const track = this._cssVal(x.scrollbarTrack || 'transparent', 80);
      bits.push(sel + ',' + sel + ' *{scrollbar-width:thin;scrollbar-color:' + thumb + ' ' + track + ';}');
      bits.push(sel + ' ::-webkit-scrollbar{width:' + w + ';height:' + w + ';}');
      bits.push(sel + ' ::-webkit-scrollbar-thumb{background:' + thumb + ';border-radius:99px;}');
      bits.push(sel + ' ::-webkit-scrollbar-track{background:' + track + ';}');
    }
    if (x.shadow) bits.push(sel + ' [class*="shadow"],' + sel + ' #arenakit-settings-panel{box-shadow:' + this._cssVal(x.shadow, 160) + ';}');
    if (x.glow) bits.push(sel + ' :focus-visible{box-shadow:' + this._cssVal(x.glow, 160) + ';}');

    /* Texture + optional image are BODY BACKGROUNDS only — never a full-page
       overlay (that sat on top of the composer, then vanished under Arena on refresh). */
    const oldFx = document.getElementById('aext-theme-fx');
    if (oldFx) oldFx.remove();
    const layers = [];
    const sizes = [];
    const tex = String(x.texture || 'none').toLowerCase();
    const op = Math.max(0, Math.min(0.35, Number(x.textureOpacity) || 0.06));
    const ink = 'hsl(var(--text-primary)/' + op + ')';
    if (tex === 'dots') {
      layers.push('radial-gradient(circle,' + ink + ' 1px,transparent 1.2px)');
      sizes.push('16px 16px');
    } else if (tex === 'grid') {
      layers.push('linear-gradient(' + ink + ' 1px,transparent 1px)', 'linear-gradient(90deg,' + ink + ' 1px,transparent 1px)');
      sizes.push('24px 24px', '24px 24px');
    } else if (tex === 'noise') {
      layers.push('repeating-linear-gradient(0deg,' + ink + ' 0 1px,transparent 1px 3px)');
      sizes.push('auto');
    }
    if (x.backgroundImage) {
      const bg = this._cssVal(x.backgroundImage, 500);
      if (bg && /^(linear|radial|conic|repeating-linear|repeating-radial)-gradient\(/i.test(bg)) {
        layers.push(bg);
        sizes.push('auto');
      }
    }
    if (layers.length) {
      const shells = [
        sel + ' html',
        sel,
        sel + ' body',
        sel + ' #__next',
        sel + ' #root',
        sel + ' main',
        sel + ' aside',
        sel + ' body > div',
        sel + ' main > div',
        sel + ' [class*="min-h-screen"]',
        sel + ' [class*="h-screen"]'
      ].join(',');
      const img = layers.join(',');
      const sz = sizes.join(',');
      bits.push(shells + '{background-image:' + img + '!important;background-size:' + sz +
        '!important;background-attachment:fixed!important;background-repeat:repeat;}');
      const wipe = [
        sel + ' .editor-content',
        sel + ' [contenteditable]',
        sel + ' textarea',
        sel + ' input',
        sel + ' button',
        sel + ' .tiptap',
        sel + ' .ProseMirror',
        sel + ' [role="dialog"]',
        sel + ' [role="tooltip"]',
        sel + ' [data-radix-popper-content-wrapper]',
        sel + ' #arenakit-settings-panel',
        sel + ' #arenakit-settings-overlay',
        sel + ' #aext-ws-search',
        sel + ' .aext-followups',
        sel + ' pre',
        sel + ' code',
        sel + ' img',
        sel + ' svg',
        sel + ' video',
        sel + ' canvas'
      ].join(',');
      bits.push(wipe + '{background-image:none!important;}');
    }
    style.textContent = bits.join('\n');

    const fontUrl = String(x.fontUrl || '');
    let fontLink = document.getElementById('arenakit-font');
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(fontUrl)) {
      if (!fontLink) {
        fontLink = document.createElement('link');
        fontLink.id = 'arenakit-font';
        fontLink.rel = 'stylesheet';
        (document.head || document.documentElement).appendChild(fontLink);
      }
      fontLink.href = fontUrl;
    } else if (fontLink) fontLink.remove();
  },

  _applyReskin(theme) {
    const id = 'arenakit-reskin';
    let style = document.getElementById(id);
    const want = !!(theme && theme.extras && theme.extras.reskin && theme.id === 'claude');
    if (!want) {
      if (style) style.textContent = '';
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = this._reskinCss(theme.id);
  },

  /* Layout-level homage CSS. Never restyles our own panel/overlays.
     Does not inject fake product copy or logos. */
  _reskinCss(id) {
    const s = 'html[aext-theme="' + id + '"]';
    const skip = ':not(#arenakit-settings-panel):not(#arenakit-settings-overlay):not(#aext-host-dlg):not(#aext-ws-search)';
    const send = s + ' button[aria-label="Send message"],' + s + ' form button[type="submit"]';
    if (id === 'claude') {
      return [
        s + ' h1,' + s + ' h2,' + s + ' h3,' + s + ' [class*="font-heading"],' + s + ' .font-heading{font-family:"Source Serif 4","Iowan Old Style",Georgia,serif!important;font-weight:600!important;letter-spacing:-.03em!important;}',
        s + ' aside,' + s + ' [data-sidebar="sidebar"],' + s + ' [data-slot="sidebar"]{background-color:hsl(var(--surface-tertiary))!important;border-right:1px solid hsl(var(--border-faint))!important;}',
        s + ' form:has(textarea),' + s + ' form:has([contenteditable]),' + s + ' .editor-content{background:hsl(var(--surface-raised))!important;border:1px solid hsl(var(--border-medium))!important;border-radius:22px!important;box-shadow:0 12px 40px rgba(0,0,0,.3)!important;}',
        s + ' form:has(textarea) textarea,' + s + ' .editor-content [contenteditable]{background:transparent!important;box-shadow:none!important;}',
        send + '{background:hsl(var(--interactive-cta))!important;color:#fff!important;border:0!important;border-radius:999px!important;width:auto!important;min-width:76px!important;height:36px!important;padding:0 16px!important;}',
        send + ' svg{color:#fff!important;stroke:#fff!important;}',
        s + ' [role="dialog"]' + skip + ',' + s + ' [data-slot="card"]{border-radius:18px!important;border-color:hsl(var(--border-medium))!important;background:hsl(var(--surface-raised))!important;}'
      ].join('\n');
    }
    return '';
  },

  _applyFixup(theme) {
    // Radix/shadcn tooltips are often rendered in a portal at <body> level,
    // outside the component that triggered them. Cover all known portal and
    // tooltip shapes and force both background and foreground explicitly.
    /* Tooltips only — never [data-radix-popper] / [data-side] (those are menus too).
       header-primary is often white, which made tooltips white-on-white. */
    const tooltipCss = theme.id !== 'default' ? `
      html[aext-theme] [role="tooltip"],
      html[aext-theme] [data-slot="tooltip-content"]{
        background-color:hsl(var(--surface-floating))!important;
        color:hsl(var(--text-primary))!important;
        border-color:hsl(var(--border-medium))!important;
      }
      html[aext-theme] [role="tooltip"] *,
      html[aext-theme] [data-slot="tooltip-content"] :not(svg):not(polygon){
        color:hsl(var(--text-primary))!important;
      }
      html[aext-theme] [data-slot="tooltip-content"] svg,
      html[aext-theme] [data-slot="tooltip-content"] svg *,
      html[aext-theme] [data-slot="tooltip-content"] polygon,
      html[aext-theme] [role="tooltip"] svg,
      html[aext-theme] [role="tooltip"] polygon{
        fill:hsl(var(--surface-floating))!important;
        color:hsl(var(--surface-floating))!important;
        background-color:transparent!important;
        stroke:none!important;
      }
    ` : '';
    const css = (AEXT_FIXUP[theme.id] || '') + tooltipCss;
    if (!this._fixupStyle) {
      const s = document.createElement('style');
      s.id = 'arenakit-fixup';
      s.dataset.arenakit = 'fixup';
      document.head && document.head.appendChild(s);
      this._fixupStyle = s;
    }
    if (this._fixupStyle) this._fixupStyle.textContent = css;
  },

  /* Next.js / arena may re-add mode classes on route changes or rehydration,
     and may even touch the inline style of <html>. Watch both and keep the
     theme applied (auto-heal): <body> never carries a mode class; the active
     class on <html> is enforced; dark themes re-apply tokens if wiped. */
  _watchDarkClass() {
    if (this._observer) return;
    this._observer = new MutationObserver(() => {
      if (this._healing) return;
      this._healing = true;
      try {
      const theme = AextGetAllThemes()[this.current] || AextThemes.default;
      const root = document.documentElement;

      if (theme && theme.id !== 'default' && document.body) {
        if (document.body.classList.contains('dark')) document.body.classList.remove('dark');
        if (document.body.classList.contains('light')) document.body.classList.remove('light');
      }

      if (theme && theme.id !== 'default') {
        if (theme.mode === 'light' && root.classList.contains('dark')) {
          root.classList.remove('dark');
        } else if (theme.mode === 'dark') {
          if (root.classList.contains('light')) root.classList.remove('light');
          if (!root.classList.contains('dark')) root.classList.add('dark');
        }
      }

      if (theme && theme.tokens && this._appliedTokens.length) {
        const missing = this._appliedTokens.some((k) => {
          try { return root.style.getPropertyValue('--' + k) === ''; }
          catch (e) { return true; }
        });
        if (missing) this.apply(this.current);
      }
      } finally { this._healing = false; }
    });
    this._observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    if (document.body) {
      this._observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }
};

const AextThemeFeature = {
  id: 'theme',
  label: 'Theme & Colors',
  init: (ctx) => AextTheme.init(ctx)
};

try { globalThis.AextTheme = AextTheme; } catch (e) { /* ignore */ }
