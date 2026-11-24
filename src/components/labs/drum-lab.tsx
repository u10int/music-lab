import { useState } from "react"
import { drum, KIND_OF } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { GENRES, PATTERNS, type Pattern } from "@/data/sprints"
import { cn } from "@/lib/utils"

/** One bar of 16 steps per row, with a moving playhead while it plays. */
export function PatternView({ p }: { p: Pattern }) {
  const [now, setNow] = useState(-1)
  const play = () => {
    const step = 60 / p.tempo / 4, bars = 4
    let last = -1
    toggle("pat-" + p.g, bars * 16 * step, (c, bus, t) => {
      for (let k = 0; k < bars * 16; k++)
        for (const [name, steps] of p.rows) if (steps.includes((k % 16) + 1)) drum(c, bus, t + k * step, KIND_OF[name], name === "Shaker" ? (k % 2 ? 0.9 : 0.45) : 1)
    }, (el) => {
      const s = Math.floor(el / step) % 16
      if (s !== last && el >= 0) {
        last = s
        setNow(s)
      }
    }, () => setNow(-1))
  }
  const steps = (fn: (i: number) => React.ReactNode) => (
    <div className="grid grid-cols-4 gap-2">
      {[0, 1, 2, 3].map((b) => (
        <span key={b} className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((k) => fn(b * 4 + k))}</span>
      ))}
    </div>
  )
  return (
    <figure className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span><span className="font-semibold">{p.name}</span> <span className="text-muted-foreground text-sm">{p.bpm}</span></span>
        <PlayButton id={"pat-" + p.g} label="Play" onPlay={play} />
      </figcaption>
      <div className="overflow-x-auto">
        <div className="grid min-w-[420px] gap-1.5">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2" aria-hidden="true">
            <span />
            {steps((i) => <span key={i} className="text-muted-foreground text-xs">{i % 4 === 0 ? i / 4 + 1 : ""}</span>)}
          </div>
          {p.rows.map(([name, on]) => (
            <div key={name} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 text-sm">
              <span>{name}</span>
              <div role="img" aria-label={`${name}: ${on.length === 16 ? "every step" : "steps " + on.join(", ")}`}>
                {steps((i) => (
                  <i key={i} className={cn("block aspect-square rounded-[3px] border-[1.5px] border-pad-edge", on.includes(i + 1) && "border-transparent bg-[var(--s1)]", now === i && "outline-2 outline-offset-1 outline-foreground")} />
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

export function DrumPatterns() {
  const [g, setG] = useState<string>("all")
  const list = PATTERNS.filter((p) => g === "all" || p.g === g)
  return (
    <div className="space-y-4">
      <Seg label="Genre" value={g} onChange={setG} options={GENRES as [string, string][]} />
      <div className="grid gap-4 lg:grid-cols-2">{list.map((p) => <PatternView key={p.g} p={p} />)}</div>
    </div>
  )
}
