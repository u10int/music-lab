import { GENRE_GUIDE, type Ref } from "@/data/genre-guide"
import { genreInfo } from "@/data/genres"
import type { Family } from "@/data/patterns"
import { TICKS_PER_16TH, writeMidi, type MidiNote, type MidiTrack } from "@/lib/midi-file"
import { buildLoop, defaultLoop, drumOptions, LOOP_STEPS, PART_NAME, patternById, soundById, soundOptions, type SynthPart } from "@/lib/loop"
import type { LoopPart, LoopState } from "@/lib/store"

export type RecipeKind = "Starter" | "Variation" | "Sectioned"
export interface Section { name: string; bars: number; parts: LoopPart[] }
export interface Recipe {
  id: string
  kind: RecipeKind
  name: string
  blurb: string
  /** What this recipe changes from the starter, in a few words. */
  changes: string[]
  loop: LoopState
  sections?: Section[]
  study?: Ref
}

const ALL: LoopPart[] = ["drums", "bass", "chords", "lead"]
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0]

/** The usual shape of a track in this genre, as sections that bring parts in and out. */
function sectionsFor(f: string): Section[] {
  if (f === "ambient" || f === "dubtechno") return [
    { name: "Opening", bars: 8, parts: ["chords"] }, { name: "Swell", bars: 16, parts: ["chords", "bass", "lead"] },
    { name: "Pulse", bars: 16, parts: ALL }, { name: "Fade", bars: 8, parts: ["chords", "lead"] },
  ]
  if (["phonk", "trap", "boombap", "lofi", "reggaeton", "ukg", "synthwave"].includes(f)) return [
    { name: "Intro", bars: 4, parts: ["chords", "lead"] }, { name: "Verse", bars: 8, parts: ["drums", "bass", "chords"] },
    { name: "Hook", bars: 8, parts: ALL }, { name: "Break", bars: 4, parts: ["chords", "lead"] }, { name: "Hook", bars: 8, parts: ALL },
  ]
  if (["techno", "minimal", "hardtechno", "techhouse"].includes(f)) return [
    { name: "Intro", bars: 8, parts: ["drums"] }, { name: "Groove", bars: 16, parts: ["drums", "bass"] },
    { name: "Peak", bars: 16, parts: ALL }, { name: "Break", bars: 8, parts: ["chords", "lead"] }, { name: "Peak", bars: 16, parts: ALL },
  ]
  return [
    { name: "Intro", bars: 8, parts: ["chords", "drums"] }, { name: "Build", bars: 8, parts: ["drums", "chords", "lead"] },
    { name: "Drop", bars: 16, parts: ALL }, { name: "Breakdown", bars: 8, parts: ["chords", "lead"] }, { name: "Drop", bars: 16, parts: ALL },
  ]
}

const sameProg = (a: number[], b: number[]) => a.join() === b.join()

/**
 * Turn a genre’s data into a small set of recipes: a starter loop, variations that each
 * change one thing (chords, groove or sounds), and a sectioned arrangement sketch.
 */
export function recipesFor(f: Family): Recipe[] {
  const guide = GENRE_GUIDE[f], info = genreInfo(f)
  if (!guide || !info) return []
  const start = defaultLoop(f)
  const refs = guide.refs
  const study = (i: number) => refs.length ? refs[i % refs.length] : undefined
  const out: Recipe[] = [{
    id: f + "-starter", kind: "Starter", name: "The core loop",
    blurb: `Four bars with the genre’s home progression, its main groove and a sound for each part. Start here, then change one thing at a time.`,
    changes: [patternById(start.drums)?.name ?? "Drums"],
    loop: start, study: study(0),
  }]

  // Chord moves
  const moves = guide.moves.filter((m) => !sameProg(m.prog, start.prog))
  moves.slice(0, 2).forEach((m, i) => out.push({
    id: `${f}-move-${i}`, kind: "Variation", name: m.name, blurb: m.note,
    changes: ["New chords"], loop: { ...start, prog: m.prog }, study: study(i + 1),
  }))

  // A different groove
  const pats = drumOptions(f).flatMap((g) => g.patterns).filter((p) => p.id !== start.drums)
  const groove = pats.find((p) => p.family === f) ?? pats[0]
  if (groove) {
    const tempo = Math.min(info.tempo[1] + 10, Math.max(info.tempo[0] - 10, groove.tempo))
    out.push({
      id: f + "-groove", kind: "Variation", name: groove.name, blurb: firstSentence(groove.note ?? `A different groove under the same chords.`),
      changes: ["New drums"],
      loop: { ...start, drums: groove.id, tempo, swing: groove.swing ?? 0 }, study: study(2),
    })
  }

  // A different palette
  const alt = (part: SynthPart) => soundOptions(f, part).flatMap((g) => g.sounds).find((s) => s.id !== start.sounds[part])
  const bass = alt("bass"), lead = alt("lead"), chords = alt("chords")
  if (bass || lead || chords) {
    const sounds = { bass: bass?.id ?? start.sounds.bass, chords: chords?.id ?? start.sounds.chords, lead: lead?.id ?? start.sounds.lead }
    const names = [bass, chords, lead].filter(Boolean).map((s) => s!.name.toLowerCase())
    out.push({
      id: f + "-palette", kind: "Variation", name: "Swap the palette",
      blurb: `The same loop played with ${names.join(", ")}. Hear how much the sound choice changes the mood.`,
      changes: ["New sounds"], loop: { ...start, sounds, follow: lead?.role === "Pluck" }, study: study(3),
    })
  }

  out.push({
    id: f + "-sections", kind: "Sectioned", name: "Arrangement sketch",
    blurb: `The starter laid out as a ${f === "ambient" ? "slow" : "full"} track shape, bringing parts in and out section by section. Export it as one MIDI file to arrange from.`,
    changes: ["Sections"], loop: start, sections: sectionsFor(f), study: study(4),
  })
  return out
}

/** MIDI tracks for a loop, optionally laid out as sections that each play some of the parts. */
export function recipeMidi(r: Recipe, root: number, iv: number[]) {
  const l = r.loop, ev = buildLoop(l, root, iv)
  const sections = r.sections ?? [{ name: "Loop", bars: 4, parts: ALL }]
  const tickOf = (s: number) => Math.round(s * TICKS_PER_16TH + (Math.floor(s) % 2 ? l.swing * TICKS_PER_16TH : 0))
  const total = sections.reduce((n, s) => n + s.bars, 0) * 16
  const tracks: MidiTrack[] = ALL.flatMap((p) => {
    const notes: MidiNote[] = []
    let at = 0
    for (const sec of sections) {
      const steps = sec.bars * 16
      if (sec.parts.includes(p)) for (let off = 0; off < steps; off += LOOP_STEPS) {
        if (p === "drums") for (const h of ev.hits) { if (off + h.step < steps) notes.push({ tick: tickOf(at + off + h.step), note: h.note, velocity: Math.round(h.vel * 110), duration: TICKS_PER_16TH / 2, channel: 9 }) }
        else for (const n of ev.notes) if (n.part === p && off + n.step < steps) notes.push({ tick: tickOf(at + off + n.step), note: n.midi, velocity: 100, duration: Math.max(1, Math.round(n.len * TICKS_PER_16TH) - 2) })
      }
      at += steps
    }
    if (!notes.length) return []
    const name = p === "drums" ? patternById(l.drums)?.name ?? "Drums" : soundById(l.sounds[p])?.name ?? PART_NAME[p]
    return [{ name, notes, length: total * TICKS_PER_16TH }]
  })
  return writeMidi(tracks, l.tempo)
}
