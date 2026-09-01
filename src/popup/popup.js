'use strict';
/* ArenaKit — popup logic. */

const $ = (id) => document.getElementById(id);

async function renderThemeGrid(activeId) {
  const grid = $('theme-grid');
  grid.innerHTML = '';
  for (const t of Object.values(AextGetAllThemes())) {
    const card = document.createElement('button');
    card.className = 'theme-card' + (t.id === activeId ? ' active' : '');
    card.dataset.theme = t.id;
    card.title = t.tagline;

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = (AextThemeIO.safeSwatch ? AextThemeIO.safeSwatch(t.swatch) : t.swatch);

    const label = document.createElement('span');
    label.className = 't-label';
    label.textContent = t.label;

    const check = document.createElement('span');
    check.className = 't-check';
    check.textContent = t.id === activeId ? '\u2713' : '';

    card.appendChild(swatch);
    card.appendChild(label);
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
  const list = $('feature-list');
  list.innerHTML = '';

  const status = (await chrome.storage.local.get('arenakit.status'))['arenakit.status'] || {};

  for (const f of AEXT_FEATURES) {
    const enabled = settings.features[f.id] !== false;
    const row = document.createElement('label');
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

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = enabled;
    toggle.addEventListener('change', async () => {
      await AextSettings.setFeature(f.id, toggle.checked);
    });

    const st = status[f.id];
    const badge = document.createElement('span');
    badge.className = 'st-badge ' + (!st || st.ok ? 'ok' : 'err');
    badge.title = st && st.error ? st.error : '';
    badge.textContent = st && st.disabled ? 'off' : (!st || st.ok ? 'on' : 'err');

    row.appendChild(icon);
    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(toggle);
    list.appendChild(row);
  }
}

async function renderHealth() {
  const status = (await chrome.storage.local.get('arenakit.status'))['arenakit.status'] || {};
  const bad = Object.values(status).filter((s) => s && s.ok === false);
  const el = $('health');
  el.className = 'health ' + (bad.length ? 'err' : 'ok');
  el.textContent = bad.length ? '\u26A0\uFE0F ' + bad.length : '\u2713';
  el.title = bad.length
    ? 'Some features failed to start:\n' + Object.entries(status)
        .filter(([, s]) => s && s.ok === false)
        .map(([id, s]) => id + ': ' + s.error).join('\n')
    : 'All features running';
}

document.addEventListener('DOMContentLoaded', async () => {
  $('version').textContent = 'v' + AEXT_META.version;
  const settings = await AextSettings.load();
  await renderThemeGrid(settings.theme);
  await renderFeatures();
  await renderHealth();

  $('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
});
