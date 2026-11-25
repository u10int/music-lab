/**
 * Splits a track into stems with HTDemucs (Meta, MIT; ONNX build from demucs-web),
 * then transcribes the vocal and instrument stems with Basic Pitch.
 * Runs on the GPU through WebGPU where the browser has it, otherwise on the CPU.
 */
import * as ort from "onnxruntime-web/webgpu"
import { CONSTANTS, prepareModelInput, standaloneIspec, standaloneMask } from "demucs-web"
import { activations, BP_SR, decodeNotes, halfRate, melodyFrom, type Melody } from "./melody-core"
import { transcribe, type Parts } from "./transcribe-core"

export const DEMUCS_URL = "https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx"
const CACHE = "music-lab-models-v1"

export type StemsMsg =
  | { type: "progress"; phase: "download" | "load" | "separate" | "notes"; p: number; detail?: string }
  | { type: "done"; melody: Melody; parts: Parts | null; gpu: boolean }
  | { type: "error"; error: string }

const post = (m: StemsMsg) => self.postMessage(m)

/** The model from the browser’s cache, or downloaded (with progress) and cached for next time. */
async function model(): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try { cache = await caches.open(CACHE) } catch { cache = null }
  const hit = await cache?.match(DEMUCS_URL).catch(() => undefined)
  if (hit) return hit.arrayBuffer()
  const res = await fetch(DEMUCS_URL)
  if (!res.ok || !res.body) throw new Error(`Couldn’t download the stem model (${res.status}).`)
  const total = Number(res.headers.get("Content-Length")) || 172e6
  const reader = res.body.getReader(), chunks: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    got += value.length
    post({ type: "progress", phase: "download", p: Math.min(1, got / total), detail: `${Math.round(got / 1e6)} of ${Math.round(total / 1e6)} MB` })
  }
  const buf = new Uint8Array(got)
  let o = 0
  for (const c of chunks) { buf.set(c, o); o += c.length }
  try { await cache?.put(DEMUCS_URL, new Response(buf, { headers: { "Content-Type": "application/octet-stream" } })) } catch { /* no room: download again next time */ }
  return buf.buffer
}

/** All four stems (drums, bass, other, vocals), each as mono at the input rate. */
async function separate(session: ort.InferenceSession, left: Float32Array, right: Float32Array) {
  const { TRAINING_SAMPLES: L, MODEL_SPEC_BINS, MODEL_SPEC_FRAMES, SEGMENT_OVERLAP } = CONSTANTS
  const total = left.length, stride = Math.floor(L * (1 - SEGMENT_OVERLAP))
  const segments = Math.max(1, Math.ceil((total - L) / stride) + 1)
  const acc = [0, 1, 2, 3].map(() => new Float32Array(total)), weight = new Float32Array(total)
  let seg = 0
  for (let start = 0; start < total; start += stride) {
    const len = Math.min(L, total - start)
    const segL = new Float32Array(L), segR = new Float32Array(L)
    segL.set(left.subarray(start, start + len)); segR.set(right.subarray(start, start + len))
    const input = prepareModelInput(segL, segR)
    const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: new ort.Tensor("float32", input.waveform, [1, 2, L]) }
    if (session.inputNames.length > 1) feeds[session.inputNames[1]] = new ort.Tensor("float32", input.magSpec, [1, 4, MODEL_SPEC_BINS, MODEL_SPEC_FRAMES])
    const out = await session.run(feeds)
    let time: ort.Tensor | null = null, freq: ort.Tensor | null = null
    for (const name of session.outputNames) {
      const t = out[name]
      if (t.dims.length === 4 && t.dims[2] === 2) time = t
      else if (t.dims.length === 5 && t.dims[2] === 4) freq = t
    }
    if (!time) throw new Error("The stem model returned something unexpected.")
    const td = time.data as Float32Array, n = time.dims[3]
    const specs = freq ? standaloneMask(freq.data as Float32Array) : null
    // Tracks: 0 drums, 1 bass, 2 other, 3 vocals. Sum each stem’s two channels and its two branches.
    const stem = (t: number) => {
      const f = specs ? standaloneIspec(specs[t], L) : null
      const y = new Float32Array(len)
      for (let i = 0; i < len; i++) y[i] = 0.5 * (td[t * 2 * n + i] + td[t * 2 * n + n + i] + (f ? f.left[i] + f.right[i] : 0))
      return y
    }
    const ys = [0, 1, 2, 3].map(stem)
    for (let i = 0; i < len; i++) {
      const w = Math.min(1, i / (stride * 0.5), (len - i) / (stride * 0.5))
      for (let t = 0; t < 4; t++) acc[t][start + i] += ys[t][i] * w
      weight[start + i] += w
    }
    for (const name of session.outputNames) out[name].dispose?.()
    post({ type: "progress", phase: "separate", p: ++seg / segments, detail: `Part ${seg} of ${segments}` })
    if (start + L >= total) break
  }
  for (let i = 0; i < total; i++) if (weight[i] > 0) for (let t = 0; t < 4; t++) acc[t][i] /= weight[i]
  return { drums: acc[0], bass: acc[1], other: acc[2], vocals: acc[3] }
}

export interface StemsJob {
  left: Float32Array
  right: Float32Array
  /** The track’s analysis, to line the parts up the same way. */
  analysis: { tempo: number; keyRoot: number; minor: boolean; sections: { t: number; label: string }[]; end: number }
}

self.onmessage = async (e: MessageEvent<StemsJob>) => {
  try {
    const { left, right, analysis } = e.data
    const gpu = typeof navigator !== "undefined" && "gpu" in navigator && !!(await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter().catch(() => null))
    const buf = await model()
    post({ type: "progress", phase: "load", p: 0 })
    // Some browsers offer WebGPU but can’t run this model on it; fall back to the CPU, which is slower but works.
    const open = (useGpu: boolean) => ort.InferenceSession.create(buf, { executionProviders: useGpu ? ["webgpu"] : ["wasm"], graphOptimizationLevel: "basic" })
    let onGpu = gpu, demucs: ort.InferenceSession
    try { demucs = await open(onGpu) } catch (err) {
      if (!onGpu) throw err
      console.warn("Stem model on the GPU failed, using the CPU:", err)
      onGpu = false; demucs = await open(false)
    }
    let stems: Awaited<ReturnType<typeof separate>>
    try { stems = await separate(demucs, left, right) } catch (err) {
      if (!onGpu) throw err
      console.warn("Stem split on the GPU failed, using the CPU:", err)
      await demucs.release().catch(() => {})
      post({ type: "progress", phase: "load", p: 0, detail: "Switching to the CPU" })
      onGpu = false; demucs = await open(false)
      stems = await separate(demucs, left, right)
    }
    await demucs.release()
    // Stems come out at 44.1 kHz; the transcription and Basic Pitch want 22.05.
    const drums = halfRate(stems.drums), bass = halfRate(stems.bass), o = halfRate(stems.other), v = halfRate(stems.vocals)

    // Drums, bass and chords again, now from their own stems.
    post({ type: "progress", phase: "notes", p: 0, detail: "Drums, bass and chords" })
    const mix = new Float32Array(drums.length)
    for (let i = 0; i < mix.length; i++) mix[i] = drums[i] + bass[i] + o[i] + v[i]
    let parts: Parts | null = null
    try { parts = transcribe({ x: mix, sr: BP_SR, ...analysis, stems: { drums, bass, harmony: o } }) } catch (err) { console.warn("Parts from stems failed:", err) }
    const barMs = (60 / (parts?.tempo ?? analysis.tempo)) * 4 * 1000

    // Basic Pitch is small: the CPU is quick and avoids GPU quirks.
    const bpBuf = await (await fetch(new URL("/models/basic-pitch.onnx", self.location.origin))).arrayBuffer()
    const bp = await ort.InferenceSession.create(bpBuf, { executionProviders: ["wasm"] })
    const run = async (x: Float32Array) => {
      const r = await bp.run({ [bp.inputNames[0]]: new ort.Tensor("float32", x, [1, x.length, 1]) })
      return { note: r["StatefulPartitionedCall:1"].data as Float32Array, onset: r["StatefulPartitionedCall:2"].data as Float32Array }
    }
    const vA = await activations(v, run, (p) => post({ type: "progress", phase: "notes", p: p / 2, detail: "Vocals" }))
    const vocalNotes = decodeNotes(vA, { minMidi: 40, maxMidi: 88 })
    const oA = await activations(o, run, (p) => post({ type: "progress", phase: "notes", p: 0.5 + p / 2, detail: "Instruments" }))
    const otherNotes = decodeNotes(oA)
    post({ type: "done", melody: melodyFrom(vocalNotes, otherNotes, barMs), parts, gpu: onGpu })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    post({ type: "error", error: `The stem split stopped: ${msg.slice(0, 300)}` })
  }
}
