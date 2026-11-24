import { useEffect, useRef, useState } from "react"
import { ArrowRight, AudioWaveform, BookOpen, Drum, Ear, Grid2x2, Grid3x3, ListMusic, Metronome, Music2, Piano, Play, Scissors, SlidersHorizontal, Square, Check } from "lucide-react"
import { Link } from "react-router"
import { playLoop } from "@/audio/loop-player"
import { toggle, usePlayingId } from "@/audio/playback"
import { SignInPanel } from "@/components/account"
import { Button } from "@/components/ui/button"
import { GENRE_INFO, genreInfo } from "@/data/genres"
import { SCALES } from "@/data/labs"
import { FAMILIES } from "@/data/patterns"
import { buildLoop, defaultLoop } from "@/lib/loop"
import { cn } from "@/lib/utils"

const famName = (f: string) => FAMILIES.find(([x]) => x === f)?.[1] ?? f
const HERO_GENRES = ["wave", "phonk", "trance", "deephouse", "dnb", "futuregarage", "odesza", "techno"]
const ROWS: { name: string; color: string; test: (lane: string) => boolean }[] = [
  { name: "Kick", color: "var(--s1)", test: (l) => l === "kick" },
  { name: "Snare", color: "var(--s2)", test: (l) => ["snare", "clap", "rim", "tom", "cowbell"].includes(l) },
  { name: "Hats", color: "var(--s4)", test: (l) => ["hat", "ohat", "shaker", "ride"].includes(l) },
]
const ROOT = 9 // A

/** A Push-style pad grid that plays a genre loop and lights up in time. */
function HeroLoop() {
  const [genre, setGenre] = useState("wave")
  const [step, setStep] = useState(-1)
  const playing = usePlayingId() === "hero"
  const info = genreInfo(genre)!
  const iv = (SCALES.find((x) => x.id === info.scale) ?? SCALES[0]).iv
  const loop = defaultLoop(genre)
  const events = buildLoop(loop, ROOT, iv)
  const live = useRef({ loop, events })
  useEffect(() => {
    live.current = { loop, events }
  })

  const play = () => {
    const queue: { s: number; at: number }[] = []
    let stopClock = () => {}
    toggle("hero", 3600, (c, bus, t0) => {
      stopClock = playLoop(c, bus, t0, () => live.current, (s, at) => {
        queue.push({ s, at })
        if (queue.length > 64) queue.shift()
      })
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.s
      setStep(cur)
    }, () => {
      stopClock()
      setStep(-1)
    })
  }
  // Picking a genre starts it playing, once the new loop has rendered.
  const startAfterPick = useRef(false)
  const pick = (g: string) => {
    startAfterPick.current = !playing
    setGenre(g)
  }
  useEffect(() => {
    if (!startAfterPick.current) return
    startAfterPick.current = false
    play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre])

  // Show the bar that's playing (or bar 1), 16 steps per row.
  const bar = step >= 0 ? Math.floor(step / 16) : 0
  const col = step >= 0 ? step % 16 : -1
  const lit = (row: number, s: number) => {
    const i = bar * 16 + s
    if (row < 3) return events.hits.some((h) => h.step === i && ROWS[row].test(h.lane))
    return events.notes.some((n) => Math.floor(n.step) === i)
  }

  return (
    <div className="bg-[#121315] p-4 text-white ring-1 ring-white/10 sm:p-5" style={{ ["--s1" as string]: "#f0664f", ["--s2" as string]: "#f0aa33", ["--s4" as string]: "#2fb8ad", ["--s5" as string]: "#5b8ef0" }}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-white/60">
        <span className="tabular-nums">{famName(genre)} · {loop.tempo} BPM · A {info.scale === "major" ? "major" : info.scale === "dorian" ? "Dorian" : info.scale === "phryg" ? "Phrygian" : "minor"}</span>
        <span className="tabular-nums" aria-hidden="true">Bar {bar + 1} of 4</span>
      </div>
      <div className="grid gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="grid grid-cols-16 gap-1 sm:gap-1.5">
            {Array.from({ length: 16 }, (_, s) => {
              const on = lit(row, s), hit = on && s === col
              const color = row < 3 ? ROWS[row].color : "var(--s5)"
              return (
                <span key={s}
                  className={cn("aspect-square rounded-none transition-[background-color,box-shadow] duration-100", s % 4 === 0 ? "ring-1 ring-white/10" : "", !on && (s === col ? "bg-white/20" : "bg-white/[0.06]"))}
                  style={on ? { background: hit ? color : `color-mix(in oklab, ${color} 45%, transparent)`, boxShadow: hit ? `0 0 14px ${color}` : undefined } : undefined} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={play} size="lg" aria-pressed={playing} className="h-11 gap-2 bg-white px-5 text-base text-[#121315] hover:bg-white/90">
          {playing ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          {playing ? "Stop" : "Play a loop"}
        </Button>
        <span className="text-sm text-white/60">Drums, bass, chords and lead, made in your browser.</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Genre">
        {HERO_GENRES.map((g) => (
          <button key={g} type="button" onClick={() => pick(g)} aria-pressed={g === genre}
            className={cn("px-3 py-1 text-xs font-medium transition-[background-color,color] duration-150", g === genre ? "bg-white text-[#121315]" : "bg-white/10 text-white/80 hover:bg-white/20")}>
            {famName(g)}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Small decorative previews for the feature tiles ---------- */

function LoopArt() {
  const rows = [[0, 4, 8, 12], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 10, 14]]
  const colors = ["var(--s1)", "var(--s2)", "var(--s4)", "var(--s5)"]
  return (
    <svg viewBox="0 0 160 64" className="w-full" aria-hidden="true">
      {rows.map((r, y) => Array.from({ length: 16 }, (_, x) => (
        <rect key={y + "-" + x} x={x * 10 + 1} y={y * 16 + 2} width={8} height={12} rx={0} fill={r.includes(x) ? colors[y] : "var(--pad-empty)"} />
      )))}
    </svg>
  )
}
function MelodyArt() {
  const notes: [number, number, number][] = [[0, 3, 5], [3, 2, 4], [5, 2, 3], [8, 6, 1], [14, 2, 2], [16, 3, 5], [19, 2, 6], [21, 3, 4], [26, 6, 3]]
  return (
    <svg viewBox="0 0 160 64" className="w-full" aria-hidden="true">
      {[1, 3, 5].map((r) => <rect key={r} x={0} y={r * 8} width={160} height={8} fill="color-mix(in oklab, var(--s5) 10%, transparent)" />)}
      {notes.map(([s, l, r], i) => <rect key={i} x={s * 5 + 1} y={r * 8 + 1} width={l * 5 - 2} height={6} rx={0} fill={r % 2 ? "var(--s5)" : "var(--s2)"} />)}
    </svg>
  )
}
function ArrangeArt() {
  const secs = [16, 8, 16, 16, 8, 16, 12]
  const lanes = ["11100011", "0111011", "0010111", "1111111", "0011011"].map((x) => x.split("").map(Number))
  let x0 = 0
  const xs = secs.map((b) => { const x = x0; x0 += b; return x })
  const total = x0
  return (
    <svg viewBox="0 0 160 64" className="w-full" aria-hidden="true">
      {lanes.map((l, y) => secs.map((b, i) => l[i] ? <rect key={y + "-" + i} x={(xs[i] / total) * 160 + 1} y={y * 12 + 3} width={(b / total) * 160 - 2} height={9} rx={0} fill={y === 3 ? "color-mix(in oklab, var(--s5) 55%, var(--card))" : "var(--s5)"} /> : null))}
    </svg>
  )
}

const FEATURED: [string, string, string, () => React.ReactElement][] = [
  ["Loop builder", "/labs/loop-builder", "Pick a genre and get drums, bass, chords and a lead in your key. Swap parts, change chords, export MIDI or play it on your instruments in Live.", LoopArt],
  ["Melody", "/labs/melody", "Write a hook over chords with the chord tones shaded. Get a suggestion in a genre’s style, and feedback as you go.", MelodyArt],
  ["Arrangement", "/labs/arrangement", "See how tracks in each genre are laid out, hear it play section by section, and reshape it into your own plan.", ArrangeArt],
]
const MORE: [string, string, string, React.ComponentType<{ className?: string }>][] = [
  ["Chord progressions", "/labs/progressions", "Build and hear progressions", ListMusic],
  ["Step sequencer", "/labs/sequencer", "Drums and melody on a grid", Grid2x2],
  ["Sampler", "/labs/sampler", "Slice your own audio onto pads", Scissors],
  ["Sound design", "/labs/sound-design", "Playable genre sound recipes", AudioWaveform],
  ["Drums and sampling", "/labs/drums", "Drum patterns from 31 genres", Drum],
  ["Mixing", "/labs/mixing", "EQ ranges and sidechain", SlidersHorizontal],
  ["Scales and chords", "/labs/theory", "Keys, modes, circle of fifths", Music2],
  ["Play along", "/labs/play-along", "Scales and chords on Push", Piano],
  ["Ear training", "/labs/ear", "Chords, intervals, EQ by ear", Ear],
  ["Timing trainer", "/labs/timing", "Tighten your timing", Metronome],
  ["Live instruments and effects", "/instruments", "What each device does", BookOpen],
  ["Push 3", "/push", "Layouts, modes, shortcuts", Grid3x3],
]

/** The front page for visitors who aren't signed in. */
export function HomePage() {
  return (
    <div className="space-y-20 pb-6">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-12">
        <div className="space-y-6">
          <h1 className="font-display text-5xl leading-[1.04] font-medium text-balance xl:text-6xl">Learn Ableton Live, Push and music theory by making music</h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">Playable labs for beats, melodies, sound design and mixing, with guides to 31 electronic genres from wave and phonk to trance and drum and bass. It all runs in your browser and can send MIDI straight into Live.</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/labs/loop-builder">Open the loop builder<ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><a href="#account">Track your progress</a></Button>
          </div>
        </div>
        <HeroLoop />
      </section>

      <section className="space-y-6" aria-labelledby="h-make">
        <div className="max-w-2xl space-y-2">
          <h2 id="h-make" className="text-2xl font-medium sm:text-3xl">Make something in minutes</h2>
          <p className="text-muted-foreground text-pretty">Start from a genre, change what you like, and take it into Live as MIDI.</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURED.map(([name, to, desc, Art]) => (
            <li key={to}>
              <Link to={to} className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color] duration-150 hover:border-foreground/30">
                <div className="border-b bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))] px-5 py-6"><Art /></div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <span className="flex items-center justify-between gap-2 text-lg font-semibold">{name}<ArrowRight className="text-muted-foreground size-4 transition-transform duration-150 group-hover:translate-x-0.5" /></span>
                  <span className="text-muted-foreground text-sm text-pretty">{desc}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6" aria-labelledby="h-more">
        <div className="max-w-2xl space-y-2">
          <h2 id="h-more" className="text-2xl font-medium sm:text-3xl">Train your ears, hands and theory</h2>
          <p className="text-muted-foreground text-pretty">Short, playable lessons that connect what you hear to what you do on Push.</p>
        </div>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {MORE.map(([name, to, desc, Icon]) => (
            <li key={to}>
              <Link to={to} className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-3 transition-[background-color] duration-150 hover:bg-accent/60">
                <Icon className="text-muted-foreground size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{name}</span>
                  <span className="text-muted-foreground block truncate text-sm">{desc}</span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6" aria-labelledby="h-genres">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl space-y-2">
            <h2 id="h-genres" className="text-2xl font-medium sm:text-3xl">31 genres, each with its own sounds</h2>
            <p className="text-muted-foreground text-pretty">Tempo, drums, chord habits, structure and artists to study, plus playable drum patterns and sound recipes.</p>
          </div>
          <Button variant="outline" asChild><Link to="/genres">All genres<ArrowRight /></Link></Button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {GENRE_INFO.map((g) => (
            <li key={g.id}>
              <Link to={`/genres/${g.id}`} className="inline-flex items-baseline gap-2 border bg-card px-3.5 py-1.5 text-sm transition-[background-color] duration-150 hover:bg-accent">
                <span className="font-medium">{famName(g.id)}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{g.tempo[0]}–{g.tempo[1]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="account" aria-labelledby="h-account" className="scroll-mt-6 overflow-hidden rounded-3xl border bg-card">
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 id="h-account" className="text-2xl font-medium sm:text-3xl">Follow a plan, and see yourself improve</h2>
              <p className="text-muted-foreground max-w-xl text-pretty">A free account turns the labs into a 12-week course: six two-week sprints from driving Live with Push to mixing and finishing a track.</p>
            </div>
            <ul className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Today", "One focused task a day, a warm-up and a practice timer"],
                ["Skill walkthroughs", "Step-by-step tutorials to follow on Push"],
                ["Practice log and streaks", "Minutes per day against a weekly goal"],
                ["Flashcards", "Spaced repetition for Push, chords and effects"],
                ["Weekly review", "What went well, weak spots and next week’s goal"],
                ["Track plans", "Plan a track or map a reference you love"],
              ].map(([t, d]) => (
                <li key={t} className="space-y-0.5">
                  <p className="flex items-center gap-2 font-medium"><Check className="text-muted-foreground size-4" />{t}</p>
                  <p className="text-muted-foreground pl-6 text-pretty">{d}</p>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-sm">Your progress is private to you and syncs across devices.</p>
          </div>
          <div className="space-y-3 rounded-2xl border bg-background p-5">
            <p className="font-semibold">Sign in or create an account</p>
            <SignInPanel idPrefix="home" />
          </div>
        </div>
      </section>
    </div>
  )
}
