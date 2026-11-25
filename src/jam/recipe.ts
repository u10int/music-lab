import { FAMILIES } from "@/data/patterns"
import { IDS } from "./vocab"

export type RecipeRole = "starter" | "variation" | "sectioned" | "live_handoff" | "custom"
export const ROLE_LABEL: Record<RecipeRole, string> = { starter: "Starter", variation: "Variation", sectioned: "Sectioned", live_handoff: "Live handoff", custom: "Custom" }

/** Everything a recipe can set. Missing fields fall back to DEFAULTS and the style’s lane. */
export interface JamConfig {
  // Header: describes the recipe, doesn’t change the MIDI.
  recipe_role: RecipeRole
  recipe_slug: string
  display_title: string
  summary: string
  mood_tags: string[]
  tempo_band: string
  study: string
  // Musical core
  key: string
  style: string
  progression: string
  chord: string
  voicing: string
  pattern: string
  bpm: number | "auto"
  bars_per_chord: number
  repeats: number
  seed: number
  // Performance
  octave: number
  velocity: number
  humanize: number
  // Layers
  generate_bass: boolean
  bass_style: string
  bass_octave: number
  generate_pad: boolean
  pad_style: string
  pad_octave: number
  generate_lead: boolean
  lead_style: string
  lead_octave: number
  lead_density: string
  lead_repetition: "high" | "low"
  generate_drums: boolean
  drum_style: string
  drum_density: string
  // Arrangement
  arrangement: boolean
  arrangement_archetype: string
  song_length: "short" | "normal" | "long"
  section_variation: boolean
  // Export
  output_mode: string
  export_layout: "full" | "full_and_sections" | "sections_only"
  sound_design_cards: boolean
}

export const DEFAULTS: JamConfig = {
  recipe_role: "custom", recipe_slug: "", display_title: "", summary: "", mood_tags: [], tempo_band: "", study: "",
  key: "A minor", style: "house", progression: "default", chord: "auto", voicing: "auto_voice_leading", pattern: "auto", bpm: "auto", bars_per_chord: 0, repeats: 2, seed: 1,
  octave: 3, velocity: 96, humanize: 0.15,
  generate_bass: true, bass_style: "auto", bass_octave: 1, generate_pad: true, pad_style: "auto", pad_octave: 2, generate_lead: true, lead_style: "auto", lead_octave: 3, lead_density: "normal", lead_repetition: "high",
  generate_drums: true, drum_style: "auto", drum_density: "normal",
  arrangement: false, arrangement_archetype: "auto", song_length: "normal", section_variation: true,
  output_mode: "single", export_layout: "full", sound_design_cards: false,
}

const HEADER: (keyof JamConfig)[] = ["recipe_role", "recipe_slug", "display_title", "summary", "mood_tags", "tempo_band", "study"]
const CONFIG_ORDER: (keyof JamConfig)[] = [
  "key", "style", "progression", "chord", "voicing", "pattern", "bpm", "bars_per_chord", "repeats", "seed",
  "octave", "velocity", "humanize",
  "generate_bass", "bass_style", "generate_pad", "pad_style", "generate_lead", "lead_style", "lead_density", "lead_repetition", "generate_drums", "drum_style", "drum_density",
  "arrangement", "arrangement_archetype", "song_length", "section_variation",
  "output_mode", "export_layout", "sound_design_cards",
]
const ALIASES: Record<string, keyof JamConfig> = { scale: "key", title: "display_title", tempo: "bpm", full_song: "arrangement", sound_design_depth: "sound_design_cards" }

/** Read a Markdown recipe. Only `key: value` lines count; everything else is notes. */
export function parseRecipe(md: string): { config: Partial<JamConfig>; title: string; warnings: string[] } {
  const config: Partial<JamConfig> = {}, warnings: string[] = []
  let title = "", fence = false, scaleWord = ""
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith("```")) { fence = !fence; continue }
    if (fence) continue
    if (!title && line.startsWith("# ")) { title = line.slice(2).trim(); continue }
    const m = line.match(/^[-*]?\s*([a-z_]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const name = m[1].toLowerCase(), value = m[2].trim()
    if (name === "scale") { scaleWord = value; continue }
    const k = (name in DEFAULTS ? name : ALIASES[name]) as keyof JamConfig | undefined
    if (!k) { warnings.push(`Ignored unknown field “${name}”.`); continue }
    const def = DEFAULTS[k]
    let v: unknown = value
    if (k === "mood_tags") v = value.split(",").map((s) => s.trim()).filter(Boolean)
    else if (typeof def === "boolean") v = /^(true|yes|on|1)$/i.test(value)
    else if (typeof def === "number" || (k === "bpm" && value !== "auto")) {
      const n = Number(value)
      if (Number.isNaN(n)) { warnings.push(`“${name}” should be a number; kept the default.`); continue }
      v = n
    }
    ;(config as Record<string, unknown>)[k] = v
  }
  if (scaleWord && config.key && !/(minor|major|dorian|phryg|harm)/i.test(config.key)) config.key = `${config.key} ${scaleWord}`
  return { config, title, warnings }
}

/** Check values against the vocabulary, so a typo gives a clear message instead of odd MIDI. */
export function validate(c: JamConfig): string[] {
  const out: string[] = []
  const check = (field: keyof typeof IDS, v: string) => { if (v !== "auto" && !(IDS[field] as string[]).includes(v)) out.push(`Unknown ${field} “${v}”. Options: ${(IDS[field] as string[]).join(", ")}.`) }
  check("chord", c.chord); check("voicing", c.voicing); check("bass_style", c.bass_style); check("pad_style", c.pad_style)
  check("lead_style", c.lead_style); check("drum_density", c.drum_density); check("lead_density", c.lead_density)
  check("arrangement_archetype", c.arrangement_archetype); check("output_mode", c.output_mode)
  if (c.pattern !== "auto" && !(IDS.pattern as string[]).includes(c.pattern)) out.push(`Unknown pattern “${c.pattern}”. Options: ${IDS.pattern.join(", ")}.`)
  if (!FAMILIES.some(([f]) => f === c.style && f !== "all")) out.push(`Unknown style “${c.style}”. Run with --list to see the styles.`)
  return out
}

const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v))

/** Write a recipe back out as Markdown, with optional notes after the config. */
export function serializeRecipe(c: JamConfig, notes = ""): string {
  const lines = [`# jam recipe – ${c.display_title || c.style}`, ""]
  for (const k of HEADER) if (show(c[k])) lines.push(`${k}: ${show(c[k])}`)
  lines.push("", "## Config")
  for (const k of CONFIG_ORDER) lines.push(`${k}: ${show(c[k])}`)
  if (notes) lines.push("", "## Notes", notes)
  return lines.join("\n") + "\n"
}
