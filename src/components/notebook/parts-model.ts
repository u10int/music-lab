import { drum, tone, type DrumKind } from "@/audio/engine"
import { toGrid } from "@/lib/melody-grid"
import { TICKS_PER_16TH, type MidiNote, type MidiTrack } from "@/lib/midi-file"
import type { BarChord, DrumFill, DrumPart, PartLane, Parts, PartSection } from "@/lib/transcribe-core"

export const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10]
export const LANE: Record<PartLane, { kind: DrumKind; note: number; name: string; seq: string }> = {
  Kick: { kind: "kick", note: 36, name: "Kick", seq: "kick" },
  Snare: { kind: "clap", note: 38, name: "Snare / clap", seq: "snare" },
  Hat: { kind: "hat", note: 42, name: "Hats", seq: "hat" },
  "Open hat": { kind: "ohat", note: 46, name: "Open hat", seq: "ohat" },
}
export const chordName = (c: BarChord) => NOTE[c.root] + (c.minor ? "m" : "")
/** Note names as Live shows them: middle C is C3. */
export const noteName = (m: number) => NOTE[m % 12] + (Math.floor(m / 12) - 2)
export const mmss = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0")
export const GRID_NAME: Record<DrumFill["grid"], string> = { "16ths": "16ths", "16th triplets": "16th-note triplets", "32nds": "32nd notes", "8th triplets": "8th-note triplets" }

/** The chord as a Roman numeral in the key, or null when it isn’t one of the key’s own chords. */
export function roman(c: BarChord, keyRoot: number, minor: boolean) {
  const sc = minor ? MINOR : MAJOR
  const deg = sc.indexOf(((c.root - keyRoot) % 12 + 12) % 12)
  if (deg < 0) return null
  const third = (sc[(deg + 2) % 7] - sc[deg] + 12) % 12, fifth = (sc[(deg + 4) % 7] - sc[deg] + 12) % 12
  if ((third === 3) !== c.minor || fifth !== 7) return null
  return { deg, label: c.minor ? ROMAN[deg].toLowerCase() : ROMAN[deg] }
}

/** The shortest chord cycle (1, 2, 4 or 8 bars) that most of the section repeats. */
export function cycle(chords: (BarChord | null)[]) {
  const key = (c: BarChord | null) => (c ? chordName(c) : "-")
  for (const p of [1, 2, 4, 8]) {
    if (chords.length < p * 2) continue
    let same = 0, n = 0
    for (let i = p; i < chords.length; i++) { n++; if (key(chords[i]) === key(chords[i - p])) same++ }
    if (n && same / n >= 0.7) return p
  }
  return Math.min(8, chords.length)
}

export function drumHits(d: DrumPart) {
  return d.rows.flatMap(([lane, on, ghost]) => [...on.map((s) => ({ lane, s: s - 1, vel: 1 })), ...ghost.map((s) => ({ lane, s: s - 1, vel: 0.4 }))])
}

/**
 * One bar of the pattern (0-based bar within the section), with a fill in that bar
 * replacing its lane from where the fill starts. Positions are in 16ths, possibly fractional.
 */
export function barHits(d: DrumPart, barInSection: number, fills: DrumFill[]) {
  const from = (barInSection % (d.length / 16)) * 16
  const pattern = drumHits(d).filter((h) => h.s >= from && h.s < from + 16).map((h) => ({ lane: h.lane, pos: h.s - from, vel: h.vel }))
  const replaced = (lane: PartLane, pos: number) => fills.some((f) => pos >= f.from && (f.lane === lane || (f.lane === "Hat" && lane === "Open hat")))
  return [
    ...pattern.filter((h) => !replaced(h.lane, h.pos)),
    ...fills.flatMap((f) => f.hits.map((h) => ({ lane: f.lane as PartLane, pos: h.pos, vel: 0.35 + 0.65 * h.v }))),
  ]
}

/* ---------- One window of bars, as events on a shared timeline ---------- */

export type Lane = "drums" | "bass" | "chords" | "vocals" | "lead"
export const LANES: [Lane, string][] = [["drums", "Drums"], ["bass", "Bass"], ["chords", "Chords"], ["vocals", "Vocals"], ["lead", "Lead"]]
export interface DrumEv { step: number; lane: PartLane; vel: number }
export interface NoteEv { step: number; len: number; midi: number; vel: number }
export interface ChordEv { step: number; bar: number; chord: BarChord | null }
export interface Window {
  /** First bar (absolute) and how many bars. */
  from: number
  bars: number
  drums: DrumEv[]
  bass: NoteEv[]
  chords: ChordEv[]
  vocals: NoteEv[]
  lead: NoteEv[]
}

/** Everything that plays in `bars` bars of a section from bar `from`, with steps counted from the window’s start. */
export function windowOf(parts: Parts, sec: PartSection, from: number, bars: number, snap: boolean): Window {
  const lo = from * 16, hi = (from + bars) * 16
  const drums: DrumEv[] = []
  if (sec.drums) for (let b = 0; b < bars; b++) {
    const bar = from + b
    for (const h of barHits(sec.drums, bar - sec.startBar, (sec.fills ?? []).filter((f) => f.bar === bar))) drums.push({ step: b * 16 + h.pos, lane: h.lane, vel: h.vel })
  }
  const clip = (ns: NoteEv[]) => ns.filter((n) => n.step < hi && n.step + n.len > lo).map((n) => ({ ...n, step: n.step - lo }))
  const m = parts.melody
  return {
    from, bars, drums,
    bass: clip(parts.bass.map((b) => ({ step: b.step, len: b.len, midi: b.midi, vel: 80 }))),
    chords: Array.from({ length: bars }, (_, b) => ({ step: b * 16, bar: from + b, chord: parts.chords[from + b] ?? null })),
    vocals: m ? clip(toGrid(m.vocals, parts, snap)) : [],
    lead: m ? clip(toGrid(m.lead, parts, snap)) : [],
  }
}

/** Lay out the chosen lanes of a window for playback, starting at t0. */
export function scheduleWindow(c: BaseAudioContext, bus: AudioNode, t0: number, w: Window, step: number, lanes: Set<Lane>) {
  const at = (s: number) => t0 + s * step
  if (lanes.has("drums")) for (const h of w.drums) drum(c, bus, at(h.step), LANE[h.lane].kind, h.vel * 0.6)
  if (lanes.has("bass")) for (const b of w.bass) tone(c, bus, at(Math.max(0, b.step)), b.midi + 12, (b.len - Math.max(0, -b.step)) * step * 0.95, { wave: "sawtooth", cutoff: 500, q: 2, level: 0.22, env: { a: 0.005, d: 0.2, s: 0.7, r: 0.05 } })
  if (lanes.has("chords")) for (const ch of w.chords) {
    if (!ch.chord) continue
    const root = 48 + ch.chord.root
    for (const iv of [0, ch.chord.minor ? 3 : 4, 7]) tone(c, bus, at(ch.step), root + iv + (root + iv < 55 ? 12 : 0), 16 * step * 0.95, { wave: "triangle", cutoff: 2200, level: 0.07, env: { a: 0.02, d: 0.6, s: 0.6, r: 0.3 } })
  }
  if (lanes.has("vocals")) for (const v of w.vocals) if (v.step >= 0) tone(c, bus, at(v.step), v.midi, v.len * step * 0.97, { wave: "triangle", cutoff: 3200, level: 0.16, env: { a: 0.02, d: 0.2, s: 0.8, r: 0.08 } })
  if (lanes.has("lead")) for (const v of w.lead) if (v.step >= 0) tone(c, bus, at(v.step), v.midi, v.len * step * 0.9, { wave: "square", cutoff: 2200, level: 0.06, env: { a: 0.005, d: 0.15, s: 0.5, r: 0.06 } })
}

/* ---------- MIDI ---------- */

/** Drums, bass and chords for `bars` bars from absolute bar `from`, placed from tick 0. */
export function partsTracks(parts: Parts, sec: PartSection | null, from: number, bars: number): MidiTrack[] {
  const len = bars * 16 * TICKS_PER_16TH, lo = from * 16, hi = (from + bars) * 16
  const drums: MidiNote[] = []
  for (const s of sec ? [sec] : parts.sections) {
    if (!s.drums) continue
    for (let bar = Math.max(from, s.startBar); bar < Math.min(from + bars, s.startBar + s.bars); bar++)
      for (const h of barHits(s.drums, bar - s.startBar, (s.fills ?? []).filter((f) => f.bar === bar)))
        drums.push({ tick: Math.round(((bar - from) * 16 + h.pos) * TICKS_PER_16TH), note: LANE[h.lane].note, velocity: Math.round(h.vel * 110), duration: TICKS_PER_16TH / 2, channel: 9 })
  }
  const bass = parts.bass.filter((b) => b.step >= lo && b.step < hi).map((b) => ({ tick: (b.step - lo) * TICKS_PER_16TH, note: b.midi, velocity: 100, duration: Math.min(b.len, hi - b.step) * TICKS_PER_16TH - 2, channel: 1 }))
  const chords = parts.chords.slice(from, from + bars).flatMap((ch, i) => {
    if (!ch) return []
    const root = 48 + ch.root
    return [0, ch.minor ? 3 : 4, 7].map((iv) => ({ tick: i * 16 * TICKS_PER_16TH, note: root + iv + (root + iv < 55 ? 12 : 0), velocity: 90, duration: 16 * TICKS_PER_16TH - 2, channel: 2 }))
  })
  return [{ name: "Drums", notes: drums, length: len }, { name: "Bass", notes: bass, length: len }, { name: "Chords", notes: chords, length: len }].filter((t) => t.notes.length)
}
