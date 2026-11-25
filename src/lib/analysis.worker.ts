import { analyzeSamples, type Analysis } from "./audio-analysis-core"
import { transcribe } from "./transcribe-core"

/** Half the sample rate by averaging pairs: plenty for tempo, key and sections. */
const half = (x: Float32Array) => {
  const y = new Float32Array(Math.floor(x.length / 2))
  for (let i = 0; i < y.length; i++) y[i] = 0.5 * (x[2 * i] + x[2 * i + 1])
  return y
}

self.onmessage = (e: MessageEvent<{ x: Float32Array; sr: number; analysis?: Analysis; parts?: boolean }>) => {
  try {
    const { x, sr } = e.data
    const analysis = e.data.analysis ?? analyzeSamples(sr > 16000 ? half(x) : x, sr > 16000 ? sr / 2 : sr)
    const parts = e.data.parts === false ? undefined : transcribe({ x, sr, tempo: analysis.tempo, keyRoot: analysis.keyRoot, minor: analysis.minor, sections: analysis.sections, end: analysis.end })
    self.postMessage({ ok: true, result: { analysis, parts } })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) })
  }
}
