import { KIND_OF, type DrumKind } from "@/audio/engine"
import type { FxSettings, Patch } from "@/audio/patch"
import { GENRE_SOUNDS, type GenreSound } from "@/data/genre-sounds"
import { genreInfo } from "@/data/genres"
import { LANE_NOTE, PATTERNS, type Family, type Pattern } from "@/data/patterns"
import type { LoopPart, LoopState } from "@/lib/store"

/** Four bars of 16th notes. */
export const LOOP_STEPS = 64
export const SYNTH_PARTS = ["bass", "chords", "lead"] as const
export type SynthPart = (typeof SYNTH_PARTS)[number]
export const PART_NAME: Record<LoopPart, string> = { drums: "Drums", bass: "Bass", chords: "Chords", lead: "Lead" }
/** MIDI channel per part (0-based): drums on 10, like Drum Rack expects from a GM file. */
export const PART_CHANNEL: Record<LoopPart, number> = { drums: 9, bass: 1, chords: 2, lead: 3 }
const ROLES: Record<SynthPart, GenreSound["role"][]> = { bass: ["Bass", "Perc"], chords: ["Chords", "Pad"], lead: ["Lead", "Pluck"] }

export const soundById = (id: string) => GENRE_SOUNDS.find((s) => s.id === id)
export const patternById = (id: string) => PATTERNS.find((p) => p.id === id)

/** Genres to draw sounds from: the genre itself, then its neighbors. */
export function familiesFor(f: string): Family[] {
  return [f as Family, ...(genreInfo(f)?.near ?? [])]
}
export function soundOptions(f: string, part: SynthPart) {
  return familiesFor(f).map((fam) => ({ fam, sounds: GENRE_SOUNDS.filter((s) => s.family === fam && ROLES[part].includes(s.role)) })).filter((g) => g.sounds.length)
}
export function drumOptions(f: string) {
  return familiesFor(f).map((fam) => ({ fam, patterns: PATTERNS.filter((p) => p.family === fam) })).filter((g) => g.patterns.length)
}

/** A sensible starting loop for a genre. */
export function defaultLoop(f: string): LoopState {
  const info = genreInfo(f)
  const pick = (part: SynthPart) => soundOptions(f, part)[0]?.sounds[0]?.id ?? ""
  const drums = drumOptions(f)[0]?.patterns[0]
  const lead = soundById(pick("lead"))
  return {
    family: f,
    drums: drums?.id ?? "",
    sounds: { bass: pick("bass"), chords: pick("chords"), lead: lead?.id ?? "" },
    prog: info?.prog ?? [0, 5, 2, 6],
    tempo: drums?.tempo ?? Math.round(((info?.tempo[0] ?? 120) + (info?.tempo[1] ?? 120)) / 2),
    swing: drums?.swing ?? 0,
    follow: lead?.role === "Pluck",
    mix: { drums: { vol: 0.8, mute: false }, bass: { vol: 0.8, mute: false }, chords: { vol: 0.7, mute: false }, lead: { vol: 0.7, mute: false } },
    solo: null,
  }
}

/** Pick a random sound for each part from what fits this genre. */
export function shuffleLoop(l: LoopState): LoopState {
  const any = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
  const sounds = { ...l.sounds }
  for (const part of SYNTH_PARTS) {
    const all = soundOptions(l.family, part).flatMap((g) => g.sounds)
    if (all.length) sounds[part] = any(all).id
  }
  const pats = drumOptions(l.family).flatMap((g) => g.patterns)
  return { ...l, sounds, drums: pats.length ? any(pats).id : l.drums }
}

export interface LoopNote { part: SynthPart; step: number; len: number; midi: number; mono: boolean }
export interface LoopHit { step: number; lane: DrumKind; note: number; vel: number }

/** MIDI note for a scale degree at a sound's octave (C3 = 60). */
export function degreeMidi(root: number, iv: number[], oct: number, deg: number, shift = 0) {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7
  return 12 * (oct + 2 + shift + o) + root + iv[d]
}

/**
 * Bass and chords take the rhythm of their sound's first bar and move it to each
 * bar's chord. The lead plays its own two-bar phrase, or follows the chords too.
 */
export function partNotes(part: SynthPart, s: GenreSound, prog: number[], root: number, iv: number[], follow: boolean, melody?: LoopState["melody"]): LoopNote[] {
  const out: LoopNote[] = []
  const push = (step: number, len: number, deg: number, shift: number) => out.push({ part, step, len, midi: degreeMidi(root, iv, s.oct, deg, shift), mono: !!s.mono })
  if (part === "lead" && melody?.length) {
    for (const n of melody) push(n.step, n.len, n.deg, 0)
    return out
  }
  if (part === "lead" && !follow) {
    for (const half of [0, 32]) for (const [start, len, deg, shift = 0] of s.phrase) for (const d of [deg].flat()) push(half + start, len, d, shift)
    return out
  }
  let bar1 = s.phrase.filter(([start]) => start < 16)
  if (!bar1.length) bar1 = s.phrase.map(([start, len, deg, shift]) => [start % 16, len, deg, shift] as typeof s.phrase[number])
  const base = part === "lead" ? 0 : Math.min(...[bar1[0][2]].flat())
  prog.forEach((chord, bar) => {
    for (const [start, len, deg, shift = 0] of bar1) {
      const l = Math.min(len, 16 - Math.floor(start))
      for (const d of [deg].flat()) push(bar * 16 + start, l, d - base + chord, shift)
    }
  })
  return out
}

export function drumHits(p: Pattern | undefined): LoopHit[] {
  if (!p) return []
  const L = p.length ?? 16, out: LoopHit[] = []
  for (let i = 0; i < LOOP_STEPS; i++) {
    const st = (i % L) + 1
    for (const [name, steps, ghost = []] of p.rows) {
      const lane = KIND_OF[name]
      if (!lane) continue
      if (steps.includes(st)) out.push({ step: i, lane, note: LANE_NOTE[name], vel: 1 })
      else if (ghost.includes(st)) out.push({ step: i, lane, note: LANE_NOTE[name], vel: 0.4 })
    }
  }
  return out
}

export function resolveSound(s: GenreSound) {
  const patch: Patch = structuredClone(s.patch), fx: FxSettings = structuredClone(s.fx)
  for (const m of s.macros) m.apply(patch, fx, m.value)
  return { patch, fx }
}

/** Which parts are heard, given mutes and solo. */
export function audible(l: LoopState, part: LoopPart) {
  return l.solo ? l.solo === part : !l.mix[part].mute
}

export function buildLoop(l: LoopState, root: number, iv: number[]) {
  const notes: LoopNote[] = []
  for (const part of SYNTH_PARTS) {
    const s = soundById(l.sounds[part])
    if (s) notes.push(...partNotes(part, s, l.prog, root, iv, l.follow, l.melody))
  }
  return { notes, hits: drumHits(patternById(l.drums)) }
}
