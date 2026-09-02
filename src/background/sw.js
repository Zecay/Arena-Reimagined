'use strict';
/* ArenaKit service worker — third-party uploads (Litterbox / Catbox).
   Content scripts cannot POST cross-origin (CORS); the SW can with host_permissions. */

function fromB64(s) {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function asBlob(data, mime) {
  const type = mime || 'application/octet-stream';
  if (typeof data === 'string' && data.length) return new Blob([fromB64(data)], { type: type });
  if (data instanceof ArrayBuffer) return new Blob([data], { type: type });
  if (data instanceof Uint8Array) return new Blob([data], { type: type });
  if (Array.isArray(data)) return new Blob([new Uint8Array(data)], { type: type });
  throw new Error('Missing file data');
}

async function postForm(url, fields, file, name, mime) {
  const fd = new FormData();
  Object.keys(fields).forEach((k) => fd.append(k, fields[k]));
  fd.append('fileToUpload', asBlob(file, mime), name || 'file');
  const r = await fetch(url, { method: 'POST', body: fd });
  const text = (await r.text()).trim();
  if (!r.ok) throw new Error('HTTP ' + r.status + (text ? (': ' + text.slice(0, 180)) : ''));
  if (!/^https?:\/\//i.test(text)) throw new Error(text || 'Upload failed');
  return text;
}

async function upload(host, msg) {
  const name = msg.name || 'file';
  const mime = msg.mime || 'application/octet-stream';
  const data = msg.data;
  if (host === 'catbox') {
    return postForm('https://catbox.moe/user/api.php', { reqtype: 'fileupload' }, data, name, mime);
  }
  return postForm(
    'https://litterbox.catbox.moe/resources/internals/api.php',
    { reqtype: 'fileupload', time: '1h' },
    data,
    name,
    mime
  );
}

function playChime(ac) {
  const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 1;
  master.connect(ac.destination);
  function note(freq, start, dur, peak, type) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0 + start);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t0 + start);
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.02);
    g.gain.exponentialRampToValueAtTime(peak * 0.55, t0 + start + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(f);
    f.connect(g);
    g.connect(master);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.06);
  }
  note(784.0, 0.00, 0.42, 0.78, 'sine');
  note(784.0, 0.00, 0.42, 0.28, 'triangle');
  note(1046.5, 0.34, 0.48, 0.85, 'sine');
  note(1318.5, 0.70, 0.55, 0.90, 'sine');
  note(2637.0, 0.70, 0.40, 0.22, 'sine');
}

/* Firefox/Zen event pages have a window + AudioContext. Chrome service
   workers do not — they go through the offscreen document. */
function playHere() {
  try {
    const Win = typeof window !== 'undefined' ? window : null;
    const AC = (Win && (Win.AudioContext || Win.webkitAudioContext)) ||
      (typeof AudioContext !== 'undefined' && AudioContext) ||
      (typeof webkitAudioContext !== 'undefined' && webkitAudioContext);
    if (!AC) return false;
    const c = playHere._ac || (playHere._ac = new AC());
    const go = () => { try { playChime(c); } catch (e) { /* ignore */ } };
    if (c.state === 'suspended') c.resume().then(go).catch(go);
    else go();
    return true;
  } catch (e) { return false; }
}

async function ding() {
  if (playHere()) return;
  if (!chrome.offscreen) return;
  let created = false;
  try {
    const has = chrome.offscreen && (await chrome.offscreen.hasDocument());
    if (!has && chrome.offscreen) {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/ding.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play a short sound when an Agent run finishes in a background tab.'
      });
      created = true;
    }
  } catch (e) {
    try {
      if (chrome.offscreen) {
        await chrome.offscreen.createDocument({
          url: 'src/offscreen/ding.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Play a short sound when an Agent run finishes in a background tab.'
        });
        created = true;
      }
    } catch (e2) { /* already open */ }
  }
  if (created) await new Promise((r) => setTimeout(r, 120));
  try { await chrome.runtime.sendMessage({ type: 'aext-ding-play' }); }
  catch (e) { /* no offscreen listener yet */ }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'aext-ding') {
    ding().then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false })
    );
    return true;
  }
  if (msg.type !== 'aext-host-upload') return;
  const host = msg.host === 'catbox' ? 'catbox' : 'litterbox';
  upload(host, msg).then(
    (url) => sendResponse({ ok: true, url: url, host: host }),
    (err) => sendResponse({ ok: false, error: (err && err.message) || String(err) })
  );
  return true;
});
