/** Minimal Standard MIDI File (type 1) writer for exporting patterns to Live. */
export interface MidiNote { tick: number; note: number; velocity: number; duration: number; channel?: number }
export interface MidiTrack { name: string; notes: MidiNote[]; /** Track length in ticks, so the clip keeps its full bar. */ length?: number }

const PPQ = 96

function vlq(n: number): number[] {
  const out = [n & 0x7f]
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80)
  return out
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const u16 = (n: number) => [(n >> 8) & 255, n & 255]
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0) & 0x7f)

function chunk(id: string, data: number[]) {
  return [...ascii(id), ...u32(data.length), ...data]
}

function trackData(t: MidiTrack, bpm?: number) {
  const ev: { tick: number; bytes: number[]; order: number }[] = []
  const name = ascii(t.name)
  ev.push({ tick: 0, bytes: [0xff, 0x03, ...vlq(name.length), ...name], order: 0 })
  if (bpm) {
    const us = Math.round(60000000 / bpm)
    ev.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (us >> 16) & 255, (us >> 8) & 255, us & 255], order: 0 })
    ev.push({ tick: 0, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8], order: 0 })
  }
  for (const n of t.notes) {
    const ch = (n.channel ?? 0) & 15
    ev.push({ tick: n.tick, bytes: [0x90 | ch, n.note & 127, Math.max(1, Math.min(127, n.velocity))], order: 2 })
    ev.push({ tick: n.tick + n.duration, bytes: [0x80 | ch, n.note & 127, 0], order: 1 })
  }
  ev.sort((a, b) => a.tick - b.tick || a.order - b.order)
  const data: number[] = []
  let last = 0
  for (const e of ev) {
    data.push(...vlq(e.tick - last), ...e.bytes)
    last = e.tick
  }
  data.push(...vlq(Math.max(0, (t.length ?? last) - last)), 0xff, 0x2f, 0x00)
  return chunk("MTrk", data)
}

/** Ticks per 16th note at this file's resolution. */
export const TICKS_PER_16TH = PPQ / 4

export function writeMidi(tracks: MidiTrack[], bpm: number): Uint8Array {
  const bytes = [...chunk("MThd", [...u16(1), ...u16(tracks.length), ...u16(PPQ)]), ...tracks.flatMap((t, i) => trackData(t, i === 0 ? bpm : undefined))]
  return new Uint8Array(bytes)
}

export function downloadFile(data: Uint8Array | string, filename: string, type = "audio/midi") {
  const blob = new Blob([data as BlobPart], { type })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
