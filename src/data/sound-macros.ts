import type { Macro } from "./genre-sounds"

/** Knob builders shared by the genre sound recipes. */
export const hz = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : Math.round(v) + " Hz")
export const pct = (v: number) => Math.round(v * 100) + "%"
export const ms = (v: number) => (v < 1 ? Math.round(v * 1000) + " ms" : v.toFixed(1) + " s")
export const cents = (v: number) => Math.round(v) + " cents"

// Reusable macros
export const cutoff = (value: number, min = 150, max = 6000): Macro => ({ id: "cutoff", label: "Cutoff", min, max, step: 1, value, fmt: hz, apply: (p, _f, v) => { p.filter.cutoff = v } })
export const reso = (value: number): Macro => ({ id: "reso", label: "Resonance", min: 0.5, max: 18, step: 0.1, value, fmt: (v) => v.toFixed(1), apply: (p, _f, v) => { p.filter.q = v } })
export const drive = (value: number): Macro => ({ id: "drive", label: "Drive", min: 0, max: 1, step: 0.01, value, fmt: pct, apply: (p, _f, v) => { p.drive = v } })
export const space = (value: number): Macro => ({ id: "space", label: "Reverb", min: 0, max: 0.8, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { f.reverb = v } })
export const detune = (value: number, max = 60): Macro => ({ id: "detune", label: "Detune", min: 0, max, step: 1, value, fmt: cents, apply: (p, _f, v) => { p.layers.forEach((l) => { if ((l.voices ?? 1) > 1) l.detune = v }) } })
export const envAmt = (value: number, max = 6000): Macro => ({ id: "env", label: "Filter envelope", min: 0, max, step: 10, value, fmt: hz, apply: (p, _f, v) => { p.filter.env = v } })
export const decay = (value: number, max = 1.5): Macro => ({ id: "decay", label: "Decay", min: 0.05, max, step: 0.01, value, fmt: ms, apply: (p, _f, v) => { p.amp.d = v; p.filter.decay = v } })
export const attack = (value: number): Macro => ({ id: "attack", label: "Attack", min: 0.003, max: 2, step: 0.005, value, fmt: ms, apply: (p, _f, v) => { p.amp.a = v } })
export const delayWet = (value: number): Macro => ({ id: "delay", label: "Delay", min: 0, max: 0.7, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { if (f.delay) f.delay.wet = v } })
export const glide = (value: number): Macro => ({ id: "glide", label: "Glide", min: 0, max: 0.3, step: 0.005, value, fmt: ms, apply: (p, _f, v) => { p.glide = v } })
export const lfoDepth = (value: number, max = 3000): Macro => ({ id: "lfo", label: "LFO depth", min: 0, max, step: 10, value, fmt: hz, apply: (p, _f, v) => { if (p.lfo) p.lfo.depth = v } })
export const RATES = [1, 0.5, 1 / 3, 0.25, 1 / 6, 0.125]
export const RATE_NAMES = ["1/4", "1/8", "1/8t", "1/16", "1/16t", "1/32"]
export const lfoRate = (value: number): Macro => ({ id: "rate", label: "Wobble rate", min: 0, max: 5, step: 1, value, fmt: (v) => RATE_NAMES[v], apply: (p, _f, v) => { if (p.lfo) p.lfo.beats = RATES[v] } })
export const pump = (value: number): Macro => ({ id: "pump", label: "Sidechain pump", min: 0, max: 0.95, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { f.duck = v } })

export const TRIAD = (r: number) => [r, r + 2, r + 4]
export const SEVENTH = (r: number) => [r, r + 2, r + 4, r + 6]

