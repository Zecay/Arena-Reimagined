'use strict';
/* ArenaKit — theme definitions.
   arena.ai's whole UI is tokenized: surfaces, text, borders, interactive
   elements and syntax colors all flow through CSS custom properties, and the
   site ships BOTH a light palette (:root) and a dark palette (.dark).

   Theme strategy (v0.1.1 — bulletproof):
     - the theme engine applies the tokens as INLINE styles with !important on
       <html>. Nothing arena's cascade can do beats an inline !important, so
       the theme survives re-renders, rehydration and arena's own theme code.
     - "light"          -> remove the .dark class: arena's own light UI appears.
     - "dark" themes    -> keep .dark, override the leaf tokens (they cascade
       through every hsl(var(--x)) usage on the page).

   Token formats: most are HSL triplets ("H S% L%", used as hsl(var(--x))).
   EXCEPTION: --base-color / --base-gradient-color are raw colors (hex).
   This file is also loaded by the popup and options page (no chrome APIs). */

const AextThemes = (() => {
  const H = (h, s, l) => h + ' ' + s + '% ' + l + '%';

  /* ------------------------------------------------------------------ */
  /* 1. MIDNIGHT — deep blue-black, calm and "premium"                   */
  /* ------------------------------------------------------------------ */
  const midnight = {
    // surfaces (structure mirrors arena's dark palette)
    'surface-primary': H(228, 26, 9),
    'surface-secondary': H(228, 24, 13),
    'surface-tertiary': H(228, 22, 8),
    'surface-raised': H(228, 22, 18),
    'surface-raised-alt': H(228, 22, 18),
    'surface-raised-tertiary': H(228, 20, 12),
    'surface-floating': H(228, 24, 14),
    'surface-highlight': H(228, 22, 18),
    'surface-skeleton': H(228, 16, 20),
    // text
    'text-primary': H(219, 30, 93),
    'text-secondary': H(220, 22, 84),
    'text-tertiary': H(220, 15, 75),
    'text-muted': H(220, 12, 60),
    'text-placeholder': H(219, 30, 93) + '/32%',
    // borders
    'border-faint': H(228, 20, 16),
    'border-faint-solid': H(228, 20, 16),
    'border-medium': H(228, 16, 22),
    'border-strong': H(228, 14, 28),
    // headers
    'header-primary': H(0, 0, 100),
    'header-secondary': H(219, 30, 93),
    // interactive
    'interactive-cta': H(217, 88, 52),
    'interactive-cta-hover': H(217, 88, 48),
    'interactive-cta-active': H(217, 86, 44),
    'interactive-cta-focus': H(217, 88, 52),
    'interactive-on-cta': H(0, 0, 100),
    'interactive-cta-secondary': H(228, 22, 18),
    'interactive-cta-secondary-hover': H(228, 20, 24),
    'interactive-cta-secondary-active': H(228, 18, 30),
    'interactive-normal': H(220, 22, 84),
    'interactive-active': H(0, 0, 100),
    'interactive-inverted': H(228, 26, 9),
    'interactive-on-inverted': H(0, 0, 98),
    'interactive-link': H(217, 91, 66),
    'interactive-positive': H(150, 60, 55),
    'interactive-negative': H(3, 70, 62),
    'interactive-warning': H(45, 95, 55),
    'interactive-purple': H(271, 70, 70),
    'interactive-pink': H(330, 85, 70),
    // highlight (selected text etc.)
    'highlight-background': H(45, 95, 52),
    'highlight-text': H(228, 26, 9),
    // raw colors (hex!)
    'base-color': '#5b6b8c',
    'base-gradient-color': '#60a5fa',
    // syntax (code highlighting)
    'syntax-red': H(3, 70, 65),
    'syntax-blue': H(217, 91, 65),
    'syntax-green': H(150, 60, 60),
    'syntax-yellow': H(45, 90, 60),
    'syntax-light-blue': H(210, 70, 70),
    'syntax-teal': H(180, 55, 55),
    'syntax-pink': H(330, 70, 70),
    'syntax-purple': H(270, 65, 72)
  };

  /* ------------------------------------------------------------------ */
  /* 2. HYPER CONTRAST — pitch black, neon cyan, extra round             */
  /* ------------------------------------------------------------------ */
  const hyper = {
    'surface-primary': '0 0% 0%',
    'surface-secondary': '0 0% 5%',
    'surface-tertiary': '0 0% 0%',
    'surface-raised': '0 0% 10%',
    'surface-raised-alt': '0 0% 10%',
    'surface-raised-tertiary': '0 0% 8%',
    'surface-floating': '0 0% 14%',
    'surface-highlight': '0 0% 10%',
    'surface-skeleton': '0 0% 12%',
    'text-primary': '0 0% 100%',
    'text-secondary': '0 0% 90%',
    'text-tertiary': '0 0% 75%',
    'text-muted': '0 0% 55%',
    'text-placeholder': '0 0% 100%/32%',
    'border-faint': '0 0% 20%',
    'border-faint-solid': '0 0% 20%',
    'border-medium': '0 0% 40%',
    'border-strong': '0 0% 70%',
    'header-primary': '0 0% 100%',
    'header-secondary': '0 0% 90%',
    'interactive-cta': '184 100% 50%',
    'interactive-cta-hover': '184 100% 44%',
    'interactive-cta-active': '184 100% 38%',
    'interactive-cta-focus': '184 100% 50%',
    'interactive-on-cta': '0 0% 0%',
    'interactive-cta-secondary': '0 0% 10%',
    'interactive-cta-secondary-hover': '0 0% 16%',
    'interactive-cta-secondary-active': '0 0% 22%',
    'interactive-normal': '0 0% 90%',
    'interactive-active': '0 0% 100%',
    'interactive-inverted': '0 0% 0%',
    'interactive-on-inverted': '0 0% 100%',
    'interactive-link': '320 100% 60%',
    'interactive-positive': '145 100% 50%',
    'interactive-negative': '345 100% 55%',
    'interactive-warning': '50 100% 55%',
    'interactive-purple': '320 100% 60%',
    'interactive-pink': '320 100% 65%',
    'highlight-background': '184 100% 50%',
    'highlight-text': '0 0% 0%',
    'base-color': '#00f0ff',
    'base-gradient-color': '#ff00a0',
    'syntax-red': '345 100% 65%',
    'syntax-blue': '190 100% 65%',
    'syntax-green': '145 100% 55%',
    'syntax-yellow': '50 100% 55%',
    'syntax-light-blue': '190 100% 70%',
    'syntax-teal': '184 100% 50%',
    'syntax-pink': '320 100% 65%',
    'syntax-purple': '320 100% 65%'
  };

  /* ------------------------------------------------------------------ */
  /* 3. SOLAR GRID — pitch black, electric orange, gold, grid overlay    */
  /* ------------------------------------------------------------------ */
  const solar = {
    'surface-primary': '20 20% 1.5%',
    'surface-secondary': '20 15% 4.5%',
    'surface-tertiary': '20 20% 0.8%',
    'surface-raised': '20 12% 8%',
    'surface-raised-alt': '20 12% 8%',
    'surface-raised-tertiary': '20 14% 5%',
    'surface-floating': '20 12% 11%',
    'surface-highlight': '20 12% 8%',
    'surface-skeleton': '20 10% 10%',
    'text-primary': '0 0% 100%',
    'text-secondary': '20 10% 88%',
    'text-tertiary': '20 8% 72%',
    'text-muted': '20 5% 50%',
    'text-placeholder': '0 0% 100%/32%',
    'border-faint': '20 100% 50%/18%',
    'border-faint-solid': '20 100% 50%/18%',
    'border-medium': '20 100% 50%/40%',
    'border-strong': '20 100% 50%/70%',
    'header-primary': '0 0% 100%',
    'header-secondary': '20 10% 88%',
    'interactive-cta': '20 100% 50%',
    'interactive-cta-hover': '20 100% 44%',
    'interactive-cta-active': '20 100% 38%',
    'interactive-cta-focus': '20 100% 50%',
    'interactive-on-cta': '20 20% 1.5%',
    'interactive-cta-secondary': '20 12% 8%',
    'interactive-cta-secondary-hover': '20 12% 14%',
    'interactive-cta-secondary-active': '20 12% 18%',
    'interactive-normal': '20 10% 88%',
    'interactive-active': '0 0% 100%',
    'interactive-inverted': '20 20% 1.5%',
    'interactive-on-inverted': '0 0% 100%',
    'interactive-link': '42 100% 55%',
    'interactive-positive': '145 75% 55%',
    'interactive-negative': '350 90% 60%',
    'interactive-warning': '42 100% 55%',
    'interactive-purple': '270 85% 70%',
    'interactive-pink': '350 90% 65%',
    'highlight-background': '42 100% 55%',
    'highlight-text': '20 20% 1.5%',
    'base-color': '#ff5500',
    'base-gradient-color': '#ffb300',
    'syntax-red': '350 90% 65%',
    'syntax-blue': '195 90% 65%',
    'syntax-green': '145 75% 60%',
    'syntax-yellow': '42 100% 60%',
    'syntax-light-blue': '195 90% 70%',
    'syntax-teal': '180 70% 50%',
    'syntax-pink': '350 90% 65%',
    'syntax-purple': '270 85% 70%'
  };


  /* ------------------------------------------------------------------ */
  /* RESKINS — Claude / ChatGPT / Gemini (homage palettes, not official) */
  /* ------------------------------------------------------------------ */
  const claude = {
    'surface-primary': H(30, 10, 10),
    'surface-secondary': H(30, 8, 14),
    'surface-tertiary': H(30, 12, 8),
    'surface-raised': H(30, 8, 17),
    'surface-raised-alt': H(30, 8, 17),
    'surface-raised-tertiary': H(30, 10, 12),
    'surface-floating': H(30, 8, 16),
    'surface-highlight': H(30, 8, 17),
    'surface-skeleton': H(30, 6, 20),
    'text-primary': H(40, 28, 94),
    'text-secondary': H(36, 12, 78),
    'text-tertiary': H(36, 8, 64),
    'text-muted': H(32, 6, 52),
    'text-placeholder': H(40, 28, 94) + '/32%',
    'border-faint': H(30, 8, 18),
    'border-faint-solid': H(30, 8, 18),
    'border-medium': H(30, 8, 24),
    'border-strong': H(30, 8, 32),
    'header-primary': H(40, 30, 96),
    'header-secondary': H(40, 28, 94),
    'interactive-cta': H(16, 62, 58),
    'interactive-cta-hover': H(16, 62, 52),
    'interactive-cta-active': H(16, 58, 46),
    'interactive-cta-focus': H(16, 62, 58),
    'interactive-on-cta': H(0, 0, 100),
    'interactive-cta-secondary': H(30, 8, 17),
    'interactive-cta-secondary-hover': H(30, 8, 22),
    'interactive-cta-secondary-active': H(30, 8, 26),
    'interactive-normal': H(36, 12, 78),
    'interactive-active': H(40, 30, 96),
    'interactive-inverted': H(30, 10, 10),
    'interactive-on-inverted': H(40, 28, 94),
    'interactive-link': H(16, 50, 68),
    'interactive-positive': H(150, 35, 48),
    'interactive-negative': H(6, 62, 56),
    'interactive-warning': H(32, 70, 55),
    'interactive-purple': H(270, 25, 62),
    'interactive-pink': H(16, 62, 58),
    'highlight-background': H(16, 62, 58),
    'highlight-text': H(30, 10, 10),
    'base-color': '#3a3734',
    'base-gradient-color': '#d97757',
    'syntax-red': H(6, 62, 58),
    'syntax-blue': H(210, 40, 62),
    'syntax-green': H(150, 35, 52),
    'syntax-yellow': H(32, 70, 58),
    'syntax-light-blue': H(200, 35, 68),
    'syntax-teal': H(170, 30, 50),
    'syntax-pink': H(340, 35, 62),
    'syntax-purple': H(270, 25, 64)
  };

  /* ------------------------------------------------------------------ */
  /* 4. SEPIA — warm paper light theme                                   */
  /* ------------------------------------------------------------------ */
  /* SEPIA — a genuinely warm parchment (clearly distinct from Arena Light,
     which is arena's near-white). Surfaces drop to a warm taupe/cream and the
     borders take on a subtle tan, so the whole page reads as old paper. Text
     stays dark-brown for readability (muted/tertiary kept >=4.5:1 on parchment). */
  const sepia = {
    'surface-primary': H(35, 40, 91),
    'surface-secondary': H(36, 45, 95),
    'surface-tertiary': H(34, 32, 84),
    'surface-raised': H(36, 38, 90),
    'surface-raised-alt': H(36, 36, 88),
    'surface-raised-tertiary': H(35, 33, 84),
    'surface-floating': H(36, 42, 94),
    'surface-highlight': H(36, 38, 90),
    'surface-skeleton': H(34, 22, 82),
    'text-primary': H(30, 18, 24),
    'text-secondary': H(30, 14, 36),
    'text-tertiary': H(30, 10, 38),
    'text-muted': H(30, 8, 39),
    'text-placeholder': H(30, 18, 24) + '/32%',
    'border-faint': H(35, 30, 82),
    'border-faint-solid': H(35, 30, 82),
    'border-medium': H(35, 25, 74),
    'border-strong': H(35, 20, 66),
    'header-primary': H(30, 16, 20),
    'header-secondary': H(30, 18, 24),
    'interactive-cta': H(28, 85, 38),
    'interactive-cta-hover': H(28, 90, 40),
    'interactive-cta-active': H(28, 80, 36),
    'interactive-cta-focus': H(28, 85, 38),
    'interactive-on-cta': H(0, 0, 100),
    'interactive-cta-secondary': H(38, 35, 90),
    'interactive-cta-secondary-hover': H(38, 30, 84),
    'interactive-cta-secondary-active': H(38, 25, 78),
    'interactive-normal': H(30, 14, 36),
    'interactive-active': H(30, 18, 24),
    'interactive-inverted': H(38, 45, 97),
    'interactive-on-inverted': H(30, 18, 24),
    'interactive-link': H(210, 70, 42),
    'interactive-positive': H(150, 50, 38),
    'interactive-negative': H(5, 62, 50),
    'interactive-warning': H(40, 92, 45),
    'interactive-purple': H(280, 45, 48),
    'interactive-pink': H(340, 55, 50),
    'highlight-background': H(45, 95, 60),
    'highlight-text': H(30, 18, 24),
    'base-color': '#b8a88c',
    'base-gradient-color': '#d97706',
    'syntax-red': H(5, 60, 50),
    'syntax-blue': H(210, 70, 45),
    'syntax-green': H(150, 45, 38),
    'syntax-yellow': H(40, 90, 45),
    'syntax-light-blue': H(210, 60, 55),
    'syntax-teal': H(180, 45, 40),
    'syntax-pink': H(340, 55, 50),
    'syntax-purple': H(280, 45, 48)
  };

  /* ------------------------------------------------------------------ */
  /* 5. LIGHT — arena's built-in light palette (just removes .dark)      */
  /* ------------------------------------------------------------------ */
  const light = {};

  return {
    default: {
      id: 'default', label: 'Arena Default', mode: 'default',
      tagline: 'The original look — untouched.',
      swatch: 'linear-gradient(135deg,#fafafa 0%,#27272a 55%,#3b82f6 130%)',
      tokens: null
    },
    light: {
      id: 'light', label: 'Light', mode: 'light',
      tagline: 'Clean light mode, straight from arena\u2019s own palette.',
      swatch: '#f4f4f5',
      tokens: light
    },
    sepia: {
      id: 'sepia', label: 'Sepia', mode: 'light',
      tagline: 'Warm parchment & tan tones — a real paper-and-ink feel.',
      swatch: 'linear-gradient(135deg,#f0e0c0 0%,#e4d3b1 45%,#8a6f4e 100%)',
      tokens: sepia
    },
    midnight: {
      id: 'midnight', label: 'Midnight', mode: 'dark',
      tagline: 'Deep blue-black with electric blue accents.',
      swatch: '#0e1526',
      tokens: midnight
    },
    hyper: {
      id: 'hyper', label: 'Hyper Contrast', mode: 'dark',
      tagline: 'Pitch black, neon cyan, extra-round chrome.',
      swatch: 'linear-gradient(135deg, #000000 0%, #00f0ff 100%)',
      tokens: hyper,
      extras: {
        radius: '20px',
        font: 'Inter, system-ui, sans-serif',
        fontMono: 'ui-monospace, SFMono-Regular, monospace',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
        selectionBg: '#00f0ff',
        selectionFg: '#000000',
        scrollbarWidth: '6px',
        scrollbarThumb: '#00f0ff',
        scrollbarTrack: '#000000',
        shadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
        glow: '0 0 24px rgba(0, 240, 255, 0.35)',
        backgroundImage: 'linear-gradient(180deg, #000000 0%, #050505 100%)',
        texture: 'none',
        textureOpacity: 0
      }
    },
    solar: {
      id: 'solar', label: 'Solar Grid', mode: 'dark',
      tagline: 'Pitch black, electric orange, gold links, grid overlay.',
      swatch: 'linear-gradient(135deg, #040200 0%, #ff5500 50%, #ffb300 100%)',
      tokens: solar,
      extras: {
        radius: '16px',
        font: 'Inter, system-ui, sans-serif',
        fontMono: 'ui-monospace, SFMono-Regular, monospace',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        selectionBg: '#ff5500',
        selectionFg: '#040200',
        scrollbarWidth: '7px',
        scrollbarThumb: '#ff5500',
        scrollbarTrack: '#040200',
        shadow: '0 12px 32px rgba(255, 85, 0, 0.2)',
        glow: '0 0 20px rgba(255, 85, 0, 0.35)',
        backgroundImage: 'linear-gradient(180deg, #040200 0%, #0d0600 100%)',
        texture: 'grid',
        textureOpacity: 0.12
      }
    },
    claude: {
      id: 'claude', label: 'Claude', mode: 'dark',
      tagline: 'Full reskin — warm Cowork dark, serif headlines, orange Let’s go send.',
      swatch: 'linear-gradient(135deg, #1c1b19 0%, #d97757 100%)',
      tokens: claude,
      extras: {
        radius: '18px',
        font: 'Libre Franklin, ui-sans-serif, system-ui, sans-serif',
        fontMono: 'ui-monospace, SFMono-Regular, monospace',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap',
        selectionBg: '#d97757',
        selectionFg: '#1c1b19',
        scrollbarWidth: '8px',
        scrollbarThumb: '#d97757',
        scrollbarTrack: '#1c1b19',
        shadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
        glow: '0 0 0 3px rgba(217, 119, 87, 0.28)',
        backgroundImage: 'linear-gradient(180deg, #1c1b19 0%, #161513 100%)',
        texture: 'none',
        textureOpacity: 0,
        reskin: true
      }
    },
  };
})();

/* ---------------------------------------------------------------------- */
/* Custom-theme registry + import/export. Shared by the content script and  */
/* the popup/options pages (no chrome APIs needed here).                    */
/*                                                                          */
/* A theme is: { id, label, mode:'dark'|'light', tagline, swatch, tokens }  */
/* where `tokens` is an object of CSS custom-property values (the same      */
/* format as the built-in palettes). Import/export uses plain JSON so any    */
/* LLM can generate a compatible theme from a prompt.                       */
/* ---------------------------------------------------------------------- */

const AextCustomThemes = [];

function AextGetAllThemes() {
  const all = {};
  const take = (t) => {
    if (!t || typeof t !== 'object' || Array.isArray(t)) return;
    if (!t.id || !t.label) return;
    all[t.id] = t;
  };
  for (const t of Object.values(AextThemes)) take(t);
  for (const t of AextCustomThemes) take(t);
  return all;
}

const AextThemeIO = {
  /* The mode arena/next-themes would use for "system": the OS preference. */
  preferredMode() {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  },

  /* Single CSS value — no declaration breakout, no url(), no @import. */
  safeCss(s, max) {
    const t = String(s == null ? '' : s)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 400);
    if (!t) return '';
    if (/[;{}@\\<>]|javascript:|expression\s*\(|url\s*\(/i.test(t)) return '';
    return t;
  },

  safeSwatch(s) {
    const fallback = 'linear-gradient(135deg,#3b82f6,#8b5cf6)';
    const t = this.safeCss(s, 180);
    if (!t) return fallback;
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t)) return t;
    if (/^(transparent|currentcolor)$/i.test(t)) return t;
    if (/^(rgb|rgba|hsl|hsla|hwb)\(/i.test(t)) return t;
    if (/^(linear|radial|conic|repeating-linear|repeating-radial)-gradient\(/i.test(t)) return t;
    return fallback;
  },

  /* Parse & validate a theme from a JSON string OR object. Throws on error. */
  parse(input) {
    let o = input;
    if (typeof input === 'string') {
      const trimmed = input.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      try { o = JSON.parse(trimmed); } catch (e) { throw new Error('Invalid JSON — could not parse the theme file.'); }
    }
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Not a theme object.');
    const rawTokens = (o.tokens && typeof o.tokens === 'object' && !Array.isArray(o.tokens)) ? o.tokens : null;
    if (!rawTokens) throw new Error("A theme needs a 'tokens' object (CSS custom-property values).");
    const tokens = {};
    for (const k of Object.keys(rawTokens)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (!/^[a-z][a-z0-9-]{0,63}$/i.test(k)) continue;
      const val = this.safeCss(rawTokens[k], 80);
      if (val) tokens[k] = val;
    }
    if (!Object.keys(tokens).length) throw new Error("A theme needs a 'tokens' object (CSS custom-property values).");
    const mode = o.mode === 'light' ? 'light' : 'dark';
    const name = String(o.name || o.label || 'Custom theme').trim().slice(0, 60) || 'Custom theme';
    const baseId = String(o.id || name).replace(/[^a-z0-9-]/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'theme';
    const swatch = this.safeSwatch(typeof o.swatch === 'string' ? o.swatch : '');
    const tagline = String(o.tagline || 'Imported custom theme').slice(0, 120) || 'Imported custom theme';
    const extrasIn = (o.extras && typeof o.extras === 'object' && !Array.isArray(o.extras)) ? o.extras : {};
    const extraMax = {
      radius: 24, font: 180, fontMono: 180,
      selectionBg: 80, selectionFg: 80,
      scrollbarWidth: 16, scrollbarThumb: 80, scrollbarTrack: 80,
      shadow: 160, glow: 160, backgroundImage: 500
    };
    const extras = {};
    for (const k of Object.keys(extraMax)) {
      if (!Object.prototype.hasOwnProperty.call(extrasIn, k)) continue;
      const val = this.safeCss(extrasIn[k], extraMax[k]);
      if (val) extras[k] = val;
    }
    if (Object.prototype.hasOwnProperty.call(extrasIn, 'texture')) {
      const tex = String(extrasIn.texture || 'none').toLowerCase();
      extras.texture = /^(none|dots|grid|noise)$/.test(tex) ? tex : 'none';
    }
    if (Object.prototype.hasOwnProperty.call(extrasIn, 'textureOpacity')) {
      extras.textureOpacity = Math.max(0, Math.min(0.35, Number(extrasIn.textureOpacity) || 0));
    }
    if (typeof extrasIn.fontUrl === 'string' && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(extrasIn.fontUrl)) {
      extras.fontUrl = extrasIn.fontUrl.slice(0, 400);
    }
    const id = baseId.indexOf('custom-') === 0 ? baseId : 'custom-' + baseId;
    return { id, label: name, mode, tagline, swatch, tokens, extras };
  },

  serialize(theme) {
    const out = {
      name: theme.label || theme.name,
      mode: theme.mode,
      tagline: theme.tagline || '',
      swatch: theme.swatch || '',
      tokens: theme.tokens || {}
    };
    if (theme.extras && typeof theme.extras === 'object' && Object.keys(theme.extras).length) out.extras = theme.extras;
    return JSON.stringify(out, null, 2);
  },

  /* Full spec for the Theme docs button — send this to an AI to generate a theme.
     Any omitted extras fall back to Arena's own look. */
  specText() {
    return [
      'ArenaKit custom theme JSON. Missing keys keep Arena defaults.',
      '',
      '{',
      '  "name": "My theme",',
      '  "mode": "dark",          // "dark" or "light"',
      '  "tagline": "one-line description",',
      '  "swatch": "#0e1526",     // card preview (css color or gradient)',
      '  "tokens": {',
      '    // HSL triplets as "H S% L%" used in hsl(var(--token)).',
      '    // Only list tokens you want to change.',
      '    "surface-primary": "228 26% 9%",',
      '    "surface-secondary": "228 24% 13%",',
      '    "surface-tertiary": "228 22% 8%",',
      '    "surface-raised": "228 22% 18%",',
      '    "surface-raised-alt": "228 22% 18%",',
      '    "surface-floating": "228 24% 14%",',
      '    "text-primary": "219 30% 93%",',
      '    "text-secondary": "220 22% 84%",',
      '    "text-tertiary": "220 15% 75%",',
      '    "text-muted": "220 12% 60%",',
      '    "border-faint": "228 20% 16%",',
      '    "border-medium": "228 16% 22%",',
      '    "border-strong": "228 14% 28%",',
      '    "header-primary": "0 0% 100%",',
      '    "interactive-cta": "217 88% 52%",',
      '    "interactive-on-cta": "0 0% 100%",',
      '    "interactive-link": "217 91% 66%",',
      '    "interactive-negative": "3 70% 62%",',
      '    "interactive-positive": "150 60% 55%",',
      '    "highlight-background": "45 95% 52%",',
      '    "highlight-text": "228 26% 9%",',
      '    "base-color": "#5b6b8c",          // hex',
      '    "base-gradient-color": "#60a5fa",  // hex',
      '    "syntax-red": "3 70% 65%",',
      '    "syntax-blue": "217 91% 65%",',
      '    "syntax-green": "150 60% 60%",',
      '    "syntax-yellow": "45 90% 60%",',
      '    "syntax-purple": "270 65% 72%"',
      '  },',
      '  "extras": {',
      '    // ALL optional. Omit any key to keep the default.',
      '    "radius": "10px",         // also "0" / "0px" — applies to buttons, cards, menus, Tailwind rounded-*',
      '    "font": "Inter, ui-sans-serif, system-ui, sans-serif",',
      '    "fontMono": "ui-monospace, SFMono-Regular, Menlo, monospace",',
      '    "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",',
      '    "selectionBg": "#60a5fa",',
      '    "selectionFg": "#0b1220",',
      '    "scrollbarWidth": "8px",',
      '    "scrollbarThumb": "#3b82f6",',
      '    "scrollbarTrack": "transparent",',
      '    "shadow": "0 12px 40px rgba(0,0,0,.35)",',
      '    "glow": "0 0 24px rgba(96,165,250,.35)",',
      '    "backgroundImage": "linear-gradient(180deg, #0b1220, #111827)",',
      '    "texture": "none",          // none | dots | grid | noise — PAGE BACKGROUND only, never over the chat UI',
      '    "textureOpacity": 0.06',
      '  }',
      '}',
      '',
      'Notes: tokens drive colors. extras drive fonts, radii, scrollbars, selection,',
      'glow/shadow, and a page background/texture. Texture is a body background',
      '(behind opaque panels, never on top of the composer). Unknown keys are ignored.'
    ].join('\n');
  },

  /* Cleanly register a parsed theme object into the runtime list (dedupe by id).
     Does NOT persist — callers persist via AextSettings. */
  adopt(theme) {
    const i = AextCustomThemes.findIndex((t) => t.id === theme.id);
    if (i >= 0) AextCustomThemes[i] = theme; else AextCustomThemes.push(theme);
    return theme;
  }
};

try {
  globalThis.AextThemeIO = AextThemeIO;
  globalThis.AextThemes = AextThemes;
  globalThis.AextGetAllThemes = AextGetAllThemes;
} catch (e) { /* ignore */ }
