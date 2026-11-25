/**
 * Audio analysis that runs on plain samples (no DOM), so it can run in a worker:
 * tempo from an onset envelope, key from a chroma profile, loudness, a waveform
 * overview, and suggested sections from where the low end and energy change.
 * Input is mono audio, ideally at 11025 Hz.
 */

export interface Analysis {
  duration: number
  /** Most likely tempo, plus the half and double readings. */
  tempo: number
  tempoAlt: number[]
  /** 0–1: how clearly one tempo stood out. */
  tempoConf: number
  keyRoot: number
  minor: boolean
  /** 0–1: how clearly one key stood out. */
  keyConf: number
  /** The next most likely keys, as [root, minor]. */
  keyAlt: [number, boolean][]
  /** Average level and peak, in dBFS. */
  rms: number
  peak: number
  /** Waveform overview: loudness per slice, 0–1. */
  peaks: number[]
  /** Where the track changes: low end in or out, energy up or down. */
  sections: { t: number; label: string; energy: number }[]
  /** Short moments where the low end cuts out (gaps before drops). */
  dropouts: { t: number; len: number }[]
  /** Where the sound ends, if there's silence at the end. */
  end: number
}

/* ---------- FFT ---------- */

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const nr = cr * wr - ci * wi
        ci = cr * wi + ci * wr; cr = nr
      }
    }
  }
}

/** Magnitude spectra of hann-windowed frames. */
function spectra(x: Float32Array, n: number, hop: number) {
  const win = new Float64Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  const frames: Float32Array[] = []
  const re = new Float64Array(n), im = new Float64Array(n)
  for (let start = 0; start + n <= x.length; start += hop) {
    for (let i = 0; i < n; i++) { re[i] = x[start + i] * win[i]; im[i] = 0 }
    fft(re, im)
    const mag = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i])
    frames.push(mag)
  }
  return frames
}

/* ---------- Tempo ---------- */

function estimateTempo(x: Float32Array, sr: number) {
  const n = 1024, hop = 128, fps = sr / hop
  const S = spectra(x, n, hop)
  const env = new Float64Array(S.length)
  for (let f = 1; f < S.length; f++) {
    let s = 0
    for (let k = 2; k < n / 2; k++) {
      const d = Math.log1p(100 * S[f][k]) - Math.log1p(100 * S[f - 1][k])
      if (d > 0) s += d
    }
    env[f] = s
  }
  // Remove the slow trend so only the hits are left.
  const w = Math.round(fps * 0.5), o = new Float64Array(env.length)
  let acc = 0
  for (let i = 0; i < env.length; i++) {
    acc += env[i] - (i - w >= 0 ? env[i - w] : 0)
    o[i] = Math.max(0, env[i] - acc / Math.min(i + 1, w))
  }
  const maxLag = Math.min(o.length - 1, Math.ceil(fps * 32)), acf = new Float64Array(maxLag + 2)
  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let s = 0
    for (let i = lag; i < o.length; i++) s += o[i] * o[i - lag]
    acf[lag] = s / (o.length - lag)
  }
  const at = (lag: number) => {
    const i = Math.floor(lag), f = lag - i
    return i + 1 >= acf.length ? 0 : acf[i] * (1 - f) + acf[i + 1] * f
  }
  // Score each tempo by how strongly the hits repeat at 1, 2, 4 and 8 beats.
  const score = (bpm: number) => {
    const period = (60 / bpm) * fps
    let s = 0
    for (const [k, wt] of [[1, 1], [2, 1], [4, 1.2], [8, 1.2], [16, 1.2]] as const) if (k * period < maxLag) s += wt * at(k * period)
    return s
  }
  let best = 0, bestScore = -1
  const scores: number[] = []
  for (let bpm = 70; bpm <= 180; bpm += 0.05) {
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2))
    const sc = score(bpm) * (0.75 + 0.25 * prior)
    scores.push(sc)
    if (sc > bestScore) { bestScore = sc; best = bpm }
  }
  // Fine pass: near the best tempo, check alignment over 16 and 32 beats, where a 1 BPM error adds up to a whole 16th.
  const fine = (bpm: number) => {
    const period = (60 / bpm) * fps
    let s2 = 0
    for (const k of [4, 8, 16, 24, 32]) if (k * period < maxLag) s2 += at(k * period)
    return s2
  }
  let fineBest = best, fineScore = -1
  for (let bpm = best - 1.5; bpm <= best + 1.5; bpm += 0.01) {
    const sc = fine(bpm)
    if (sc > fineScore) { fineScore = sc; fineBest = bpm }
  }
  best = fineBest
  const sorted = [...scores].sort((a, b) => b - a)
  const median = sorted[Math.floor(sorted.length / 2)]
  const conf = Math.max(0, Math.min(1, (bestScore - median) / (bestScore + 1e-9)))
  const tempo = Math.round(best * 2) / 2
  const alt = [tempo / 2, tempo * 2].filter((v) => v >= 55 && v <= 220).map((v) => Math.round(v * 2) / 2)
  return { tempo, alt, conf }
}

/* ---------- Key ---------- */

// Krumhansl’s key profiles: how strongly each scale step implies major and minor keys.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
function corr(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length
  let n = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
  return n / Math.sqrt(da * db + 1e-12)
}
function estimateKey(S: Float32Array[], sr: number, n: number) {
  // One value per note from C2 to C7 (the loudest bin in each semitone), so high notes don’t outweigh low ones
  // just because they cover more FFT bins. Like a constant-Q chroma.
  const notes: [number, number, number][] = []
  for (let m = 36; m <= 96; m++) {
    const lo = 440 * Math.pow(2, (m - 0.5 - 69) / 12), hi = 440 * Math.pow(2, (m + 0.5 - 69) / 12)
    const a = Math.max(1, Math.floor((lo * n) / sr)), b = Math.max(a + 1, Math.ceil((hi * n) / sr))
    notes.push([m % 12, a, b])
  }
  const chroma = new Array(12).fill(0)
  for (const frame of S) {
    const c = new Array(12).fill(0)
    for (const [pc, a, b] of notes) {
      let mx = 0
      for (let k = a; k < b && k < frame.length; k++) if (frame[k] > mx) mx = frame[k]
      c[pc] += mx * mx
    }
    const top = Math.max(...c)
    if (top > 1e-9) for (let i = 0; i < 12; i++) chroma[i] += c[i] / top
  }
  const scores: { root: number; minor: boolean; r: number }[] = []
  for (let r = 0; r < 12; r++) {
    const rot = (p: number[]) => p.map((_, i) => p[(i - r + 12) % 12])
    scores.push({ root: r, minor: false, r: corr(rot(MAJOR), chroma) }, { root: r, minor: true, r: corr(rot(MINOR), chroma) })
  }
  scores.sort((a, b) => b.r - a.r)
  const conf = Math.max(0, Math.min(1, (scores[0].r - scores[1].r) * 4 + (scores[0].r - 0.5)))
  return { root: scores[0].root, minor: scores[0].minor, conf, alt: scores.slice(1, 3).map((s) => [s.root, s.minor] as [number, boolean]) }
}

/* ---------- Everything ---------- */

const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -120)

export function analyzeSamples(x: Float32Array, sr: number): Analysis {
  const duration = x.length / sr
  let peak = 0, sum = 0
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; sum += v * v }

  // Waveform overview: RMS in 600 slices.
  const slices = 600, per = Math.max(1, Math.floor(x.length / slices)), raw: number[] = []
  for (let s = 0; s < slices; s++) {
    let a = 0
    for (let i = s * per; i < Math.min(x.length, (s + 1) * per); i++) a += x[i] * x[i]
    raw.push(Math.sqrt(a / per))
  }
  const top = Math.max(...raw, 1e-9)
  const peaks = raw.map((v) => Math.round((v / top) * 100) / 100)

  const tempo = estimateTempo(x, sr)

  const n = 4096, hop = 2048, S = spectra(x, n, hop), fps = sr / hop
  const key = estimateKey(S, sr, n)

  // Per-frame energy in the low end (below 150 Hz) and overall.
  const lowBin = Math.round((150 * n) / sr)
  const low: number[] = [], all: number[] = []
  for (const f of S) {
    let l = 0, a = 0
    for (let k = 1; k < f.length; k++) { const p = f[k] * f[k]; a += p; if (k <= lowBin) l += p }
    low.push(Math.sqrt(l)); all.push(Math.sqrt(a))
  }
  const smooth = (v: number[], w: number) => v.map((_, i) => {
    const a = v.slice(Math.max(0, i - w), i + w + 1).sort((p, q) => p - q)
    return a[Math.floor(a.length / 2)]
  })
  const pct = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(v.length * p)]
  const lowRef = pct(low, 0.9), allRef = pct(all, 0.95)

  // Where the sound ends.
  let endFrame = all.length - 1
  while (endFrame > 0 && all[endFrame] < allRef * 0.02) endFrame--
  const end = Math.min(duration, (endFrame + 1) / fps)

  // Short dropouts in the low end (a beat or two of no kick and bass).
  const dropouts: { t: number; len: number }[] = []
  let gapStart = -1
  for (let i = 0; i <= endFrame; i++) {
    const out = low[i] < lowRef * 0.12
    if (out && gapStart < 0) gapStart = i
    if (!out && gapStart >= 0) {
      const len = (i - gapStart) / fps, before = low.slice(Math.max(0, gapStart - Math.round(fps * 2)), gapStart)
      if (len >= 0.75 && len <= 3 && before.some((v) => v > lowRef * 0.4) && low.slice(i, i + Math.round(fps)).some((v) => v > lowRef * 0.4)) dropouts.push({ t: Math.round((gapStart / fps) * 10) / 10, len: Math.round(len * 10) / 10 })
      gapStart = -1
    }
  }

  // Sections: split where the low end comes in or goes out, or the energy changes a lot, for at least 6 seconds.
  const lowS = smooth(low, Math.round(fps * 1.5)), allS = smooth(all, Math.round(fps * 1.5))
  const state = (i: number) => (lowS[i] > lowRef * 0.15 ? 1 : 0) * 2 + (allS[i] > allRef * 0.5 ? 1 : 0)
  const minLen = Math.round(fps * 6)
  const cuts = [0]
  let cur = state(0)
  for (let i = 1; i <= endFrame; i++) {
    const s = state(i)
    if (s !== cur) {
      const ahead = Array.from({ length: Math.min(minLen, endFrame - i) }, (_, k) => state(i + k))
      if (ahead.length >= minLen * 0.8 && ahead.filter((v) => v === s).length > ahead.length * 0.75 && i - cuts[cuts.length - 1] >= minLen) {
        cuts.push(i)
        cur = s
      }
    }
  }
  // Snap each cut to the nearest bar from the first sound.
  let first = 0
  while (first < all.length && all[first] < allRef * 0.05) first++
  const barLen = 240 / tempo.tempo, t0 = first / fps
  const snap = (t: number) => (t < 1 ? 0 : Math.round(((t0 + Math.round((t - t0) / barLen) * barLen) * 10)) / 10)
  let prevLabel = ""
  const sections = cuts.map((c, idx) => {
    const to = cuts[idx + 1] ?? endFrame
    const seg = all.slice(c, Math.max(c + 1, to)), lowSeg = low.slice(c, Math.max(c + 1, to))
    const e = seg.reduce((a, v) => a + v, 0) / seg.length, l = lowSeg.reduce((a, v) => a + v, 0) / lowSeg.length
    const energy = Math.max(1, Math.min(10, Math.round((e / allRef) * 10)))
    const hasLow = l > lowRef * 0.15
    const isLast = idx === cuts.length - 1
    const label = idx === 0 ? "Intro" : isLast && energy <= 6 ? "Outro" : hasLow && energy >= 7 ? "Drop" : !hasLow ? (prevLabel === "Drop" ? "Breakdown" : "Break") : "Build"
    prevLabel = label
    return { t: snap(c / fps), label, energy }
  })
  if (end < duration - 1) sections.push({ t: Math.round(end * 10) / 10, label: "End", energy: 1 })

  return {
    duration, tempo: tempo.tempo, tempoAlt: tempo.alt, tempoConf: Math.round(tempo.conf * 100) / 100,
    keyRoot: key.root, minor: key.minor, keyConf: Math.round(key.conf * 100) / 100, keyAlt: key.alt,
    rms: Math.round(db(Math.sqrt(sum / x.length)) * 10) / 10, peak: Math.round(db(peak) * 10) / 10,
    peaks, sections, dropouts, end,
  }
}
