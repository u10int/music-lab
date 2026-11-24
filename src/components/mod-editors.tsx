import { useEffect, useRef, useState } from "react"
import { Play, Square } from "lucide-react"
import { audio, masterBus, mtof } from "@/audio/engine"
import { toggle, usePlayingId } from "@/audio/playback"
import { Button } from "@/components/ui/button"
import { Seg } from "@/components/seg"
import { fmtHz, fmtS } from "@/lib/theory"
import { cn } from "@/lib/utils"

const NOTE = 45 // A2: low enough that filter movement is obvious
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/* ---------------- Envelope ---------------- */

type Env = { a: number; d: number; s: number; r: number }
type EnvTarget = "amp" | "filter"
const ENV_PRESETS: [string, string, Env][] = [["pluck", "Pluck", { a: 0.005, d: 0.25, s: 0, r: 0.2 }], ["keys", "Keys", { a: 0.01, d: 0.6, s: 0.5, r: 0.4 }], ["pad", "Pad", { a: 0.9, d: 0.8, s: 0.8, r: 1.5 }], ["swell", "Swell", { a: 1.6, d: 0.3, s: 1, r: 0.6 }]]

/**
 * Drag the three points of an ADSR envelope: the peak sets attack, the next
 * point sets decay and sustain, the last sets release. Hold the button (or the
 * Space-free "Hold to play" key) to hear it; while a note is held, the sustain
 * level follows the drag, and a dot runs along the shape.
 */
export function EnvelopeEditor() {
  const [env, setEnv] = useState<Env>(ENV_PRESETS[1][2])
  const [target, setTarget] = useState<EnvTarget>("amp")
  const [held, setHeld] = useState(false)
  const [t, setT] = useState<number | null>(null)
  const voice = useRef<{ vca: GainNode; vcf: BiquadFilterNode; oscs: OscillatorNode[]; start: number; releasedAt: number | null } | null>(null)
  const live = useRef({ env, target })
  useEffect(() => { live.current = { env, target } })

  // Geometry: attack and decay share the first 55% of the width, sustain holds, release takes the rest.
  const W = 320, H = 128, top = 12, bot = 120, MAX_AD = 4, MAX_R = 4
  // Square-root time scale, so short attacks and decays get room without long ones running off the end.
  const SEG = W * 0.28, toX = (t: number, max: number, w: number) => Math.sqrt(t / max) * w, fromX = (px: number, max: number, w: number) => Math.pow(clamp(px / w, 0, 1), 2) * max
  const xA = toX(env.a, MAX_AD, SEG), xD = xA + toX(env.d, MAX_AD, SEG), xS = W * 0.66, xR = xS + toX(env.r, MAX_R, W - xS)
  const y = (v: number) => bot - v * (bot - top)
  const path = `M0 ${bot} L${xA} ${y(1)} L${xD} ${y(env.s)} L${xS} ${y(env.s)} L${xR} ${bot}`

  const level = (e: EnvTarget) => (e === "amp" ? 0.28 : 0.2)
  const start = () => {
    const c = audio()
    if (!c || voice.current) return
    const { env: e, target: tg } = live.current, now = c.currentTime + 0.01
    const vca = c.createGain(), vcf = c.createBiquadFilter()
    vcf.type = "lowpass"
    vcf.Q.value = 6
    vca.connect(masterBus())
    vcf.connect(vca)
    const oscs = [-9, 9].map((dt) => {
      const o = c.createOscillator()
      o.type = "sawtooth"
      o.frequency.value = mtof(NOTE)
      o.detune.value = dt
      o.connect(vcf)
      o.start(now)
      return o
    })
    if (tg === "amp") {
      vcf.frequency.value = 3200
      vca.gain.setValueAtTime(0, now)
      vca.gain.linearRampToValueAtTime(level("amp"), now + Math.max(e.a, 0.003))
      vca.gain.setTargetAtTime(level("amp") * e.s, now + Math.max(e.a, 0.003), Math.max(e.d, 0.01) / 3)
    } else {
      // Filter envelope: volume stays up, the cutoff opens from 120 Hz toward 6 kHz and settles at the sustain level.
      vca.gain.setValueAtTime(0, now)
      vca.gain.linearRampToValueAtTime(level("filter"), now + 0.005)
      vcf.frequency.setValueAtTime(120, now)
      vcf.frequency.linearRampToValueAtTime(6000, now + Math.max(e.a, 0.003))
      vcf.frequency.setTargetAtTime(120 + 5880 * e.s, now + Math.max(e.a, 0.003), Math.max(e.d, 0.01) / 3)
    }
    voice.current = { vca, vcf, oscs, start: now, releasedAt: null }
    setHeld(true)
  }
  const release = () => {
    const c = audio(), v = voice.current
    if (!c || !v) return
    const { env: e, target: tg } = live.current, now = c.currentTime
    const p = tg === "amp" ? v.vca.gain : v.vcf.frequency
    p.cancelScheduledValues(now)
    p.setValueAtTime(p.value, now)
    p.setTargetAtTime(tg === "amp" ? 0 : 120, now, Math.max(e.r, 0.02) / 3)
    if (tg === "filter") v.vca.gain.setTargetAtTime(0, now + e.r, 0.05)
    const end = now + e.r * 4 + 0.3
    v.oscs.forEach((o) => o.stop(end))
    v.releasedAt = now
    voice.current = null
    setHeld(false)
    window.setTimeout(() => v.vca.disconnect(), (end - now) * 1000 + 100)
    // Keep the dot running through the release.
    const t0 = v.start, rel = now
    const tick = () => {
      const c2 = audio()!, el = c2.currentTime - rel
      if (el > e.r * 2 || voice.current) return setT(null)
      setT(-(el + 0.0001))
      requestAnimationFrame(tick)
    }
    void t0
    requestAnimationFrame(tick)
  }
  // The dot while held: time since the note started.
  useEffect(() => {
    if (!held) return
    let raf = 0
    const tick = () => {
      const c = audio(), v = voice.current
      if (c && v) setT(c.currentTime - v.start)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [held])
  // While held, moving the sustain point changes the held level right away.
  useEffect(() => {
    const c = audio(), v = voice.current
    if (!c || !v) return
    const now = c.currentTime
    if (now - v.start < env.a + env.d * 0.5) return
    if (target === "amp") v.vca.gain.setTargetAtTime(level("amp") * env.s, now, 0.03)
    else v.vcf.frequency.setTargetAtTime(120 + 5880 * env.s, now, 0.03)
  }, [env.s, env.a, env.d, target])

  const dot = (() => {
    if (t === null) return null
    if (t < 0) {
      const el = -t, v = env.s * Math.exp(-el / Math.max(env.r / 3, 0.01))
      return { x: xS + Math.min(1, el / Math.max(env.r, 0.02)) * (xR - xS), y: y(v) }
    }
    if (t < env.a) return { x: (t / Math.max(env.a, 0.001)) * xA, y: y(t / Math.max(env.a, 0.001)) }
    const dt = t - env.a
    if (dt < env.d * 1.5) return { x: xA + Math.min(1, dt / Math.max(env.d, 0.01)) * (xD - xA), y: y(env.s + (1 - env.s) * Math.exp(-dt / Math.max(env.d / 3, 0.003))) }
    return { x: xD + ((dt % 2) / 2) * (xS - xD), y: y(env.s) }
  })()

  const drag = useRef<"a" | "ds" | "r" | null>(null)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const r = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H
    const round = (v: number) => Math.round(v * 1000) / 1000
    if (drag.current === "a") setEnv((x) => ({ ...x, a: round(clamp(fromX(px, MAX_AD, SEG), 0.001, MAX_AD)) }))
    else if (drag.current === "ds") setEnv((x) => ({ ...x, d: round(clamp(fromX(px - toX(x.a, MAX_AD, SEG), MAX_AD, SEG), 0.01, MAX_AD)), s: round(clamp((bot - py) / (bot - top), 0, 1)) }))
    else setEnv((x) => ({ ...x, r: round(clamp(fromX(px - xS, MAX_R, W - xS), 0.02, MAX_R)) }))
  }
  const handle = (id: "a" | "ds" | "r", cx: number, cy: number, label: string, onKey: (dx: number, dy: number) => void) => (
    <g role="slider" tabIndex={0} aria-label={label} aria-valuetext={id === "a" ? fmtS(env.a) : id === "ds" ? `decay ${fmtS(env.d)}, sustain ${Math.round(env.s * 100)}%` : fmtS(env.r)}
      className="group cursor-grab outline-none"
      onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId); drag.current = id }}
      onKeyDown={(e) => {
        const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, dy = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0
        if (!dx && !dy) return
        e.preventDefault()
        onKey(dx * (e.shiftKey ? 5 : 1), dy * (e.shiftKey ? 5 : 1))
      }}>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle cx={cx} cy={cy} r={7} fill="none" stroke="var(--ring)" strokeWidth={2} className="opacity-0 group-focus-visible:opacity-100" />
      <circle cx={cx} cy={cy} r={4} fill="var(--background)" stroke="var(--foreground)" strokeWidth={1.75} className="transition-[r] duration-100 group-hover:[r:5]" />
    </g>
  )
  const step = (v: number, k: number, lo: number, hi: number) => Math.round(clamp(v + k * Math.max(0.005, v * 0.08), lo, hi) * 1000) / 1000

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Seg label="Envelope preset" value={ENV_PRESETS.find((p) => JSON.stringify(p[2]) === JSON.stringify(env))?.[0] ?? ""} onChange={(v) => setEnv(ENV_PRESETS.find((p) => p[0] === v)![2])} options={ENV_PRESETS.map(([id, n]) => [id, n] as [string, string])} />
        <Seg label="Envelope target" value={target} onChange={setTarget} options={[["amp", "Volume"], ["filter", "Filter"]]} />
      </div>
      <svg viewBox={`-8 0 ${W + 16} ${H}`} className="vsvg touch-none select-none" role="group" aria-label="Envelope editor: drag the squares"
        onPointerMove={onMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <line className="vgrid" x1={0} y1={bot} x2={W} y2={bot} />
        <line className="vmark" x1={xS} y1={top - 4} x2={xS} y2={bot} />
        <text className="vtext" x={xS + 4} y={top + 6}>key released</text>
        <path className="varea" d={`${path} Z`} />
        <path className="vline" d={path} />
        {dot && <circle cx={dot.x} cy={dot.y} r={4.5} fill="var(--primary)" />}
        {handle("a", xA, y(1), "Attack", (dx) => setEnv((x) => ({ ...x, a: step(x.a, dx, 0.001, MAX_AD) })))}
        {handle("ds", xD, y(env.s), "Decay and sustain: left and right for decay, up and down for sustain", (dx, dy) => setEnv((x) => ({ ...x, d: step(x.d, dx, 0.01, MAX_AD), s: Math.round(clamp(x.s + dy * 0.02, 0, 1) * 100) / 100 })))}
        {handle("r", xR, bot, "Release", (dx) => setEnv((x) => ({ ...x, r: step(x.r, dx, 0.02, MAX_R) })))}
      </svg>
      <dl className="grid grid-cols-4 gap-2 text-sm tabular-nums">
        {([["Attack", fmtS(env.a)], ["Decay", fmtS(env.d)], ["Sustain", Math.round(env.s * 100) + "%"], ["Release", fmtS(env.r)]] as const).map(([n, v]) => (
          <div key={n} className="border-t pt-1.5"><dt className="text-muted-foreground text-xs">{n}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
      <Button type="button" variant={held ? "default" : "outline"} className={cn("w-full touch-none select-none", held && "bg-[#23782b] text-white hover:bg-[#1c6623]")}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start() }} onPointerUp={release} onPointerCancel={release}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); start() } }}
        onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") release() }}>
        {held ? "Let go to release" : "Hold to play a note"}
      </Button>
    </div>
  )
}

/* ---------------- LFO ---------------- */

type Shape = "sine" | "triangle" | "square" | "sawtooth"
type LfoTarget = "cutoff" | "volume" | "pitch"
const SHAPES: [Shape, string][] = [["sine", "Sine"], ["triangle", "Triangle"], ["square", "Square"], ["sawtooth", "Saw"]]
const shapeAt = (sh: Shape, ph: number) => {
  const x = ph - Math.floor(ph)
  return sh === "sine" ? Math.sin(x * 2 * Math.PI) : sh === "triangle" ? 1 - 4 * Math.abs(Math.round(x - 0.25) - (x - 0.25)) : sh === "square" ? (x < 0.5 ? 1 : -1) : 2 * x - 1
}
/** Rates as note lengths at 120 BPM, for the readout. */
const SYNC: [number, string][] = [[0.125, "4 bars"], [0.25, "2 bars"], [0.5, "1 bar"], [1, "1/2"], [2, "1/4"], [4, "1/8"], [8, "1/16"]]

/**
 * Drag left and right on the wave to change the rate and up and down to change
 * the amount. Play runs a sustained sound with the LFO on the chosen target,
 * and every change is heard right away.
 */
export function LfoEditor() {
  const [shape, setShape] = useState<Shape>("sine")
  const [rate, setRate] = useState(2)
  const [amount, setAmount] = useState(0.6)
  const [target, setTarget] = useState<LfoTarget>("cutoff")
  const [phase, setPhase] = useState(0)
  const playing = usePlayingId() === "lfo-demo"
  const nodes = useRef<{ lfo: OscillatorNode; depth: GainNode; vcf: BiquadFilterNode; vca: GainNode; trem: GainNode; oscs: OscillatorNode[]; t0: number } | null>(null)

  const depthFor = (tg: LfoTarget, amt: number) => (tg === "cutoff" ? amt * 1800 : tg === "volume" ? amt * 0.5 : amt * 80)
  const wire = (tg: LfoTarget, amt: number) => {
    const n = nodes.current, c = audio()
    if (!n || !c) return
    n.depth.disconnect()
    n.vcf.frequency.setTargetAtTime(tg === "cutoff" ? 2000 : 3500, c.currentTime, 0.03)
    n.trem.gain.setTargetAtTime(tg === "volume" ? 0.5 : 1, c.currentTime, 0.03)
    n.depth.gain.setTargetAtTime(depthFor(tg, amt), c.currentTime, 0.03)
    if (tg === "cutoff") n.depth.connect(n.vcf.frequency)
    else if (tg === "volume") n.depth.connect(n.trem.gain)
    else n.oscs.forEach((o) => n.depth.connect(o.detune))
  }
  const play = () => {
    toggle("lfo-demo", 3600, (c, bus, t0) => {
      const vcf = c.createBiquadFilter(), vca = c.createGain(), trem = c.createGain(), depth = c.createGain(), lfo = c.createOscillator()
      vcf.type = "lowpass"
      vcf.Q.value = 5
      vca.gain.setValueAtTime(0, t0)
      vca.gain.linearRampToValueAtTime(0.22, t0 + 0.05)
      vcf.connect(trem)
      trem.connect(vca)
      vca.connect(bus)
      const oscs = [-7, 0, 7].map((dt, i) => {
        const o = c.createOscillator()
        o.type = "sawtooth"
        o.frequency.value = mtof(NOTE + (i === 1 ? 12 : 0))
        o.detune.value = dt
        o.connect(vcf)
        o.start(t0)
        return o
      })
      lfo.type = shape
      lfo.frequency.value = rate
      lfo.connect(depth)
      lfo.start(t0)
      nodes.current = { lfo, depth, vcf, vca, trem, oscs, t0 }
      wire(target, amount)
    }, undefined, () => { nodes.current = null; setPhase(0) })
  }
  // Every change is applied to the running sound at once.
  useEffect(() => {
    const n = nodes.current, c = audio()
    if (!n || !c) return
    n.lfo.type = shape
    n.lfo.frequency.setTargetAtTime(rate, c.currentTime, 0.02)
  }, [shape, rate])
  useEffect(() => { wire(target, amount) }, [target, amount])
  // A dot rides the wave at the LFO's current phase.
  useEffect(() => {
    if (!playing) return
    let raf = 0, ph = 0, last = performance.now()
    const tick = (now: number) => {
      ph += ((now - last) / 1000) * rateRef.current
      last = now
      setPhase(ph)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  const rateRef = useRef(rate)
  useEffect(() => { rateRef.current = rate })

  const W = 320, H = 150, mid = 66, amp = 52 * amount
  // Show two seconds of the wave, so faster rates draw more cycles.
  const span = 2
  let d = ""
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * W, v = shapeAt(shape, (i / 200) * span * rate)
    d += (i ? " L" : "M") + x.toFixed(1) + " " + (mid - v * amp).toFixed(1)
  }
  const dotX = (((phase / rate) % span) / span) * W, dotY = mid - shapeAt(shape, phase) * amp
  const drag = useRef<{ x: number; y: number; rate: number; amount: number } | null>(null)
  const near = SYNC.reduce((a, b) => (Math.abs(Math.log(b[0] / rate)) < Math.abs(Math.log(a[0] / rate)) ? b : a))
  const targetText = target === "cutoff" ? `cutoff ±${fmtHz(depthFor("cutoff", amount))}` : target === "volume" ? `volume ±${Math.round(amount * 50)}%` : `pitch ±${Math.round(depthFor("pitch", amount))} cents`
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Seg label="LFO shape" value={shape} onChange={setShape} options={SHAPES} />
        <Seg label="LFO target" value={target} onChange={setTarget} options={[["cutoff", "Filter"], ["volume", "Volume"], ["pitch", "Pitch"]]} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="vsvg cursor-move touch-none outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        role="slider" tabIndex={0} aria-label="LFO: left and right change the rate, up and down change the amount" aria-valuetext={`${rate.toFixed(2)} Hz, amount ${Math.round(amount * 100)}%`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, rate, amount } }}
        onPointerMove={(e) => {
          const g = drag.current
          if (!g) return
          // Dragging right doubles the rate every 80 pixels; up raises the amount.
          setRate(Math.round(clamp(g.rate * Math.pow(2, (e.clientX - g.x) / 80), 0.1, 16) * 100) / 100)
          setAmount(Math.round(clamp(g.amount + (g.y - e.clientY) / 120, 0, 1) * 100) / 100)
        }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setRate((r) => Math.round(clamp(r * (e.key === "ArrowRight" ? 1.1 : 1 / 1.1), 0.1, 16) * 100) / 100) }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); setAmount((a) => Math.round(clamp(a + (e.key === "ArrowUp" ? 0.05 : -0.05), 0, 1) * 100) / 100) }
        }}>
        <line className="vgrid" x1={0} y1={mid} x2={W} y2={mid} />
        <line className="vmark" x1={0} y1={mid - 56} x2={0} y2={mid + 56} />
        {rate * span >= 1 && <line className="vmark" x1={W / (rate * span)} y1={mid - 56} x2={W / (rate * span)} y2={mid + 56} />}
        <path className="vline" d={d} />
        {playing && <circle cx={dotX} cy={dotY} r={4.5} fill="var(--primary)" />}
        <text className="vtext" x={0} y={H - 14}>Rate {rate.toFixed(2)} Hz <tspan className="vtext" style={{ fontSize: 11 }}>≈ {near[1]} at 120 BPM</tspan></text>
        <text className="vtext" x={W} y={H - 14} textAnchor="end">Amount {Math.round(amount * 100)}%</text>
        <text className="vtext" x={W} y={H - 1} textAnchor="end" style={{ fontSize: 11 }}>{targetText}</text>
      </svg>
      <Button type="button" variant={playing ? "default" : "outline"} className={cn("w-full", playing && "bg-[#23782b] text-white hover:bg-[#1c6623]")} aria-pressed={playing} onClick={play}>
        {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}{playing ? "Stop" : "Play with the LFO"}
      </Button>
    </div>
  )
}
