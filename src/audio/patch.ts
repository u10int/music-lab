import { mtof, noiseBuffer } from "./engine"

/**
 * A small subtractive synth voice, rich enough to sketch genre sounds:
 * stacked detuned oscillators, sub and noise, a filter with its own envelope,
 * pitch envelope, glide, an LFO and drive.
 */
export interface Layer {
  wave: OscillatorType
  /** Unison voices, spread across `detune` cents. */
  voices?: number
  detune?: number
  level?: number
  /** Frequency multiplier, for metallic or FM-ish partials (cowbells, bells). */
  ratio?: number
  oct?: number
}
export interface Patch {
  layers: Layer[]
  sub?: number
  noise?: number
  filter: {
    type?: BiquadFilterType
    cutoff: number
    q?: number
    /** Hz added at the start of each note, falling back over `decay` seconds. */
    env?: number
    decay?: number
    /** Cutoff as a multiple of the note's frequency, instead of a fixed Hz. */
    track?: number
  }
  amp: { a: number; d: number; s: number; r: number }
  /** Pitch envelope: start this many semitones away and fall to the note. */
  pitch?: { semis: number; time: number }
  /** Slide time from the previous note, in seconds. */
  glide?: number
  lfo?: { target: "cutoff" | "amp" | "pitch"; beats?: number; rate?: number; depth: number; shape?: OscillatorType }
  /** 0–1 waveshaper drive. */
  drive?: number
  level?: number
}
export interface FxSettings {
  reverb?: number
  delay?: { beats: number; fb: number; wet: number }
  /** 0–1 sidechain-style ducking on every beat. */
  duck?: number
}

const curves = new Map<number, Float32Array<ArrayBuffer>>()
function driveCurve(amount: number) {
  const k = Math.round(amount * 20) / 20
  if (!curves.has(k)) {
    const n = 1024, c = new Float32Array(n), g = 1 + k * 18
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      c[i] = Math.tanh(x * g) / Math.tanh(g)
    }
    curves.set(k, c)
  }
  return curves.get(k)!
}

export function voice(c: BaseAudioContext, out: AudioNode, t: number, midi: number, dur: number, p: Patch, tempo: number, prev?: number) {
  const f = mtof(midi), { a, d, s, r } = p.amp
  const end = t + dur + Math.max(r, 0.02) * 5 + 0.05
  const mix = c.createGain()
  const filt = c.createBiquadFilter()
  filt.type = p.filter.type ?? "lowpass"
  filt.Q.value = p.filter.q ?? 0.7
  const base = Math.min(18000, p.filter.track ? f * p.filter.track : p.filter.cutoff)
  if (p.filter.env) {
    filt.frequency.setValueAtTime(Math.min(18000, base + p.filter.env), t)
    filt.frequency.setTargetAtTime(base, t, Math.max(0.01, (p.filter.decay ?? 0.2) / 3))
  } else filt.frequency.setValueAtTime(base, t)
  const amp = c.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(p.level ?? 0.2, t + Math.max(a, 0.002))
  amp.gain.setTargetAtTime((p.level ?? 0.2) * s, t + Math.max(a, 0.002), Math.max(d, 0.01) / 3)
  amp.gain.setTargetAtTime(0, t + Math.max(dur, a), Math.max(r, 0.02) / 3)
  mix.connect(filt)
  let node: AudioNode = filt
  if (p.drive) {
    const ws = c.createWaveShaper(), comp = c.createGain()
    ws.curve = driveCurve(p.drive)
    comp.gain.value = 1 / (1 + p.drive * 1.5)
    filt.connect(ws)
    ws.connect(comp)
    node = comp
  }
  node.connect(amp)
  let last: AudioNode = amp
  const oscs: OscillatorNode[] = []
  const freqAt = (target: number, o: OscillatorNode) => {
    if (prev !== undefined && p.glide) {
      o.frequency.setValueAtTime(target * (mtof(prev) / f), t)
      o.frequency.exponentialRampToValueAtTime(target, t + p.glide)
    } else if (p.pitch) {
      o.frequency.setValueAtTime(target * Math.pow(2, p.pitch.semis / 12), t)
      o.frequency.exponentialRampToValueAtTime(target, t + p.pitch.time)
    } else o.frequency.setValueAtTime(target, t)
  }
  for (const L of p.layers) {
    const n = Math.max(1, L.voices ?? 1), g = c.createGain()
    g.gain.value = (L.level ?? 1) / Math.sqrt(n)
    g.connect(mix)
    for (let v = 0; v < n; v++) {
      const o = c.createOscillator()
      o.type = L.wave
      freqAt(f * (L.ratio ?? 1) * Math.pow(2, L.oct ?? 0), o)
      o.detune.value = n > 1 ? ((v / (n - 1)) * 2 - 1) * (L.detune ?? 0) : 0
      o.connect(g)
      oscs.push(o)
    }
  }
  if (p.sub) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = "sine"
    freqAt(f / 2, o)
    g.gain.value = p.sub
    o.connect(g)
    g.connect(mix)
    oscs.push(o)
  }
  if (p.noise) {
    const n = c.createBufferSource(), g = c.createGain()
    n.buffer = noiseBuffer()
    n.loop = true
    g.gain.value = p.noise
    n.connect(g)
    g.connect(mix)
    n.start(t)
    n.stop(end)
  }
  if (p.lfo) {
    const l = c.createOscillator(), lg = c.createGain()
    l.type = p.lfo.shape ?? "sine"
    l.frequency.value = p.lfo.beats ? tempo / 60 / p.lfo.beats : p.lfo.rate ?? 1
    l.connect(lg)
    if (p.lfo.target === "cutoff") {
      lg.gain.value = p.lfo.depth
      lg.connect(filt.frequency)
    } else if (p.lfo.target === "pitch") {
      lg.gain.value = p.lfo.depth
      oscs.forEach((o) => lg.connect(o.detune))
    } else {
      const trem = c.createGain()
      trem.gain.value = 1 - p.lfo.depth / 2
      lg.gain.value = p.lfo.depth / 2
      lg.connect(trem.gain)
      amp.connect(trem)
      last = trem
    }
    l.start(t)
    l.stop(end)
  }
  last.connect(out)
  oscs.forEach((o) => {
    o.start(t)
    o.stop(end)
  })
}

/** Reverb and delay sends whose levels can change while a loop plays. */
export function fxChain(c: BaseAudioContext, out: AudioNode) {
  const input = c.createGain(), duck = c.createGain()
  duck.connect(out)
  input.connect(duck)
  // Delay: input -> delay -> tone filter -> feedback, tapped into the duck bus.
  const dl = c.createDelay(2), fb = c.createGain(), tone = c.createBiquadFilter(), dWet = c.createGain()
  tone.type = "bandpass"
  tone.frequency.value = 1800
  tone.Q.value = 0.5
  input.connect(dl)
  dl.connect(tone)
  tone.connect(fb)
  fb.connect(dl)
  tone.connect(dWet)
  dWet.connect(duck)
  // Reverb: a generated impulse response.
  const len = Math.floor(c.sampleRate * 2.8), ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  const cv = c.createConvolver(), rWet = c.createGain()
  cv.buffer = ir
  input.connect(cv)
  dWet.connect(cv)
  cv.connect(rWet)
  rWet.connect(duck)
  const set = (fx: FxSettings, tempo: number) => {
    rWet.gain.value = fx.reverb ?? 0
    dWet.gain.value = fx.delay?.wet ?? 0
    fb.gain.value = Math.min(0.85, fx.delay?.fb ?? 0)
    dl.delayTime.value = Math.min(1.9, (fx.delay?.beats ?? 0.75) * (60 / tempo))
  }
  return { input, duck, set }
}
