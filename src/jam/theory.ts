import { SCALES } from "@/data/labs"
import type { ChordColor, Voicing } from "./vocab"

const LETTER: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
const SCALE_WORDS: Record<string, string> = { minor: "minor", min: "minor", m: "minor", aeolian: "minor", major: "major", maj: "major", ionian: "major", dorian: "dorian", phrygian: "phryg", phryg: "phryg", harmonic: "harm", harm: "harm", "harmonic minor": "harm" }
export const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
export const SCALE_LABEL: Record<string, string> = { minor: "minor", major: "major", dorian: "dorian", phryg: "phrygian", harm: "harmonic minor" }

export interface Key { root: number; scale: string; iv: number[] }

/** “F# minor”, “Bb major”, “A dorian”, “Cm” or just “E”. */
export function parseKey(text: string, fallbackScale = "minor"): Key {
  const m = text.trim().toLowerCase().match(/^([a-g])\s*(#|♯|b|♭)?\s*(.*)$/)
  if (!m) throw new Error(`Couldn’t read the key “${text}”. Try something like “A minor” or “F# dorian”.`)
  const root = (LETTER[m[1]] + (m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0) + 12) % 12
  const word = m[3].trim()
  const scale = word ? SCALE_WORDS[word] : fallbackScale
  if (!scale) throw new Error(`Unknown scale “${m[3]}”. Use minor, major, dorian, phrygian or harmonic minor.`)
  return { root, scale, iv: scaleIv(scale) }
}
export const scaleIv = (scale: string) => (SCALES.find((s) => s.id === scale) ?? SCALES[0]).iv
const MODE_TO_MAJOR: Record<string, number> = { major: 0, minor: 3, harm: 3, dorian: 10, phryg: 8 }
/** Flat keys (F, B♭, E♭… and their relative minors) spell with flats, the rest with sharps. */
export function spell(k: Key, pc: number) {
  const flats = [5, 10, 3, 8, 1, 6].includes((k.root + (MODE_TO_MAJOR[k.scale] ?? 0)) % 12)
  return (flats ? ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] : ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"])[pc % 12]
}
export const keyName = (k: Key) => `${NOTE_NAMES[k.root]} ${SCALE_LABEL[k.scale] ?? k.scale}`

type Quality = "maj" | "min" | "dim" | "aug"
export interface Chord {
  /** Semitones above the key’s root. */
  root: number
  quality: Quality
  /** Per-chord colour from a suffix like 7, 9 or sus4. */
  color?: ChordColor
  label: string
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii"]

/** Read Roman numerals relative to the key’s scale: i, VI, bII, v7, IVmaj9, ii°, VIIsus4. */
export function parseProgression(text: string, key: Key): Chord[] {
  const tokens = text.split(/[\s,–—-]+/).filter(Boolean)
  if (!tokens.length) throw new Error("The progression is empty.")
  return tokens.map((tok) => {
    const m = tok.match(/^(b|#|♭|♯)?(vii|vi|v|iv|iii|ii|i)(°|o|\+|dim|aug)?(.*)$/i)
    if (!m) throw new Error(`Couldn’t read the chord “${tok}”. Use Roman numerals like i, VI, bII or v7.`)
    const n = ROMAN.indexOf(m[2].toLowerCase())
    const acc = m[1] === "b" || m[1] === "♭" ? -1 : m[1] ? 1 : 0
    const upper = m[2] === m[2].toUpperCase()
    const quality: Quality = m[3] === "°" || m[3] === "o" || m[3]?.toLowerCase() === "dim" ? "dim" : m[3] === "+" || m[3]?.toLowerCase() === "aug" ? "aug" : upper ? "maj" : "min"
    const suffix = m[4].toLowerCase()
    const color: ChordColor | undefined = !suffix ? undefined : suffix.includes("sus2") ? "sus2" : suffix.includes("sus") ? "sus4" : suffix.includes("add9") ? "add9" : suffix.includes("11") ? "eleventh" : suffix.includes("9") ? "ninth" : suffix.includes("7") ? "seventh" : suffix.includes("6") ? "sixth" : suffix.includes("5") ? "power" : undefined
    // Accidentals are read against the major scale, as usual (bVII is a whole step below the root); plain numerals follow the key’s own scale.
    const MAJOR = [0, 2, 4, 5, 7, 9, 11]
    return { root: ((acc ? MAJOR[n] : key.iv[n]) + acc + 12) % 12, quality, color, label: tok }
  })
}

/** Scale degrees (0 = i) as Roman numerals in this scale. */
export function degreesToRoman(degrees: number[], iv: number[]) {
  return degrees.map((d) => {
    const r = iv[d], t = (iv[(d + 2) % 7] - r + 12) % 12, f = (iv[(d + 4) % 7] - r + 12) % 12
    const base = ROMAN[d]
    return t === 4 ? base.toUpperCase() + (f === 8 ? "+" : "") : base + (f === 6 ? "°" : "")
  }).join(",")
}

/** An interval above the chord root that stays in the key when it can, else a sensible default. */
function inKey(key: Key, root: number, want: number[], fallback: number) {
  for (const w of want) if (key.iv.includes((root + w) % 12)) return w
  return fallback
}

/** Intervals above the chord’s root for a colour. */
export function chordIntervals(c: Chord, color: ChordColor, key: Key): number[] {
  const third = c.quality === "maj" || c.quality === "aug" ? 4 : 3
  const fifth = c.quality === "dim" ? 6 : c.quality === "aug" ? 8 : 7
  const seventh = () => inKey(key, c.root, c.quality === "maj" ? [11, 10] : [10, 11], c.quality === "maj" ? 11 : 10)
  const ninth = () => (key.iv.includes((c.root + 2) % 12) ? 14 : 0)
  switch (c.color ?? color) {
    case "power": return [0, 7, 12]
    case "sus2": return [0, 2, 7]
    case "sus4": return [0, 5, 7]
    case "seventh": return [0, third, fifth, seventh()]
    case "ninth": { const n = ninth(); return n ? [0, third, fifth, seventh(), n] : [0, third, fifth, seventh()] }
    case "add9": return [0, third, fifth, 14]
    case "sixth": return [0, third, fifth, inKey(key, c.root, [9, 8], 9)]
    case "eleventh": { const n = ninth(); return [0, third, fifth, seventh(), ...(n ? [n] : []), 17] }
    case "quartal": return [0, 5, 10, 15]
    case "cluster": return [0, inKey(key, c.root, [2, 1], 2), third, fifth]
    default: return [0, third, fifth]
  }
}

/** MIDI pitch of the chord’s root near a register (C3 = 60, as in Live). */
export function rootMidi(key: Key, c: Chord, octave: number) {
  const base = 12 * (octave + 2) + key.root
  let m = base + c.root
  if (m > base + 7) m -= 12
  return m
}

/** Turn intervals into MIDI notes with a voicing. `prev` is the last chord, for voice leading. */
export function voice(root: number, ints: number[], v: Voicing, prev?: number[]): number[] {
  const closed = ints.map((i) => root + i).sort((a, b) => a - b)
  switch (v) {
    case "open": return closed.map((n, i) => (i === 1 && closed.length > 2 ? n + 12 : n)).sort((a, b) => a - b)
    case "wide": return [closed[0] - 12, ...closed.slice(1).map((n, i) => (i === 0 ? n + 12 : n))].sort((a, b) => a - b)
    case "drop2": {
      if (closed.length < 4) return closed
      const out = [...closed]
      out[out.length - 2] -= 12
      return out.sort((a, b) => a - b)
    }
    case "rootless": return closed.length >= 4 ? closed.slice(1) : closed
    case "shell": return closed.length >= 4 ? [closed[0], closed[1], closed[3]] : closed
    case "auto_voice_leading": {
      if (!prev?.length) return closed
      // Try every inversion in a few octaves and keep the one that moves least.
      let best = closed, cost = Infinity
      for (let inv = 0; inv < closed.length; inv++) for (const shift of [-12, 0, 12]) {
        const cand = closed.map((n, i) => n + (i < inv ? 12 : 0) + shift).sort((a, b) => a - b)
        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
        const c = Math.abs(avg(cand) - avg(prev)) + Math.abs(cand[cand.length - 1] - prev[prev.length - 1]) * 0.5
        if (c < cost) { cost = c; best = cand }
      }
      return best
    }
    default: return closed
  }
}

/** A tiny seeded random number generator, so the same recipe always cooks the same MIDI. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { next, pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)], chance: (p: number) => next() < p }
}
export const hashSeed = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7)
