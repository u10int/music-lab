import { drum, mtof, noiseBuffer, tone } from "./engine"

let VERB: { ctx: BaseAudioContext; ir: AudioBuffer } | null = null

export function verbBus(ctx: BaseAudioContext, out: AudioNode, wet: number) {
  if (!VERB || VERB.ctx !== ctx) {
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    VERB = { ctx, ir };
  }
  const mix = ctx.createGain(), cv = ctx.createConvolver(), wg = ctx.createGain();
  cv.buffer = VERB.ir; wg.gain.value = wet; mix.connect(out); mix.connect(cv); cv.connect(wg); wg.connect(out);
  return mix;
}

export function dotDelay(ctx: BaseAudioContext, out: AudioNode, time: number, fb: number, wet: number) {
  const inp = ctx.createGain(), d = ctx.createDelay(2), f = ctx.createGain(), hp = ctx.createBiquadFilter(), w = ctx.createGain();
  d.delayTime.value = time; f.gain.value = fb; hp.type = "bandpass"; hp.frequency.value = 1500; hp.Q.value = 0.5; w.gain.value = wet;
  inp.connect(out); inp.connect(d); d.connect(hp); hp.connect(f); f.connect(d); hp.connect(w); w.connect(out); return inp;
}

export function fmTone(ctx: BaseAudioContext, out: AudioNode, t: number, midi: number, dur: number, ratio: number, index: number, decay: number, level = 0.18) {
  const f = mtof(midi), c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  c.frequency.value = f; m.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * index * 0.05 + 1, t + decay * 0.5);
  m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(out);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  [c, m].forEach(o => { o.start(t); o.stop(t + Math.max(dur, decay) + 0.1); });
}

export function sineDrop(ctx: BaseAudioContext, out: AudioNode, t: number, f0: number, f1: number, drop: number, dur: number, level = 0.6, shape = false) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + drop);
  let node: AudioNode = o;
  if (shape) { const ws = ctx.createWaveShaper(), n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 4); } ws.curve = cv; o.connect(ws); node = ws; }
  node.connect(g); g.connect(out);
  g.gain.setValueAtTime(level, t); g.gain.setTargetAtTime(0, t + dur * 0.6, dur / 4);
  o.start(t); o.stop(t + dur + 0.5); return o;
}

export function noiseSweep(ctx: BaseAudioContext, out: AudioNode, t: number, dur: number, f0: number, f1: number, level: number, type: BiquadFilterType = "bandpass") {
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(); n.loop = true;
  const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
  n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.3);
}

export function cowbell(ctx: BaseAudioContext, out: AudioNode, t: number, semis: number, dur: number) {
  const k = Math.pow(2, semis / 12), g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100 * k; bp.Q.value = 1.4;
  [540, 800].forEach(f => { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = f * k; o.connect(bp); o.start(t); o.stop(t + dur + 0.1); });
  bp.connect(g); g.connect(out); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
}

const B = 60 / 124;
type Preview = (c: BaseAudioContext, o: AudioNode, t: number) => number

/** Rough browser sketches of each recipe. Each returns its length in seconds. */
export const PREVIEW: Record<string, Preview> = {
  "Sub bass": (c, o, t) => { [38, 41].forEach((n, i) => tone(c, o, t + i * 1.1, n, 1, { wave: "sine", env: { a: 0.005, d: 0.1, s: 1, r: 0.08 }, cutoff: 6000, level: 0.45 })); return 2.4; },
  "Reese bass": (c, o, t) => { tone(c, o, t, 38, 2.2, { wave: "sawtooth", env: { a: 0.01, d: 0.2, s: 1, r: 0.15 }, cutoff: 650, q: 1.2, detune: 30, level: 0.3, lfo: { rate: 0.6, depth: 250 } }); return 2.6; },
  "808 bass with slides": (c, o, t) => { const x = sineDrop(c, o, t, mtof(38) * 2, mtof(38), 0.05, 1.8, 0.55, true); x.frequency.setValueAtTime(mtof(38), t + 0.9); x.frequency.exponentialRampToValueAtTime(mtof(41), t + 1.0); return 2.3; },
  "Rolling progressive bass": (c, o, t) => { for (let i = 0; i < 8; i++) tone(c, o, t + (i + 0.5) * B, i < 4 ? 38 : 34, B * 0.4, { wave: "sawtooth", env: { a: 0.003, d: 0.15, s: 0, r: 0.05 }, cutoff: 900, q: 2, level: 0.3 }); return 8 * B + 0.4; },
  "Pluck": (c, o, t) => { const v = verbBus(c, o, 0.35); [62, 65, 69, 74, 69, 65, 62, 65].forEach((n, i) => tone(c, v, t + i * B / 2, n, 0.1, { wave: "sawtooth", env: { a: 0.003, d: 0.25, s: 0, r: 0.2 }, cutoff: 2500, q: 2, level: 0.16 })); return 4 * B + 2.6; },
  "Guitar-like pluck": (c, o, t) => { const v = verbBus(c, o, 0.25), d = dotDelay(c, v, 0.75 * B, 0.4, 0.4); [77, 62, 69, 77, 65, 69].forEach((n, i) => tone(c, d, t + i * 0.75 * B, n, 0.15, { wave: "sawtooth", env: { a: 0.002, d: 0.35, s: 0, r: 0.3 }, cutoff: 1800, level: 0.14 })); return 5 * B + 2.6; },
  "Supersaw lead": (c, o, t) => { const v = verbBus(c, o, 0.3); [[69, 0, 1.5], [67, 1.5, 0.5], [65, 2, 2]].forEach(([n, s, l]) => [25, 10].forEach(dt => tone(c, v, t + s * B, n, l * B * 0.95, { wave: "sawtooth", env: { a: 0.02, d: 0.2, s: 0.8, r: 0.25 }, cutoff: 5000, detune: dt, level: 0.08 }))); return 4 * B + 2.6; },
  "Phonk cowbell": (c, o, t) => { const v = verbBus(c, o, 0.15); [0, 3, 7, 5, 3, 2, 0, -2].forEach((s, i) => cowbell(c, v, t + i * B / 2, s, 0.3)); return 4 * B + 2.6; },
  "Bells and glassy keys": (c, o, t) => { const v = verbBus(c, o, 0.35); [81, 77, 74, 76].forEach((n, i) => fmTone(c, v, t + i * B, n, 1.4, 3.5, 2.2, 1.6)); return 4 * B + 2.8; },
  "Wide warm pad": (c, o, t) => { const v = verbBus(c, o, 0.45); [57, 62, 65, 69].forEach(n => tone(c, v, t, n, 2.4, { wave: "sawtooth", env: { a: 0.8, d: 1, s: 0.7, r: 1.4 }, cutoff: 1400, detune: 12, level: 0.07 })); return 5.6; },
  "Evolving pad": (c, o, t) => { const v = verbBus(c, o, 0.45); [57, 62, 65, 69].forEach(n => tone(c, v, t, n, 3, { wave: "sawtooth", env: { a: 0.6, d: 1, s: 0.8, r: 1.4 }, cutoff: 1200, q: 3, detune: 15, level: 0.07, lfo: { rate: 0.5, depth: 900 } })); return 6; },
  "Air and texture": (c, o, t) => { const v = verbBus(c, o, 0.6); noiseSweep(c, v, t, 3, 2500, 6000, 0.08); return 5.8; },
  "Electric piano": (c, o, t) => { const v = verbBus(c, o, 0.2); [[50, 0], [57, 0.02], [60, 0.04], [65, 0.06], [64, 0.08]].forEach(([n, s]) => fmTone(c, v, t + s, n, 2, 1, 1.1, 2.2, 0.1)); return 4.8; },
  "Marimba, kalimba and mallets": (c, o, t) => { const v = verbBus(c, o, 0.25); [74, 69, 65, 69, 74, 77, 74, 69].forEach((n, i) => { fmTone(c, v, t + i * B / 2, n, 0.4, 4, 0.6, 0.45, 0.16); }); return 4 * B + 2.6; },
  "Kick": (c, o, t) => { for (let i = 0; i < 4; i++) drum(c, o, t + i * B, "kick"); return 4 * B + 0.4; },
  "Claps and snares": (c, o, t) => { for (let i = 0; i < 2; i++) { drum(c, o, t + (i * 2 + 1) * B, "clap"); drum(c, o, t + (i * 2 + 1) * B + 0.012, "clap", 0.6); } return 4 * B + 0.4; },
  "Hats and rolls": (c, o, t) => { for (let i = 0; i < 6; i++) drum(c, o, t + i * B / 2, "hat", i % 2 ? 0.7 : 1); for (let k = 0; k < 6; k++) drum(c, o, t + 3 * B + k * B / 6, "hat", 0.5 + k * 0.08); return 4 * B + 0.3; },
  "Riser": (c, o, t) => { const v = verbBus(c, o, 0.5); noiseSweep(c, v, t, 3.5, 300, 9000, 0.25, "highpass"); tone(c, v, t, 50, 3.4, { wave: "sawtooth", env: { a: 3, d: 0.1, s: 1, r: 0.1 }, cutoff: 3000, level: 0.06 }); return 5.8; },
  "Impact and downlifter": (c, o, t) => { const v = verbBus(c, o, 0.5); sineDrop(c, v, t, 120, 32, 2, 2.4, 0.7); drum(c, v, t, "clap", 1); noiseSweep(c, v, t, 0.6, 6000, 400, 0.12); return 5; }
};
