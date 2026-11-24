import { SCALES, spellScale, type Scale } from "@/data/labs"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]
export type Quality = "maj" | "min" | "dim" | "aug"
export interface Chord {
  d: number; r: number; t3: number; t5: number; q: Quality
  roman: string; name: string; pcs: number[]; notes: string[]
}
export interface Theory { sc: Scale; pc: number; names: string[]; pcs: number[]; chords: Chord[]; progs: number[][] }

/** Everything about a key: spelled notes, diatonic triads and a few progressions. */
export function theory(root: number, scaleId: string): Theory {
  const sc = SCALES.find((x) => x.id === scaleId) ?? SCALES[0], pc = root
  const names = spellScale(pc, sc.iv)
  const pcs = sc.iv.map((x) => (pc + x) % 12)
  const chords = sc.iv.map((r, d): Chord => {
    const third = sc.iv[(d + 2) % 7] + (d + 2 > 6 ? 12 : 0), fifth = sc.iv[(d + 4) % 7] + (d + 4 > 6 ? 12 : 0)
    const t3 = third - r, t5 = fifth - r
    const q: Quality = t3 === 4 && t5 === 7 ? "maj" : t3 === 3 && t5 === 7 ? "min" : t3 === 3 && t5 === 6 ? "dim" : "aug"
    const rn = q === "maj" || q === "aug" ? ROMAN[d] : ROMAN[d].toLowerCase()
    return {
      d, r, t3, t5, q,
      roman: rn + (q === "dim" ? "°" : q === "aug" ? "+" : ""),
      name: names[d] + { maj: "", min: "m", dim: "dim", aug: "aug" }[q],
      pcs: [(pc + r) % 12, (pc + r + t3) % 12, (pc + r + t5) % 12],
      notes: [names[d], names[(d + 2) % 7], names[(d + 4) % 7]],
    }
  })
  const progs = sc.minor ? [[0, 5, 2, 6], [0, 3, 4, 0], [0, 3, 6, 2], [0, 6, 5, 4]] : [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4]]
  return { sc, pc, names, pcs, chords, progs }
}

export function chordMidi(T: Theory, ch: Chord) {
  let base = 60 + T.pc + ch.r
  while (base > 67) base -= 12
  return { bass: base - 24, notes: [base, base + ch.t3, base + ch.t5] }
}

export const fmtS = (v: number) => (v < 1 ? Math.round(v * 1000) + " ms" : v.toFixed(2) + " s")
export const fmtHz = (v: number) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + " kHz" : Math.round(v) + " Hz")
export const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
export const noteName = (midi: number) => NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 2)
