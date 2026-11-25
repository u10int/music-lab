import { useEffect, useState } from "react"
import { ArrowLeft, PencilRuler, Play, Repeat, Square } from "lucide-react"
import { drum, KIND_OF, playNote } from "@/audio/engine"
import { playLoop } from "@/audio/loop-player"
import { useKey } from "@/components/key-picker"
import { PlayButton } from "@/components/play-button"
import { SCALES } from "@/data/labs"
import { buildLoop, defaultLoop } from "@/lib/loop"
import { theory } from "@/lib/theory"
import { bindTempo, setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { cn } from "@/lib/utils"
import { Link, useNavigate, useParams } from "react-router"
import { DrumPatterns } from "@/components/labs/drum-lab"
import { SoundCard } from "@/components/labs/genre-sounds"
import { FxLibrary } from "@/components/labs/fx-recipes"
import { Block, Caption, PageHeader, SECTION_TITLE } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { genreInfo, GENRE_INFO } from "@/data/genres"
import { FAMILIES, PATTERNS } from "@/data/patterns"
import { uid, update, useProgress, type LoopState, type TrackPlan } from "@/lib/store"

const famName = (f: string) => FAMILIES.find(([x]) => x === f)?.[1] ?? f
const SCALE_NAME: Record<string, string> = { minor: "Natural minor", major: "Major", dorian: "Dorian", phryg: "Phrygian", harm: "Harmonic minor" }

/** A simple outline in this genre's shape, for the track planner. */
function planFor(id: string): TrackPlan {
  const g = genreInfo(id)!
  const outline: [string, number, number][] = id === "ambient" || id === "dubtechno"
    ? [["Opening", 16, 2], ["Swell", 32, 5], ["Peak", 16, 7], ["Fade", 16, 2]]
    : ["phonk", "trap", "boombap", "lofi", "reggaeton", "ukg", "synthwave"].includes(id)
      ? [["Intro", 8, 3], ["Verse", 16, 5], ["Hook", 16, 8], ["Verse", 16, 5], ["Hook", 16, 9], ["Outro", 8, 3]]
      : [["Intro", 16, 3], ["Build", 8, 6], ["Drop", 16, 9], ["Breakdown", 16, 4], ["Build", 8, 7], ["Drop", 16, 10], ["Outro", 16, 3]]
  const sections = outline.map(([name, bars, energy]) => ({ id: uid(), name, bars, energy }))
  return {
    title: `My ${famName(id).toLowerCase()} track`,
    tempo: Math.round((g.tempo[0] + g.tempo[1]) / 2),
    sections,
    lanes: ["Drums", "Bass", "Chords", "Lead", "FX"].map((name) => ({ id: uid(), name, fx: name === "FX", cells: {} })),
  }
}

/** Families of genres, each with a color used across this page. */
const GROUPS: { id: string; name: string; color: string; members: string[] }[] = [
  { id: "wave", name: "Wave, phonk and trap", color: "var(--s6)", members: ["wave", "driftwave", "hardwave", "phonk", "trap", "futurebass"] },
  { id: "house", name: "House", color: "var(--s2)", members: ["house", "deephouse", "techhouse", "discohouse", "basshouse", "afrohouse", "prog"] },
  { id: "techno", name: "Techno and trance", color: "var(--s5)", members: ["techno", "minimal", "hardtechno", "dubtechno", "trance", "hardstyle"] },
  { id: "bass", name: "Bass, breaks and garage", color: "var(--s1)", members: ["dnb", "jungle", "dubstep", "ukg", "futuregarage", "breakbeat", "electro"] },
  { id: "chill", name: "Downtempo and beats", color: "var(--s4)", members: ["ambient", "odesza", "lofi", "boombap", "synthwave", "reggaeton"] },
]
const groupOf = (id: string) => GROUPS.find((g) => g.members.includes(id)) ?? GROUPS[0]
const BPM_MIN = 60, BPM_MAX = 180
const pct = (bpm: number) => ((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100

/** A tiny kick/snare/hat grid from the genre's first drum pattern. */
function PatternGlyph({ id, color }: { id: string; color: string }) {
  const pat = PATTERNS.find((p) => p.family === id)
  const now = usePos("genre-" + id)
  if (!pat) return <div className="h-[46px]" aria-hidden="true" />
  const rows = pat.rows.slice(0, 3)
  return (
    <div className="grid gap-[3px]" aria-hidden="true">
      {rows.map(([name, steps, ghost = []]) => (
        <div key={name} className="grid grid-cols-16 gap-[3px]">
          {Array.from({ length: 16 }, (_, i) => {
            const on = steps.includes(i + 1), soft = ghost.includes(i + 1)
            return <span key={i} className="h-3" data-ph={now % 16 === i || undefined} data-on={on || soft || undefined} style={{ background: on ? color : soft ? `color-mix(in oklab, ${color} 35%, transparent)` : "var(--pad-empty)" }} />
          })}
        </div>
      ))}
    </div>
  )
}

function playPattern(id: string) {
  const p = PATTERNS.find((x) => x.family === id)
  if (!p) return
  const len = p.length ?? 16, step = 60 / p.tempo / 4, total = Math.max(32, len), swing = (p.swing ?? 0) * step
  toggle("genre-" + id, total * step + 0.3, (c, bus, t) => {
    for (let k = 0; k < total; k++) {
      const s = (k % len) + 1, at = t + k * step + (k % 2 ? swing : 0)
      for (const [name, steps, ghost = []] of p.rows) {
        if (steps.includes(s)) drum(c, bus, at, KIND_OF[name], 1)
        else if (ghost.includes(s)) drum(c, bus, at, KIND_OF[name], 0.4)
      }
    }
  }, (el) => setPos(el < 0 ? -1 : Math.floor(el / step) % len))
}

/** A genre as a card: name, tempo, its beat as a glyph you can play, and a short description. */
function GenreCard({ id }: { id: string }) {
  const playing = usePlayingId()
  const g = genreInfo(id)!, color = groupOf(id).color
  const pats = PATTERNS.filter((p) => p.family === id).length, sounds = GENRE_SOUNDS.filter((s) => s.family === id).length
  const on = playing === "genre-" + id
  return (
    <li className="relative flex flex-col gap-4 border-r border-b p-5 transition-[background-color] duration-150 hover:bg-muted/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-medium">
            <Link to={`/genres/${id}`} className="after:absolute after:inset-0 hover:underline">{famName(id)}</Link>
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm tabular-nums">{g.tempo[0]}–{g.tempo[1]} BPM · {SCALE_NAME[g.scale]}</p>
        </div>
        {pats > 0 && (
          <Button type="button" variant="outline" size="icon-sm" aria-pressed={on} aria-label={on ? `Stop the ${famName(id)} beat` : `Play a ${famName(id)} beat`}
            onClick={() => playPattern(id)} className={cn("relative z-10 shrink-0", on && "border-transparent bg-[#23782b] text-white hover:bg-[#1c6623] hover:text-white dark:bg-[#23782b] dark:hover:bg-[#1c6623]")}>
            {on ? <Square className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
          </Button>
        )}
      </div>
      <PatternGlyph id={id} color={color} />
      <p className="line-clamp-2 text-sm text-pretty">{g.blurb}</p>
      <p className="text-muted-foreground mt-auto text-xs">{g.artists.slice(0, 3).join(", ")} · {pats} {pats === 1 ? "pattern" : "patterns"} · {sounds} {sounds === 1 ? "sound" : "sounds"}</p>
    </li>
  )
}

export function GenresPage() {
  const [group, setGroup] = useState<string>("all")
  const list = GENRE_INFO.filter((g) => group === "all" || groupOf(g.id).id === group)
  const byTempo = [...list].sort((a, b) => a.tempo[0] + a.tempo[1] - (b.tempo[0] + b.tempo[1]))
  return (
    <div className="space-y-12">
      <PageHeader title="Genres">31 styles of electronic music and what makes each one sound like itself: tempo, drums, chords, structure and who to listen to. Each page gathers that genre’s drum patterns and sounds.</PageHeader>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by family">
        {[{ id: "all", name: "All genres", color: "var(--foreground)" }, ...GROUPS].map((g) => (
          <button key={g.id} type="button" onClick={() => setGroup(g.id)} aria-pressed={group === g.id}
            className={cn("inline-flex h-8 items-center gap-2 border px-3 text-sm transition-[background-color,color] duration-150", group === g.id ? "border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground")}>
            {g.id !== "all" && <span aria-hidden="true" className="size-2.5" style={{ background: g.color }} />}
            {g.name}
          </button>
        ))}
      </div>

      <section aria-labelledby="tempo-h" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="tempo-h" className={SECTION_TITLE}>Tempo map</h2>
          <p className="text-muted-foreground text-sm">Each bar is a genre’s usual tempo range. Click one to open it.</p>
        </div>
        <div className="border-t border-foreground">
          <div className="relative ml-36 h-7 sm:ml-44" aria-hidden="true">
            {[60, 80, 100, 120, 140, 160, 180].map((b) => (
              <span key={b} className="text-muted-foreground absolute top-1.5 -translate-x-1/2 text-xs tabular-nums first:translate-x-0 last:-translate-x-full" style={{ left: `${pct(b)}%` }}>{b}</span>
            ))}
          </div>
          <ol className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-36 sm:left-44">
              {[80, 100, 120, 140, 160].map((b) => <span key={b} className="absolute inset-y-0 w-px bg-border" style={{ left: `${pct(b)}%` }} />)}
            </div>
            {byTempo.map((g) => {
              const c = groupOf(g.id).color
              return (
                <li key={g.id}>
                  <Link to={`/genres/${g.id}`} className="group relative flex h-7 items-center hover:bg-muted">
                    <span className="w-36 shrink-0 truncate pr-3 text-sm group-hover:underline sm:w-44">{famName(g.id)}</span>
                    <span className="relative h-full flex-1">
                      <span className="absolute top-1/2 h-3 -translate-y-1/2" style={{ left: `${pct(g.tempo[0])}%`, width: `${Math.max(1, pct(g.tempo[1]) - pct(g.tempo[0]))}%`, background: c }} />
                      <span className={cn("text-muted-foreground absolute top-1/2 -translate-y-1/2 text-xs whitespace-nowrap tabular-nums", pct(g.tempo[1]) > 70 ? "pr-2" : "pl-2")}
                        style={pct(g.tempo[1]) > 70 ? { right: `${100 - pct(g.tempo[0])}%` } : { left: `${pct(g.tempo[1])}%` }}>{g.tempo[0]}–{g.tempo[1]}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {GROUPS.filter((gr) => group === "all" || gr.id === group).map((gr) => (
        <section key={gr.id} aria-labelledby={"g-" + gr.id} className="space-y-4">
          <h2 id={"g-" + gr.id} className={cn(SECTION_TITLE, "flex items-center gap-3 border-t border-foreground pt-3")}>
            <span aria-hidden="true" className="size-3" style={{ background: gr.color }} />{gr.name}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">{gr.members.length}</span>
          </h2>
          <ul className="grid border-t border-l sm:grid-cols-2 xl:grid-cols-3">
            {gr.members.map((id) => <GenreCard key={id} id={id} />)}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** What the genre page's loop reads on each tick, kept outside the component so it survives a page change. */
const heroLive: { current: { loop: LoopState; events: ReturnType<typeof buildLoop> } | null } = { current: null }
const LANES: { name: string; test: (lane: string) => boolean }[] = [
  { name: "Kick", test: (l) => l === "kick" },
  { name: "Snare", test: (l) => ["snare", "clap", "rim", "tom", "cowbell"].includes(l) },
  { name: "Hats", test: (l) => ["hat", "ohat", "shaker", "ride"].includes(l) },
]

/** A half-circle tempo dial from 60 to 180 BPM with the genre's range marked. Drag it or use the arrow keys. */
function TempoDial({ value, range, color, onChange }: { value: number; range: [number, number]; color: string; onChange: (v: number) => void }) {
  const W = 240, cx = 120, cy = 124, R = 100
  const ang = (bpm: number) => Math.PI * (1 - (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN))
  const pt = (bpm: number, r = R) => [cx + r * Math.cos(ang(bpm)), cy - r * Math.sin(ang(bpm))]
  const arc = (a: number, b: number, r = R) => {
    const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r)
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * (W + 28) - 14 - cx, y = cy - ((e.clientY - r.top) / r.height) * 140
    const a = Math.atan2(Math.max(0, y), x)
    onChange(Math.round(BPM_MIN + (1 - a / Math.PI) * (BPM_MAX - BPM_MIN)))
  }
  const [nx, ny] = pt(value, R - 18)
  return (
    <svg viewBox={`-14 0 ${W + 28} 140`} className="w-full max-w-[280px] cursor-pointer touch-none outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      role="slider" tabIndex={0} aria-label="Tempo" aria-valuemin={BPM_MIN} aria-valuemax={BPM_MAX} aria-valuenow={value} aria-valuetext={`${value} BPM`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e) }}
      onKeyDown={(e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0
        if (!d) return
        e.preventDefault()
        onChange(Math.max(BPM_MIN, Math.min(BPM_MAX, value + d * (e.shiftKey ? 5 : 1))))
      }}>
      <path d={arc(BPM_MIN, BPM_MAX)} fill="none" stroke="var(--border)" strokeWidth={10} />
      <path d={arc(range[0], range[1])} fill="none" stroke={color} strokeWidth={10} />
      {[60, 90, 120, 150, 180].map((b) => {
        const [x, y] = pt(b, R + 14)
        return <text key={b} x={x} y={y + 4} textAnchor="middle" className="vtext" style={{ fontSize: 11 }}>{b}</text>
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--foreground)" strokeWidth={3} />
      <rect x={cx - 5} y={cy - 5} width={10} height={10} fill="var(--foreground)" />
    </svg>
  )
}

/** The top of a genre page: its loop playing in your key, a tempo dial, the chords lighting bar by bar and the beat. */
function GenreHero({ id }: { id: string }) {
  const g = genreInfo(id)!, color = groupOf(id).color
  const { root } = useKey()
  const iv = (SCALES.find((x) => x.id === g.scale) ?? SCALES[0]).iv
  const T = theory(root, g.scale)
  const pid = "genre-loop-" + id
  const playing = usePlayingId() === pid
  const [tempo, setTempo] = useState(() => (playing && heroLive.current ? heroLive.current.loop.tempo : Math.round((g.tempo[0] + g.tempo[1]) / 4) * 2))
  const loop: LoopState = { ...defaultLoop(id), tempo }
  const events = buildLoop(loop, root, iv)
  const step = usePos(pid)
  // While this loop plays, it follows the dial.
  useEffect(() => {
    if (playing) heroLive.current = { loop, events }
  })
  const play = () => {
    heroLive.current = { loop, events }
    const queue: { s: number; at: number }[] = []
    let end = () => {}
    toggle(pid, 3600, (c, bus, t0) => {
      end = playLoop(c, bus, t0, () => heroLive.current!, (s, at) => {
        queue.push({ s, at })
        if (queue.length > 64) queue.shift()
      })
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.s
      setPos(cur)
    }, () => end())
    bindTempo(pid, {
      get: () => heroLive.current!.loop.tempo, min: BPM_MIN, max: BPM_MAX,
      set: (v) => { heroLive.current = { ...heroLive.current!, loop: { ...heroLive.current!.loop, tempo: v } }; setTempo(v) },
    })
  }
  const chord = (d: number) => {
    const pcs = T.chords[d].pcs
    pcs.forEach((pc, k) => playNote(48 + pc + (k && pc < pcs[0] ? 12 : 0), { wave: "sawtooth", cutoff: 1800, level: 0.12, env: { a: 0.01, d: 0.6, s: 0.4, r: 0.6 } }, 0.9))
  }
  const bar = step >= 0 ? Math.floor(step / 16) : -1
  const inRange = tempo >= g.tempo[0] && tempo <= g.tempo[1]
  return (
    <section aria-label={`Hear ${famName(id).toLowerCase()}`} className="grid border-y border-foreground md:grid-cols-[auto_minmax(0,1fr)]" style={{ ["--c" as string]: color }}>
      <div className="flex flex-col items-center gap-3 border-b p-5 md:border-r md:border-b-0">
        <TempoDial value={tempo} range={g.tempo} color={color} onChange={setTempo} />
        <p className="-mt-1 text-center leading-tight">
          <span className="block text-stat-lg font-medium tabular-nums">{tempo}</span>
          <span className="text-muted-foreground text-xs">BPM · {inRange ? "in the usual range" : tempo < g.tempo[0] ? "slower than usual" : "faster than usual"}</span>
        </p>
        <PlayButton id={pid} label="Play the loop" primary onPlay={play} className="w-full" />
      </div>
      <div className="min-w-0 space-y-5 p-5">
        <h2 className={SECTION_TITLE}>Four bars in {T.names[0]} {SCALE_NAME[g.scale].toLowerCase()}</h2>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Chords: press one to hear it">
          {loop.prog.map((d, b) => (
            <button key={b} type="button" onClick={() => chord(d)}
              className={cn("grid gap-0.5 border px-3 py-2.5 text-left transition-[background-color,color,border-color] duration-100", bar === b ? "border-transparent bg-[var(--c)] text-[color:var(--on-accent)]" : "border-foreground/25 hover:border-foreground")}>
              <span className="text-lg leading-tight font-medium">{T.chords[d].roman}</span>
              <span className={cn("text-xs", bar === b ? "opacity-80" : "text-muted-foreground")}>{T.chords[d].name}</span>
            </button>
          ))}
        </div>
        <div className="space-y-1" aria-hidden="true">
          {LANES.map((lane) => {
            const on = new Set(events.hits.filter((h) => lane.test(h.lane)).map((h) => h.step))
            return (
              <div key={lane.name} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
                <span className="text-muted-foreground text-xs">{lane.name}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((b) => (
                    <div key={b} className="grid grid-cols-16 gap-px">
                      {Array.from({ length: 16 }, (_, j) => {
                        const i = b * 16 + j
                        return <span key={j} data-ph={step === i || undefined} data-on={on.has(i) || undefined} className="h-3" style={{ background: on.has(i) ? color : j % 4 === 0 ? "var(--border)" : "var(--pad-empty)" }} />
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-muted-foreground text-sm text-pretty">{playing ? "Turn the dial while it plays to hear how tempo changes the feel." : "The loop builder’s starting loop for this genre: its drums, bass, chords and lead."}</p>
      </div>
    </section>
  )
}

export function GenrePage() {
  const { id = "" } = useParams()
  const g = genreInfo(id)
  const progress = useProgress()
  const navigate = useNavigate()
  if (!g) return <p>There’s no page for that genre yet. <Link className="underline" to="/genres">See all genres</Link>.</p>
  const sounds = GENRE_SOUNDS.filter((s) => s.family === g.id)
  const hasDrums = PATTERNS.some((p) => p.family === g.id)
  const startPlan = () => {
    if (!progress.plan) update((d) => { d.plan = planFor(g.id) })
    navigate("/planner")
  }
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Link to="/genres" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"><ArrowLeft className="size-4" />All genres</Link>
        <PageHeader
          title={famName(g.id)}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link to={`/labs/loop-builder?genre=${g.id}`}><Repeat />Build a loop</Link></Button>
              <Button variant="outline" onClick={startPlan}><PencilRuler />{progress.plan ? "Open your track plan" : "Start a track plan"}</Button>
            </div>
          }
        >
          {g.blurb}
        </PageHeader>
      </div>

      <GenreHero key={g.id} id={g.id} />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <Block title="What to listen for">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{g.traits.map((t) => <li key={t} className="text-pretty">{t}</li>)}</ul>
        </Block>
        <dl className="grid content-start gap-4 text-sm sm:grid-cols-2">
          <div className="grid gap-1"><dt className="text-muted-foreground">Tempo</dt><dd className="font-medium tabular-nums">{g.tempo[0]}–{g.tempo[1]} BPM</dd></div>
          <div className="grid gap-1"><dt className="text-muted-foreground">A good scale to start in</dt><dd className="font-medium">{SCALE_NAME[g.scale]}</dd></div>
          <div className="grid gap-1 sm:col-span-2"><dt className="text-muted-foreground">Chords</dt><dd className="text-pretty">{g.chords}</dd></div>
          <div className="grid gap-1 sm:col-span-2"><dt className="text-muted-foreground">How tracks are laid out</dt><dd className="text-pretty">{g.arrangement}</dd></div>
          <div className="grid gap-1.5 sm:col-span-2">
            <dt className="text-muted-foreground">Artists to study</dt>
            <dd className="flex flex-wrap gap-1.5">{g.artists.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}</dd>
          </div>
        </dl>
      </div>

      {hasDrums && <Block title="Drum patterns"><DrumPatterns only={g.id} /></Block>}
      {sounds.length ? (
        <Block title="Sounds">
          <div className="grid gap-4 lg:grid-cols-2">{sounds.map((s) => <SoundCard key={s.id} s={s} />)}</div>
        </Block>
      ) : null}
      <Block title="Atmospheres, transitions and vocal effects" description={`The effects ${famName(g.id).toLowerCase()} producers use between and around the notes, over ${famName(g.id).toLowerCase()} drums.`}><FxLibrary only={g.id} /></Block>
      <Block title="Related genres">
        <ul className="grid border-t border-l sm:grid-cols-2 xl:grid-cols-3">{g.near.map((n) => <GenreCard key={n} id={n} />)}</ul>
        <Caption>The loop builder borrows sounds from these when {famName(g.id).toLowerCase()} has none for a part.</Caption>
      </Block>
    </div>
  )
}
