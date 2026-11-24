import { useEffect, useRef } from "react"
import { scopeNode } from "@/audio/engine"
import { usePlayingId } from "@/audio/playback"
import { cn } from "@/lib/utils"

const BARS = 40

/**
 * A live view of the app's output: the spectrum as bars behind the waveform.
 * It runs only while something plays and rests on a flat line otherwise.
 */
export function Scope({ className, bars = true, label = "Output scope" }: { className?: string; bars?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const playing = usePlayingId() !== null
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext("2d")
    if (!g) return
    let raf = 0, frame = 0, colors = { fg: "#000", line: "#00f", grid: "#ddd" }
    const readColors = () => {
      const st = getComputedStyle(cv)
      colors = { fg: st.getPropertyValue("--foreground").trim() || "#000", line: st.getPropertyValue("--primary").trim() || "#00f", grid: st.getPropertyValue("--border").trim() || "#ddd" }
    }
    const size = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.max(1, Math.round(r.width * d))
      cv.height = Math.max(1, Math.round(r.height * d))
    }
    const ro = new ResizeObserver(() => { size(); draw() })
    ro.observe(cv)
    size()
    readColors()
    const wave = new Float32Array(1024), spec = new Uint8Array(1024)
    let until = 0
    function draw() {
      const W = cv!.width, H = cv!.height, a = scopeNode()
      g!.clearRect(0, 0, W, H)
      g!.fillStyle = colors.grid
      g!.fillRect(0, Math.round(H / 2), W, 1)
      if (!a) return
      if (bars) {
        a.getByteFrequencyData(spec)
        const ny = a.context.sampleRate / 2, bw = W / BARS
        g!.globalAlpha = 0.16
        g!.fillStyle = colors.fg
        for (let i = 0; i < BARS; i++) {
          // Log-spaced bands from 30 Hz to 16 kHz.
          const f0 = 30 * Math.pow(16000 / 30, i / BARS), f1 = 30 * Math.pow(16000 / 30, (i + 1) / BARS)
          const b0 = Math.floor((f0 / ny) * spec.length), b1 = Math.max(b0 + 1, Math.ceil((f1 / ny) * spec.length))
          let m = 0
          for (let k = b0; k < b1 && k < spec.length; k++) m = Math.max(m, spec[k])
          const h = (m / 255) * H
          g!.fillRect(i * bw + 1, H - h, bw - 2, h)
        }
        g!.globalAlpha = 1
      }
      a.getFloatTimeDomainData(wave)
      // Start at a rising zero crossing so the trace holds still.
      let s = 0
      for (let i = 1; i < 512; i++) if (wave[i - 1] < 0 && wave[i] >= 0) { s = i; break }
      g!.strokeStyle = colors.line
      g!.lineWidth = Math.max(1.5, H / 40)
      g!.beginPath()
      const n = 512
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W, y = H / 2 - Math.max(-1, Math.min(1, wave[s + i] * 1.6)) * (H / 2 - 2)
        if (i) g!.lineTo(x, y)
        else g!.moveTo(x, y)
      }
      g!.stroke()
    }
    const loop = () => {
      if (++frame % 60 === 0) readColors()
      draw()
      if (playing || performance.now() < until) raf = requestAnimationFrame(loop)
    }
    // Keep drawing briefly after a stop so the trace settles to a line.
    until = performance.now() + 500
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [playing, bars])
  return <canvas ref={ref} role="img" aria-label={playing ? `${label}: sound playing` : `${label}: silent`} className={cn("block h-full w-full", className)} />
}
