import { analyzeSamples, type Analysis } from "./audio-analysis-core"

export type { Analysis }
const SR = 11025

/** Decode an audio file and mix it to mono at 11025 Hz, which is plenty for tempo, key and sections. */
async function decodeMono(file: Blob): Promise<Float32Array> {
  const buf = await file.arrayBuffer()
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  try {
    const audio = await ctx.decodeAudioData(buf)
    const off = new OfflineAudioContext(1, Math.ceil(audio.duration * SR), SR)
    const src = off.createBufferSource()
    src.buffer = audio
    src.connect(off.destination)
    src.start()
    return (await off.startRendering()).getChannelData(0)
  } finally {
    void ctx.close()
  }
}

/** Tempo, key, loudness, waveform and suggested sections for an audio file. Runs in a worker when it can. */
export async function analyzeFile(file: Blob): Promise<Analysis> {
  let x: Float32Array
  try {
    x = await decodeMono(file)
  } catch {
    throw new Error("This browser can’t read that file. Try an MP3, WAV, M4A or FLAC.")
  }
  try {
    const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" })
    return await new Promise<Analysis>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: Analysis; error?: string }>) => {
        worker.terminate()
        if (e.data.ok) resolve(e.data.result!)
        else reject(new Error(e.data.error))
      }
      worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message)) }
      worker.postMessage({ x, sr: SR }, [x.buffer])
    })
  } catch {
    // No worker (or it failed): do it here. Slower, but it still works.
    return analyzeSamples(x.buffer.byteLength ? x : await decodeMono(file), SR)
  }
}
