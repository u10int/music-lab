import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { audio } from "@/audio/engine"
import { stop, toggle, usePlayingId } from "@/audio/playback"
import { Caption, SECTION_TITLE } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { usePref } from "@/lib/store"
import { cn } from "@/lib/utils"
import { onNote, useMidi } from "@/midi/midi"

type Sub = "4" | "8" | "16"
const RANGE = 80 // ms shown either side of the beat

function click(c: AudioContext, out: AudioNode, t: number, accent: boolean, main: boolean) {
  const o = c.createOscillator(), g = c.createGain()
  o.frequency.value = accent ? 1760 : main ? 1320 : 990
  g.gain.setValueAtTime(accent ? 0.5 : main ? 0.32 : 0.14, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  o.connect(g)
  g.connect(out)
  o.start(t)
  o.stop(t + 0.06)
}

/** Converts a performance.now() time to the audio clock, using what the speakers are playing right now. */
function toAudioTime(c: AudioContext, perfMs: number) {
  const ts = c.getOutputTimestamp?.()
  if (ts && ts.contextTime !== undefined && ts.performanceTime) return ts.contextTime + (perfMs - ts.performanceTime) / 1000
  return c.currentTime - (performance.now() - perfMs) / 1000 - (c.outputLatency || c.baseLatency || 0)
}

export function TimingTrainer() {
  const [tempo, setTempo] = usePref<number>("timing-tempo", 100)
  const [sub, setSub] = usePref<Sub>("timing-sub", "8")
  const [latency, setLatency] = usePref<number>("timing-latency", 0)
  const [hits, setHits] = useState<number[]>([])
  const running = usePlayingId() === "timing"
  const { status, inputs } = useMidi()
  const grid = useRef<{ t0: number; step: number } | null>(null)
  const settings = useRef({ tempo, sub, latency })
  useEffect(() => {
    settings.current = { tempo, sub, latency }
  })

  const start = () => {
    let timer = 0
    toggle("timing", 3600, (c, bus, t0) => {
      const { tempo: bpm, sub: sb } = settings.current
      const step = 60 / bpm / (+sb / 4), per = +sb / 4
      grid.current = { t0, step }
      let next = t0, k = 0
      const tick = () => {
        while (next < horizon(c)) {
          click(c, bus, next, k % (per * 4) === 0, k % per === 0)
          next += step
          k++
        }
      }
      tick()
      timer = startClock(tick)
    }, undefined, () => {
      stopClock(timer)
      grid.current = null
    })
  }

  const register = (perfMs: number) => {
    const c = audio(), g = grid.current
    if (!c || !g) return
    const t = toAudioTime(c, perfMs) - settings.current.latency / 1000
    if (t < g.t0 - g.step / 2) return
    const n = Math.round((t - g.t0) / g.step)
    const off = (t - (g.t0 + n * g.step)) * 1000
    setHits((h) => [...h.slice(-39), off])
  }
  const registerRef = useRef(register)
  useEffect(() => {
    registerRef.current = register
  })
  useEffect(() => onNote((_n, _v, at) => registerRef.current(at)), [])
  useEffect(() => {
    if (!running) return
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || (e.target as HTMLElement).closest("input, textarea, [role=slider]")) return
      if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyF") {
        e.preventDefault()
        registerRef.current(e.timeStamp || performance.now())
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [running])
  useEffect(() => () => stop(), [])

  const n = hits.length
  const mean = n ? hits.reduce((a, b) => a + b, 0) / n : 0
  const sd = n > 1 ? Math.sqrt(hits.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  const tight = n ? Math.round((hits.filter((h) => Math.abs(h) <= 20).length / n) * 100) : 0
  const x = (ms: number) => 50 + (Math.max(-RANGE, Math.min(RANGE, ms)) / RANGE) * 47

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <PlayButton id="timing" label="Start click" primary onPlay={start} />
        <div className="grid w-44 gap-2">
          <div className="flex justify-between text-sm"><Label htmlFor="tt-tempo">Tempo</Label><output className="text-muted-foreground tabular-nums">{tempo} BPM</output></div>
          <Slider id="tt-tempo" min={60} max={180} step={1} value={[tempo]} disabled={running} onValueChange={([v]) => setTempo(v)} aria-label="Tempo" />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Play on</span>
          <Seg label="Subdivision" value={sub} onChange={(v) => { if (!running) setSub(v) }} options={[["4", "Quarters"], ["8", "8ths"], ["16", "16ths"]]} />
        </div>
      </div>
      {running && <Caption>Tempo and subdivision lock while the click runs. Stop it to change them.</Caption>}

      <div className="space-y-3">
        <div className="relative h-28 rounded-xl border bg-card" role="img" aria-label={n ? `Last ${n} hits: average ${Math.round(Math.abs(mean))} ms ${mean < 0 ? "early" : "late"}, spread ${Math.round(sd)} ms` : "No hits yet"}>
          <div className="absolute inset-y-0 left-1/2 w-px bg-foreground" />
          <div className="absolute inset-y-3 rounded-sm bg-[color-mix(in_oklab,var(--s3)_14%,transparent)]" style={{ left: `${x(-20)}%`, width: `${x(20) - x(-20)}%` }} />
          {hits.map((h, i) => (
            <span key={i} className={cn("absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full", Math.abs(h) <= 20 ? "bg-[var(--s3)]" : "bg-[var(--s1)]")} style={{ left: `${x(h)}%`, opacity: 0.25 + (0.75 * (i + 1)) / n, top: `${30 + ((i * 37) % 40)}%` }} />
          ))}
        </div>
        <div className="text-muted-foreground -mt-1 flex justify-between text-xs" aria-hidden="true"><span>Early</span><span>On the beat</span><span>Late</span></div>
        <dl className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Hits", String(n)],
            ["Average", n ? `${Math.round(Math.abs(mean))} ms ${Math.abs(mean) < 3 ? "" : mean < 0 ? "early" : "late"}` : "–"],
            ["Spread", n > 1 ? `±${Math.round(sd)} ms` : "–"],
            ["Within 20 ms", n ? `${tight}%` : "–"],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground text-sm">{k}</dt><dd className="font-display text-2xl font-bold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" disabled={!n} onClick={() => setHits([])}>Clear hits</Button>
          <span className="text-muted-foreground text-sm">
            {status === "ready" && inputs.length ? `Listening to ${inputs[0]}, plus Space, F and J.` : "Tap Space, F or J in time. Connect Push or a keyboard from the sidebar to drum on pads."}
          </span>
        </div>
      </div>

      <div className="grid max-w-2xl gap-2">
        <div className="flex justify-between text-sm"><Label htmlFor="tt-lat">Latency correction</Label><output className="text-muted-foreground tabular-nums">{latency > 0 ? "+" : ""}{latency} ms</output></div>
        <Slider id="tt-lat" min={-100} max={100} step={1} value={[latency]} onValueChange={([v]) => setLatency(v)} aria-label="Latency correction" />
        <Caption>Every setup has some delay. If your hits sit consistently late even when they feel right, play 20 or so steady quarters, then move this until the average reads close to 0. Bluetooth headphones add a lot; wired is best.</Caption>
      </div>

      <div className="space-y-1.5 text-sm">
        <h2 className={SECTION_TITLE}>What good looks like</h2>
        <p className="text-pretty">A spread under ±15 ms feels tight; most players start around ±30. Work at a slow tempo until 80% of hits land within 20 ms, then go up 5 BPM. 16ths at 100 BPM is the same speed as Note Repeat hats at 1/16 in a 100 BPM track.</p>
      </div>
    </div>
  )
}
