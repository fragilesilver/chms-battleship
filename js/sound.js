// ============================================================
//  sound.js  -  sound effects made with the Web Audio API,
//  so there are no audio files to upload.
// ============================================================
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

let ctx = null;
let muted = store.get("bs_muted") === "1";

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
// browsers only allow sound after the first tap or click
document.addEventListener("pointerdown", () => audio(), { once: true });

export const isMuted = () => muted;
export function setMuted(m) { muted = m; store.set("bs_muted", m ? "1" : "0"); }

function tone(freq, dur, { type = "sine", gain = 0.18, at = 0, to = null } = {}) {
  const a = audio(); if (!a || muted) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { gain = 0.3, at = 0, freq = 800, to = null, type = "lowpass" } = {}) {
  const a = audio(); if (!a || muted) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  fire()    { noise(0.35, { freq: 3000, to: 400, gain: 0.2, type: "bandpass" }); },
  miss()    { noise(0.5, { freq: 1200, to: 300, gain: 0.18, at: 0.25 }); tone(500, 0.25, { to: 180, gain: 0.06, at: 0.25 }); },
  hit()     { noise(0.7, { freq: 900, to: 60, gain: 0.5, at: 0.2 }); tone(120, 0.5, { type: "sawtooth", to: 40, gain: 0.12, at: 0.2 }); },
  sink()    { noise(1.4, { freq: 500, to: 40, gain: 0.55, at: 0.2 }); tone(90, 1.2, { type: "sawtooth", to: 30, gain: 0.15, at: 0.3 }); tone(60, 1.4, { to: 25, gain: 0.2, at: 0.5 }); },
  incoming(){ tone(880, 0.12, { type: "square", gain: 0.08 }); tone(660, 0.12, { type: "square", gain: 0.08, at: 0.15 }); tone(880, 0.12, { type: "square", gain: 0.08, at: 0.3 }); },
  correct() { tone(660, 0.12, { type: "triangle" }); tone(990, 0.2, { type: "triangle", at: 0.1 }); },
  wrong()   { tone(200, 0.3, { type: "square", gain: 0.07, to: 140 }); },
  power()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, { type: "triangle", at: i * 0.07 })); },
  sonar()   { tone(1400, 0.9, { gain: 0.15, to: 1350 }); tone(1400, 0.9, { gain: 0.06, at: 0.45, to: 1350 }); },
  storm()   { noise(2.2, { freq: 200, to: 1200, gain: 0.25 }); tone(70, 2, { type: "sawtooth", gain: 0.06, to: 50 }); },
  win()     { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.18, { type: "triangle", gain: 0.2, at: i * 0.16 })); },
};

// A small speaker button for the header
export function muteButton(el) {
  const draw = () => {
    el.textContent = muted ? "Sound off" : "Sound on";
    el.setAttribute("aria-pressed", String(!muted));
  };
  el.addEventListener("click", () => { setMuted(!muted); draw(); if (!muted) sfx.correct(); });
  draw();
}
