import { useState } from "react"
import { drum, tone } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { FREQ, SCALES } from "@/data/labs"
import { fmtHz, fmtS } from "@/lib/theory"

const fx = (f: number) => (Math.log(f / 20) / Math.log(1000)) * 100

export function FrequencyMap() {
  const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  return (
    <div className="space-y-3">
      <div role="img" aria-label={`Approximate frequency ranges: ${FREQ.map(([n, r]) => n + " " + r.map(([a, b]) => fmtHz(a) + " to " + fmtHz(b)).join(" and ")).join("; ")}`} className="grid gap-1.5">
        {FREQ.map(([n, r]) => (
          <div key={n} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 text-sm">
            <span className="truncate">{n}</span>
            <div className="relative h-4 rounded-sm bg-muted">
              {r.map(([a, b]) => <span key={a} className="absolute inset-y-0 rounded-sm bg-[var(--s6)]" style={{ left: `${fx(a)}%`, width: `${fx(b) - fx(a)}%` }} />)}
              <span className="absolute inset-y-[-3px] border-l border-dashed border-foreground" style={{ left: `${fx(120)}%` }} />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3" aria-hidden="true">
          <span />
          <div className="relative h-4">
            {ticks.map((t) => (
              <span key={t} className="text-muted-foreground absolute -translate-x-1/2 text-[11px] tabular-nums" style={{ left: `${fx(t)}%` }}>
                {[50, 200, 500, 2000, 5000].includes(t) ? "" : t >= 1000 ? t / 1000 + "k" : t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Caption>Approximate ranges in Hz. The dashed line at 120 Hz is a starting point for high-passing anything that isn't kick, sub or bass.</Caption>
    </div>
  )
}

export function SidechainLab() {
  const { root, scale } = useKey()
  const [depth, setDepth] = useState(0.8)
  const [release, setRelease] = useState(0.25)
  const W = 640, H = 120, beats = 4, top = 24, bot = 110, beatS = 60 / 124
  let p = ""
  for (let i = 0; i <= 320; i++) {
    const t = (i / 320) * beats * beatS, since = t % beatS, g = 1 - depth * Math.exp(-since / Math.max(release / 3, 0.01))
    p += (i ? " L" : "M") + ((i / 320) * W).toFixed(1) + " " + (bot - g * (bot - top)).toFixed(1)
  }
  const play = () => {
    const n = 8, dur = n * beatS, minor = SCALES.find((s) => s.id === scale)?.minor
    toggle("sc", dur, (c, bus, t) => {
      const duck = c.createGain()
      duck.connect(bus)
      for (let b = 0; b < n; b++) {
        drum(c, bus, t + b * beatS, "kick")
        duck.gain.setValueAtTime(1 - depth, t + b * beatS + 0.005)
        duck.gain.setTargetAtTime(1, t + b * beatS + 0.01, Math.max(release / 3, 0.01))
      }
      const midi = 36 + root
      tone(c, duck, t, midi, dur - 0.1, { wave: "sawtooth", env: { a: 0.01, d: 0.1, s: 1, r: 0.1 }, cutoff: 500, q: 1, detune: 20, level: 0.3 })
      tone(c, duck, t, midi + 24, dur - 0.1, { wave: "sawtooth", env: { a: 0.02, d: 0.1, s: 1, r: 0.2 }, cutoff: 1800, detune: 10, level: 0.1 })
      tone(c, duck, t, midi + 27 + (minor ? 0 : 1), dur - 0.1, { wave: "sawtooth", env: { a: 0.02, d: 0.1, s: 1, r: 0.2 }, cutoff: 1800, detune: 10, level: 0.1 })
    })
  }
  return (
    <div className="space-y-4" style={{ ["--c" as string]: "var(--s6)" }}>
      <div className="relative">
        {Array.from({ length: beats }, (_, i) => (
          <span key={i} aria-hidden="true" className="absolute top-0 h-3 w-3 -translate-x-0 rounded-full bg-foreground" style={{ left: `${(i / beats) * 100}%` }} />
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="vsvg wide" role="img" aria-label={`Bass volume ducks by ${Math.round(depth * 100)}% on each kick and recovers over about ${Math.round(release * 1000)} ms`}>
          <line className="vgrid" x1={0} y1={top} x2={W} y2={top} />
          <line className="vgrid" x1={0} y1={bot} x2={W} y2={bot} />
          <path className="varea" d={`${p} L${W} ${bot} L0 ${bot} Z`} />
          <path className="vline" d={p} />
        </svg>
      </div>
      <div className="text-muted-foreground flex gap-5 text-sm" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><i className="size-3 rounded-full bg-foreground" />Kick, one per beat at 124 BPM</span>
        <span className="inline-flex items-center gap-2"><i className="h-0.5 w-5 bg-[var(--s6)]" />Bass volume</span>
      </div>
      <div className="grid max-w-2xl items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="grid gap-2">
          <div className="flex justify-between text-sm"><Label htmlFor="scd">Depth</Label><output className="text-muted-foreground tabular-nums">{Math.round(depth * 100)}%</output></div>
          <Slider id="scd" min={0} max={1} step={0.01} value={[depth]} onValueChange={([v]) => setDepth(v)} aria-label="Depth" />
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between text-sm"><Label htmlFor="scr">Release</Label><output className="text-muted-foreground tabular-nums">{fmtS(release)}</output></div>
          <Slider id="scr" min={0.05} max={0.5} step={0.01} value={[release]} onValueChange={([v]) => setRelease(v)} aria-label="Release" />
        </div>
        <PlayButton id="sc" label="Play two bars" onPlay={play} />
      </div>
      <Caption>Set Depth to 0 to hear the bass without sidechain. In Live, put a Compressor on the bass and pick the kick as its sidechain input.</Caption>
    </div>
  )
}

export function MixLab() {
  return (
    <div className="space-y-8">
      <div className="space-y-3"><h3 className="font-semibold">Where each part sits</h3><FrequencyMap /></div>
      <div className="space-y-3"><h3 className="font-semibold">Sidechain: the kick ducks the bass</h3><SidechainLab /></div>
    </div>
  )
}
