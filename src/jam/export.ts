import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { genreInfo } from "@/data/genres"
import { TICKS_PER_16TH, writeMidi, type MidiTrack } from "@/lib/midi-file"
import { LAYER_CHANNEL, LAYER_NAME, type Jam, type JLayer, type LayerId } from "./generate"
import { serializeRecipe } from "./recipe"

const ROLE_FOR: Record<Exclude<LayerId, "drums">, string[]> = { bass: ["Bass"], chords: ["Chords", "Pluck"], pad: ["Pad", "Chords"], lead: ["Lead", "Pluck"] }

function track(j: Jam, l: JLayer, from = 0, to = Infinity): MidiTrack {
  const vel = j.config.velocity
  const notes = l.notes.filter((n) => n.step >= from * 16 && n.step < to * 16).map((n) => ({
    tick: Math.max(0, Math.round((n.step - from * 16) * TICKS_PER_16TH)),
    note: n.midi,
    velocity: Math.round(Math.min(127, vel * n.vel * (l.id === "drums" ? 1.15 : 1))),
    duration: Math.max(1, Math.round(n.len * TICKS_PER_16TH) - 1),
    channel: LAYER_CHANNEL[l.id],
  }))
  const bars = Math.min(to, j.bars) - from
  return { name: LAYER_NAME[l.id], notes, length: bars * 16 * TICKS_PER_16TH }
}

/** The whole jam as one multi-track MIDI file. */
export const jamMidi = (j: Jam, layers?: LayerId[]) => writeMidi(j.layers.filter((l) => !layers || layers.includes(l.id)).map((l) => track(j, l)), j.bpm)

/** One section as its own file, for clips in Live’s Session View. */
export function sectionMidi(j: Jam, i: number) {
  const s = j.sections[i]
  return writeMidi(j.layers.filter((l) => s.layers.includes(l.id)).map((l) => track(j, l, s.start, s.start + s.bars)), j.bpm)
}

/** Sound cards: a sound from the app’s genre sounds for each layer, with how to build it. */
function soundCards(j: Jam) {
  const fams = [j.config.style, ...(genreInfo(j.config.style)?.near ?? [])]
  const lines: string[] = []
  for (const id of ["bass", "chords", "pad", "lead"] as const) {
    if (!j.layers.some((l) => l.id === id)) continue
    const s = fams.flatMap((f) => GENRE_SOUNDS.filter((x) => x.family === f && ROLE_FOR[id].includes(x.role)))[0]
    if (!s) continue
    lines.push(`### ${LAYER_NAME[id]}: ${s.name}`, s.what, "", ...s.steps.map((t, i) => `${i + 1}. ${t}`), `Effects: ${s.chain.join(" → ")}`, "")
  }
  return lines
}

/** Notes for importing the pack into Live. */
export function packNotes(j: Jam): string {
  const c = j.config
  const lines = [
    `# ${c.display_title || c.style} – import notes`, "",
    ...j.explain.map((e) => `- ${e}`), "",
    "## Into Live",
    "1. Set the tempo to " + j.bpm + " BPM.",
    "2. Drag `full.mid` into an empty MIDI track; Live splits it into one track per layer.",
    `3. Channels: ${j.layers.map((l) => `${LAYER_NAME[l.id]} on ${LAYER_CHANNEL[l.id] + 1}`).join(", ")}. Drums use General MIDI notes for Drum Rack (kick 36, snare 38, clap 39, closed hat 42, open hat 46).`,
    ...(j.sections.length > 1 ? ["4. Drop each file in `sections/` into Session View as a scene, one clip slot per layer, to jam the arrangement live."] : []),
    "",
  ]
  if (c.study) lines.push("## Study", `${c.study}: listen for the feel, not to copy it.`, "")
  if (c.sound_design_cards) lines.push("## Sound cards", ...soundCards(j))
  return lines.join("\n")
}

export interface PackFile { path: string; data: Uint8Array | string }

/** Everything in a pack: full MIDI, layers, sections, the recipe and notes. */
export function packFiles(j: Jam): PackFile[] {
  const files: PackFile[] = [{ path: "full.mid", data: jamMidi(j) }]
  for (const l of j.layers) files.push({ path: `layers/${l.id}.mid`, data: jamMidi(j, [l.id]) })
  if (j.sections.length > 1 && j.config.export_layout !== "full") j.sections.forEach((s, i) => files.push({ path: `sections/${String(i + 1).padStart(2, "0")}-${s.name.toLowerCase().replace(/\s+/g, "-")}.mid`, data: sectionMidi(j, i) }))
  files.push({ path: "recipe.md", data: serializeRecipe(j.config) }, { path: "notes.md", data: packNotes(j) })
  return files
}

/* ---------- A tiny zip writer (no compression), so the browser can download a pack as one file ---------- */

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
const crc32 = (d: Uint8Array) => { let c = 0xffffffff; for (const b of d) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

export function zip(files: PackFile[], folder = ""): Uint8Array {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []
  const u16 = (n: number) => [n & 255, (n >> 8) & 255], u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
  let offset = 0, centralSize = 0
  for (const f of files) {
    const name = enc.encode(folder + f.path), data = typeof f.data === "string" ? enc.encode(f.data) : f.data
    const crc = crc32(data)
    const head = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name])
    const entry = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name])
    parts.push(head, data)
    central.push(entry)
    offset += head.length + data.length
    centralSize += entry.length
  }
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)])
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((n, a) => n + a.length, 0))
  let at = 0
  for (const a of all) { out.set(a, at); at += a.length }
  return out
}
