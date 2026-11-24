import { useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Play } from "lucide-react"
import { tone, type ToneOptions } from "@/audio/engine"
import { stop, toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { TabSwitch } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { INTERVALS, QUALS } from "@/data/labs"
import { recordEar, update, useProgress, usePref } from "@/lib/store"
import { weakSpots, weightedPick } from "@/lib/adaptive"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { chordMidi, theory } from "@/lib/theory"
import { cn } from "@/lib/utils"

type Mode = "chords" | "intervals" | "progressions" | "degrees" | "keys"
const MODES: [Mode, string][] = [["chords", "Chord quality"], ["intervals", "Intervals"], ["progressions", "Progressions"], ["degrees", "Scale degrees"], ["keys", "Major or minor"]]
const HELP: Record<Mode, string> = {
  chords: "Each question plays a chord together, then one note at a time. Name its quality.",
  intervals: "Two notes together, then one after the other. Name the distance between them.",
  progressions: "Four chords in a random key. Pick the progression by its Roman numerals. Listen for where the bass goes and whether it ends at home.",
  degrees: "A short I–IV–V–I sets the key, then one note plays. Which step of the major scale is it?",
  keys: "A chord progression and a scale run. Does it sound major (bright) or minor (darker)?",
}

/** Where to learn what each quiz tests. */
const LEARN: Partial<Record<Mode, [string, string]>> = {
  chords: ["/labs/theory?tab=qualities", "Learn the chord qualities"],
  intervals: ["/labs/theory?tab=intervals", "Learn the intervals"],
  progressions: ["/labs/theory?tab=chords", "Hear the chords in a key"],
  keys: ["/labs/theory?tab=qualities", "Hear major and minor side by side"],
}

/** Progressions by scale degree (0 = I), used for the progression quiz. */
const PROGS: { minor: boolean; d: number[] }[] = [
  { minor: false, d: [0, 4, 5, 3] },
  { minor: false, d: [0, 5, 3, 4] },
  { minor: false, d: [5, 3, 0, 4] },
  { minor: false, d: [0, 3, 4, 0] },
  { minor: false, d: [1, 4, 0, 0] },
  { minor: true, d: [0, 5, 2, 6] },
  { minor: true, d: [0, 3, 4, 0] },
  { minor: true, d: [0, 6, 5, 6] },
  { minor: true, d: [0, 3, 6, 2] },
]
const DEGREES = ["1 (root)", "2", "3", "4", "5", "6", "7"]

interface Question { a: number; base: number; root: number; options: string[]; extra?: number }

const rnd = (n: number) => Math.floor(Math.random() * n)
const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1])

function progLabel(i: number) {
  const p = PROGS[i]
  const T = theory(0, p.minor ? "minor" : "major")
  return p.d.map((d) => T.chords[d].roman).join("–")
}

/** Answer labels per quiz, used to track which ones you miss. */
const KEYS_OF: Record<Mode, () => string[]> = {
  chords: () => QUALS.map((q) => q[0]),
  intervals: () => INTERVALS,
  degrees: () => DEGREES,
  keys: () => ["Major", "Minor"],
  progressions: () => PROGS.map((_, i) => progLabel(i)),
}

function makeQuestion(mode: Mode, pick: (keys: string[]) => number): Question {
  const base = 55 + rnd(10), root = rnd(12)
  if (mode === "chords") return { a: pick(KEYS_OF.chords()), base, root, options: QUALS.map((q) => q[0]) }
  if (mode === "intervals") return { a: pick(INTERVALS), base, root, options: INTERVALS }
  if (mode === "degrees") return { a: pick(DEGREES), base, root, options: DEGREES }
  if (mode === "keys") return { a: pick(["Major", "Minor"]), base, root, options: ["Major", "Minor"], extra: rnd(2) }
  // Progressions: the answer plus three others from the same mode, in random order.
  const answer = pick(KEYS_OF.progressions())
  const minor = PROGS[answer].minor
  const pool = PROGS.map((p, i) => ({ p, i })).filter((x) => x.p.minor === minor).map((x) => x.i)
  const picks = shuffle([answer, ...shuffle(pool.filter((i) => i !== answer)).slice(0, 3)])
  return { a: picks.indexOf(answer), base, root, options: picks.map(progLabel), extra: answer }
}

const KEYS: ToneOptions = { wave: "triangle", env: { a: 0.01, d: 0.5, s: 0.5, r: 0.3 }, cutoff: 3000, level: 0.15 }
const BASS: ToneOptions = { wave: "sine", env: { a: 0.01, d: 0.5, s: 0.7, r: 0.2 }, cutoff: 4000, level: 0.28 }

function schedule(mode: Mode, q: Question) {
  return (c: AudioContext, bus: AudioNode, t: number): number => {
    if (mode === "chords" || mode === "intervals") {
      const notes = mode === "chords" ? QUALS[q.a][1].map((x) => q.base + x) : [q.base, q.base + q.a + 1]
      notes.forEach((n) => tone(c, bus, t, n, 0.9, KEYS))
      notes.forEach((n, k) => tone(c, bus, t + 1.1 + k * 0.4, n, 0.35, KEYS))
      return 1.1 + notes.length * 0.4 + 0.6
    }
    const chordsAt = (T: ReturnType<typeof theory>, degs: number[], start: number, len: number) =>
      degs.forEach((d, k) => {
        const m = chordMidi(T, T.chords[d])
        m.notes.forEach((n) => tone(c, bus, start + k * len, n, len * 0.85, KEYS))
        tone(c, bus, start + k * len, m.bass, len * 0.85, BASS)
      })
    if (mode === "progressions") {
      const p = PROGS[q.extra!]
      chordsAt(theory(q.root, p.minor ? "minor" : "major"), p.d, t, 1.0)
      return 4.4
    }
    if (mode === "degrees") {
      const T = theory(q.root, "major")
      chordsAt(T, [0, 3, 4, 0], t, 0.55)
      let n = 60 + T.pc + T.sc.iv[q.a]
      if (n > 72) n -= 12
      tone(c, bus, t + 2.8, n, 0.9, { ...KEYS, level: 0.22 })
      return 4
    }
    // Major or minor: a progression, then the scale up and back to the root.
    const minor = q.a === 1
    const T = theory(q.root, minor ? "minor" : "major")
    chordsAt(T, q.extra ? [0, 3, 4, 0] : minor ? [0, 5, 2, 6] : [0, 4, 5, 3], t, 0.8)
    const run = [0, 1, 2, 3, 4, 5, 6, 7]
    run.forEach((d, k) => {
      const n = 60 + T.pc - (T.pc > 7 ? 12 : 0) + (d === 7 ? 12 : T.sc.iv[d])
      tone(c, bus, t + 3.4 + k * 0.2, n, 0.18, { ...KEYS, level: 0.18 })
    })
    return 3.4 + 8 * 0.2 + 0.5
  }
}

export function EarTraining() {
  const progress = useProgress()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => (MODES.some(([m]) => m === params.get("quiz")) ? (params.get("quiz") as Mode) : "chords"))
  const [focus, setFocus] = usePref("ear-focus", true)
  const [q, setQ] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [streak, setStreak] = useState({ now: 0, best: 0 })
  const nextRef = useRef<HTMLButtonElement>(null)
  const sc = progress.ear[mode] ?? { right: 0, total: 0 }
  const opts = q?.options ?? (mode === "chords" ? QUALS.map((x) => x[0]) : mode === "intervals" ? INTERVALS : mode === "degrees" ? DEGREES : mode === "keys" ? ["Major", "Minor"] : [])

  const play = (question = q) => {
    if (!question) return
    toggle("ear", 6, schedule(mode, question))
  }
  const next = () => {
    stop()
    const nq = makeQuestion(mode, (keys) => weightedPick(progress.earDetail?.[mode], keys, focus))
    setQ(nq)
    setPicked(null)
    play(nq)
  }
  const answer = (i: number) => {
    if (!q || picked !== null) return
    setPicked(i)
    setStreak((s) => (i === q.a ? { now: s.now + 1, best: Math.max(s.best, s.now + 1) } : { now: 0, best: s.best }))
    update((d) => recordEar(d, mode, q.options[q.a], i === q.a))
    requestAnimationFrame(() => nextRef.current?.focus())
  }
  const many = opts.length > 4
  return (
    <div className="space-y-4">
      <TabSwitch label="Quiz type" value={mode} onChange={(m) => { stop(); setMode(m); setQ(null); setPicked(null) }} options={MODES} />
      <Caption>{HELP[mode]}{LEARN[mode] && <> <Link to={LEARN[mode]![0]} className="text-foreground underline underline-offset-2">{LEARN[mode]![1]}</Link> first if they’re new to you.</>}</Caption>
      <WeakSpots detail={progress.earDetail?.[mode]} focus={focus} setFocus={setFocus} id="ear-focus" />
      <div className="flex flex-wrap items-center gap-2">
        {q ? <PlayButton id="ear" label="Play again" onPlay={() => play()} /> : <Button onClick={next}><Play className="size-3.5 fill-current" />Start</Button>}
        {q && picked !== null && <Button ref={nextRef} onClick={next}>Next question</Button>}
        <span className="text-muted-foreground text-sm tabular-nums">{sc.total ? `${sc.right} of ${sc.total} right` : "No answers yet"}</span>
        {(streak.now > 0 || streak.best > 0) && (
          <span className="ml-auto flex items-baseline gap-3 text-sm tabular-nums" aria-label={`Streak ${streak.now}, best this session ${streak.best}`}>
            <span><span key={streak.now} className={cn("inline-block text-2xl font-medium", streak.now > 0 && "animate-[pop_300ms_ease-out]")}>{streak.now}</span> in a row</span>
            <span className="text-muted-foreground">best {streak.best}</span>
          </span>
        )}
      </div>
      <div className={cn("grid gap-2", many ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : opts.length === 2 ? "max-w-sm grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {opts.map((o, i) => {
          const st = q && picked !== null ? (i === q.a ? "correct" : i === picked ? "wrong" : "") : ""
          return (
            <Button
              key={i}
              variant="outline"
              disabled={!q || picked !== null}
              onClick={() => answer(i)}
              className={cn("h-auto min-h-9 whitespace-normal py-2 disabled:opacity-100", st === "correct" && "border-transparent bg-[var(--s3)] text-[var(--on-accent)]", st === "wrong" && "border-destructive text-destructive line-through", !st && picked !== null && "opacity-50")}
            >
              {o}
              {st === "correct" && <span className="sr-only"> (answer)</span>}
              {st === "wrong" && <span className="sr-only"> (your pick)</span>}
            </Button>
          )
        })}
      </div>
      <div role="status">
        {q && picked !== null && <Feedback mode={mode} q={q} picked={picked} opts={opts} />}
      </div>
    </div>
  )
}

/** Your weakest answers in this quiz, and the switch that makes questions favor them. */
export function WeakSpots({ detail, focus, setFocus, id, fmt = (k) => k }: { detail?: Record<string, { right: number; total: number }>; focus: boolean; setFocus: (v: boolean) => void; id: string; fmt?: (k: string) => string }) {
  const weak = weakSpots(detail).slice(0, 4)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Switch id={id} checked={focus} onCheckedChange={setFocus} />
        <Label htmlFor={id} className="font-normal">Focus on weak spots</Label>
      </div>
      <span className="text-muted-foreground">
        {weak.length ? <>Weakest: {weak.map((w) => `${fmt(w.key)} (${Math.round(w.acc * 100)}%)`).join(", ")}</> : "No weak spots yet. Answer a few more to find them."}
      </span>
    </div>
  )
}

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]

/** A small keyboard with the question's notes filled in. */
function NoteKeys({ notes, label }: { notes: number[]; label: string }) {
  const lo = Math.floor(Math.min(...notes) / 12) * 12, n = Math.max(...notes) - lo < 12 ? 12 : 24
  const whites: number[] = [], blacks: { m: number; at: number }[] = []
  for (let m = lo; m < lo + n; m++) [1, 3, 6, 8, 10].includes(m % 12) ? blacks.push({ m, at: whites.length }) : whites.push(m)
  return (
    <div className="relative flex h-16 w-full max-w-sm" role="img" aria-label={label}>
      {whites.map((m) => <span key={m} className={cn("flex flex-1 items-end justify-center border border-l-0 border-pad-edge pb-1 text-[10px] first:border-l", notes.includes(m) ? "bg-[var(--s5)] font-semibold text-white" : "bg-card")}>{notes.includes(m) ? NAMES[m % 12] : ""}</span>)}
      {blacks.map(({ m, at }) => <span key={m} className={cn("absolute top-0 z-10 flex h-[58%] -translate-x-1/2 items-end justify-center pb-0.5 text-[9px]", notes.includes(m) ? "bg-[var(--s5)] font-semibold text-white" : "bg-[var(--key-black)]")} style={{ left: `${(at / whites.length) * 100}%`, width: `${60 / whites.length}%` }}>{notes.includes(m) ? NAMES[m % 12] : ""}</span>)}
    </div>
  )
}

/** After an answer: right or wrong, what the answer looks like, and a way to hear your pick next to it. */
function Feedback({ mode, q, picked, opts }: { mode: Mode; q: Question; picked: number; opts: string[] }) {
  const right = picked === q.a
  const notesOf = (a: number) => (mode === "chords" ? QUALS[a][1].map((x) => q.base + x) : [q.base, q.base + a + 1])
  const compare = () => toggle("ear-compare", 6, (c, bus, t) => {
    ;[notesOf(picked), notesOf(q.a)].forEach((ns, k) => ns.forEach((n) => tone(c, bus, t + k * 1.3, n, 1, KEYS)))
    return 2.6
  })
  let detail: React.ReactNode = null
  if (mode === "chords" || mode === "intervals") {
    const ns = notesOf(q.a), gaps = ns.slice(1).map((n, i) => n - ns[i])
    detail = (
      <div className="space-y-2">
        <NoteKeys notes={ns} label={`${opts[q.a]}: ${ns.map((n) => NAMES[n % 12]).join(", ")}`} />
        <p className="text-muted-foreground text-sm">{mode === "chords" ? `Stacked ${gaps.join(" + ")} semitones from the root.` : `${gaps[0]} ${gaps[0] === 1 ? "semitone" : "semitones"} apart.`}</p>
      </div>
    )
  } else if (mode === "degrees") {
    const T = theory(q.root, "major")
    detail = (
      <ol className="grid max-w-sm grid-cols-7 gap-1" aria-label={`Degree ${q.a + 1} of ${T.names[0]} major is ${T.names[q.a]}`}>
        {T.names.map((nm, i) => <li key={i} className={cn("grid place-items-center border py-1.5 text-xs leading-tight", i === q.a ? "border-transparent bg-[var(--s5)] font-semibold text-white" : "border-foreground/20")}><b className="text-sm">{i + 1}</b>{nm}</li>)}
      </ol>
    )
  } else if (mode === "progressions") {
    const p = PROGS[q.extra!], T = theory(q.root, p.minor ? "minor" : "major")
    detail = <p className="text-sm">In {T.names[0]} {p.minor ? "minor" : "major"}: {p.d.map((d) => `${T.chords[d].roman} ${T.chords[d].name}`).join(" → ")}</p>
  }
  return (
    <div className={cn("animate-[fade-in_200ms_ease-out] space-y-3 border-t-2 pt-3", right ? "border-[var(--s3)]" : "border-destructive")}>
      <p className="text-sm"><span className="mr-2 text-lg font-medium">{right ? "Right." : "Not quite."}</span>{right ? `That was ${opts[q.a]}.` : `You picked ${opts[picked]}; it was ${opts[q.a]}.`}</p>
      {detail}
      {!right && (mode === "chords" || mode === "intervals") && <Button variant="outline" size="sm" onClick={compare}><Play className="size-3 fill-current" />Hear yours, then the answer</Button>}
    </div>
  )
}
