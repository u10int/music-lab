/**
 * Building blocks for effect recipes: coloured noise, crackle, filters,
 * envelopes, a reverb and delay send, and a formant "voice" that stands in
 * for a vocal sample. Everything schedules on a given context at a given time,
 * so recipes can render a loop cycle at a time.
 */
import { mtof } from "./engine"

type Ctx = BaseAudioContext
const cache = new WeakMap<Ctx, Map<string, AudioBuffer>>()
function cached(c: Ctx, key: string, make: () => AudioBuffer) {
  let m = cache.get(c)
  if (!m) cache.set(c, (m = new Map()))
  if (!m.has(key)) m.set(key, make())
  return m.get(key)!
}

export type NoiseColor = "white" | "pink" | "brown"
/** Four seconds of looping noise in a colour. Pink is softer, brown is a low rumble. */
export function noiseOf(c: Ctx, color: NoiseColor): AudioBuffer {
  return cached(c, "noise-" + color, () => {
    const len = c.sampleRate * 4, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (color === "white") d[i] = w * 0.5
      else if (color === "pink") {
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11
      } else {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.2
      }
    }
    return b
  })
}

/** A looping noise source from t to end, returned so it can be filtered. */
export function noise(c: Ctx, t: number, end: number, color: NoiseColor = "white", rate = 1) {
  const s = c.createBufferSource()
  s.buffer = noiseOf(c, color)
  s.loop = true
  s.playbackRate.value = rate
  s.start(t, Math.random() * 3)
  s.stop(end)
  return s
}

/** Sparse random clicks and pops: vinyl crackle, fire, rain on glass. `density` is clicks per second. */
export function crackleBuffer(c: Ctx, density: number, soft = 0.5) {
  const key = `crackle-${Math.round(density)}-${soft.toFixed(2)}`
  return cached(c, key, () => {
    const secs = 4, len = c.sampleRate * secs, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0)
    const n = Math.round(density * secs)
    for (let k = 0; k < n; k++) {
      const at = Math.floor(Math.random() * (len - 400)), amp = Math.pow(Math.random(), 2.2) * (Math.random() < 0.06 ? 1 : 0.45)
      const width = 4 + Math.floor(Math.random() * (soft * 60 + 4)), sign = Math.random() < 0.5 ? -1 : 1
      for (let j = 0; j < width; j++) d[at + j] += sign * amp * Math.exp(-j / (width / 3)) * (j % 2 ? -0.6 : 1)
    }
    return b
  })
}
export function crackle(c: Ctx, t: number, end: number, density: number, soft = 0.5) {
  const s = c.createBufferSource()
  s.buffer = crackleBuffer(c, density, soft)
  s.loop = true
  s.start(t, Math.random() * 3)
  s.stop(end)
  return s
}

export function filter(c: Ctx, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}
export function gain(c: Ctx, v = 1) {
  const g = c.createGain()
  g.gain.value = v
  return g
}
export function panner(c: Ctx, v: number) {
  const p = c.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, v))
  return p
}
/** Chain nodes left to right and return the last. */
export function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}
/** Points are [time offset, value]. Linear between them, starting from the first. */
export function ramp(param: AudioParam, t: number, pts: [number, number][], curve: "lin" | "exp" = "lin") {
  param.cancelScheduledValues(t)
  param.setValueAtTime(pts[0][1], t + pts[0][0])
  for (const [dt, v] of pts.slice(1)) {
    if (curve === "exp") param.exponentialRampToValueAtTime(Math.max(0.0001, v), t + dt)
    else param.linearRampToValueAtTime(v, t + dt)
  }
}

/** A reverb send: returns the node to feed. Long, dark tail by default. */
export function reverb(c: Ctx, out: AudioNode, wet: number, secs = 3, dark = 0.6) {
  const buf = cached(c, `ir-${secs.toFixed(1)}-${dark}`, () => {
    const len = Math.floor(c.sampleRate * secs), ir = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        lp = lp + (w - lp) * (1 - dark * 0.85)
        d[i] = lp * Math.pow(1 - i / len, 2.6)
      }
    }
    return ir
  })
  const cv = c.createConvolver(), g = gain(c, wet)
  cv.buffer = buf
  cv.connect(g)
  g.connect(out)
  return cv
}
/** A feedback delay send. Time in seconds. */
export function delay(c: Ctx, out: AudioNode, time: number, fb: number, wet: number, tone = 2500) {
  const d = c.createDelay(4), f = gain(c, Math.min(0.92, fb)), t = filter(c, "bandpass", tone, 0.6), w = gain(c, wet)
  d.delayTime.value = Math.min(3.9, time)
  d.connect(t); t.connect(f); f.connect(d); t.connect(w); w.connect(out)
  return d
}

/* ---------- Voice ---------- */

export type Vowel = "a" | "e" | "i" | "o" | "u"
const FORMANTS: Record<Vowel, [number, number, number]> = {
  a: [730, 1090, 2440], e: [530, 1840, 2480], i: [300, 2200, 3000], o: [570, 840, 2410], u: [320, 870, 2240],
}
export interface VoiceOpts {
  /** Multiplies the formant frequencies: below 1 sounds bigger and darker, above 1 smaller and chipmunk-like. */
  formant?: number
  breath?: number
  vibrato?: number
  attack?: number
  release?: number
  level?: number
  /** Glide from this many semitones away at the start of the note. */
  scoop?: number
  /** Vowel to move to over the note. */
  to?: Vowel
  /** Bend this many semitones over the note. */
  bend?: number
}
/** A sung vowel: a buzzy source through three formant band-passes. Stands in for a vocal sample. */
export function sing(c: Ctx, out: AudioNode, t: number, midi: number, dur: number, vowel: Vowel, o: VoiceOpts = {}) {
  const f = mtof(midi), end = t + dur + (o.release ?? 0.08) + 0.05
  const src = c.createOscillator(), src2 = c.createOscillator()
  src.type = "sawtooth"; src2.type = "square"
  const sg = gain(c, 0.6), sg2 = gain(c, 0.25)
  for (const s of [src, src2]) {
    if (o.scoop) {
      s.frequency.setValueAtTime(f * Math.pow(2, o.scoop / 12), t)
      s.frequency.exponentialRampToValueAtTime(f, t + 0.09)
    } else s.frequency.setValueAtTime(f, t)
    if (o.bend) s.frequency.exponentialRampToValueAtTime(f * Math.pow(2, o.bend / 12), t + dur)
  }
  if (o.vibrato) {
    const v = c.createOscillator(), vg = gain(c, o.vibrato)
    v.frequency.value = 5.2
    v.connect(vg); vg.connect(src.detune); vg.connect(src2.detune)
    v.start(t + 0.15); v.stop(end)
  }
  const amp = gain(c, 0), lvl = (o.level ?? 0.5) * 0.6
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(lvl, t + (o.attack ?? 0.02))
  amp.gain.setValueAtTime(lvl, t + Math.max(dur, o.attack ?? 0.02))
  amp.gain.linearRampToValueAtTime(0, t + dur + (o.release ?? 0.08))
  const mix = gain(c, 1)
  src.connect(sg); src2.connect(sg2); sg.connect(mix); sg2.connect(mix)
  if (o.breath) {
    const n = noise(c, t, end, "white"), ng = gain(c, o.breath), hp = filter(c, "highpass", 1800)
    n.connect(hp); hp.connect(ng); ng.connect(mix)
  }
  const shift = o.formant ?? 1, fs = FORMANTS[vowel], to = o.to ? FORMANTS[o.to] : null
  ;[1, 0.45, 0.22].forEach((g, k) => {
    const bp = filter(c, "bandpass", fs[k] * shift, k === 0 ? 7 : 9), fg = gain(c, g * (k === 0 ? 3 : 4))
    if (to) bp.frequency.linearRampToValueAtTime(to[k] * shift, t + dur)
    mix.connect(bp); bp.connect(fg); fg.connect(amp)
  })
  amp.connect(out)
  src.start(t); src2.start(t); src.stop(end); src2.stop(end)
}

/** Note number for a scale degree around a base octave, in the key. */
export function degree(root: number, iv: number[], deg: number, oct = 4) {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7
  return 12 * (oct + 1 + o) + root + iv[d]
}

/** A detuned saw stack note with its own pitch and cutoff ramps. Used for risers, sirens and pads. */
export function saws(c: Ctx, out: AudioNode, t: number, dur: number, midi: number, o: { voices?: number; detune?: number; bend?: number; cutoff?: [number, number]; level?: number; attack?: number; type?: OscillatorType } = {}) {
  const n = o.voices ?? 5, g = gain(c, 0), lp = filter(c, "lowpass", o.cutoff?.[0] ?? 3000, 1)
  if (o.cutoff) lp.frequency.exponentialRampToValueAtTime(o.cutoff[1], t + dur)
  const f = mtof(midi), lvl = (o.level ?? 0.15) / Math.sqrt(n)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(lvl, t + (o.attack ?? 0.02))
  g.gain.setValueAtTime(lvl, t + dur - 0.03)
  g.gain.linearRampToValueAtTime(0, t + dur)
  for (let v = 0; v < n; v++) {
    const s = c.createOscillator()
    s.type = o.type ?? "sawtooth"
    s.frequency.setValueAtTime(f, t)
    if (o.bend) s.frequency.exponentialRampToValueAtTime(f * Math.pow(2, o.bend / 12), t + dur)
    s.detune.value = n > 1 ? ((v / (n - 1)) * 2 - 1) * (o.detune ?? 20) : 0
    s.connect(lp)
    s.start(t); s.stop(t + dur + 0.02)
  }
  lp.connect(g); g.connect(out)
  return g
}

/** Soft clipping distortion, 0–1. */
export function shaper(c: Ctx, amount: number) {
  const ws = c.createWaveShaper(), n = 1024, curve = new Float32Array(n), g = 1 + amount * 25
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * g) / Math.tanh(g) }
  ws.curve = curve
  ws.oversample = "2x"
  return ws
}
