/**
 * The jam command line: cook Markdown recipes into MIDI, like jamburgr.
 * Run with `npm run jam -- <flags>`; `npm run jam -- --help` lists them.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { createInterface } from "node:readline/promises"
import { GENRE_GUIDE } from "@/data/genre-guide"
import { GENRE_INFO, genreInfo } from "@/data/genres"
import { TELLS } from "@/data/genre-tells"
import { FAMILIES, type Family } from "@/data/patterns"
import { cookbook } from "@/jam/cookbook"
import { jamMidi, packFiles } from "@/jam/export"
import { drumPatternsFor, generate, LAYER_CHANNEL, progressionNames, type Jam } from "@/jam/generate"
import { DEFAULTS, parseRecipe, serializeRecipe, type JamConfig } from "@/jam/recipe"
import { ARCHETYPES, BASSES, CHORDS, LEADS, OUTPUT_MODES, PADS, PATTERNS, VOICINGS, type Opt } from "@/jam/vocab"
import { writeMidi } from "@/lib/midi-file"

const HELP = `jam: cook Markdown recipes into MIDI

  npm run jam                                  interactive menu
  npm run jam -- --style ukg --key "F minor" --out ./jams/ukg
  npm run jam -- --style deephouse --recipe starter --output-mode pack --out ./jams/deep
  npm run jam -- --config recipes/ukg/ukg_shuffle_chord_skip.md --out ./jams/ukg
  npm run jam -- --style all --recipe starter --output-mode multi --out ./jams/all

Flags
  --style <id|all>          a style (see --list)
  --key "<root> <scale>"     e.g. "F# minor", "D dorian"
  --progression <name|i,VI,III,VII>   default, a named move, or Roman numerals
  --chord --voicing --pattern --bpm --bass-style --pad-style --lead-style
  --drum-style --drum-density --lead-density --seed --humanize ...
                            any recipe field, with dashes or underscores
  --recipe <role|slug>      cook one of the style’s six recipes: starter, variation-1..3, sectioned, live, or a slug
  --recipes                 list the style’s recipes
  --config <file.md>        cook a Markdown recipe (flags still override it)
  --arrangement true        sectioned sketch; --arrangement-archetype club|hook_first|...
  --output-mode single|multi|pack
  --export-layout full|full_and_sections|sections_only
  --out <folder>            where files go (default ./jams/<style>)
  --list                    print the whole vocabulary
  --style-info <id>         print a style’s notes without cooking
  --explain-only            resolve and explain without writing MIDI
  --write-example-config <file>   write a starter recipe to edit
  --write-recipes <folder>  write every style’s six recipes as Markdown
`

function args(argv: string[]) {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const [k, inline] = a.slice(2).split("=")
    const next = argv[i + 1]
    out[k.replace(/-/g, "_")] = inline ?? (next && !next.startsWith("--") ? (i++, next) : "true")
  }
  return out
}

const STYLES = FAMILIES.filter(([f]) => f !== "all") as unknown as [Family, string][]
const list = (title: string, xs: readonly Opt[]) => `${title}\n${xs.map(([k, v]) => `  ${k.padEnd(22)} ${v}`).join("\n")}\n`

function styleInfo(id: Family) {
  const g = genreInfo(id)!, guide = GENRE_GUIDE[id]
  const lines = [
    `${STYLES.find(([f]) => f === id)?.[1]} (${id}) · ${g.tempo[0]}–${g.tempo[1]} BPM · ${g.scale} · ${guide.era}`, guide.tagline, "", g.blurb, "",
    "Chords: " + g.chords, "Groove: " + guide.groove, "",
    "Progressions: " + Object.entries(progressionNames(id)).slice(0, 4).map(([k, v]) => `${k} (${v})`).join(", "),
    "Drum patterns: " + drumPatternsFor(id).slice(0, 4).map((p) => p.id).join(", "), "",
    "Production tells:", ...TELLS[id].flatMap((t) => [`  ${t.name}: ${t.intro}`, ...t.moves.map((m) => `    - ${m}`)]), "",
    "Listen to: " + guide.refs.map((r) => (r.track ? `${r.artist} – ${r.track}` : r.artist)).join("; "),
    "", "Recipes:", ...cookbook(id).map((r) => `  ${r.recipe_role.padEnd(13)} ${r.display_title}`),
  ]
  return lines.join("\n")
}

function pickRecipe(style: Family, which: string, root: string): JamConfig | undefined {
  const book = cookbook(style, root)
  const roles: Record<string, number> = { starter: 0, "variation-1": 1, "variation-2": 2, "variation-3": 3, sectioned: 4, live: 5, live_handoff: 5 }
  return which in roles ? book[roles[which]] : book.find((r) => r.recipe_slug === which || r.recipe_slug.endsWith(which))
}

function write(path: string, data: Uint8Array | string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}

function report(j: Jam) {
  console.log(`\n${j.config.display_title || j.config.style}`)
  for (const e of j.explain) console.log("  " + e)
  for (const w of j.warnings) console.log("  ! " + w)
}

async function interactive(): Promise<Record<string, string>> {
  // Piped input (not a terminal) is read up front, so scripted answers work too.
  const piped = !process.stdin.isTTY ? readFileSync(0, "utf8").split(/\r?\n/) : null
  const rl = piped ? null : createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (q: string, def: string) => {
    if (piped) { const v = (piped.shift() ?? "").trim(); console.log(`${q} [${def}]: ${v}`); return v || def }
    return (await rl!.question(`${q} [${def}]: `)).trim() || def
  }
  console.log("jam: leave a prompt blank to keep the default.\n")
  console.log(STYLES.map(([f]) => f).join(", "))
  const style = await ask("Style", "deephouse")
  const key = await ask("Key", `A ${({ minor: "minor", major: "major", dorian: "dorian", phryg: "phrygian", harm: "harmonic minor" } as Record<string, string>)[genreInfo(style)?.scale ?? "minor"]}`)
  const recipe = await ask("Recipe (starter, variation-1..3, sectioned, live, or none)", "starter")
  const output_mode = await ask("Output mode (single, pack)", "single")
  const out = await ask("Output folder", `./jams/${style}`)
  rl?.close()
  return { style, key, ...(recipe !== "none" ? { recipe } : {}), output_mode, out }
}

async function main() {
  const raw = process.argv.slice(2)
  let a = args(raw)
  if (a.help) return console.log(HELP)
  if (!raw.length) a = await interactive()
  if (a.list) {
    console.log(list("Chord colours (chord)", CHORDS) + list("Voicings (voicing)", VOICINGS) + list("Chord rhythms (pattern)", PATTERNS) + list("Bass styles (bass_style)", BASSES) + list("Pad styles (pad_style)", PADS) + list("Lead styles (lead_style)", LEADS) + list("Arrangements (arrangement_archetype)", ARCHETYPES) + list("Output modes (output_mode)", OUTPUT_MODES))
    console.log("Styles\n" + STYLES.map(([f, n]) => `  ${f.padEnd(22)} ${n}`).join("\n"))
    console.log("\nDrum styles: any drum pattern id; --style-info <style> shows the style’s own.")
    return
  }
  if (a.style_info) return console.log(styleInfo(a.style_info as Family))
  if (a.write_example_config) {
    write(a.write_example_config, serializeRecipe({ ...cookbook("deephouse")[0] }, "Edit any line above, then cook it with:\n  npm run jam -- --config " + a.write_example_config))
    return console.log(`Wrote ${a.write_example_config}`)
  }
  if (a.write_recipes) {
    let n = 0
    for (const [f] of STYLES) for (const r of cookbook(f)) { write(join(a.write_recipes, f, r.recipe_slug + ".md"), serializeRecipe(r, `Study: ${r.study}. Listen for the feel, not to copy it.`)); n++ }
    return console.log(`Wrote ${n} recipes to ${a.write_recipes}`)
  }

  const fromFile: Partial<JamConfig> = a.config ? parseRecipe(readFileSync(a.config, "utf8")).config : {}
  const styles = (a.style === "all" ? STYLES.map(([f]) => f) : [(a.style ?? fromFile.style ?? DEFAULTS.style) as Family])
  if (a.recipes) {
    for (const s of styles) console.log(`${s}\n` + cookbook(s).map((r) => `  ${r.recipe_role.padEnd(13)} ${r.recipe_slug.padEnd(40)} ${r.display_title}`).join("\n"))
    return
  }
  // Flags that name a recipe field override the recipe file.
  const overrides: Partial<JamConfig> = {}
  const skip = new Set(["config", "out", "recipe", "explain_only", "style", "export_arrangement_json"])
  for (const [k, v] of Object.entries(a)) if (!skip.has(k) && k in DEFAULTS) Object.assign(overrides, parseRecipe(`${k}: ${v}`).config)

  const jams: Jam[] = []
  for (const s of styles) {
    if (!GENRE_INFO.some((g) => g.id === s)) { console.error(`Unknown style “${s}”. Try --list.`); process.exitCode = 1; return }
    const root = (overrides.key ?? fromFile.key ?? "A").trim().split(/\s+/)[0]
    const base = a.recipe ? pickRecipe(s, a.recipe, root) : undefined
    if (a.recipe && !base) { console.error(`No recipe “${a.recipe}” for ${s}. Try --recipes.`); process.exitCode = 1; return }
    const keyText = overrides.key ?? fromFile.key
    const cfg: Partial<JamConfig> = { ...(base ?? {}), ...fromFile, ...(a.style && a.style !== "all" ? { style: s } : { style: s }), ...overrides, ...(keyText ? { key: keyText } : {}) }
    const j = generate(cfg)
    jams.push(j)
    report(j)
  }
  if (a.explain_only) return
  if (a.export_arrangement_json) write(a.export_arrangement_json, JSON.stringify(jams.map((j) => ({ title: j.config.display_title, bpm: j.bpm, bars: j.bars, sections: j.sections })), null, 2))

  const mode = overrides.output_mode ?? fromFile.output_mode ?? jams[0].config.output_mode
  const outDir = a.out ?? `./jams/${a.style === "all" ? "all-styles" : styles[0]}`
  const name = (j: Jam) => (j.config.recipe_slug || `${j.config.style}_${j.bpm}bpm`)
  if (mode === "multi" && jams.length > 1) {
    // Back to back in one file: one track per layer, each jam after the last.
    const tracks = new Map<string, { name: string; notes: { tick: number; note: number; velocity: number; duration: number; channel: number }[] }>()
    let offset = 0
    for (const j of jams) {
      for (const l of j.layers) {
        const t = tracks.get(l.id) ?? { name: l.id, notes: [] }
        for (const n of l.notes) t.notes.push({ tick: Math.round((offset + n.step) * 24), note: n.midi, velocity: Math.round(j.config.velocity * n.vel), duration: Math.max(1, Math.round(n.len * 24) - 1), channel: LAYER_CHANNEL[l.id] })
        tracks.set(l.id, t)
      }
      offset += j.bars * 16
    }
    write(join(outDir, "multi.mid"), writeMidi([...tracks.values()], jams[0].bpm))
    console.log(`\nWrote ${join(outDir, "multi.mid")} (tempo from the first style; each style follows the last)`)
    return
  }
  for (const j of jams) {
    if (mode === "pack") {
      const dir = join(outDir, jams.length > 1 ? name(j) : "")
      for (const f of packFiles(j)) write(join(dir, f.path), f.data)
      console.log(`\nWrote a pack to ${dir}`)
    } else {
      const file = join(outDir, name(j) + ".mid")
      write(file, jamMidi(j))
      console.log(`\nWrote ${file}`)
    }
  }
}

await main()
