import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ExternalLink, Flag, Pause, PencilRuler, Play, Plus, RotateCcw, Search, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { Block, Caption, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AudioUpload, Suggestions, TrackPlayer } from "@/components/notebook/track-audio"
import { ROOTS } from "@/data/labs"
import { deleteProofFile } from "@/lib/proofs"
import { fmtDay, getProgress, safeUrl, todayISO, uid, update, usePref, useProgress, type RefMarker, type RefNote, type TrackPlan } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAMES = ["Intro", "Verse", "Build", "Drop", "Breakdown", "Chorus", "Bridge", "Break", "Outro"]
const mmss = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0") + "." + Math.floor((t % 1) * 10)
function parseTime(s: string) {
  const m = s.trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
  return m ? (m[1] ? +m[1] * 60 : 0) + +m[2] : null
}
/** Bars from the start, with the first downbeat at 0:00. */
const barAt = (t: number, tempo: number) => (t * (tempo || 120)) / 240
const blank = (): RefNote => ({ id: uid(), title: "", artist: "", url: "", tempo: 0, date: todayISO(), notes: "", markers: [] })

/** Sections between markers, rounded to whole bars. Lengths snap to multiples of 4 when they're close. */
function sectionsOf(n: RefNote, end?: number) {
  const ms = [...n.markers].sort((a, b) => a.t - b.t)
  return ms.map((m, i) => {
    const next = ms[i + 1]?.t ?? end
    const raw = next === undefined ? null : barAt(next, n.tempo) - barAt(m.t, n.tempo)
    const snapped = raw === null ? null : Math.abs(raw - Math.round(raw / 4) * 4) < 0.75 ? Math.max(4, Math.round(raw / 4) * 4) : Math.max(1, Math.round(raw))
    return { m, startBar: Math.round(barAt(m.t, n.tempo)) + 1, bars: snapped }
  })
}

function TapTimer({ onMark }: { onMark: (t: number) => void }) {
  const [running, setRunning] = useState(false)
  const [base, setBase] = useState(0)
  const [now, setNow] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const elapsed = running ? base + (now - startAt) / 1000 : base
  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => { setNow(performance.now()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])
  const live = useRef({ running, elapsed, onMark })
  useEffect(() => {
    live.current = { running, elapsed, onMark }
  })
  const toggleRun = () => {
    if (running) { setBase(elapsed); setRunning(false) }
    else { const t = performance.now(); setStartAt(t); setNow(t); setRunning(true) }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code !== "Space" || tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || (e.target as HTMLElement)?.getAttribute("role") === "combobox") return
      if (!live.current.running) return
      e.preventDefault()
      live.current.onMark(live.current.elapsed)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div className="flex flex-wrap items-center gap-3 border bg-card p-4">
      <output className="min-w-24 text-stat font-medium tabular-nums" aria-label="Time listened">{mmss(elapsed)}</output>
      <Button variant="outline" onClick={toggleRun}>{running ? <Pause /> : <Play className="fill-current" />}{running ? "Pause" : elapsed ? "Resume" : "Start"}</Button>
      <Button onClick={() => onMark(elapsed)} disabled={!running && !elapsed}><Flag />Mark a section</Button>
      <Button variant="ghost" size="sm" disabled={running || !elapsed} onClick={() => setBase(0)}><RotateCcw />Reset</Button>
      <Caption className="basis-full">Press Start when you press play on the track, then tap Space (or the button) each time a new section begins. Start right on the first beat so the bar numbers line up.</Caption>
    </div>
  )
}

function MarkerRow({ m, startBar, bars, onChange, onDelete }: { m: RefMarker; startBar: number; bars: number | null; onChange: (p: Partial<RefMarker>) => void; onDelete: () => void }) {
  const [time, setTime] = useState(mmss(m.t))
  return (
    <li className="grid gap-2 p-3 sm:grid-cols-[5.5rem_9rem_7rem_minmax(0,1fr)_auto] sm:items-center">
      <Input aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} onBlur={() => { const t = parseTime(time); if (t !== null) onChange({ t }); else setTime(mmss(m.t)) }} className="h-8 tabular-nums" />
      <Input aria-label="Section name" list="nb-names" value={m.label} onChange={(e) => onChange({ label: e.target.value })} className="h-8" />
      <Select value={String(m.energy)} onValueChange={(v) => onChange({ energy: +v })}>
        <SelectTrigger size="sm" aria-label="Energy" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{Array.from({ length: 10 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>Energy {i + 1}</SelectItem>)}</SelectContent>
      </Select>
      <Input aria-label="What happens here" placeholder="What changes here" value={m.note} onChange={(e) => onChange({ note: e.target.value })} className="h-8" />
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">Bar {startBar}{bars !== null ? ` · ${bars} bars` : ""}</span>
        <Button variant="ghost" size="sm" aria-label={`Delete ${m.label || "marker"}`} onClick={onDelete}><Trash2 /></Button>
      </div>
    </li>
  )
}

const isEmpty = (x: RefNote) => !(x.title.trim() || x.artist.trim() || x.url.trim() || x.notes.trim() || x.audio || x.markers.length || x.comments?.length)
const keyLabel = (n: RefNote) => (n.key ? `${ROOTS[n.key.root]} ${n.key.minor ? "minor" : "major"}` : null)
const lengthOf = (n: RefNote) => (n.audio ? Math.floor(n.audio.analysis.duration / 60) + ":" + String(Math.floor(n.audio.analysis.duration % 60)).padStart(2, "0") : null)

/** A small waveform with section lines, or the section energy shape when there's no audio. */
function MiniShape({ n }: { n: RefNote }) {
  const a = n.audio?.analysis
  if (a) {
    const bars = 72
    const pk = Array.from({ length: bars }, (_, i) => Math.max(...a.peaks.slice(Math.floor((i * a.peaks.length) / bars), Math.max(Math.floor((i * a.peaks.length) / bars) + 1, Math.floor(((i + 1) * a.peaks.length) / bars)))))
    return (
      <div className="relative flex h-14 items-end gap-px" aria-hidden="true">
        {pk.map((v, i) => <span key={i} className="flex-1 bg-foreground/70" style={{ height: `${Math.max(4, v * 100)}%` }} />)}
        {n.markers.map((m) => <span key={m.id} className="absolute inset-y-0 w-px bg-background" style={{ left: `${(m.t / a.duration) * 100}%` }} />)}
      </div>
    )
  }
  const secs = sectionsOf(n)
  if (secs.length) {
    return (
      <div className="flex h-14 items-end gap-px" aria-hidden="true">
        {secs.map((s) => <span key={s.m.id} className="bg-foreground/70" style={{ flex: `${s.bars ?? 8} 1 0`, height: `${s.m.energy * 10}%` }} />)}
      </div>
    )
  }
  return <div className="text-muted-foreground grid h-14 place-items-center border border-dashed text-xs" aria-hidden="true">No audio or sections yet</div>
}

function RefCard({ n }: { n: RefNote }) {
  const key = keyLabel(n), len = lengthOf(n), notes = n.comments?.length ?? 0
  const stats: [string, string | null][] = [["Key", key], ["Tempo", n.tempo > 0 ? `${n.tempo} BPM` : null], ["Length", len]]
  return (
    <li>
      <Link to={`/notebook/${n.id}`} className="group flex h-full flex-col gap-4 border bg-card p-4 transition-[border-color] duration-150 hover:border-foreground focus-visible:border-foreground">
        <MiniShape n={n} />
        <div className="min-w-0 space-y-0.5">
          <h2 className="truncate font-semibold group-hover:underline">{n.title || "Untitled reference"}</h2>
          <p className="text-muted-foreground truncate text-sm">{n.artist || "Unknown artist"}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 border-t pt-3">
          {stats.map(([label, v]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className={cn("truncate text-sm tabular-nums", !v && "text-muted-foreground")}>{v ?? "–"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-auto text-xs">
          {n.markers.length} section{n.markers.length === 1 ? "" : "s"} · {notes} note{notes === 1 ? "" : "s"} · Added {fmtDay.format(new Date(n.date + "T00:00:00"))}
        </p>
      </Link>
    </li>
  )
}

/** All references as cards. */
export function NotebookPage() {
  const progress = useProgress()
  const navigate = useNavigate()
  const list = progress.notebook ?? []
  const [q, setQ] = useState("")
  const [sort, setSort] = usePref<"new" | "title" | "tempo">("nb-sort", "new")
  // References opened with "New reference" but never filled in are dropped, so they don't leave empty cards behind.
  useEffect(() => {
    if (getProgress().notebook?.some(isEmpty)) update((d) => { d.notebook = d.notebook.filter((x) => !isEmpty(x)) })
  }, [])
  const add = () => {
    const nn = blank()
    update((d) => { (d.notebook ??= []).unshift(nn) })
    navigate(`/notebook/${nn.id}`)
  }
  const shown = list
    .filter((x) => !q.trim() || `${x.title} ${x.artist} ${keyLabel(x) ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === "title" ? (a.title || "~").localeCompare(b.title || "~") : sort === "tempo" ? a.tempo - b.tempo : b.date.localeCompare(a.date)))

  return (
    <div className="space-y-8">
      <PageHeader title="Reference notebook" actions={<Button onClick={add}><Plus />New reference</Button>}>
        Study tracks you love. Add the audio and the notebook finds the tempo, key and sections, and you can pin notes to any moment. Then turn a track’s map into a plan for your own.
      </PageHeader>

      {!list.length ? (
        <div className="space-y-3 border bg-card p-6">
          <p className="font-semibold">No references yet</p>
          <Caption>Pick a track in the genre you’re working on, ideally one you’d like yours to sound next to in a DJ set.</Caption>
          <Button onClick={add}><Plus />Add your first reference</Button>
        </div>
      ) : (
        <>
          {list.length > 3 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input aria-label="Search references" placeholder="Search by title, artist or key" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger aria-label="Sort references" className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Newest first</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="tempo">Tempo</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">{shown.length} of {list.length}</span>
            </div>
          )}
          {shown.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((x) => <RefCard key={x.id} n={x} />)}</ul>
          ) : (
            <p className="text-sm">No references match “{q}”. <button type="button" className="underline" onClick={() => setQ("")}>Clear the search</button></p>
          )}
        </>
      )}
    </div>
  )
}

/** One reference, full width: details, audio and notes, sections, and the plan. */
export function NotebookTrackPage() {
  const { id } = useParams()
  const progress = useProgress()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const n = (progress.notebook ?? []).find((x) => x.id === id) ?? null
  const edit = (fn: (d: RefNote) => void) => update((d) => { const x = d.notebook?.find((y) => y.id === id); if (x) fn(x) })
  const mark = (t: number) => edit((d) => {
    const names = d.markers.map((x) => x.label)
    const guess = !d.markers.length ? "Intro" : NAMES.find((x) => !names.includes(x)) ?? "Section"
    d.markers.push({ id: uid(), t: Math.round(t * 10) / 10, label: guess, energy: 5, note: "" })
    d.markers.sort((a, b) => a.t - b.t)
  })
  if (!n) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild><Link to="/notebook"><ArrowLeft />All references</Link></Button>
        <p>This reference doesn’t exist any more.</p>
      </div>
    )
  }
  const makePlan = () => {
    const secs = sectionsOf(n)
    const sections = secs.map((s) => ({ id: uid(), name: s.m.label || "Section", bars: s.bars ?? 16, energy: s.m.energy }))
    const plan: TrackPlan = { title: `Based on ${n.title || "a reference"}`, tempo: n.tempo || 120, sections, lanes: ["Drums", "Bass", "Chords", "Lead", "FX"].map((name) => ({ id: uid(), name, fx: name === "FX", cells: {} })) }
    update((d) => { d.plan = plan })
    navigate("/planner")
  }
  const remove = () => {
    const path = n.audio?.path
    update((d) => { d.notebook = d.notebook.filter((x) => x.id !== n.id) })
    if (path) void deleteProofFile(path)
    navigate("/notebook")
  }
  const secs = sectionsOf(n)
  const totalBars = secs.reduce((a, s) => a + (s.bars ?? 0), 0)
  const url = safeUrl(n.url)
  const key = keyLabel(n)

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" asChild><Link to="/notebook"><ArrowLeft />All references</Link></Button>
        <PageHeader title={n.title || "New reference"}
          actions={!deleting
            ? <Button variant="ghost" onClick={() => setDeleting(true)}><Trash2 />Delete</Button>
            : <div className="flex items-center gap-2"><span className="text-sm">Delete this reference{n.audio ? " and its audio" : ""}?</span><Button variant="destructive" size="sm" onClick={remove}>Delete</Button><Button variant="ghost" size="sm" onClick={() => setDeleting(false)}>Cancel</Button></div>}>
          {[n.artist || null, key, n.tempo > 0 ? `${n.tempo} BPM` : null, lengthOf(n)].filter(Boolean).join(" · ") || "Add the title and artist, then the audio."}
        </PageHeader>
      </div>
      <datalist id="nb-names">{NAMES.map((x) => <option key={x} value={x} />)}</datalist>

      <Block title="Track">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,3fr)_8rem]">
          <div className="grid gap-1.5"><Label htmlFor="nb-title">Title</Label><Input id="nb-title" autoFocus={!n.title && !n.audio} value={n.title} onChange={(e) => edit((d) => { d.title = e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="nb-artist">Artist</Label><Input id="nb-artist" value={n.artist} onChange={(e) => edit((d) => { d.artist = e.target.value })} /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="nb-url">Link</Label>
            <div className="flex gap-2">
              <Input id="nb-url" placeholder="https://" value={n.url} onChange={(e) => edit((d) => { d.url = e.target.value })} />
              {url && <Button variant="outline" size="icon" asChild><a href={url} target="_blank" rel="noreferrer" aria-label="Open the track"><ExternalLink /></a></Button>}
            </div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="nb-tempo">Tempo (BPM)</Label><Input id="nb-tempo" type="number" inputMode="numeric" min={50} max={220} placeholder="120" value={n.tempo || ""} onChange={(e) => edit((d) => { d.tempo = Math.max(0, Math.round(+e.target.value) || 0) })} className="tabular-nums" /></div>
        </div>
        {!n.audio && <Caption>Not sure of the tempo? Add the audio below and the notebook will find it, or tap along in Live with the Tap Tempo button.</Caption>}
      </Block>

      <Block title="Listen" description={n.audio ? `${n.audio.name} · ${(n.audio.size / 1024 / 1024).toFixed(1)} MB` : "Add the audio to analyse it and pin notes to moments in the track."}
        actions={n.audio && (
          <div className="flex flex-wrap items-center gap-1">
            <AudioUpload n={n} edit={edit} compact />
            <Button variant="ghost" size="sm" onClick={() => { const path = n.audio!.path; edit((d) => { delete d.audio }); void deleteProofFile(path) }}><Trash2 />Remove audio</Button>
          </div>
        )}>
        {n.audio ? (
          <>
            <TrackPlayer key={n.id} n={n} edit={edit} onMark={mark} />
            <Suggestions n={n} edit={edit} />
          </>
        ) : <AudioUpload n={n} edit={edit} />}
      </Block>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Block title="Sections">
          {!n.audio && <TapTimer onMark={mark} />}
          {secs.length > 0 ? (
            <>
              <div className="flex h-20 items-end gap-0.5 border bg-card p-2" role="img" aria-label={`Energy across ${secs.length} sections`}>
                {secs.map((s) => (
                  <div key={s.m.id} className="flex h-full min-w-0 flex-col justify-end" style={{ flex: `${s.bars ?? 8} 1 0` }}>
                    <div className="bg-[var(--s5)]" style={{ height: `${s.m.energy * 10}%` }} />
                    <span className="text-muted-foreground mt-1 truncate text-[11px]">{s.m.label}</span>
                  </div>
                ))}
              </div>
              <ul className="divide-y border bg-card">
                {secs.map((s) => (
                  <MarkerRow key={s.m.id + ":" + s.m.t} m={s.m} startBar={s.startBar} bars={s.bars}
                    onChange={(p) => edit((d) => { const x = d.markers.find((y) => y.id === s.m.id); if (x) Object.assign(x, p); d.markers.sort((a, b) => a.t - b.t) })}
                    onDelete={() => edit((d) => { d.markers = d.markers.filter((y) => y.id !== s.m.id) })} />
                ))}
              </ul>
              <Caption>{totalBars ? `${totalBars} bars mapped. ` : ""}The last section has no length until you mark where the track ends: add one more marker at the end and name it “End”. Lengths close to a multiple of 4 snap to it, since sections almost always come in 4, 8, 16 or 32 bars.</Caption>
            </>
          ) : n.audio ? <Caption>Use the suggested sections above, or press M while it plays to mark where each section starts.</Caption> : null}
        </Block>

        <Block title="Takeaways">
          <Label htmlFor="nb-notes" className="sr-only">Takeaways</Label>
          <Textarea id="nb-notes" rows={10} placeholder="Sounds, mix moves and tricks worth stealing" value={n.notes} onChange={(e) => edit((d) => { d.notes = e.target.value })} />
          <div className="flex flex-wrap items-center gap-3">
            {!confirming ? (
              <Button disabled={!secs.length} onClick={() => (progress.plan ? setConfirming(true) : makePlan())}><PencilRuler />Make a track plan from this</Button>
            ) : (
              <>
                <span className="text-sm">This replaces your current track plan.</span>
                <Button variant="destructive" size="sm" onClick={makePlan}>Replace track plan</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
              </>
            )}
          </div>
          {!secs.length && <Caption>Map the sections first to turn this track’s shape into a plan for your own.</Caption>}
        </Block>
      </div>
    </div>
  )
}
