import type { Melody } from "./melody-core"
import type { StemsJob, StemsMsg } from "./stems.worker"
import type { Parts } from "./transcribe-core"

export type StemsProgress = Extract<StemsMsg, { type: "progress" }>
const SR = 44100

/** Decode a file as stereo at 44.1 kHz, the rate the stem model expects. */
async function decodeStereo(file: Blob) {
  const buf = await file.arrayBuffer()
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  try {
    const audio = await ctx.decodeAudioData(buf)
    const off = new OfflineAudioContext(2, Math.ceil(audio.duration * SR), SR)
    const src = off.createBufferSource()
    src.buffer = audio
    src.connect(off.destination)
    src.start()
    const out = await off.startRendering()
    return { left: out.getChannelData(0), right: out.getChannelData(1) }
  } catch {
    throw new Error("This browser can’t read that file. Try an MP3, WAV, M4A or FLAC.")
  } finally {
    void ctx.close()
  }
}

/** Whether this browser can run the stem model on the GPU (much faster than the CPU). */
export async function hasWebGpu() {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  return !!gpu && !!(await gpu.requestAdapter().catch(() => null))
}

/**
 * Split a track into stems and transcribe the vocals and instruments as notes.
 * The first run downloads the ~170 MB stem model; the browser keeps it for later runs.
 */
export async function splitAndTranscribe(file: Blob, analysis: StemsJob["analysis"], onProgress: (p: StemsProgress) => void, signal?: AbortSignal): Promise<{ melody: Melody; parts: Parts | null; gpu: boolean }> {
  const { left, right } = await decodeStereo(file)
  const worker = new Worker(new URL("./stems.worker.ts", import.meta.url), { type: "module" })
  return new Promise((resolve, reject) => {
    const stop = () => { worker.terminate(); reject(new DOMException("Stopped", "AbortError")) }
    signal?.addEventListener("abort", stop, { once: true })
    worker.onmessage = (e: MessageEvent<StemsMsg>) => {
      const m = e.data
      if (m.type === "progress") return onProgress(m)
      signal?.removeEventListener("abort", stop)
      worker.terminate()
      if (m.type === "done") resolve({ melody: m.melody, parts: m.parts, gpu: m.gpu })
      else reject(new Error(m.error))
    }
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || "The stem worker stopped.")) }
    worker.postMessage({ left, right, analysis } satisfies StemsJob, [left.buffer, right.buffer])
  })
}
