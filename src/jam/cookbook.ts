import { GENRE_GUIDE, type Ref } from "@/data/genre-guide"
import { genreInfo } from "@/data/genres"
import type { Family } from "@/data/patterns"
import { drumPatternsFor, slug } from "./generate"
import { DEFAULTS, type JamConfig } from "./recipe"
import { LANES } from "./styles"
import { describe, type ChordColor } from "./vocab"

const RICHER: Record<ChordColor, ChordColor> = { triad: "seventh", power: "sus2", sus2: "add9", sus4: "seventh", seventh: "ninth", ninth: "eleventh", add9: "ninth", sixth: "ninth", eleventh: "ninth", quartal: "quartal", cluster: "ninth" }
const studyText = (r?: Ref) => (r ? (r.track ? `${r.artist}, “${r.track}”${r.year ? ` (${r.year})` : ""}` : r.artist) : "")

function summary(c: Partial<JamConfig>, lead: string) {
  const bits = [`${describe(c.chord!)[0].toUpperCase() + describe(c.chord!).slice(1)} as ${describe(c.pattern!)}`]
  if (c.bass_style && c.bass_style !== "none") bits.push(describe(c.bass_style))
  if (c.pad_style && c.pad_style !== "none") bits.push(describe(c.pad_style))
  if (c.lead_style && c.lead_style !== "none") bits.push(describe(c.lead_style))
  return `${lead}${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}.`
}

/**
 * Six recipes for a style, like a cookbook page: a starter, three variations that
 * each take it somewhere different, a sectioned sketch and a Live handoff.
 */
export function cookbook(style: Family, keyRoot = "A"): JamConfig[] {
  const info = genreInfo(style), guide = GENRE_GUIDE[style], lane = LANES[style]
  if (!info || !guide || !lane) return []
  const key = `${keyRoot} ${({ minor: "minor", major: "major", dorian: "dorian", phryg: "phrygian", harm: "harmonic minor" } as Record<string, string>)[info.scale]}`
  const band = `${info.tempo[0]}-${info.tempo[1]}`
  const pats = drumPatternsFor(style)
  const own = pats.filter((p) => p.family === style)
  const drumAlt = (own[1] ?? pats[1] ?? pats[0])?.id ?? "auto"
  const move = (i: number) => guide.moves.map((m) => m.prog.join()).findIndex((p, k) => k >= i && p !== info.prog.join())
  const m1 = move(0), m2 = move(m1 + 1)
  const base: Partial<JamConfig> = { key, style, chord: lane.chord, voicing: lane.voicing, pattern: lane.patterns[0], bass_style: lane.basses[0], pad_style: lane.pads[0], lead_style: lane.leads[0], drum_style: "auto", tempo_band: band }
  const make = (role: JamConfig["recipe_role"], name: string, extra: Partial<JamConfig>, moods: string[], lead: string, ref: number): JamConfig => {
    const c = { ...DEFAULTS, ...base, ...extra }
    return { ...c, recipe_role: role, display_title: name, recipe_slug: `${style}_${slug(name)}`, mood_tags: moods, study: studyText(guide.refs[ref % guide.refs.length]), summary: summary(c, lead), seed: 1 + ref }
  }
  const [w0, w1, w2, w3] = lane.words
  return [
    make("starter", lane.starter, {}, guide.moods.slice(0, 3), `The ${info.id === "ambient" ? "core sound" : "first cook"} for ${style === "ukg" ? "UK garage" : "the style"}: `, 0),
    make("variation", `${w0} Chord Lift`, {
      progression: m1 >= 0 ? slug(guide.moves[m1].name) : "classic", pattern: lane.patterns[1], voicing: "auto_voice_leading", chord: RICHER[lane.chord], lead_style: lane.leads[1],
    }, ["lifted", "melodic", guide.moods[3] ?? "bright"], "A brighter take with new chord moves: ", 1),
    make("variation", `${w1} Bass Pressure`, {
      bass_style: lane.basses[1], pad_style: "none", pattern: lane.patterns[2], lead_style: "chop", lead_density: "sparse", drum_density: "busy",
    }, ["bass-forward", "pressure", "driving"], "A bass-forward lane: ", 2),
    make("variation", `${w2} Pad Drift`, {
      progression: m2 >= 0 ? slug(guide.moves[m2].name) : "default", pad_style: lane.pads[1] === "none" ? "fifth_drone" : lane.pads[1], pattern: "sustain", chord: RICHER[lane.chord], voicing: "wide",
      bass_style: lane.basses[2], lead_style: lane.leads[2], lead_density: "sparse", drum_style: drumAlt, drum_density: "sparse",
    }, ["pad-led", "drifting", "spacious"], "A pad-first lane with more space: ", 3),
    make("sectioned", `${w3} Section Sketch`, {
      arrangement: true, arrangement_archetype: lane.archetype, section_variation: true,
    }, ["arranged", "sections", guide.moods[1] ?? "full"], `A full-track sketch (${describe(lane.archetype)}): `, 4),
    make("live_handoff", `Live ${w0} Session`, {
      arrangement: true, arrangement_archetype: lane.archetype === "club" ? "cold_open" : "club", song_length: "short", output_mode: "pack", export_layout: "full_and_sections", sound_design_cards: true,
      lead_style: lane.leads[1], drum_style: drumAlt,
    }, ["live", "session", "editable"], "A Live handoff with section clips and sound cards: ", 5),
  ]
}
