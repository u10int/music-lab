/** Small Web Audio engine shared by every interactive part of the app. */
export type OscType = OscillatorType
export type DrumKind = "kick" | "snare" | "clap" | "hat" | "ohat" | "shaker"
export interface ToneOptions {
  wave?: OscType
  env?: { a: number; d: number; s: number; r: number }
  cutoff?: number
  q?: number
  detune?: number
  level?: number
  /** Filter LFO: rate in Hz, depth in Hz of cutoff movement */
  lfo?: { rate: number; depth: number }
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null

/** Lazily create (and resume) the shared AudioContext. Call from a user gesture. */
export function audio(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(comp)
    comp.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}
export const masterBus = () => master!
export const noiseBuffer = () => noise!
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export function tone(c: BaseAudioContext, out: AudioNode, t: number, midi: number, gate: number, o: ToneOptions = {}) {
  const env = o.env ?? { a: 0.01, d: 0.3, s: 0.6, r: 0.3 }
  const a = Math.max(env.a, 0.003), d = Math.max(env.d, 0.01), r = Math.max(env.r, 0.02)
  const g = c.createGain()
  g.gain.value = 0
  const f = c.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.value = o.cutoff ?? 2400
  f.Q.value = o.q ?? 0.7
  f.connect(g)
  g.connect(out)
  const dets = o.detune ? [-o.detune, o.detune] : [0]
  const end = t + Math.max(gate, a + 0.01) + r * 4 + 0.05
  for (const dt of dets) {
    const x = c.createOscillator()
    x.type = o.wave ?? "sawtooth"
    x.frequency.value = mtof(midi)
    x.detune.value = dt
    const og = c.createGain()
    og.gain.value = 1 / dets.length
    x.connect(og)
    og.connect(f)
    x.start(t)
    x.stop(end)
  }
  if (o.lfo) {
    const l = c.createOscillator(), lg = c.createGain()
    l.frequency.value = o.lfo.rate
    lg.gain.value = o.lfo.depth
    l.connect(lg)
    lg.connect(f.frequency)
    l.start(t)
    l.stop(end)
  }
  const peak = o.level ?? 0.22, tg = t + Math.max(gate, a + 0.01)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.setTargetAtTime(peak * env.s, t + a, d / 3)
  g.gain.setTargetAtTime(0, tg, r / 3)
  return g
}

function noiseSrc(c: BaseAudioContext, t: number, dur: number) {
  const n = c.createBufferSource()
  n.buffer = noise
  n.start(t)
  n.stop(t + dur)
  return n
}

export function drum(c: BaseAudioContext, out: AudioNode, t: number, kind: DrumKind, vel = 1) {
  const g = c.createGain()
  g.connect(out)
  const decay = (peak: number, len: number) => {
    g.gain.setValueAtTime(peak * vel, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + len)
  }
  if (kind === "kick") {
    const o = c.createOscillator()
    o.type = "sine"
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    o.connect(g)
    decay(0.95, 0.38)
    o.start(t)
    o.stop(t + 0.4)
  } else if (kind === "snare" || kind === "clap") {
    const n = noiseSrc(c, t, 0.3), bp = c.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = kind === "clap" ? 1500 : 1900
    bp.Q.value = 0.9
    n.connect(bp)
    bp.connect(g)
    if (kind === "clap") {
      g.gain.setValueAtTime(0, t)
      for (const off of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(0.55 * vel, t + off)
        g.gain.setTargetAtTime(0.1 * vel, t + off + 0.002, 0.004)
      }
      g.gain.setTargetAtTime(0.0001, t + 0.03, 0.05)
    } else {
      decay(0.5, 0.18)
      const tn = c.createOscillator(), tg = c.createGain()
      tn.type = "triangle"
      tn.frequency.value = 190
      tg.gain.setValueAtTime(0.35 * vel, t)
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      tn.connect(tg)
      tg.connect(out)
      tn.start(t)
      tn.stop(t + 0.12)
    }
  } else {
    const len = kind === "ohat" ? 0.28 : kind === "shaker" ? 0.06 : 0.05
    const n = noiseSrc(c, t, len + 0.05), hp = c.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = kind === "shaker" ? 5000 : 7000
    n.connect(hp)
    hp.connect(g)
    decay(kind === "shaker" ? 0.14 : 0.22, len)
  }
}
export const KIND_OF: Record<string, DrumKind> = { Kick: "kick", Clap: "clap", Snare: "snare", Hat: "hat", "Open hat": "ohat", Shaker: "shaker" }

/** Play a single note right now, for pads and keys. */
export function playNote(midi: number, o: ToneOptions = {}, gate = 0.35) {
  const c = audio()
  if (!c) return
  tone(c, masterBus(), c.currentTime + 0.01, midi, gate, { wave: "triangle", env: { a: 0.005, d: 0.3, s: 0.4, r: 0.4 }, cutoff: 2600, level: 0.3, ...o })
}
export function hit(kind: DrumKind, vel = 1) {
  const c = audio()
  if (!c) return
  drum(c, masterBus(), c.currentTime + 0.02, kind, vel)
}
