/**
 * Transcribes a full mix into a starting point for drums, bass and chords.
 * Like audio-analysis-core it works on plain mono samples (11025 Hz), so it can
 * run in a worker. Everything snaps to a beat grid refined from the kick drum.
 *
 * - Drums: onsets in three bands (kick, snare/clap, hats) sampled on 16th steps,
 *   then summarised per section as the hits that repeat in most bars.
 * - Bass: pitch of the low end (below ~250 Hz) on every 16th, snapped to the key.
 * - Chords: a chroma profile for each bar matched against major and minor triads,
 *   nudged toward the bass note and the key.
 *
 * It's a transcription to correct, not a perfect one: layered and busy mixes confuse it.
 */
import { fft } from "./audio-analysis-core"

export type PartLane = "Kick" | "Snare" | "Hat"
export const PART_LANES: PartLane[] = ["Kick", "Snare", "Hat"]

export interface DrumPart {
  length: 16 | 32
  /** Per lane: steps (1-based) that hit in most bars, and quieter or less regular ones. */
  rows: [PartLane, number[], number[]][]
  /** 0–1: how consistent the bars were. */
  conf: number
}
export interface PartSection {
  label: string
  /** First bar (0-based, from the first downbeat) and how many bars. */
  startBar: number
  bars: number
  drums: DrumPart | null
}
export interface BassNote { step: number; len: number; midi: number }
export interface BarChord { root: number; minor: boolean; conf: number }
export interface Parts {
  version: 1
  /** The tempo refined against the kick, and the time of the first downbeat. */
  tempo: number
  t0: number
  bars: number
  sections: PartSection[]
  /** Every bass note in the track, in 16th steps from the first downbeat. */
  bass: BassNote[]
  /** One chord per bar; null where there's no clear harmony. */
  chords: (BarChord | null)[]
}

interface Input {
  x: Float32Array
  sr: number
  tempo: number
  keyRoot: number
  minor: boolean
  sections: { t: number; label: string }[]
  end: number
}

const MAJOR_IV = [0, 2, 4, 5, 7, 9, 11], MINOR_IV = [0, 2, 3, 5, 7, 8, 10]

/* ---------- Onset features ---------- */

/**
 * Per-frame onset features, comparing each frame with the one ~17 ms earlier so
 * attacks spread over several frames still register:
 * low: rise in 40–120 Hz (kick or bass); cent: centroid of 40–250 Hz (a kick’s pitch falls fast);
 * mid/hi: the share of bins in 200–2500 Hz and 3–5.5 kHz that jumped, so noisy hits (snares, claps,
 * hats) score high and tonal changes (a new chord) score low; all: overall rise, for the grid.
 */
function features(x: Float32Array, sr: number) {
  // About 46 ms windows every 5.8 ms, whatever the sample rate.
  const n = sr > 16000 ? 1024 : 512, hop = n / 8, lag = 3
  const win = new Float64Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  const bin = (hz: number) => Math.max(1, Math.min(n / 2 - 1, Math.round((hz * n) / sr)))
  const [l0, l1, c1, m0, m1, h0, h1] = [bin(40), bin(120), bin(250), bin(200), bin(2500), bin(3000), bin(Math.min(10000, sr / 2 - 200))]
  const frames = Math.max(0, Math.floor((x.length - n) / hop) + 1)
  const mk = () => new Float32Array(frames)
  const low = mk(), lowE = mk(), midE = mk(), fcent = mk(), midLin = mk(), midFrac = mk(), hiLin = mk(), hiFrac = mk(), all = mk(), loud = mk()
  const re = new Float64Array(n), im = new Float64Array(n)
  const hist = Array.from({ length: lag + 1 }, () => new Float64Array(n / 2))
  const histM = Array.from({ length: lag + 1 }, () => new Float64Array(n / 2))
  for (let f = 0; f < frames; f++) {
    const start = f * hop
    for (let i = 0; i < n; i++) { re[i] = x[start + i] * win[i]; im[i] = 0 }
    fft(re, im)
    const cur = hist[f % (lag + 1)], prev = hist[(f + 1) % (lag + 1)]
    const curM = histM[f % (lag + 1)], prevM = histM[(f + 1) % (lag + 1)]
    let e = 0, le = 0, me = 0
    for (let k = 0; k < n / 2; k++) {
      const mag = Math.hypot(re[k], im[k])
      curM[k] = mag
      cur[k] = Math.log1p(60 * mag)
      if (k >= m0 && k <= m1) { e += cur[k]; me += mag * mag }
      if (k >= l0 && k <= l1) le += mag * mag
    }
    lowE[f] = le
    midE[f] = me
    loud[f] = e / (m1 - m0 + 1)
    if (f < lag) continue
    let sl = 0, sa = 0, nm = 0, nh = 0, ml = 0, hl = 0, cw = 0, cm = 0
    for (let k = l0; k <= h1; k++) {
      const d = cur[k] - prev[k]
      const dm = curM[k] - prevM[k]
      if (k <= c1 && dm > 0) { cw += dm * k; cm += dm }
      if (d <= 0) continue
      sa += d
      if (k <= l1) sl += d
      if (k >= m0 && k <= m1) { if (d > 0.35) nm++; if (dm > 0) ml += dm }
      if (k >= h0 && k <= h1) { if (d > 0.35) nh++; if (dm > 0) hl += dm }
    }
    low[f] = sl / (l1 - l0 + 1)
    all[f] = sa / (h1 - l0 + 1)
    midFrac[f] = nm / (m1 - m0 + 1)
    hiFrac[f] = nh / (h1 - h0 + 1)
    midLin[f] = ml
    hiLin[f] = hl
    fcent[f] = cm > 1e-9 ? ((cw / cm) * sr) / n : 0
  }
  return { low, lowE, midE, fcent, midLin, midFrac, hiLin, hiFrac, all, loud, fps: sr / hop }
}

const percentile = (v: ArrayLike<number>, p: number) => {
  const a = Array.from(v).sort((x, y) => x - y)
  return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0
}

/* ---------- Beat grid ---------- */

type Feat = ReturnType<typeof features>

/** The strongest value near a time, allowing a little early or late (swing, groove). */
function near(env: Float32Array, fps: number, t: number, before = 0.02, after = 0.035) {
  const a = Math.max(0, Math.floor((t - before) * fps)), b = Math.min(env.length - 1, Math.ceil((t + after) * fps))
  let m = 0
  for (let i = a; i <= b; i++) if (env[i] > m) m = env[i]
  return m
}
/** Mean of an envelope over a short window. */
function mean(env: Float32Array, fps: number, t: number, w: number) {
  const a = Math.max(0, Math.round(t * fps)), b = Math.min(env.length - 1, Math.round((t + w) * fps))
  let s = 0
  for (let i = a; i <= b; i++) s += env[i]
  return b >= a ? s / (b - a + 1) : 0
}
/**
 * How kick-like a low-end onset is: strong, with new energy reaching up past ~90 Hz
 * (a kick’s pitch starts high and falls) and dying away within ~150 ms. A held bass note
 * starts lower and sustains.
 */
function kickness(F: Feat, t: number, lowRef: number) {
  const v = near(F.low, F.fps, t) / (lowRef + 1e-9)
  if (v < 0.1) return 0
  const fc = near(F.fcent, F.fps, t, 0.01, 0.02)
  let peak = 0
  for (let dt = 0; dt <= 0.05; dt += 0.006) peak = Math.max(peak, mean(F.lowE, F.fps, t + dt, 0.006))
  const tail = mean(F.lowE, F.fps, t + 0.16, 0.03)
  const decay = peak > 0 ? 1 - Math.min(1, tail / peak) : 0
  // New low energy centred around 80–160 Hz; much higher is a snare’s body, much lower a bass note.
  const shape = fc <= 160 ? (fc - 60) / 50 : 1.2 - (fc - 160) / 50
  return v * Math.min(1, decay * 1.6) * Math.max(0.1, Math.min(1.2, shape))
}

/**
 * Find the 16th grid (refining the tempo against every onset), then which 16th
 * is the beat (where kicks land), then which beat is the downbeat (kicks, plus
 * where the harmony changes).
 */
function beatGrid(F: Feat, x: Float32Array, sr: number, tempo: number, startSec: number, endSec: number) {
  const { fps } = F
  const allRef = percentile(F.all, 0.97) + 1e-9
  let best = { bpm: tempo, phase: 0, score: -1 }
  for (let bpm = tempo - 0.6; bpm <= tempo + 0.6001; bpm += 0.01) {
    const stepF = (60 / bpm / 4) * fps
    for (let ph = 0; ph < stepF; ph += 1) {
      let sc = 0
      for (let f = startSec * fps + ph; f < endSec * fps; f += stepF) {
        const i = Math.round(f)
        sc += Math.max(F.all[i - 1] ?? 0, F.all[i] ?? 0, F.all[i + 1] ?? 0) / allRef
      }
      if (sc > best.score) best = { bpm, phase: ph, score: sc }
    }
  }
  const step = 60 / best.bpm / 4
  const first = startSec + best.phase / fps
  const nSteps = Math.floor((endSec - first) / step)
  const lowRef = percentile(F.low, 0.97)
  const kk = Array.from({ length: nSteps }, (_, s) => kickness(F, first + s * step, lowRef))
  // Snares and claps land on beats too (2 and 4, or 3 in half-time), which settles grooves
  // where the kick plays off the beat (garage, trap).
  const sn = Array.from({ length: nSteps }, (_, s) => near(F.midLin, F.fps, first + s * step) * Math.sqrt(near(F.midFrac, F.fps, first + s * step)))
  const snRef = percentile(sn, 0.97) + 1e-9, kkRef = percentile(kk, 0.97) + 1e-9
  let beatOff = 0, bs = -1
  for (let o = 0; o < 4; o++) {
    let sc = 0
    for (let s = o; s < nSteps; s += 4) sc += kk[s] / kkRef + sn[s] / snRef
    if (sc > bs) { bs = sc; beatOff = o }
  }
  // Harmony changes per beat, from chroma.
  const beat0 = first + beatOff * step, beats = Math.floor((endSec - beat0) / (4 * step))
  const chroma = windowChroma(x, sr, Array.from({ length: beats }, (_, b) => beat0 + b * 4 * step), 4 * step, 36)
  const novelty = chroma.map((c, b) => {
    if (b < 2) return 0
    const prev = chroma[b - 1].chroma.map((v, k) => v + chroma[b - 2].chroma[k])
    const now = c.chroma.map((v, k) => v + (chroma[b + 1]?.chroma[k] ?? v))
    const dot = prev.reduce((s, v, k) => s + v * now[k], 0), na = Math.hypot(...prev), nb = Math.hypot(...now)
    return na && nb ? 1 - dot / (na * nb) : 0
  })
  const novRef = percentile(novelty, 0.9) + 1e-9
  let down = 0, ds = -1
  for (let d = 0; d < 4; d++) {
    let sc = 0
    for (let b = d; b < beats; b += 4) sc += (kk[beatOff + b * 4] ?? 0) / kkRef + 1.5 * (novelty[b] / novRef)
    if (sc > ds) { ds = sc; down = d }
  }
  let t0 = beat0 + down * 4 * step
  const bar = 16 * step
  while (t0 - bar >= startSec - step) t0 -= bar
  return { bpm: Math.round(best.bpm * 100) / 100, t0 }
}

/* ---------- Drums ---------- */

/** Per 16th step: kick, snare/clap and hat strength, each 0–1+ against that lane’s strong hits. */
function drumSteps(F: Feat, t0: number, step: number, steps: number) {
  const lowRef = percentile(F.low, 0.97)
  const kick = new Float32Array(steps), snare = new Float32Array(steps), hat = new Float32Array(steps), low = new Float32Array(steps)
  for (let s = 0; s < steps; s++) {
    const t = t0 + s * step
    kick[s] = kickness(F, t, lowRef)
    // Snares and claps ring on for 50–150 ms; a kick’s click is gone in a few. Weight by how much
    // mid energy is still added well after the hit, compared with just before it.
    const before = mean(F.midE, F.fps, t - 0.045, 0.03), body = mean(F.midE, F.fps, t + 0.03, 0.06)
    let peak = 0
    for (let dt = 0; dt <= 0.03; dt += 0.006) peak = Math.max(peak, mean(F.midE, F.fps, t + dt, 0.006))
    const ring = peak > before ? Math.max(0, body - before) / (peak - before) : 0
    snare[s] = near(F.midLin, F.fps, t) * Math.sqrt(near(F.midFrac, F.fps, t)) * Math.max(0.25, Math.min(1, ring * 2.5))
    hat[s] = near(F.hiLin, F.fps, t) * Math.sqrt(near(F.hiFrac, F.fps, t))
    low[s] = near(F.low, F.fps, t) / (lowRef + 1e-9)
  }
  const norm = (v: Float32Array) => { const r = percentile(v, 0.97) + 1e-9; for (let i = 0; i < v.length; i++) v[i] /= r; return v }
  return { kick: norm(kick), snare: norm(snare), hat: norm(hat), low }
}

function sectionDrums(vals: Float32Array[], startBar: number, bars: number): DrumPart | null {
  if (bars < 1) return null
  // Per bar and lane: which steps hit, and how hard compared with the track’s strong hits.
  const hits = (lane: number, bar: number, s: number) => {
    const v = vals[lane][(startBar + bar) * 16 + s]
    // A kick’s click lights up the snare band; only count a snare there if it’s clearly its own hit.
    if (lane === 1 && vals[0][(startBar + bar) * 16 + s] >= 0.42 && v < 0.8) return 0
    // A snare hit also lights up the hat band; only count the hat if it stands out on its own.
    if (lane === 2) {
      const sn = vals[1][(startBar + bar) * 16 + s]
      if (sn >= 0.38 && v < Math.max(1, sn * 1.15)) return 0
    }
    return v
  }
  const summarise = (len: 16 | 32) => {
    const per = len / 16, groups = Math.floor(bars / per)
    if (groups < 1) return null
    let consistency = 0, cells = 0
    const rows = PART_LANES.map((lane, li): [PartLane, number[], number[]] => {
      const on: number[] = [], ghost: number[] = []
      const thr = li === 0 ? 0.42 : 0.38
      for (let s = 0; s < len; s++) {
        let count = 0, sum = 0
        for (let g = 0; g < groups; g++) {
          const v = hits(li, g * per + Math.floor(s / 16), s % 16)
          if (v >= thr) { count++; sum += v }
        }
        const frac = count / groups
        consistency += Math.abs(2 * frac - 1); cells++
        if (frac >= 0.5) (sum / Math.max(1, count) < 0.55 && li > 0 ? ghost : on).push(s + 1)
        else if (frac >= 0.3 && groups >= 3) ghost.push(s + 1)
      }
      return [lane, on, ghost]
    })
    return { length: len, rows, conf: consistency / cells }
  }
  const one = summarise(16), two = bars >= 4 ? summarise(32) : null
  let best = one
  if (one && two) {
    // Use two bars only when bar 2 really differs and the two-bar reading is more consistent.
    const differs = two.rows.some(([, on]) => on.filter((s) => s <= 16).join() !== on.filter((s) => s > 16).map((s) => s - 16).join())
    if (differs && two.conf > one.conf + 0.08) best = two
  }
  if (!best) return null
  const total = best.rows.reduce((n, [, on]) => n + on.length, 0)
  if (total < 2) return null
  return { ...best, conf: Math.round(Math.max(0, Math.min(1, (best.conf - 0.5) * 2)) * 100) / 100 }
}

/* ---------- Bass ---------- */

/** Two-pole low-pass, run forward then backward so it doesn’t smear timing. */
function lowpass(x: Float32Array, sr: number, fc: number) {
  const w = (2 * Math.PI * fc) / sr, q = Math.SQRT1_2, alpha = Math.sin(w) / (2 * q), cw = Math.cos(w)
  const b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = (1 - cw) / 2, a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha
  const run = (src: Float32Array) => {
    const y = new Float32Array(src.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < src.length; i++) {
      const v = (b0 * src[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
      x2 = x1; x1 = src[i]; y2 = y1; y1 = v; y[i] = v
    }
    return y
  }
  const f = run(x)
  f.reverse()
  const b = run(f)
  return b.reverse()
}

/** YIN pitch estimate for one window: frequency and how periodic it is (lower is better). */
function yin(x: Float32Array, start: number, w: number, sr: number, fmin: number, fmax: number) {
  const tmin = Math.floor(sr / fmax), tmax = Math.min(Math.ceil(sr / fmin), Math.floor(w / 2))
  if (start < 0 || start + w + tmax >= x.length) return null
  const d = new Float64Array(tmax + 1)
  for (let tau = 1; tau <= tmax; tau++) {
    let s = 0
    for (let i = 0; i < w; i++) { const v = x[start + i] - x[start + i + tau]; s += v * v }
    d[tau] = s
  }
  let run = 0, best = -1, bestV = 1
  const cmnd = new Float64Array(tmax + 1)
  cmnd[0] = 1
  for (let tau = 1; tau <= tmax; tau++) { run += d[tau]; cmnd[tau] = (d[tau] * tau) / (run || 1) }
  for (let tau = tmin; tau <= tmax; tau++) {
    if (cmnd[tau] < 0.2) {
      while (tau + 1 <= tmax && cmnd[tau + 1] < cmnd[tau]) tau++
      best = tau; bestV = cmnd[tau]; break
    }
    if (cmnd[tau] < bestV) { bestV = cmnd[tau]; best = tau }
  }
  if (best <= 0) return null
  // Parabolic interpolation for a finer period.
  const a = cmnd[best - 1] ?? cmnd[best], b = cmnd[best], c = cmnd[best + 1] ?? cmnd[best]
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1)
  return { f0: sr / (best + (Math.abs(shift) < 1 ? shift : 0)), ap: bestV }
}

function transcribeBass(x: Float32Array, sr: number, t0: number, step: number, steps: number, scale: number[], keyRoot: number, lowOnset: Float32Array, lowRef: number, kick: Float32Array) {
  // Low-pass, then halve the sample rate: pitch tracking below 250 Hz doesn’t need more, and it’s 4× faster.
  const full = lowpass(lowpass(x, sr, 260), sr, 260)
  const lp = new Float32Array(Math.floor(full.length / 2))
  for (let i = 0; i < lp.length; i++) lp[i] = full[i * 2]
  sr = sr / 2
  const w = Math.round(0.07 * sr)
  // Loudness of the low end per step, to tell notes from silence.
  const rms = new Float32Array(steps), raw: (number | null)[] = []
  for (let s = 0; s < steps; s++) {
    const a = Math.round((t0 + s * step + 0.012) * sr)
    let e = 0
    for (let i = 0; i < w && a + i < lp.length; i++) if (a + i >= 0) e += lp[a + i] * lp[a + i]
    rms[s] = Math.sqrt(e / w)
  }
  const ref = percentile(rms, 0.9)
  for (let s = 0; s < steps; s++) {
    if (rms[s] < ref * 0.22) { raw.push(null); continue }
    const r = yin(lp, Math.round((t0 + s * step + 0.012) * sr), w, sr, 30, 250)
    if (!r || r.ap > 0.35) { raw.push(null); continue }
    let m = 69 + 12 * Math.log2(r.f0 / 440)
    while (m > 60) m -= 12
    while (m < 26) m += 12
    let note = Math.round(m)
    // Snap out-of-key notes to the nearest scale note when the reading sits between them.
    const inKey = (k: number) => scale.includes(((k - keyRoot) % 12 + 12) % 12)
    if (!inKey(note)) {
      const lo = note - 1, hi = note + 1
      if (inKey(lo) && (!inKey(hi) || m - note < 0)) note = lo
      else if (inKey(hi)) note = hi
    }
    raw.push(note)
  }
  // Fix single-step octave jumps against both neighbours.
  for (let s = 1; s < raw.length - 1; s++) {
    const a = raw[s - 1], b = raw[s], c = raw[s + 1]
    if (a !== null && b !== null && c !== null && a === c && Math.abs(b - a) === 12) raw[s] = a
  }
  // Join steps into notes: a new note on a pitch change, after silence, or on a fresh low-end onset.
  const notes: BassNote[] = []
  let cur: BassNote | null = null
  for (let s = 0; s < steps; s++) {
    const m = raw[s]
    const onset = lowOnset[s] > lowRef * 0.55 && rms[s] > rms[Math.max(0, s - 1)] * 1.15
    if (m === null) { cur = null; continue }
    // Right on or after a kick, a new low pitch is usually the kick’s own tail, not a bass note.
    if ((kick[s] > 0.35 || kick[s - 1] > 0.35) && (!cur || cur.midi !== m) && !(raw[s + 1] === m && raw[s + 2] === m)) { cur = null; continue }
    if (cur && cur.midi === m && !onset && s === cur.step + cur.len) { cur.len++; continue }
    cur = { step: s, len: 1, midi: m }
    notes.push(cur)
  }
  // Drop isolated blips one step long between silences; they’re usually kick tails.
  const kept = notes.filter((n, i) => n.len > 1 || (notes[i - 1]?.step + notes[i - 1]?.len === n.step) || (notes[i + 1]?.step === n.step + 1))
  return holdBars(kept, steps)
}

/**
 * Basslines mostly hold one note per bar; gaps between readings are usually kicks
 * masking the pitch, not rests. A bar whose readings mostly agree becomes one
 * note for the whole bar. A bar that moves (a transition or a walk-up) keeps its
 * notes, joined end to start, with the first starting on the downbeat when a kick
 * likely hid it and the last held to the bar line unless the bass clearly stops early.
 */
export function holdBars(notes: BassNote[], steps: number, bar = 16): BassNote[] {
  const out: BassNote[] = []
  for (let b0 = 0; b0 < steps; b0 += bar) {
    const b1 = Math.min(steps, b0 + bar)
    // This bar’s pieces of each note.
    const inBar = notes
      .map((n) => ({ step: Math.max(n.step, b0), end: Math.min(n.step + n.len, b1), midi: n.midi }))
      .filter((n) => n.end > n.step)
    if (!inBar.length) continue
    const voiced = inBar.reduce((t, n) => t + n.end - n.step, 0)
    const byPc = new Map<number, number>(), byMidi = new Map<number, number>()
    for (const n of inBar) {
      byPc.set(n.midi % 12, (byPc.get(n.midi % 12) ?? 0) + n.end - n.step)
      byMidi.set(n.midi, (byMidi.get(n.midi) ?? 0) + n.end - n.step)
    }
    const [pc, pcLen] = [...byPc].sort((x, y) => y[1] - x[1])[0]
    if (voiced >= 4 && pcLen / voiced >= 0.6) {
      const midi = [...byMidi].filter(([m]) => m % 12 === pc).sort((x, y) => y[1] - x[1])[0][0]
      out.push({ step: b0, len: b1 - b0, midi })
      continue
    }
    // A moving bar: merge repeats, then play legato.
    const merged: { step: number; end: number; midi: number }[] = []
    for (const n of inBar) {
      const last = merged[merged.length - 1]
      if (last && last.midi === n.midi) last.end = n.end
      else merged.push({ ...n })
    }
    // A kick on the downbeat often hides the bass’s first step.
    if (merged[0].step - b0 <= 2) merged[0].step = b0
    merged.forEach((n, i) => {
      const next = merged[i + 1]
      const end = next ? next.step : b1 - n.end <= 4 ? b1 : n.end
      out.push({ step: n.step, len: end - n.step, midi: n.midi })
    })
  }
  return out
}

/* ---------- Chords ---------- */

/** Chroma (one value per pitch class) for each window, from notes `lowNote` to C6. */
function windowChroma(x: Float32Array, sr: number, starts: number[], dur: number, lowNote = 48) {
  const n = 4096, hop = 1024
  const win = new Float64Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  // One bin range per note from C3 to C6, so each note counts once.
  const notes: [number, number, number][] = []
  for (let m = lowNote; m <= 84; m++) {
    const lo = 440 * Math.pow(2, (m - 0.5 - 69) / 12), hi = 440 * Math.pow(2, (m + 0.5 - 69) / 12)
    notes.push([m % 12, Math.max(1, Math.floor((lo * n) / sr)), Math.max(2, Math.ceil((hi * n) / sr))])
  }
  const re = new Float64Array(n), im = new Float64Array(n)
  const out: { chroma: number[]; energy: number }[] = []
  for (const t of starts) {
    const c = new Array(12).fill(0)
    let energy = 0, frames = 0
    const a = Math.round(t * sr), z = Math.max(a, Math.round((t + dur) * sr) - n)
    for (let start = Math.max(0, a); start <= z && start + n <= x.length; start += hop) {
      for (let i = 0; i < n; i++) { re[i] = x[start + i] * win[i]; im[i] = 0 }
      fft(re, im)
      const fc = new Array(12).fill(0)
      for (const [pc, lo, hi] of notes) {
        let mx = 0
        for (let k = lo; k < hi; k++) { const v = Math.hypot(re[k], im[k]); if (v > mx) mx = v }
        fc[pc] += mx * mx
      }
      const top = Math.max(...fc)
      energy += top
      if (top > 1e-9) for (let i = 0; i < 12; i++) c[i] += fc[i] / top
      frames++
    }
    out.push({ chroma: c.map((v) => v / Math.max(1, frames)), energy: energy / Math.max(1, frames) })
  }
  return out
}

function matchChords(bars: { chroma: number[]; energy: number }[], bassPc: (number | null)[], keyRoot: number, scale: number[]) {
  const ref = percentile(bars.map((b) => b.energy), 0.8)
  return bars.map((b, i): BarChord | null => {
    if (b.energy < ref * 0.08) return null
    const mean = b.chroma.reduce((s, v) => s + v, 0) / 12
    const c = b.chroma.map((v) => v - mean)
    const norm = Math.hypot(...c) || 1
    if (Math.max(...b.chroma) - mean < 0.12) return null
    const scores: { root: number; minor: boolean; s: number }[] = []
    for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
      const tones = [r, (r + (minor ? 3 : 4)) % 12, (r + 7) % 12]
      const t = Array.from({ length: 12 }, (_, k): number => (tones.includes(k) ? (k === r ? 1.1 : 1) : 0))
      const tm = t.reduce((s, v) => s + v, 0) / 12, tc = t.map((v) => v - tm), tn = Math.hypot(...tc)
      let s = c.reduce((acc, v, k) => acc + v * tc[k], 0) / (norm * tn)
      const bp = bassPc[i]
      if (bp !== null) s += bp === r ? 0.12 : tones.includes(bp) ? 0.03 : -0.04
      // A small preference for chords that belong to the key.
      const deg = scale.indexOf(((r - keyRoot) % 12 + 12) % 12)
      if (deg >= 0) {
        const third = (scale[(deg + 2) % 7] - scale[deg] + 12) % 12
        if ((third === 3) === minor) s += 0.06
      }
      scores.push({ root: r, minor, s })
    }
    scores.sort((p, q) => q.s - p.s)
    const conf = Math.max(0, Math.min(1, (scores[0].s - scores[1].s) * 4 + (scores[0].s - 0.4)))
    return { root: scores[0].root, minor: scores[0].minor, conf: Math.round(conf * 100) / 100 }
  })
}

/* ---------- Everything ---------- */

export function transcribe({ x: xIn, sr: srIn, tempo, keyRoot, minor, sections, end }: Input): Parts {
  const scale = minor ? MINOR_IV : MAJOR_IV
  // Drums use the full input (22050 Hz reaches the hats); pitch work uses half that.
  const F = features(xIn, srIn)
  let x = xIn, sr = srIn
  if (srIn > 16000) {
    x = new Float32Array(Math.floor(xIn.length / 2))
    for (let i = 0; i < x.length; i++) x[i] = 0.5 * (xIn[2 * i] + xIn[2 * i + 1])
    sr = srIn / 2
  }
  // Where the sound starts.
  const loudRef = percentile(F.loud, 0.95)
  let start = 0
  while (start < F.loud.length && F.loud[start] < loudRef * 0.3) start++
  const startSec = start / F.fps, endSec = Math.max(startSec + 4, end || x.length / sr)

  const grid = beatGrid(F, x, sr, tempo, startSec, endSec)
  const step = 60 / grid.bpm / 4, barSec = step * 16
  const bars = Math.max(0, Math.floor((endSec - grid.t0) / barSec))
  const steps = bars * 16
  const D = drumSteps(F, grid.t0, step, steps)
  const vals = [D.kick, D.snare, D.hat]

  // Sections in bars, from the analysis.
  const barOf = (t: number) => Math.max(0, Math.round((t - grid.t0) / barSec))
  const cuts = sections.filter((s) => s.label !== "End").map((s) => ({ label: s.label, bar: barOf(s.t) }))
  if (!cuts.length || cuts[0].bar > 0) cuts.unshift({ label: "Intro", bar: 0 })
  const partSections: PartSection[] = []
  cuts.forEach((c, i) => {
    const next = i + 1 < cuts.length ? cuts[i + 1].bar : bars
    const n = Math.min(next, bars) - c.bar
    if (n <= 0) return
    partSections.push({ label: c.label, startBar: c.bar, bars: n, drums: sectionDrums(vals, c.bar, n) })
  })

  const bass = transcribeBass(x, sr, grid.t0, step, steps, scale, keyRoot, D.low, 1, D.kick)
  // The bass note that sounds longest in each bar helps pick the chord root.
  const bassPc: (number | null)[] = Array.from({ length: bars }, (_, b) => {
    const tally = new Map<number, number>()
    for (const n of bass) {
      const from = Math.max(n.step, b * 16), to = Math.min(n.step + n.len, (b + 1) * 16)
      if (to > from) tally.set(n.midi % 12, (tally.get(n.midi % 12) ?? 0) + to - from)
    }
    let best: number | null = null, bv = 0
    for (const [pc, v] of tally) if (v > bv) { bv = v; best = pc }
    return bv >= 3 ? best : null
  })
  const chords = matchChords(windowChroma(x, sr, Array.from({ length: bars }, (_, b) => grid.t0 + b * barSec), barSec), bassPc, keyRoot, scale)

  return { version: 1, tempo: grid.bpm, t0: Math.round(grid.t0 * 1000) / 1000, bars, sections: partSections, bass, chords }
}
