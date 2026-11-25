import { analyzeSamples, type Analysis } from "./audio-analysis-core"
import { transcribe, type Parts } from "./transcribe-core"

export type { Analysis, Parts }
/** 22050 Hz reaches the hi-hats; tempo, key and pitch work use half of that. */
const SR = 22050

/** Decode an audio file and mix it to mono at 22050 Hz. */
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

const half = (x: Float32Array) => {
  const y = new Float32Array(Math.floor(x.length / 2))
  for (let i = 0; i < y.length; i++) y[i] = 0.5 * (x[2 * i] + x[2 * i + 1])
  return y
}

function run(x: Float32Array, analysis?: Analysis): Promise<{ analysis: Analysis; parts?: Parts }> {
  const copy = x.slice()
  try {
    const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" })
    return new Promise((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: { analysis: Analysis; parts?: Parts }; error?: string }>) => {
        worker.terminate()
        if (e.data.ok) resolve(e.data.result!)
        else reject(new Error(e.data.error))
      }
      worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message)) }
      worker.postMessage({ x, sr: SR, analysis }, [x.buffer])
    }).catch(() => local(copy, analysis)) as Promise<{ analysis: Analysis; parts?: Parts }>
  } catch {
    return Promise.resolve(local(copy, analysis))
  }
}
/** No worker (or it failed): do it here. Slower, but it still works. */
function local(x: Float32Array, analysis?: Analysis) {
  const a = analysis ?? analyzeSamples(half(x), SR / 2)
  let parts: Parts | undefined
  try { parts = transcribe({ x, sr: SR, tempo: a.tempo, keyRoot: a.keyRoot, minor: a.minor, sections: a.sections, end: a.end }) } catch { parts = undefined }
  return { analysis: a, parts }
}

async function decode(file: Blob) {
  try {
    return await decodeMono(file)
  } catch {
    throw new Error("This browser can’t read that file. Try an MP3, WAV, M4A or FLAC.")
  }
}

/** Tempo, key, loudness, waveform and sections, plus drums, bass and chords. Runs in a worker when it can. */
export async function analyzeFile(file: Blob): Promise<{ analysis: Analysis; parts?: Parts }> {
  return run(await decode(file))
}

/** Drums, bass and chords for audio that was analysed before parts existed. */
export async function analyzeParts(file: Blob, analysis: Analysis): Promise<Parts | undefined> {
  return (await run(await decode(file), analysis)).parts
}
