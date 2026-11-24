import { NOTE_NAMES } from "./theory"

/** Interval sets (from the root, in semitones) and the suffix used to name them. */
const SHAPES: [number[], string, string][] = [
  [[0, 4, 7], "", "major"],
  [[0, 3, 7], "m", "minor"],
  [[0, 3, 6], "dim", "diminished"],
  [[0, 4, 8], "aug", "augmented"],
  [[0, 2, 7], "sus2", "suspended 2nd"],
  [[0, 5, 7], "sus4", "suspended 4th"],
  [[0, 4, 7, 11], "maj7", "major 7th"],
  [[0, 3, 7, 10], "m7", "minor 7th"],
  [[0, 4, 7, 10], "7", "dominant 7th"],
  [[0, 3, 6, 10], "m7♭5", "half-diminished"],
  [[0, 3, 6, 9], "dim7", "diminished 7th"],
  [[0, 4, 7, 9], "6", "major 6th"],
  [[0, 3, 7, 9], "m6", "minor 6th"],
  [[0, 4, 7, 14], "add9", "add 9"],
  [[0, 7], "5", "power chord"],
]

export interface ChordMatch { name: string; quality: string; root: number; pcs: number[]; inversion: boolean }

/** Names the chord made by a set of MIDI notes, or null if it isn't a known shape. */
export function detectChord(notes: number[]): ChordMatch | null {
  const pcs = [...new Set(notes.map((n) => n % 12))]
  if (pcs.length < 2) return null
  const bass = Math.min(...notes) % 12
  let best: ChordMatch | null = null
  for (const root of pcs) {
    const rel = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b)
    for (const [shape, suffix, quality] of SHAPES) {
      const want = [...new Set(shape.map((x) => x % 12))].sort((a, b) => a - b)
      if (want.length === rel.length && want.every((x, i) => x === rel[i])) {
        const m = { name: NOTE_NAMES[root] + suffix + (bass !== root ? "/" + NOTE_NAMES[bass] : ""), quality, root, pcs, inversion: bass !== root }
        if (!best || (best.inversion && !m.inversion)) best = m
      }
    }
  }
  return best
}

/** Name the interval between two notes. */
const INTERVAL_NAMES = ["Unison", "Minor 2nd", "Major 2nd", "Minor 3rd", "Major 3rd", "Perfect 4th", "Tritone", "Perfect 5th", "Minor 6th", "Major 6th", "Minor 7th", "Major 7th"]
export function intervalName(a: number, b: number) {
  const d = Math.abs(b - a)
  return d === 12 ? "Octave" : INTERVAL_NAMES[d % 12] + (d > 12 ? " (+ octave)" : "")
}
