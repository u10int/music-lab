import type { MNote } from "./melody-core"
import { TICKS_PER_16TH, type MidiTrack } from "./midi-file"
import type { Parts } from "./transcribe-core"

/** A note on the parts grid: start and length in 16ths from the first downbeat (fractional unless snapped). */
export interface GridNote { step: number; len: number; midi: number; vel: number }

/** Notes in ms to the parts grid, snapped to 16ths when asked. */
export function toGrid(notes: MNote[], parts: Parts, snap: boolean): GridNote[] {
  const step = 60 / parts.tempo / 4
  const out: GridNote[] = []
  for (const [ms, dur, midi, vel] of notes) {
    let s = (ms / 1000 - parts.t0) / step, l = dur / 1000 / step
    if (snap) { const e = Math.round(s + l); s = Math.round(s); l = Math.max(1, e - s) }
    if (s + l <= 0) continue
    out.push({ step: s, len: l, midi, vel })
  }
  if (!snap) return out
  // Snapping can stack two notes on one step; keep the stronger, and cut overlaps.
  const by = new Map<number, GridNote>()
  for (const n of out) { const o = by.get(n.step); if (!o || n.vel > o.vel) by.set(n.step, n) }
  const sorted = [...by.values()].sort((a, b) => a.step - b.step)
  sorted.forEach((n, i) => { const next = sorted[i + 1]; if (next && n.step + n.len > next.step) n.len = Math.max(1, next.step - n.step) })
  return sorted
}

/** MIDI tracks for the melody parts between two bars, placed from tick 0. */
export function melodyTracks(parts: Parts, fromBar: number, bars: number, snap: boolean, withOther: boolean): MidiTrack[] {
  const m = parts.melody
  if (!m) return []
  const lo = fromBar * 16, hi = (fromBar + bars) * 16
  const track = (name: string, notes: MNote[], channel: number, poly = false): MidiTrack => ({
    name,
    notes: toGrid(notes, parts, snap && !poly).filter((n) => n.step >= lo && n.step < hi).map((n) => ({
      tick: Math.round((n.step - lo) * TICKS_PER_16TH),
      note: n.midi,
      velocity: Math.max(30, Math.min(120, Math.round(40 + n.vel * 0.8))),
      duration: Math.max(6, Math.round(n.len * TICKS_PER_16TH) - 2),
      channel,
    })),
    length: bars * 16 * TICKS_PER_16TH,
  })
  const tracks = [track("Vocals", m.vocals, 3), track("Lead melody", m.lead, 4)]
  if (withOther) tracks.push(track("Instruments (all notes)", m.other, 5, true))
  return tracks.filter((t) => t.notes.length)
}

