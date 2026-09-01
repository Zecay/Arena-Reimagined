'use strict';
/* ArenaKit — options page logic. */

const $ = (id) => document.getElementById(id);

async function renderThemeGrid(activeId) {
  const grid = $('theme-grid');
  grid.innerHTML = '';
  for (const t of Object.values(AextGetAllThemes())) {
    const card = document.createElement('button');
    card.className = 'theme-card' + (t.id === activeId ? ' active' : '');
    card.dataset.theme = t.id;

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = t.swatch;

    const info = document.createElement('span');
    info.className = 't-info';
    const label = document.createElement('span');
    label.className = 't-label';
    label.textContent = t.label;
    const tag = document.createElement('span');
    tag.className = 't-tag';
    tag.textContent = t.tagline;
    info.appendChild(label);
    info.appendChild(tag);

    const check = document.createElement('span');
    check.className = 't-check';
    check.textContent = t.id === activeId ? '\u2713' : '';

    card.appendChild(swatch);
    card.appendChild(info);
    card.appendChild(check);
    card.addEventListener('click', async () => {
      await AextSettings.setTheme(t.id);
      renderThemeGrid(t.id);
    });
    grid.appendChild(card);
  }
}

async function renderFeatures() {
  const settings = await AextSettings.load();
  const status = (await chrome.storage.local.get('arenakit.status'))['arenakit.status'] || {};
  const list = $('feature-list');
  list.innerHTML = '';

  for (const f of AEXT_FEATURES) {
    const enabled = settings.features[f.id] !== false;
    const st = status[f.id];

    const row = document.createElement('div');
    row.className = 'feat';

    const icon = document.createElement('span');
    icon.className = 'f-icon';
    icon.textContent = f.icon;

    const info = document.createElement('span');
    info.className = 'f-info';
    const name = document.createElement('span');
    name.className = 'f-name';
    name.textContent = f.name;
    const desc = document.createElement('span');
    desc.className = 'f-desc';
    desc.textContent = f.desc;
    info.appendChild(name);
    info.appendChild(desc);

    const badge = document.createElement('span');
    badge.className = 'st-badge ' + (!st || st.ok ? 'ok' : 'err');
    badge.textContent = st && st.disabled ? 'disabled' : (!st || st.ok ? 'running' : 'error');
    badge.title = st && st.error ? st.error : '';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = enabled;
    toggle.addEventListener('change', async () => {
      await AextSettings.setFeature(f.id, toggle.checked);
      await renderHealth();
    });

    row.appendChild(icon);
    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(toggle);
    list.appendChild(row);
  }
}

function renderScanDemo() {
  // Lightweight mirror of the real WCAG math, operating on the options page itself.
  const short = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex) || /^#?([0-9a-f]{3})$/i.exec(hex);
    if (!m) return null;
    let h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const lum = (c) => {
    const l = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

  const rows = [];
  const els = document.querySelectorAll('.feat .f-name, .theme-card .t-label, .check-row b, .card h2');
  els.forEach((el) => {
    const c = short(getComputedStyle(el).color);
    const bg = short((getComputedStyle(el).backgroundColor || '#121216'));
    if (!c) return;
    rows.push({ el: (el.textContent || '').slice(0, 40), ratio: ratio(c, bg || [18, 18, 22]) });
  });
  const fails = rows.filter((r) => r.ratio < 4.5);
  const out = $('scan-out');
  out.innerHTML = '<p class="muted">This page (ArenaKit options): ' +
    (rows.length - fails.length) + '/' + rows.length + ' sampled text nodes meet 4.5:1. ' +
    (fails.length ? fails.map((f) => '<code>' + f.el + ' (' + f.ratio.toFixed(2) + ')</code>').join(', ') : 'PASS') +
    '</p>';
}

async function renderHealth() {
  const status = (await chrome.storage.local.get('arenakit.status'))['arenakit.status'] || {};
  const list = $('health-list');
  list.innerHTML = '';

  const bad = Object.values(status).filter((s) => s && s.ok === false);

  if (!Object.keys(status).length) {
    list.innerHTML = '<p class="muted">No status yet — features report here as soon as they run on an arena.ai page.</p>';
  }

  for (const [id, st] of Object.entries(status)) {
    const row = document.createElement('div');
    row.className = 'hrow';
    const name = document.createElement('span');
    name.className = 'h-name';
    name.textContent = id;
    const state = document.createElement('span');
    state.className = 'h-state ' + (st.ok ? 'ok' : 'err');
    state.textContent = st.disabled ? 'disabled' : (st.ok ? 'ok' : 'error');
    row.appendChild(name);
    row.appendChild(state);
    if (st.error) {
      const err = document.createElement('pre');
      err.className = 'h-err';
      err.textContent = st.error;
      row.appendChild(err);
    }
    list.appendChild(row);
  }

  const dot = $('health-dot');
  const txt = $('health-text');
  if (bad.length) {
    dot.className = 'dot err';
    txt.textContent = bad.length + ' feature(s) failed — see Diagnostics';
  } else if (Object.keys(status).length) {
    dot.className = 'dot ok';
    txt.textContent = 'All features running';
  } else {
    dot.className = 'dot';
    txt.textContent = 'Waiting for an arena.ai page…';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $('version').textContent = 'v' + AEXT_META.version;
  $('tagline').textContent = AEXT_META.tagline;

  const settings = await AextSettings.load();
  await renderThemeGrid(settings.theme);
  await renderFeatures();
  await renderHealth();

  /* theme import/export */
  const all = AextGetAllThemes();
  const currentTheme = all[settings.theme] || all.default;
  $('theme-export').addEventListener('click', () => {
    const json = AextThemeIO.serialize(currentTheme);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'arenakit-theme-' + currentTheme.id + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  const importBox = $('theme-import-box');
  const errEl = $('theme-import-err');
  $('theme-import').addEventListener('click', () => importBox.classList.toggle('open'));
  $('theme-import-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    $('theme-json').value = await f.text();
  });
  const doImport = async () => {
    errEl.textContent = '';
    try {
      const theme = AextThemeIO.parse($('theme-json').value);
      const cur = await AextSettings.load();
      const list = (cur.customThemes || []).filter((t) => t.id !== theme.id);
      list.push(theme);
      await AextSettings.save({ customThemes: list, theme: theme.id });
      importBox.classList.remove('open');
      $('theme-json').value = '';
      location.reload();
    } catch (e) { errEl.textContent = e.message; }
  };
  $('theme-import-do').addEventListener('click', doImport);

  $('run-scan').addEventListener('click', renderScanDemo);
  renderScanDemo();

  $('recheck').addEventListener('click', async () => {
    $('recheck').textContent = 'Re-checking… (open/refresh arena.ai)';
    setTimeout(() => { $('recheck').textContent = 'Re-check features'; }, 1500);
    await renderHealth();
  });

  $('reset').addEventListener('click', async () => {
    if (!confirm('Reset all ArenaKit settings to defaults?')) return;
    await AextSettings.reset();
    location.reload();
  });
});
