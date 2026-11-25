import { analyzeSamples } from "./audio-analysis-core"

self.onmessage = (e: MessageEvent<{ x: Float32Array; sr: number }>) => {
  try {
    self.postMessage({ ok: true, result: analyzeSamples(e.data.x, e.data.sr) })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) })
  }
}
