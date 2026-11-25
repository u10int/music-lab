/**
 * Notes from separated stems, using Spotify’s Basic Pitch model (Apache-2.0,
 * https://github.com/spotify/basic-pitch). The windowing and note decoding below
 * are ported from its Python package; running the model is left to the caller so
 * this works with any ONNX runtime, in a worker or in Node for tests.
 *
 * - Vocals: the vocal stem’s notes reduced to one line, the strongest note at a time.
 * - Lead: the top line of the instrument stem (synths, keys, guitars), leaving out long pads.
 * - Other: every note in the instrument stem, for MIDI.
 */

export const BP_SR = 22050
const HOP = 256
const WIN = BP_SR * 2 - HOP // 43844 samples per model window
const FRAMES = 172 // output frames per window
const OVERLAP_FRAMES = 30
const OVERLAP = OVERLAP_FRAMES * HOP
const STEP = WIN - OVERLAP
const MIDI_OFFSET = 21
const PITCHES = 88

/** A note: start and length in ms, MIDI pitch, and strength 0–100. Compact, since a track has thousands. */
export type MNote = [start: number, dur: number, midi: number, vel: number]
export interface Melody {
  version: 1
  vocals: MNote[]
  lead: MNote[]
  other: MNote[]
}

/** Runs the model on one window (43844 samples) and returns its note and onset activations, 172 × 88 each. */
export type RunWindow = (x: Float32Array) => Promise<{ note: Float32Array; onset: Float32Array }>

/** Model activations for a whole signal at 22050 Hz: frames × 88 for notes and onsets. */
export async function activations(x: Float32Array, run: RunWindow, onProgress?: (p: number) => void) {
  // Pad the start by half the overlap, then step through windows that overlap by 30 frames.
  const padded = new Float32Array(x.length + OVERLAP / 2)
  padded.set(x, OVERLAP / 2)
  const nFrames = Math.floor((x.length * Math.floor(BP_SR / HOP)) / BP_SR) // 86 frames per second, trimmed to the audio
  const keep = FRAMES - OVERLAP_FRAMES // frames kept per window after trimming 15 from each end
  const note = new Float32Array(nFrames * PITCHES), onset = new Float32Array(nFrames * PITCHES), times = new Float32Array(nFrames)
  const windows = Math.ceil(padded.length / STEP)
  let out = 0
  for (let w = 0; w < windows && out < nFrames; w++) {
    const win = new Float32Array(WIN)
    win.set(padded.subarray(w * STEP, Math.min(padded.length, w * STEP + WIN)))
    const r = await run(win)
    for (let f = OVERLAP_FRAMES / 2; f < OVERLAP_FRAMES / 2 + keep && out < nFrames; f++, out++) {
      note.set(r.note.subarray(f * PITCHES, (f + 1) * PITCHES), out * PITCHES)
      onset.set(r.onset.subarray(f * PITCHES, (f + 1) * PITCHES), out * PITCHES)
      times[out] = (w * STEP - OVERLAP / 2 + f * HOP) / BP_SR
    }
    onProgress?.((w + 1) / windows)
  }
  return { note, onset, nFrames, times }
}

interface DecodeOptions { onset?: number; frame?: number; minFrames?: number; minMidi?: number; maxMidi?: number; energyTol?: number }

/**
 * Basic Pitch’s polyphonic decoding: notes start at onset peaks and run while the
 * frame activation stays up, then any strong energy left over becomes notes too.
 */
export function decodeNotes(A: { note: Float32Array; onset: Float32Array; nFrames: number; times: Float32Array }, o: DecodeOptions = {}): MNote[] {
  const onTh = o.onset ?? 0.5, frTh = o.frame ?? 0.3, minLen = o.minFrames ?? 11, tol = o.energyTol ?? 11
  const lo = Math.max(0, (o.minMidi ?? 21) - MIDI_OFFSET), hi = Math.min(PITCHES, (o.maxMidi ?? 108) - MIDI_OFFSET + 1)
  const n = A.nFrames, P = PITCHES
  const frames = A.note, at = (f: number, p: number) => f * P + p
  // Inferred onsets: where a note’s frame activation jumps, even if the onset head missed it.
  const ons = new Float32Array(A.onset)
  let maxOn = 0, maxDiff = 0
  const diff = new Float32Array(n * P)
  for (let f = 0; f < n; f++) for (let p = 0; p < P; p++) {
    if (p < lo || p >= hi) { ons[at(f, p)] = 0; continue }
    maxOn = Math.max(maxOn, ons[at(f, p)])
    if (f < 2) continue
    const d = Math.min(frames[at(f, p)] - frames[at(f - 1, p)], frames[at(f, p)] - frames[at(f - 2, p)])
    if (d > 0) { diff[at(f, p)] = d; maxDiff = Math.max(maxDiff, d) }
  }
  if (maxDiff > 0) for (let i = 0; i < diff.length; i++) ons[i] = Math.max(ons[i], (maxOn * diff[i]) / maxDiff)

  const energy = new Float32Array(frames)
  for (let f = 0; f < n; f++) for (let p = 0; p < P; p++) if (p < lo || p >= hi) energy[at(f, p)] = 0
  const out: MNote[] = []
  const push = (s: number, e: number, p: number) => {
    let sum = 0
    for (let f = s; f < e; f++) sum += frames[at(f, p)]
    const t0 = A.times[s], t1 = A.times[Math.min(e, n - 1)]
    out.push([Math.round(t0 * 1000), Math.round((t1 - t0) * 1000), p + MIDI_OFFSET, Math.round((sum / (e - s)) * 100)])
  }
  const clear = (s: number, e: number, p: number) => {
    for (let f = s; f < e; f++) for (const q of [p - 1, p, p + 1]) if (q >= 0 && q < P) energy[at(f, q)] = 0
  }
  // Onset peaks over time, latest first.
  const starts: [number, number][] = []
  for (let f = 1; f < n - 1; f++) for (let p = lo; p < hi; p++) {
    const v = ons[at(f, p)]
    if (v >= onTh && v > ons[at(f - 1, p)] && v > ons[at(f + 1, p)]) starts.push([f, p])
  }
  starts.reverse()
  for (const [s, p] of starts) {
    let i = s + 1, k = 0
    while (i < n - 1 && k < tol) { k = energy[at(i, p)] < frTh ? k + 1 : 0; i++ }
    i -= k
    if (i - s <= minLen) continue
    clear(s, i, p)
    push(s, i, p)
  }
  // Leftover energy: follow the strongest remaining peak both ways while it stays up.
  for (;;) {
    let best = -1, bv = frTh
    for (let j = 0; j < energy.length; j++) if (energy[j] > bv) { bv = energy[j]; best = j }
    if (best < 0) break
    const mid = Math.floor(best / P), p = best % P
    energy[best] = 0
    let i = mid + 1, k = 0
    while (i < n - 1 && k < tol) { k = energy[at(i, p)] < frTh ? k + 1 : 0; for (const q of [p - 1, p, p + 1]) if (q >= 0 && q < P) energy[at(i, q)] = 0; i++ }
    const end = i - 1 - k
    i = mid - 1; k = 0
    while (i > 0 && k < tol) { k = energy[at(i, p)] < frTh ? k + 1 : 0; for (const q of [p - 1, p, p + 1]) if (q >= 0 && q < P) energy[at(i, q)] = 0; i-- }
    const start = i + 1 + k
    if (end - start <= minLen) continue
    push(start, end, p)
  }
  return out.sort((a, b) => a[0] - b[0] || a[2] - b[2])
}

/**
 * One note at a time: stronger and longer notes win where notes overlap, then each
 * note is cut where the next begins, and repeats of a pitch with a tiny gap are joined.
 */
export function monophonic(notes: MNote[], minVel = 25, minDur = 90): MNote[] {
  const cand = notes.filter((n) => n[3] >= minVel && n[1] >= minDur).sort((a, b) => b[3] * Math.sqrt(b[1]) - a[3] * Math.sqrt(a[1]))
  const kept: MNote[] = []
  for (const n of cand) {
    const s = n[0], e = n[0] + n[1]
    // Skip a note mostly covered by a stronger one already kept.
    const covered = kept.reduce((t, k) => t + Math.max(0, Math.min(e, k[0] + k[1]) - Math.max(s, k[0])), 0)
    if (covered > n[1] * 0.3) continue
    kept.push([...n] as MNote)
  }
  kept.sort((a, b) => a[0] - b[0])
  const out: MNote[] = []
  for (const n of kept) {
    const last = out[out.length - 1]
    if (last && last[0] + last[1] > n[0]) last[1] = Math.max(0, n[0] - last[0])
    if (last && last[2] === n[2] && n[0] - (last[0] + last[1]) < 60) { last[1] = n[0] + n[1] - last[0]; last[3] = Math.max(last[3], n[3]); continue }
    out.push(n)
  }
  return out.filter((n) => n[1] >= minDur * 0.6)
}

/**
 * The top line of a polyphonic part: at each moment the highest sounding note, leaving
 * out notes held longer than `maxHold` ms (pads and drones), then made monophonic.
 */
export function topLine(notes: MNote[], maxHold: number, minVel = 30): MNote[] {
  // A pad is often heard as a string of short notes on one pitch, re-struck by whatever
  // plays over it; join those first, and leave out any pitch that holds longer than maxHold.
  const byPitch = new Map<number, MNote[]>()
  for (const n of notes) byPitch.set(n[2], [...(byPitch.get(n[2]) ?? []), n])
  const held = new Set<MNote>()
  for (const list of byPitch.values()) {
    list.sort((a, b) => a[0] - b[0])
    let chain: MNote[] = []
    // Held: spans more than maxHold and sounds for most of it (a riff repeating one pitch has rests).
    const close = () => {
      if (chain.length) {
        const span = chain[chain.length - 1][0] + chain[chain.length - 1][1] - chain[0][0], on = chain.reduce((t, n) => t + n[1], 0)
        if (span > maxHold && on >= span * 0.75) chain.forEach((n) => held.add(n))
      }
      chain = []
    }
    for (const n of list) {
      const last = chain[chain.length - 1]
      if (last && n[0] - (last[0] + last[1]) > 400) close()
      chain.push(n)
    }
    close()
  }
  const cand = notes.filter((n) => n[3] >= minVel && !held.has(n))
  const top: MNote[] = []
  for (const n of cand) {
    const s = n[0], e = n[0] + n[1]
    // The parts of this note where nothing higher (and reasonably strong) is sounding.
    let segs: [number, number][] = [[s, e]]
    for (const m of cand) {
      if (m[2] <= n[2] || m[0] >= e || m[0] + m[1] <= s) continue
      const ms = m[0], me = m[0] + m[1]
      segs = segs.flatMap(([a, b]): [number, number][] => (me <= a || ms >= b ? [[a, b]] : [...(ms > a ? [[a, ms] as [number, number]] : []), ...(me < b ? [[me, b] as [number, number]] : [])]))
    }
    for (const [a, b] of segs) if (b - a >= 90) top.push([a, b - a, n[2], n[3]])
  }
  return monophonic(top, minVel, 90)
}

/** Every note in both stems, from model activations. */
export function melodyFrom(vocal: ReturnType<typeof decodeNotes>, other: ReturnType<typeof decodeNotes>, barMs: number): Melody {
  return {
    version: 1,
    vocals: monophonic(vocal),
    lead: topLine(other.filter((n) => n[2] >= 55), barMs),
    other,
  }
}

/** Halve the sample rate with a low-pass first, so nothing above ~10 kHz folds back. */
export function halfRate(x: Float32Array) {
  // 31-tap half-band low-pass: a windowed sinc cut off at a quarter of the input rate.
  const N = 31, half = 15, taps = new Float32Array(N)
  let sum = 0
  for (let k = 0; k < N; k++) {
    const m = k - half, sinc = m === 0 ? 0.5 : Math.sin((Math.PI * m) / 2) / (Math.PI * m)
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * k) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * k) / (N - 1))
    taps[k] = sinc * w; sum += taps[k]
  }
  const y = new Float32Array(Math.floor(x.length / 2))
  for (let i = 0; i < y.length; i++) {
    let s = 0
    const c = i * 2
    for (let k = 0; k < N; k++) { const j = c + k - half; if (j >= 0 && j < x.length) s += taps[k] * x[j] }
    y[i] = s / sum
  }
  return y
}
