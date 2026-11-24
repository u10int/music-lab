import { useEffect, useState } from "react"
import { useLocation } from "react-router"
import { drum, KIND_OF } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { FAMILIES, PATTERNS, type Family, type Pattern } from "@/data/patterns"
import { usePref } from "@/lib/store"
import { cn } from "@/lib/utils"

/** One bar of 16 steps per row, with a moving playhead while it plays. Ghost notes show lighter. */
export function PatternView({ p }: { p: Pattern }) {
  const [now, setNow] = useState(-1)
  const id = "pat-" + p.id
  const play = () => {
    const len = p.length ?? 16, step = 60 / p.tempo / 4, total = 64, swing = (p.swing ?? 0) * step
    let last = -1
    toggle(id, total * step, (c, bus, t) => {
      for (let k = 0; k < total; k++) {
        const s = (k % len) + 1, at = t + k * step + (k % 2 ? swing : 0)
        for (const [name, steps, ghost = []] of p.rows) {
          if (steps.includes(s)) drum(c, bus, at, KIND_OF[name], 1)
          else if (ghost.includes(s)) drum(c, bus, at, KIND_OF[name], 0.4)
        }
      }
    }, (el) => {
      const s = Math.floor(el / step) % (p.length ?? 16)
      if (s !== last && el >= 0) {
        last = s
        setNow(s)
      }
    }, () => setNow(-1))
  }
  const bars = Array.from({ length: (p.length ?? 16) / 16 }, (_, b) => b)
  const steps = (fn: (i: number) => React.ReactNode) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
      {bars.map((bar) => (
        <div key={bar} className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((b) => <span key={b} className="grid grid-cols-4 gap-0.5">{[0, 1, 2, 3].map((k) => fn(bar * 16 + b * 4 + k))}</span>)}
        </div>
      ))}
    </div>
  )
  return (
    <figure id={"pat-" + p.id} tabIndex={-1} className={cn("min-w-0 scroll-mt-24 space-y-3 rounded-xl border bg-card p-4 outline-none transition-[box-shadow] duration-300 data-[flash=true]:ring-2 data-[flash=true]:ring-ring", p.length === 32 && "lg:col-span-2")}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span><span className="font-semibold">{p.name}</span> <span className="text-muted-foreground text-sm">{p.bpm}{p.swing && !p.bpm.includes("swung") ? ", swung" : ""}{p.length === 32 ? " · 2 bars" : ""}</span></span>
        <PlayButton id={id} label="Play" onPlay={play} />
      </figcaption>
      <div className="overflow-x-auto">
        <div className={cn("grid gap-1.5", bars.length > 1 ? "min-w-[640px]" : "min-w-[420px]")}>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2" aria-hidden="true">
            <span />
            {steps((i) => <span key={i} className="text-muted-foreground text-xs whitespace-nowrap">{i % 16 === 0 && bars.length > 1 ? `Bar ${i / 16 + 1}` : i % 4 === 0 ? (i % 16) / 4 + 1 : ""}</span>)}
          </div>
          {p.rows.map(([name, on, ghost = []]) => (
            <div key={name} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 text-sm">
              <span>{name}</span>
              <div role="img" aria-label={`${name}: ${on.length === (p.length ?? 16) ? "every step" : on.length ? "steps " + on.join(", ") : "no main hits"}${ghost.length ? `; quiet on ${ghost.join(", ")}` : ""}`}>
                {steps((i) => (
                  <i key={i} className={cn("block aspect-square rounded-[3px] border-[1.5px] border-pad-edge", on.includes(i + 1) && "border-transparent bg-[var(--s1)]", ghost.includes(i + 1) && "border-transparent bg-[color-mix(in_oklab,var(--s1)_35%,var(--card))]", now === i && "outline-2 outline-offset-1 outline-foreground")} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Caption>{p.note}</Caption>
    </figure>
  )
}

export function DrumPatterns({ only }: { only?: Family }) {
  const [fam, setFam] = usePref<Family | "all">("pattern-family", "all")
  const { hash } = useLocation()
  useEffect(() => {
    const id = hash.startsWith("#pat-") ? hash.slice(5) : null
    const p = id && PATTERNS.find((x) => x.id === id)
    if (p && fam !== "all" && p.family !== fam) setFam("all")
  }, [hash])
  const f = only ?? fam
  const list = PATTERNS.filter((p) => f === "all" || p.family === f)
  return (
    <div className="space-y-4">
      {!only && <Seg label="Style" value={fam} onChange={setFam} options={FAMILIES} />}
      <Caption>Solid squares are the main hits, light ones are quiet ghost notes. Load any of these into the step sequencer to edit it and export MIDI.</Caption>
      <div className="grid gap-4 lg:grid-cols-2">{list.map((p) => <PatternView key={p.id} p={p} />)}</div>
    </div>
  )
}
