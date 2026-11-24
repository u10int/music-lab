import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import { Link } from "react-router"
import { fxChain, voice, type FxSettings, type Patch } from "@/audio/patch"
import { stop, toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { GENRE_SOUNDS, type GenreSound, type Macro } from "@/data/genre-sounds"
import { SCALES } from "@/data/labs"
import { degreeMidi } from "@/lib/loop"
import { recordEar, update, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Sliders whose range spans a lot (frequencies, times) feel right on a log scale. */
const isLog = (m: Macro) => m.min > 0 && m.max / m.min >= 20
const norm = (m: Macro, v: number) => (isLog(m) ? Math.log(v / m.min) / Math.log(m.max / m.min) : (v - m.min) / (m.max - m.min))
const denorm = (m: Macro, x: number) => {
  const v = isLog(m) ? m.min * Math.pow(m.max / m.min, x) : m.min + x * (m.max - m.min)
  return Math.min(m.max, Math.max(m.min, Math.round(v / m.step) * m.step))
}
const POOL = GENRE_SOUNDS.filter((s) => s.macros.length >= 3)

interface Round { s: GenreSound; hidden: string[]; target: Record<string, number> }

function makeRound(knobs: number): Round {
  const s = POOL[Math.floor(Math.random() * POOL.length)]
  const hidden = [...s.macros].sort(() => Math.random() - 0.5).slice(0, knobs).map((m) => m.id)
  const target = Object.fromEntries(s.macros.map((m) => {
    if (!hidden.includes(m.id)) return [m.id, m.value]
    // Somewhere clearly away from the default, so the default is never the answer.
    let x = Math.random()
    if (Math.abs(x - norm(m, m.value)) < 0.25) x = (x + 0.5) % 1
    return [m.id, denorm(m, 0.08 + x * 0.84)]
  }))
  return { s, hidden, target }
}
function resolve(s: GenreSound, vals: Record<string, number>) {
  const patch: Patch = structuredClone(s.patch), fx: FxSettings = structuredClone(s.fx)
  for (const m of s.macros) m.apply(patch, fx, vals[m.id] ?? m.value)
  return { patch, fx }
}
/** How close the guesses are, from 0 to 100. */
function score(r: Round, vals: Record<string, number>) {
  const ms = r.s.macros.filter((m) => r.hidden.includes(m.id))
  const err = ms.reduce((a, m) => a + Math.abs(norm(m, vals[m.id]) - norm(m, r.target[m.id])), 0) / ms.length
  return Math.max(0, Math.round(100 - err * 160))
}

export function MatchSound() {
  const progress = useProgress()
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const [knobs, setKnobs] = useState("2")
  const [r, setR] = useState<Round | null>(null)
  const [vals, setVals] = useState<Record<string, number>>({})
  const [checked, setChecked] = useState<number | null>(null)
  const live = useRef({ vals })
  useEffect(() => {
    live.current = { vals }
  })
  const sc = progress.ear.match ?? { right: 0, total: 0 }

  const play = (id: string, which: "target" | "yours", round = r) => {
    if (!round) return
    const s = round.s, sixteenth = 60 / s.tempo / 4
    toggle(id, 32 * sixteenth + 2, (c, bus, t0) => {
      const v = which === "target" ? round.target : live.current.vals
      const { patch, fx } = resolve(s, v)
      const chain = fxChain(c, bus)
      chain.set(fx, s.tempo)
      let prev: number | undefined
      for (const [start, len, deg, shift = 0] of s.phrase) {
        for (const d of [deg].flat()) {
          const m = degreeMidi(root, iv, s.oct, d, shift)
          voice(c, chain.input, t0 + start * sixteenth, m, len * sixteenth, patch, s.tempo, s.mono ? prev : undefined)
          if (s.mono) prev = m
        }
      }
      if (fx.duck) for (let b = 0; b < 8; b++) {
        const t = t0 + b * 4 * sixteenth
        chain.duck.gain.setValueAtTime(1 - fx.duck, t + 0.005)
        chain.duck.gain.setTargetAtTime(1, t + 0.01, 0.07)
      }
    })
  }
  const start = () => {
    stop()
    const nr = makeRound(+knobs)
    setR(nr)
    setVals(Object.fromEntries(nr.s.macros.map((m) => [m.id, m.value])))
    setChecked(null)
    play("match-target", "target", nr)
  }
  const check = () => {
    if (!r) return
    const pts = score(r, vals)
    setChecked(pts)
    update((d) => recordEar(d, "match", r.s.name, pts >= 80))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Seg label="Knobs to match" value={knobs} onChange={(k) => { stop(); setKnobs(k); setR(null); setChecked(null) }} options={[["1", "1 knob"], ["2", "2 knobs"], ["3", "3 knobs"]]} />
        <span className="text-muted-foreground text-sm tabular-nums">{sc.total ? `${sc.right} of ${sc.total} rounds matched` : "No rounds yet"}</span>
      </div>
      <Caption>A sound plays with some knobs set to secret values. Play the target, turn the knobs until yours sounds the same, then check. 80 points or more counts as a match.</Caption>
      {!r ? (
        <Button variant="outline" size="sm" onClick={start}><Play className="size-3 fill-current" />Start a round</Button>
      ) : (
        <div className="space-y-5 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{r.s.name}</h3>
                <Badge variant="secondary">{r.s.role}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{r.s.genre} · <Link className="underline" to={`/labs/sound-design#sound-${r.s.id}`}>See the recipe</Link></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PlayButton id="match-target" label="Play target" onPlay={() => play("match-target", "target")} />
              <PlayButton id="match-yours" label="Play yours" onPlay={() => play("match-yours", "yours")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {r.s.macros.filter((m) => r.hidden.includes(m.id)).map((m) => {
              const x = norm(m, vals[m.id] ?? m.value)
              return (
                <div key={m.id} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <Label htmlFor={`match-${m.id}`}>{m.label}</Label>
                    <output className="text-muted-foreground text-xs tabular-nums">{m.fmt(vals[m.id] ?? m.value)}</output>
                  </div>
                  <Slider id={`match-${m.id}`} aria-label={m.label} disabled={checked !== null} min={0} max={1} step={0.001} value={[x]} onValueChange={([v]) => setVals((o) => ({ ...o, [m.id]: denorm(m, v) }))} />
                  {checked !== null && (
                    <div className="relative h-2" aria-hidden="true">
                      <span className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-[var(--s3)]" style={{ left: `${norm(m, r.target[m.id]) * 100}%` }} />
                    </div>
                  )}
                  {checked !== null && <p className="text-muted-foreground text-xs">Target {m.fmt(r.target[m.id])}</p>}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {checked === null ? <Button size="sm" onClick={check}>Check</Button> : <Button size="sm" variant="outline" onClick={start}>Next round</Button>}
            <p role="status" className={cn("text-sm", checked !== null && "font-medium")}>
              {checked !== null && (checked >= 80 ? `${checked} points. That’s a match.` : `${checked} points. The green marks show the targets; play both again to hear the difference.`)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
