import { useState } from "react"
import { Play, RotateCcw, Square } from "lucide-react"
import { drum, type DrumKind } from "@/audio/engine"
import { setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { Button } from "@/components/ui/button"
import { TabSwitch } from "@/components/seg"
import { recordEar, update, usePref, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

type Level = "easy" | "medium" | "hard"
type Lane = "kick" | "snare" | "hat"
type Grid = Record<Lane, number[]>
const LANES: [Lane, string, DrumKind][] = [["hat", "Hat", "hat"], ["snare", "Snare", "snare"], ["kick", "Kick", "kick"]]
const LEVELS: [Level, string][] = [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

/** A random one-bar beat. Easy gives you the hats; medium and hard make you hear them too. */
function makeBeat(level: Level): Grid {
  const kick = level === "easy" ? pick([[0, 8], [0, 6, 8], [0, 8, 10], [0, 4, 8, 12], [0, 10]])
    : level === "medium" ? pick([[0, 6, 8], [0, 3, 8], [0, 8, 11], [0, 7, 10], [0, 4, 8, 12], [0, 6, 10]])
    : pick([[0, 3, 6, 10], [0, 7, 11, 14], [0, 3, 8, 11], [0, 5, 8, 14], [0, 6, 9, 12]])
  const snare = level === "hard" ? pick([[4, 12, 15], [4, 10, 12], [8, 14], [4, 7, 12]]) : pick([[4, 12], [8], [4, 12]])
  const hat = level === "easy" ? [0, 2, 4, 6, 8, 10, 12, 14] : level === "medium" ? pick([[0, 2, 4, 6, 8, 10, 12, 14], [2, 6, 10, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14]])
    : pick([[0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 15], [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], [2, 6, 7, 10, 14, 15]])
  return { kick, snare, hat }
}
const empty = (): Grid => ({ kick: [], snare: [], hat: [] })

/**
 * Hear a one-bar beat, rebuild it on the grid, and check it hit by hit.
 * The ear skill behind Sprint 1's Friday reference days.
 */
export function RhythmDictation() {
  const [level, setLevel] = usePref<Level>("rhythm-level", "easy")
  const [target, setTarget] = useState<Grid>(() => makeBeat(level))
  const [mine, setMine] = useState<Grid>(() => (level === "easy" ? { ...empty(), hat: makeBeat("easy").hat } : empty()))
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const p = useProgress()
  const score = p.ear?.rhythm
  const playingId = usePlayingId()
  const step = usePos(playingId === "rd-target" ? "rd-target" : "rd-mine")
  const bpm = level === "easy" ? 90 : level === "medium" ? 100 : 110

  const play = (id: string, g: Grid) => {
    const six = 60 / bpm / 4, bars = 4
    toggle(id, bars * 16 * six, (c, bus, t0) => {
      for (let b = 0; b < bars; b++)
        for (const [lane, , kind] of LANES)
          for (const s of g[lane]) drum(c, bus, t0 + (b * 16 + s) * six, kind, lane === "hat" ? 0.6 : 1)
    }, (el) => setPos(el < 0 ? -1 : Math.floor(el / six) % 16))
  }
  const fresh = (lv: Level = level) => {
    const t = makeBeat(lv)
    setTarget(t)
    setMine(lv === "easy" ? { ...empty(), hat: t.hat } : empty())
    setChecked(false)
  }
  const toggleCell = (lane: Lane, s: number) => {
    if (checked || (level === "easy" && lane === "hat")) return
    setMine((m) => ({ ...m, [lane]: m[lane].includes(s) ? m[lane].filter((x) => x !== s) : [...m[lane], s] }))
  }
  let right = 0, missed = 0, extra = 0
  for (const [lane] of LANES) {
    if (level === "easy" && lane === "hat") continue
    for (let s = 0; s < 16; s++) {
      const t = target[lane].includes(s), m = mine[lane].includes(s)
      if (t && m) right++
      else if (t) missed++
      else if (m) extra++
    }
  }
  const acc = Math.round((right / Math.max(1, right + missed + extra)) * 100)
  const check = () => {
    setChecked(true)
    const perfect = missed === 0 && extra === 0
    setStreak((x) => (perfect ? x + 1 : 0))
    update((d) => recordEar(d, "rhythm", level, perfect))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabSwitch label="Difficulty" value={level} onChange={(v) => { setLevel(v); fresh(v) }} options={LEVELS} />
        <span className="text-muted-foreground text-sm tabular-nums">{score ? `${score.right} of ${score.total} perfect` : "No beats yet"}{streak > 1 ? ` · ${streak} in a row` : ""}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => play("rd-target", target)} className={cn(playingId === "rd-target" && "bg-[#23782b] text-white hover:bg-[#1c6623]")}>
          {playingId === "rd-target" ? <><Square className="fill-current" />Stop</> : <><Play className="fill-current" />Play the beat</>}
        </Button>
        <Button variant="outline" onClick={() => play("rd-mine", mine)}>{playingId === "rd-mine" ? <><Square className="fill-current" />Stop</> : <><Play />Play yours</>}</Button>
        <span className="text-muted-foreground text-sm">{bpm} BPM, one bar on a loop</span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] gap-1" role="group" aria-label="Your beat: click a step to add or remove a hit">
          {LANES.map(([lane, name]) => (
            <div key={lane} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2">
              <span className="text-sm">{name}{level === "easy" && lane === "hat" && <span className="text-muted-foreground block text-[11px]">given</span>}</span>
              <div className="grid grid-cols-16 gap-1">
                {Array.from({ length: 16 }, (_, s) => {
                  const t = target[lane].includes(s), m = mine[lane].includes(s), given = level === "easy" && lane === "hat"
                  const state = !checked || given ? (m ? "on" : "off") : t && m ? "right" : t ? "missed" : m ? "extra" : "off"
                  return (
                    <button key={s} type="button" disabled={checked || given} onClick={() => toggleCell(lane, s)} data-ph={step === s || undefined} data-on={m || undefined}
                      aria-label={`${name}, step ${s + 1}${m ? ", on" : ""}${checked && !given ? `: ${state === "off" ? "correct, empty" : state}` : ""}`} aria-pressed={m}
                      className={cn("relative grid aspect-square place-items-center border text-[11px] transition-[background-color] duration-75",
                        s % 4 === 0 ? "border-foreground/40" : "border-pad-edge",
                        state === "on" && (given ? "border-transparent bg-foreground/35" : "border-transparent bg-[var(--s1)]"),
                        state === "right" && "border-transparent bg-[#23782b] text-white",
                        state === "missed" && "border-2 border-dashed border-[#23782b]",
                        state === "extra" && "border-transparent bg-destructive text-white")}>
                      {state === "extra" ? "✕" : state === "missed" ? <span className="sr-only">missed</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!checked ? <Button onClick={check}>Check my beat</Button> : <Button onClick={() => fresh()}><RotateCcw />Next beat</Button>}
        {!checked && <Button variant="ghost" onClick={() => setMine(level === "easy" ? { ...empty(), hat: target.hat } : empty())}>Clear</Button>}
        {checked && (
          <p className="text-sm" role="status">
            <span className="mr-2 text-lg font-medium">{missed === 0 && extra === 0 ? "Perfect." : `${acc}%`}</span>
            {right} right{missed ? `, ${missed} missed (dashed)` : ""}{extra ? `, ${extra} extra (✕)` : ""}. Play both to hear the difference.
          </p>
        )}
      </div>
    </div>
  )
}

const QUIZZES: [string, string][] = [["rhythm", "Rhythm dictation"], ["chords", "Chord quality"], ["intervals", "Intervals"], ["progressions", "Progressions"], ["degrees", "Scale degrees"], ["keys", "Major or minor"], ["mix-eq", "EQ band"], ["match", "Match the sound"]]

/** Accuracy per ear drill over the last 14 days, one bar per day, with this sprint's focus drill first. */
export function EarTrack({ focus }: { focus?: string }) {
  const p = useProgress()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  })
  const rows = QUIZZES.filter(([q]) => q === focus || days.some((d) => p.earDays?.[d]?.[q]?.total)).sort((a, b) => (a[0] === focus ? -1 : b[0] === focus ? 1 : 0))
  if (!rows.length) return <p className="text-muted-foreground text-sm">Answer a few questions and your accuracy shows up here, day by day.</p>
  return (
    <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map(([q, name]) => {
        const all = p.ear?.[q]
        return (
          <li key={q} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn(q === focus && "font-medium")}>{name}{q === focus && <span className="text-muted-foreground font-normal"> · this sprint’s focus</span>}</span>
              <span className="text-muted-foreground tabular-nums">{all?.total ? `${Math.round((all.right / all.total) * 100)}% overall` : "–"}</span>
            </div>
            <div className="flex h-10 items-end gap-0.5" role="img" aria-label={`${name}, last 14 days: ` + days.map((d) => { const x = p.earDays?.[d]?.[q]; return x?.total ? `${Math.round((x.right / x.total) * 100)}%` : "none" }).join(", ")}>
              {days.map((d) => {
                const x = p.earDays?.[d]?.[q], v = x?.total ? x.right / x.total : 0
                return <span key={d} className={cn("flex-1", x?.total ? "bg-[var(--s5)]" : "bg-muted")} style={{ height: x?.total ? `${Math.max(8, v * 100)}%` : "8%" }} />
              })}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
