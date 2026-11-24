import { useRef, useState } from "react"
import { Play } from "lucide-react"
import { tone } from "@/audio/engine"
import { stop, toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { INTERVALS, QUALS } from "@/data/labs"
import { update, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

type Mode = "chords" | "intervals"

export function EarTraining() {
  const progress = useProgress()
  const [mode, setMode] = useState<Mode>("chords")
  const [q, setQ] = useState<{ a: number; base: number } | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const opts = mode === "chords" ? QUALS.map((x) => x[0]) : INTERVALS
  const sc = progress.ear[mode] ?? { right: 0, total: 0 }

  const play = (question = q) => {
    if (!question) return
    const { a, base } = question
    toggle("ear", 2.6, (c, bus, t) => {
      const o = { wave: "triangle" as const, env: { a: 0.01, d: 0.5, s: 0.5, r: 0.3 }, cutoff: 3000, level: 0.16 }
      const notes = mode === "chords" ? QUALS[a][1].map((x) => base + x) : [base, base + a + 1]
      notes.forEach((n) => tone(c, bus, t, n, 0.9, o))
      notes.forEach((n, k) => tone(c, bus, t + 1.1 + k * 0.4, n, 0.35, o))
    })
  }
  const next = () => {
    stop()
    const nq = { a: Math.floor(Math.random() * (mode === "chords" ? 4 : 12)), base: 55 + Math.floor(Math.random() * 10) }
    setQ(nq)
    setPicked(null)
    play(nq)
  }
  const answer = (i: number) => {
    if (!q || picked !== null) return
    setPicked(i)
    update((d) => {
      const s = (d.ear[mode] ??= { right: 0, total: 0 })
      s.total++
      if (i === q.a) s.right++
    })
    requestAnimationFrame(() => nextRef.current?.focus())
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Caption>Each question plays the notes together, then one at a time. Name what you hear.</Caption>
        <Seg label="Quiz type" value={mode} onChange={(m) => { stop(); setMode(m); setQ(null); setPicked(null) }} options={[["chords", "Chord quality"], ["intervals", "Intervals"]]} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {q ? <PlayButton id="ear" label="Play again" onPlay={() => play()} /> : <Button variant="outline" size="sm" onClick={next}><Play className="size-3 fill-current" />Start</Button>}
        {q && picked !== null && <Button ref={nextRef} variant="outline" size="sm" onClick={next}>Next question</Button>}
        <span className="text-muted-foreground text-sm tabular-nums">{sc.total ? `${sc.right} of ${sc.total} right` : "No answers yet"}</span>
      </div>
      <div className={cn("grid gap-2", mode === "chords" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6")}>
        {opts.map((o, i) => {
          const st = q && picked !== null ? (i === q.a ? "correct" : i === picked ? "wrong" : "") : ""
          return (
            <Button
              key={o}
              variant="outline"
              disabled={!q || picked !== null}
              onClick={() => answer(i)}
              className={cn("disabled:opacity-100", st === "correct" && "border-transparent bg-[var(--s3)] text-[var(--on-accent)]", st === "wrong" && "border-destructive text-destructive line-through", !st && picked !== null && "opacity-50")}
            >
              {o}
              {st === "correct" && <span className="sr-only"> (answer)</span>}
              {st === "wrong" && <span className="sr-only"> (your pick)</span>}
            </Button>
          )
        })}
      </div>
      <p className="text-sm" role="status">
        {q && picked !== null && (picked === q.a ? `Right, that was ${opts[q.a].toLowerCase()}.` : `Not quite. You picked ${opts[picked].toLowerCase()}, and it was ${opts[q.a].toLowerCase()}. Play it again to compare.`)}
      </p>
    </div>
  )
}
