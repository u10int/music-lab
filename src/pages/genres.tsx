import { ArrowLeft, PencilRuler, Repeat } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { DrumPatterns } from "@/components/labs/drum-lab"
import { SoundCard } from "@/components/labs/genre-sounds"
import { Block, Caption, PageHeader } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { genreInfo, GENRE_INFO } from "@/data/genres"
import { FAMILIES, PATTERNS } from "@/data/patterns"
import { uid, update, useProgress, type TrackPlan } from "@/lib/store"

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

export function GenresPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Genres">What makes each style sound like itself: tempo, drums, chords, structure and who to listen to. Each page gathers that genre’s drum patterns and sounds, and can start a loop or a track plan for it.</PageHeader>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GENRE_INFO.map((g) => {
          const pats = PATTERNS.filter((p) => p.family === g.id).length, sounds = GENRE_SOUNDS.filter((s) => s.family === g.id).length
          return (
            <li key={g.id}>
              <Link to={`/genres/${g.id}`} className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-[background-color] duration-150 hover:bg-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-sans text-base font-semibold tracking-normal">{famName(g.id)}</h2>
                  <span className="text-muted-foreground shrink-0 text-sm tabular-nums">{g.tempo[0]}–{g.tempo[1]} BPM</span>
                </div>
                <p className="text-muted-foreground line-clamp-3 text-sm text-pretty">{g.blurb}</p>
                <p className="text-muted-foreground mt-auto pt-1 text-xs">{pats} drum {pats === 1 ? "pattern" : "patterns"} · {sounds} {sounds === 1 ? "sound" : "sounds"}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
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
      <Block title="Related genres">
        <div className="flex flex-wrap gap-2">
          {g.near.map((n) => <Button key={n} variant="outline" size="sm" asChild><Link to={`/genres/${n}`}>{famName(n)}</Link></Button>)}
        </div>
        <Caption>The loop builder borrows sounds from these when {famName(g.id).toLowerCase()} has none for a part.</Caption>
      </Block>
    </div>
  )
}
