import { GENRE_GUIDE } from "@/data/genre-guide"
import { genreInfo } from "@/data/genres"
import { LANE_NOTE, PATTERNS, type Family, type Lane as DrumLane, type Pattern } from "@/data/patterns"
import { DEFAULTS, validate, type JamConfig } from "./recipe"
import { LANES } from "./styles"
import { chordIntervals, degreesToRoman, hashSeed, keyName, parseKey, parseProgression, rng, rootMidi, spell, voice, type Chord, type Key } from "./theory"
import { describe, IDS, NAMED_PROGRESSIONS, type Archetype, type BassStyle, type ChordColor, type ChordPattern, type LeadStyle, type PadStyle, type Voicing } from "./vocab"

export type LayerId = "chords" | "bass" | "pad" | "lead" | "drums"
export const LAYER_IDS: LayerId[] = ["drums", "bass", "chords", "pad", "lead"]
export const LAYER_NAME: Record<LayerId, string> = { chords: "Chords", bass: "Bass", pad: "Pad", lead: "Lead", drums: "Drums" }
/** MIDI channel per layer (0-based): drums on 10, as Drum Rack expects. */
export const LAYER_CHANNEL: Record<LayerId, number> = { bass: 1, chords: 2, lead: 3, pad: 4, drums: 9 }

/** A note: `step` counts 16ths from the start of the song; `vel` is 0–1. */
export interface JNote { step: number; len: number; midi: number; vel: number }
export interface JLayer { id: LayerId; notes: JNote[] }
export interface JSection { name: string; start: number; bars: number; layers: LayerId[] }
export interface Jam {
  config: JamConfig
  key: Key
  bpm: number
  bars: number
  /** Bars in one pass of the progression. */
  loopBars: number
  chords: { label: string; name: string }[]
  layers: JLayer[]
  sections: JSection[]
  drums?: Pattern
  explain: string[]
  warnings: string[]
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")

/** The style’s own patterns first, then its neighbours’. */
export function drumPatternsFor(f: string) {
  const near = genreInfo(f)?.near ?? []
  return [f, ...near].flatMap((fam) => PATTERNS.filter((p) => p.family === fam))
}

/** Every progression name a style understands: default, the style’s own moves, and the shared names. */
export function progressionNames(f: string): Record<string, string> {
  const info = genreInfo(f), guide = GENRE_GUIDE[f as Family]
  const iv = parseKey("C " + (info?.scale ?? "minor")).iv
  const out: Record<string, string> = { default: degreesToRoman(info?.prog ?? [0, 5, 2, 6], iv) }
  for (const m of guide?.moves ?? []) out[slug(m.name)] = degreesToRoman(m.prog, iv)
  return { ...out, ...NAMED_PROGRESSIONS }
}

/** Fill in every “auto” from the style, so the result says exactly what was cooked. */
export function resolveConfig(partial: Partial<JamConfig>): { config: JamConfig; key: Key; chords: Chord[]; drums?: Pattern; warnings: string[] } {
  const c: JamConfig = { ...DEFAULTS, ...partial }
  const warnings = validate(c)
  // Anything the vocabulary doesn’t know falls back to the style’s choice.
  for (const f of ["chord", "voicing", "pattern", "bass_style", "pad_style", "lead_style", "arrangement_archetype"] as const) if (!(IDS[f] as string[]).includes(c[f])) c[f] = "auto"
  for (const f of ["drum_density", "lead_density"] as const) if (!(IDS[f] as string[]).includes(c[f])) c[f] = "normal"
  if (!genreInfo(c.style)) c.style = "house"
  const info = genreInfo(c.style) ?? genreInfo("house")!
  const lane = LANES[info.id]
  const key = parseKey(c.key, info.scale)
  c.key = keyName(key)
  if (c.chord === "auto") c.chord = lane.chord
  if (c.voicing === "auto") c.voicing = lane.voicing
  if (c.pattern === "auto") c.pattern = lane.patterns[0]
  if (c.bass_style === "auto") c.bass_style = lane.basses[0]
  if (c.pad_style === "auto") c.pad_style = lane.pads[0]
  if (c.lead_style === "auto") c.lead_style = lane.leads[0]
  if (c.arrangement_archetype === "auto") c.arrangement_archetype = lane.archetype
  if (!c.bars_per_chord) c.bars_per_chord = lane.bpc ?? 1
  const pats = drumPatternsFor(info.id)
  let drums: Pattern | undefined
  if (c.drum_style === "auto") drums = pats[0]
  else {
    drums = PATTERNS.find((p) => p.id === c.drum_style)
    if (!drums) { warnings.push(`Unknown drum_style “${c.drum_style}”; used the style’s main pattern.`); drums = pats[0] }
  }
  c.drum_style = drums?.id ?? "none"
  if (c.bpm === "auto") {
    const mid = Math.round((info.tempo[0] + info.tempo[1]) / 2)
    c.bpm = drums && drums.tempo >= info.tempo[0] - 2 && drums.tempo <= info.tempo[1] + 2 ? drums.tempo : mid
  }
  const names = progressionNames(info.id)
  let prog = names[c.progression] ?? names[slug(c.progression)] ?? c.progression
  let chords: Chord[]
  try { chords = parseProgression(prog, key) } catch (e) {
    warnings.push((e as Error).message + " Used the style’s default progression.")
    prog = names.default
    chords = parseProgression(prog, key)
  }
  return { config: c, key, chords, drums, warnings }
}

function chordName(key: Key, ch: Chord, ints: number[]) {
  const root = spell(key, key.root + ch.root)
  const has = (n: number) => ints.includes(n)
  const q = ch.quality === "min" ? "m" : ch.quality === "dim" ? "dim" : ch.quality === "aug" ? "aug" : ""
  if (has(5) && !has(3) && !has(4)) return root + "sus4"
  if (has(2) && !has(3) && !has(4)) return root + "sus2"
  if (ints.length === 3 && has(12)) return root + "5"
  const sev = has(11) ? "maj7" : has(10) ? "7" : ""
  const ext = has(17) ? "11" : has(14) ? (sev ? "9" : "add9") : ""
  if (ch.quality === "dim" && has(10)) return root + "m7♭5"
  if (sev && ext && ext !== "add9") return root + q + (sev === "maj7" ? "maj" : "") + ext
  return root + q + sev + (ext === "add9" ? "(add9)" : "")
}

const euclid = (k: number, n: number) => Array.from({ length: n }, (_, i) => i).filter((i) => Math.floor((i * k) / n) !== Math.floor(((i - 1) * k) / n))

/** Rhythm of the chord layer within one chord’s span. `idx` set means play one note of the chord (arps). */
function chordRhythm(p: ChordPattern, span: number, n: number): { s: number; len: number; idx?: number; vel?: number }[] {
  const out: { s: number; len: number; idx?: number; vel?: number }[] = []
  const perBar = (fn: (b: number) => void) => { for (let b = 0; b < span; b += 16) fn(b) }
  switch (p) {
    case "sustain": out.push({ s: 0, len: span - 0.25 }); break
    case "half_bar": for (let s = 0; s < span; s += 8) out.push({ s, len: 7.5 }); break
    case "pulse_quarters": for (let s = 0; s < span; s += 4) out.push({ s, len: 3 }); break
    case "pulse_8ths": for (let s = 0; s < span; s += 2) out.push({ s, len: 1.5, vel: s % 4 ? 0.8 : 1 }); break
    case "offbeat_stabs": for (let s = 2; s < span; s += 4) out.push({ s, len: 1.2 }); break
    case "stabs_332": perBar((b) => [0, 3, 6, 8, 11, 14].forEach((s) => out.push({ s: b + s, len: 1.5 }))); break
    case "two_step_skip": perBar((b) => [0, 3, 6, 11, 14].forEach((s) => out.push({ s: b + s, len: 1.2, vel: s ? 0.85 : 1 }))); break
    case "push_pull": perBar((b) => { out.push({ s: b, len: 6 }, { s: b + 7, len: 1, vel: 0.7 }, { s: b + 10, len: 3.5, vel: 0.85 }) }); break
    case "gate_16ths": for (let s = 0; s < span; s++) out.push({ s, len: 0.6, vel: [1, 0.6, 0.8, 0.6][s % 4] }); break
    case "sidechain_gaps": for (let s = 1; s < span; s += 4) out.push({ s, len: 2.8 }); break
    case "broken": { const order = [0, 2, 1, 3, 2, 1, 3, 2]; for (let s = 0, i = 0; s < span; s += 2, i++) out.push({ s, len: 2.5, idx: order[i % 8] % n, vel: i % 4 ? 0.75 : 0.95 }); break }
    case "arp_up": for (let s = 0, i = 0; s < span; s++, i++) out.push({ s, len: 0.8, idx: i % (n + 1), vel: i % 4 ? 0.7 : 1 }); break
    case "arp_updown": { const seq = [...Array(n).keys(), ...Array.from({ length: Math.max(0, n - 2) }, (_, i) => n - 2 - i)]; for (let s = 0, i = 0; s < span; s++, i++) out.push({ s, len: 0.8, idx: seq[i % seq.length] + 1, vel: i % 4 ? 0.7 : 1 }); break }
    case "euclid_5_16": perBar((b) => euclid(5, 16).forEach((s) => out.push({ s: b + s, len: 1.2 }))); break
    case "euclid_7_16": perBar((b) => euclid(7, 16).forEach((s) => out.push({ s: b + s, len: 1, vel: s % 4 ? 0.75 : 1 }))); break
    case "dub_stab": perBar((b) => out.push({ s: b + 2, len: 1, vel: 0.9 })); break
  }
  return out
}

interface Ctx { key: Key; chords: Chord[]; ints: number[][]; bpc: number; loopSteps: number; c: JamConfig; seed: number }

function chordLayer(x: Ctx): JNote[] {
  const out: JNote[] = [], span = x.bpc * 16
  let prev: number[] | undefined
  x.chords.forEach((ch, i) => {
    let notes = voice(rootMidi(x.key, ch, x.c.octave), x.ints[i], x.c.voicing as Voicing, prev)
    // Keep chords in a usable register: no shrill tops, no muddy bottoms.
    while (Math.max(...notes) > 12 * (x.c.octave + 2) + 26 && Math.min(...notes) - 12 >= 12 * (x.c.octave + 1)) notes = notes.map((n) => n - 12)
    while (Math.min(...notes) < 12 * (x.c.octave + 1)) notes = notes.map((n) => n + 12)
    prev = notes
    for (const r of chordRhythm(x.c.pattern as ChordPattern, span, notes.length)) {
      if (r.idx === undefined) for (const m of notes) out.push({ step: i * span + r.s, len: r.len, midi: m, vel: (r.vel ?? 1) * 0.85 })
      else {
        const k = r.idx % (notes.length + 1)
        out.push({ step: i * span + r.s, len: r.len, midi: k === notes.length ? notes[0] + 12 : notes[k], vel: (r.vel ?? 1) * 0.85 })
      }
    }
  })
  return out
}

function bassLayer(x: Ctx): JNote[] {
  const out: JNote[] = [], span = x.bpc * 16, R = rng(x.seed + 11)
  const style = x.c.bass_style as BassStyle
  const keyRoot = 12 * (x.c.bass_octave + 2) + x.key.root
  // One acid riff for the whole loop, so it repeats like a 303 pattern.
  const acid = Array.from({ length: 16 }, (_, s) => ({ on: s === 0 || R.chance(0.68), iv: s === 0 ? 0 : R.pick([0, 0, 0, 12, 7, 10, 3]), slide: R.chance(0.22), accent: R.chance(0.3) }))
  x.chords.forEach((ch, i) => {
    let root = keyRoot + ch.root
    if (root > keyRoot + 7) root -= 12
    const fifth = root + 7, third = root + (ch.quality === "maj" ? 4 : 3)
    const next = x.chords[(i + 1) % x.chords.length]
    let nextRoot = keyRoot + next.root
    if (nextRoot > keyRoot + 7) nextRoot -= 12
    const at = (s: number, len: number, midi: number, vel = 1) => out.push({ step: i * span + s, len, midi, vel })
    const perBar = (fn: (b: number, last: boolean) => void) => { for (let b = 0; b < span; b += 16) fn(b, b + 16 >= span) }
    switch (style) {
      case "root": at(0, span - 0.25, root); break
      case "root_pulse": for (let s = 0; s < span; s += 4) at(s, 3, root); break
      case "octave_pulse": for (let s = 0; s < span; s += 2) at(s, 1.5, s % 4 ? root + 12 : root, s % 4 ? 0.8 : 1); break
      case "offbeat": for (let s = 2; s < span; s += 4) at(s, 1.6, root); break
      case "rolling": for (let s = 0; s < span; s++) if (s % 4) at(s, 0.8, root, s % 4 === 2 ? 1 : 0.8); break
      case "acid_303": for (let s = 0; s < span; s++) { const a = acid[s % 16]; if (a.on) at(s, a.slide ? 1.1 : 0.7, root + a.iv, a.accent ? 1 : 0.72) } break
      case "reese": at(0, span + 0.3, root); break
      case "sub_808": perBar((b, last) => { at(b, 6, root); at(b + 7, 2.5, root, 0.85); at(b + 10, last ? 4 : 5.5, root); if (last && nextRoot !== root) at(b + 14, 2.2, nextRoot, 0.8) }); break
      case "walking": perBar((b, last) => { at(b, 3.5, root); at(b + 4, 3.5, third, 0.85); at(b + 8, 3.5, fifth, 0.9); at(b + 12, 3.5, last ? nextRoot + (nextRoot > root ? -1 : 1) : third + 2, 0.8) }); break
      case "root_fifth": perBar((b) => { at(b, 3, root); at(b + 6, 2, fifth, 0.85); at(b + 8, 3, root); at(b + 12, 2, root + 12, 0.8) }); break
      case "pedal": at(0, span - 0.25, keyRoot > root + 6 ? keyRoot - 12 : keyRoot); break
      case "log_drum": perBar((b) => [[0, 0], [5, 12], [8, 0], [11, 7], [14, 12]].forEach(([s, iv]) => at(b + s, 1, root + iv, s ? 0.85 : 1))); break
      case "two_step": perBar((b) => { at(b, 2, root); at(b + 6, 1, root + 12, 0.8); at(b + 10, 2, root); at(b + 13, 1, fifth, 0.8) }); break
      case "half_time": perBar((b) => { at(b, 10, root); at(b + 11, 4.5, root, 0.85) }); break
      case "dembow": perBar((b) => { at(b, 3, root); at(b + 3, 1, root, 0.8); at(b + 8, 3, root); at(b + 11, 1, fifth, 0.8) }); break
    }
  })
  return out
}

function padLayer(x: Ctx): JNote[] {
  const out: JNote[] = [], span = x.bpc * 16, style = x.c.pad_style as PadStyle
  const base = 12 * (x.c.pad_octave + 2) + x.key.root
  if (style === "root_drone") {
    for (let s = 0; s < x.loopSteps; s += 64) for (const m of [base - 12, base - 5]) out.push({ step: s, len: Math.min(64, x.loopSteps - s) - 0.25, midi: m, vel: 0.55 })
    return out
  }
  let prev: number[] | undefined
  x.chords.forEach((ch, i) => {
    const root = rootMidi(x.key, ch, x.c.pad_octave)
    const notes = voice(root, x.ints[i].filter((n) => n < 12), "auto_voice_leading", prev)
    prev = notes
    const add = (midis: number[], vel: number) => midis.forEach((m) => out.push({ step: i * span, len: span - 0.25, midi: m, vel }))
    if (style === "sustain") add(notes, 0.6)
    else if (style === "swell") add(notes, 0.45)
    else if (style === "fifth_drone") add([root - 12, root - 5], 0.55)
    else if (style === "high_shimmer") add(notes.slice(-3).map((m) => m + 12), 0.4)
  })
  return out
}

const PENTA_MINOR = [0, 3, 5, 7, 10], PENTA_MAJOR = [0, 2, 4, 7, 9]

function leadLayer(x: Ctx): JNote[] {
  const style = x.c.lead_style as LeadStyle
  if (style === "none") return []
  const R = rng(x.seed + 101), span = x.bpc * 16
  const keep = { sparse: 0.55, normal: 0.85, busy: 1 }[x.c.lead_density as "sparse" | "normal" | "busy"] ?? 0.85
  const base = 12 * (x.c.lead_octave + 2) + x.key.root
  const minor = x.key.iv[2] === 3
  const scale = [-12, 0, 12].flatMap((o) => x.key.iv.map((v) => base + o + v)).filter((m) => m >= base - 5 && m <= base + 16)
  const penta = [-12, 0, 12].flatMap((o) => (minor ? PENTA_MINOR : PENTA_MAJOR).map((v) => base + o + v)).filter((m) => m >= base - 5 && m <= base + 16)
  const tones = (i: number) => {
    const ch = x.chords[i], r = rootMidi(x.key, ch, x.c.lead_octave)
    return [-12, 0, 12].flatMap((o) => x.ints[i].map((n) => r + o + (n % 12))).filter((m) => m >= base - 3 && m <= base + 15).sort((a, b) => a - b)
  }
  const nearest = (pool: number[], m: number) => pool.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a))
  const out: JNote[] = []
  const push = (step: number, len: number, midi: number, vel = 0.9) => { if (R.chance(keep) || step % 16 === 0) out.push({ step, len, midi, vel }) }
  // A rhythm cell: onsets within a bar, seeded.
  const cell = (n: number, grid: number[]) => [...grid].sort(() => R.next() - 0.5).slice(0, n).sort((a, b) => a - b)
  const bars = x.loopSteps / 16
  const barChord = (bar: number) => Math.min(x.chords.length - 1, Math.floor((bar * 16) / span))

  switch (style) {
    case "simple_motif":
    case "pentatonic": {
      const pool = style === "pentatonic" ? penta : scale
      const rhythm = cell(5, [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14])
      const shape = rhythm.map(() => R.pick([-2, -1, 0, 1, 1, 2, 3]))
      for (let bar = 0; bar < bars; bar++) {
        const t = tones(barChord(bar))
        let m = nearest(pool, t[Math.floor(t.length / 2)] ?? base)
        const last = bar % 4 === 3
        rhythm.forEach((s, k) => {
          const idx = pool.indexOf(m) + (x.c.lead_repetition === "low" && bar % 2 ? -shape[k] : shape[k])
          m = pool[Math.max(0, Math.min(pool.length - 1, idx))]
          const len = (rhythm[k + 1] ?? 16) - s
          push(bar * 16 + s, Math.min(len, 4) - 0.2, last && k === rhythm.length - 1 ? nearest(t, m) : m)
        })
      }
      break
    }
    case "chord_tone":
      for (let bar = 0; bar < bars; bar++) {
        const t = tones(barChord(bar)).slice(-4).reverse()
        ;[0, 3, 6, 10].forEach((s, k) => push(bar * 16 + s, k === 3 ? 5.5 : 2.5, t[k % t.length], k ? 0.8 : 1))
      }
      break
    case "pluck_arp":
      for (let bar = 0; bar < bars; bar++) {
        const t = tones(barChord(bar))
        for (let s = 0; s < 16; s += 2) push(bar * 16 + s, 1.6, t[(s / 2) % t.length], s % 4 ? 0.75 : 0.95)
      }
      break
    case "call_response": {
      const rhythm = cell(4, [0, 2, 3, 6, 8, 10])
      for (let bar = 0; bar < bars; bar++) {
        const t = tones(barChord(bar)), answer = bar % 2 === 1
        rhythm.forEach((s, k) => {
          const step = t[Math.min(t.length - 1, answer ? t.length - 1 - k : k + 1)]
          push(bar * 16 + s + (answer ? 0 : 0), k === rhythm.length - 1 ? 4 : 1.8, answer && k === rhythm.length - 1 ? t[0] : step, answer ? 0.8 : 0.95)
        })
      }
      break
    }
    case "chop": {
      const rhythm = cell(5, [0, 3, 4, 6, 8, 10, 11, 14])
      for (let bar = 0; bar < bars; bar++) {
        const t = tones(barChord(bar)), top = t[t.length - 1], low = t[t.length - 2] ?? top
        rhythm.forEach((s, k) => push(bar * 16 + s, 0.6, k % 3 === 2 ? low : top, 0.9))
      }
      break
    }
    case "hook": {
      // A two-bar riff in scale steps that doesn’t follow the chords, like a cowbell or trance hook.
      const rhythm = [cell(6, [0, 2, 3, 5, 6, 8, 10, 11, 13, 14]), cell(5, [0, 2, 3, 6, 8, 10, 12])]
      const pool = minor ? penta : scale
      const degs = rhythm.map((r) => r.map(() => R.pick([0, 1, 2, 3, 4, 5])))
      for (let bar = 0; bar < bars; bar++) {
        const r = rhythm[bar % 2], d = degs[bar % 2]
        r.forEach((s, k) => push(bar * 16 + s, Math.min((r[k + 1] ?? 16) - s, 3) - 0.2, pool[Math.min(pool.length - 1, pool.indexOf(nearest(pool, base)) + d[k])], k ? 0.85 : 1))
      }
      break
    }
    case "sparse":
      x.chords.forEach((_, i) => {
        const t = tones(i)
        push(i * span, Math.min(span, 16) * 0.6, t[t.length - 1], 0.8)
        if (span >= 16 && R.chance(0.6)) push(i * span + 10, 5, t[t.length - 2] ?? t[0], 0.7)
      })
      break
  }
  return out
}

function drumLayer(p: Pattern | undefined, steps: number, density: string): JNote[] {
  if (!p) return []
  const L = p.length ?? 16, out: JNote[] = []
  const extras: DrumLane[] = ["Shaker", "Tom", "Ride", "Rim"]
  const hasHats = p.rows.some(([lane, s]) => lane === "Hat" && s.length >= 8)
  for (let i = 0; i < steps; i++) {
    const st = (i % L) + 1
    for (const [lane, on, ghost = []] of p.rows) {
      if (density === "sparse" && extras.includes(lane)) continue
      if (on.includes(st)) out.push({ step: i, len: 0.5, midi: LANE_NOTE[lane], vel: 1 })
      else if (ghost.includes(st) && density !== "sparse") out.push({ step: i, len: 0.5, midi: LANE_NOTE[lane], vel: 0.42 })
    }
    if (density === "busy" && !hasHats && i % 2 === 1) out.push({ step: i, len: 0.5, midi: LANE_NOTE.Hat, vel: 0.35 })
  }
  return out
}

/** Sections for an archetype, as [name, bars, layers]. */
function archetypeSections(a: Archetype, length: string): [string, number, LayerId[]][] {
  const all: LayerId[] = ["drums", "bass", "chords", "pad", "lead"]
  const t: Record<Archetype, [string, number, LayerId[]][]> = {
    club: [["Intro", 16, ["drums", "pad"]], ["Build", 8, ["drums", "chords", "pad"]], ["Drop", 16, all], ["Breakdown", 16, ["chords", "pad", "lead"]], ["Build", 8, ["drums", "chords", "pad", "lead"]], ["Drop 2", 16, all], ["Outro", 16, ["drums", "bass"]]],
    hook_first: [["Hook", 8, all], ["Verse", 16, ["drums", "bass", "chords"]], ["Hook", 16, all], ["Break", 8, ["chords", "pad", "lead"]], ["Hook 2", 16, all], ["Outro", 8, ["drums", "pad"]]],
    cold_open: [["Cold open", 16, ["drums", "bass"]], ["Groove", 16, ["drums", "bass", "chords"]], ["Main", 16, all], ["Break", 8, ["chords", "pad", "lead"]], ["Return", 16, all], ["Outro", 16, ["drums", "bass"]]],
    song: [["Intro", 8, ["chords", "pad"]], ["Verse", 16, ["drums", "bass", "chords"]], ["Hook", 16, all], ["Verse 2", 16, ["drums", "bass", "chords", "pad"]], ["Hook 2", 16, all], ["Outro", 8, ["pad", "lead"]]],
    slow_bloom: [["Haze", 16, ["pad"]], ["Bloom", 16, ["pad", "chords", "bass"]], ["Pulse", 32, all], ["Drift", 16, ["pad", "lead"]], ["Fade", 16, ["pad"]]],
    dj_tool: [["Intro", 32, ["drums"]], ["Groove", 32, ["drums", "bass"]], ["Main", 32, all], ["Break", 16, ["chords", "pad"]], ["Main 2", 32, all], ["Outro", 32, ["drums"]]],
  }
  const k = length === "short" ? 0.5 : length === "long" ? 1.5 : 1
  return (t[a] ?? t.club).map(([n, b, l]) => [n, Math.max(4, Math.round((b * k) / 4) * 4), l])
}

/** Cook a recipe into notes, sections and an explanation. */
export function generate(partial: Partial<JamConfig>): Jam {
  const { config: c, key, chords, drums, warnings } = resolveConfig(partial)
  const seed = c.seed * 7919 + hashSeed(c.style)
  const ints = chords.map((ch) => chordIntervals(ch, c.chord as ChordColor, key))
  const bpc = Math.max(1, Math.round(c.bars_per_chord))
  const loopBars = chords.length * bpc, loopSteps = loopBars * 16
  const x: Ctx = { key, chords, ints, bpc, loopSteps, c, seed }

  const loop: Record<LayerId, JNote[]> = {
    chords: chordLayer(x),
    bass: c.generate_bass && c.bass_style !== "none" ? bassLayer(x) : [],
    pad: c.generate_pad && c.pad_style !== "none" ? padLayer(x) : [],
    lead: c.generate_lead ? leadLayer(x) : [],
    drums: c.generate_drums ? drumLayer(drums, loopSteps, c.drum_density) : [],
  }
  const present = LAYER_IDS.filter((id) => loop[id].length)

  const sections: JSection[] = []
  if (c.arrangement) {
    let at = 0
    for (const [name, bars, layers] of archetypeSections(c.arrangement_archetype as Archetype, c.song_length)) {
      sections.push({ name, start: at, bars, layers: layers.filter((l) => present.includes(l)) })
      at += bars
    }
  } else sections.push({ name: "Loop", start: 0, bars: loopBars * Math.max(1, c.repeats), layers: present })

  const R = rng(seed + 999)
  const human = Math.max(0, Math.min(1, c.humanize))
  const layers: JLayer[] = present.map((id) => ({ id, notes: [] }))
  const mainSeen = { n: 0 }
  for (const sec of sections) {
    const isMain = /drop|hook|main|return|pulse/i.test(sec.name)
    const lift = c.section_variation && isMain && mainSeen.n++ > 0
    for (const layer of layers) {
      if (!sec.layers.includes(layer.id)) continue
      const end = sec.bars * 16
      for (let off = 0; off < end; off += loopSteps) for (const n of loop[layer.id]) {
        const s = off + n.step
        if (s >= end) continue
        const jitter = layer.id === "drums" && n.midi === 36 ? 0 : (R.next() - 0.5) * 0.12 * human
        layer.notes.push({
          step: sec.start * 16 + s + jitter,
          len: Math.min(n.len, end - s),
          midi: n.midi + (lift && layer.id === "lead" && n.midi < 79 ? 12 : 0),
          vel: Math.max(0.05, Math.min(1, n.vel * (1 + (R.next() - 0.5) * 0.25 * human) * (lift ? 1.05 : 1))),
        })
      }
      // A snare roll into the drop at the end of each build.
      if (layer.id === "drums" && /build/i.test(sec.name)) for (let i = 0; i < 16; i++) layer.notes.push({ step: (sec.start + sec.bars - 1) * 16 + i, len: 0.4, midi: LANE_NOTE.Snare, vel: 0.35 + (i / 16) * 0.6 })
    }
  }
  const bars = sections.reduce((n, s) => Math.max(n, s.start + s.bars), 0)

  const chordList = chords.map((ch, i) => ({ label: ch.label, name: chordName(key, ch, ints[i]) }))
  const explain = [
    `${keyName(key)} · ${c.bpm} BPM · ${bars} bars${c.arrangement ? ` in ${sections.length} sections` : ""}.`,
    `Chords: ${chordList.map((ch) => ch.label).join("–")} (${chordList.map((ch) => ch.name).join(", ")}), ${describe(c.chord)} in ${describe(c.voicing)}, played as ${describe(c.pattern)}, ${bpc} bar${bpc > 1 ? "s" : ""} each.`,
    loop.bass.length ? `Bass: ${describe(c.bass_style)}.` : "Bass: off.",
    loop.pad.length ? `Pad: ${describe(c.pad_style)}.` : "Pad: off.",
    loop.lead.length ? `Lead: ${describe(c.lead_style)}, ${c.lead_density} density.` : "Lead: off.",
    loop.drums.length ? `Drums: ${drums?.name}${c.drum_density !== "normal" ? `, ${c.drum_density}` : ""}.` : "Drums: off.",
    ...(c.arrangement ? [`Arrangement: ${describe(c.arrangement_archetype)}: ${sections.map((s) => `${s.name} ${s.bars}`).join(", ")}.`] : []),
  ]
  return { config: c, key, bpm: c.bpm as number, bars, loopBars, chords: chordList, layers, sections, drums, explain, warnings }
}
