import { useEffect, useRef, useState } from "react"
import { ExternalLink, Flag, Pause, PencilRuler, Play, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useNavigate } from "react-router"
import { Block, Caption, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fmtDay, safeUrl, todayISO, uid, update, useProgress, type RefMarker, type RefNote, type TrackPlan } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAMES = ["Intro", "Verse", "Build", "Drop", "Breakdown", "Chorus", "Bridge", "Break", "Outro"]
const mmss = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0") + "." + Math.floor((t % 1) * 10)
function parseTime(s: string) {
  const m = s.trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
  return m ? (m[1] ? +m[1] * 60 : 0) + +m[2] : null
}
/** Bars from the start, with the first downbeat at 0:00. */
const barAt = (t: number, tempo: number) => (t * tempo) / 240
const blank = (): RefNote => ({ id: uid(), title: "", artist: "", url: "", tempo: 124, date: todayISO(), notes: "", markers: [] })

/** Sections between markers, rounded-none to whole bars. Lengths snap to multiples of 4 when they're close. */
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
      <output className="font-display min-w-24 text-3xl font-medium tabular-nums" aria-label="Time listened">{mmss(elapsed)}</output>
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

export function NotebookPage() {
  const progress = useProgress()
  const navigate = useNavigate()
  const list = progress.notebook ?? []
  const [selId, setSelId] = useState<string | null>(list[0]?.id ?? null)
  const [confirming, setConfirming] = useState(false)
  const n = list.find((x) => x.id === selId) ?? null
  const edit = (fn: (d: RefNote) => void) => update((d) => { const x = d.notebook?.find((y) => y.id === selId); if (x) fn(x) })
  const add = () => {
    const nn = blank()
    update((d) => { (d.notebook ??= []).unshift(nn) })
    setSelId(nn.id)
  }
  const mark = (t: number) => edit((d) => {
    const names = d.markers.map((x) => x.label)
    const guess = !d.markers.length ? "Intro" : NAMES.find((x) => !names.includes(x)) ?? "Section"
    d.markers.push({ id: uid(), t: Math.round(t * 10) / 10, label: guess, energy: 5, note: "" })
    d.markers.sort((a, b) => a.t - b.t)
  })
  const makePlan = () => {
    if (!n) return
    const secs = sectionsOf(n)
    const sections = secs.map((s) => ({ id: uid(), name: s.m.label || "Section", bars: s.bars ?? 16, energy: s.m.energy }))
    const plan: TrackPlan = { title: `Based on ${n.title || "a reference"}`, tempo: n.tempo, sections, lanes: ["Drums", "Bass", "Chords", "Lead", "FX"].map((name) => ({ id: uid(), name, fx: name === "FX", cells: {} })) }
    update((d) => { d.plan = plan })
    navigate("/planner")
  }
  const secs = n ? sectionsOf(n) : []
  const totalBars = secs.reduce((a, s) => a + (s.bars ?? 0), 0)
  const url = n ? safeUrl(n.url) : ""

  return (
    <div className="space-y-10">
      <PageHeader title="Reference notebook" actions={<Button onClick={add}><Plus />New reference</Button>}>
        Study tracks you love. Tap where each section starts while you listen, label it and rate its energy, and the notebook turns the times into bars. Then turn the map into a track plan to build your own track on the same shape.
      </PageHeader>
      <datalist id="nb-names">{NAMES.map((x) => <option key={x} value={x} />)}</datalist>

      {!list.length ? (
        <div className="space-y-3 rounded-xl border bg-card p-6">
          <p className="font-medium">No references yet</p>
          <Caption>Pick a track in the genre you’re working on, ideally one you’d like yours to sound next to in a DJ set.</Caption>
          <Button onClick={add}><Plus />Add your first reference</Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <nav aria-label="References">
            <ul className="grid gap-1">
              {list.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setSelId(x.id)} aria-current={x.id === selId ? "true" : undefined}
                    className={cn("grid w-full gap-0.5 rounded-lg px-3 py-2 text-left transition-[background-color] duration-150 hover:bg-accent", x.id === selId && "bg-accent")}>
                    <span className="truncate text-sm font-medium">{x.title || "Untitled reference"}</span>
                    <span className="text-muted-foreground truncate text-xs">{x.artist || "Unknown artist"} · {x.markers.length} sections · {fmtDay.format(new Date(x.date + "T00:00:00"))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {n && (
            <div className="min-w-0 space-y-10">
              <Block title="Track">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5"><Label htmlFor="nb-title">Title</Label><Input id="nb-title" value={n.title} onChange={(e) => edit((d) => { d.title = e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label htmlFor="nb-artist">Artist</Label><Input id="nb-artist" value={n.artist} onChange={(e) => edit((d) => { d.artist = e.target.value })} /></div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="nb-url">Link</Label>
                    <div className="flex gap-2">
                      <Input id="nb-url" placeholder="https://" value={n.url} onChange={(e) => edit((d) => { d.url = e.target.value })} />
                      {url && <Button variant="outline" size="icon" asChild><a href={url} target="_blank" rel="noreferrer" aria-label="Open the track"><ExternalLink /></a></Button>}
                    </div>
                  </div>
                  <div className="grid gap-1.5"><Label htmlFor="nb-tempo">Tempo (BPM)</Label><Input id="nb-tempo" type="number" inputMode="numeric" min={50} max={220} value={n.tempo} onChange={(e) => edit((d) => { d.tempo = Math.max(1, +e.target.value || 0) })} className="tabular-nums" /></div>
                </div>
                <Caption>Not sure of the tempo? Tap along in Live with the Tap Tempo button, or search the track on a BPM database.</Caption>
              </Block>

              <Block title="Map the sections">
                <TapTimer onMark={mark} />
                {secs.length > 0 && (
                  <>
                    <div className="flex h-20 items-end gap-0.5 rounded-lg border bg-card p-2" role="img" aria-label={`Energy across ${secs.length} sections`}>
                      {secs.map((s) => (
                        <div key={s.m.id} className="flex h-full min-w-0 flex-col justify-end" style={{ flex: `${s.bars ?? 8} 1 0` }}>
                          <div className="rounded-none bg-[var(--s5)]" style={{ height: `${s.m.energy * 10}%` }} />
                          <span className="text-muted-foreground mt-1 truncate text-[11px]">{s.m.label}</span>
                        </div>
                      ))}
                    </div>
                    <ul className="divide-y rounded-xl border bg-card">
                      {secs.map((s) => (
                        <MarkerRow key={s.m.id + ":" + s.m.t} m={s.m} startBar={s.startBar} bars={s.bars}
                          onChange={(p) => edit((d) => { const x = d.markers.find((y) => y.id === s.m.id); if (x) Object.assign(x, p); d.markers.sort((a, b) => a.t - b.t) })}
                          onDelete={() => edit((d) => { d.markers = d.markers.filter((y) => y.id !== s.m.id) })} />
                      ))}
                    </ul>
                    <Caption>{totalBars ? `${totalBars} bars mapped. ` : ""}The last section has no length until you mark where the track ends: tap once more at the end and name it “End”. Lengths close to a multiple of 4 snap to it, since sections almost always come in 4, 8, 16 or 32 bars.</Caption>
                  </>
                )}
              </Block>

              <Block title="Notes">
                <Label htmlFor="nb-notes" className="sr-only">Notes</Label>
                <Textarea id="nb-notes" rows={5} placeholder="Sounds, mix moves and tricks worth stealing" value={n.notes} onChange={(e) => edit((d) => { d.notes = e.target.value })} />
              </Block>

              <div className="flex flex-wrap items-center gap-3 border-t pt-6">
                {!confirming ? (
                  <Button disabled={!secs.length} onClick={() => (progress.plan ? setConfirming(true) : makePlan())}><PencilRuler />Make a track plan from this</Button>
                ) : (
                  <>
                    <span className="text-sm">This replaces your current track plan.</span>
                    <Button variant="destructive" size="sm" onClick={makePlan}>Replace track plan</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
                  </>
                )}
                <Button variant="ghost" className="ml-auto" onClick={() => { update((d) => { d.notebook = d.notebook.filter((x) => x.id !== n.id) }); setSelId(list.find((x) => x.id !== n.id)?.id ?? null) }}><Trash2 />Delete reference</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
