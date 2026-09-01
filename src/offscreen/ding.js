'use strict';
/* Plays the run-complete chime while the arena.ai tab is in the background. */

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

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'aext-ding-play') return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = playChime._ac || (playChime._ac = new AC());
    const go = () => { try { playChime(c); } catch (e) { /* ignore */ } };
    if (c.state === 'suspended') c.resume().then(go).catch(go);
    else go();
  } catch (e) { /* ignore */ }
});
