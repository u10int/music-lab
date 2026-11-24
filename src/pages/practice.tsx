import { useRef, useState } from "react"
import { Block, PageHeader } from "@/components/page"
import { PracticeTimer } from "@/components/practice-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SPRINTS } from "@/data/sprints"
import {
  currentWeek, fmtDay, fmtMinutes, isoOf, minutesByDay, minutesThisWeek, mondayOf, sprintForWeek, streaks, todayISO, uid, update,
  useProgress, WEEKLY_GOAL_MIN, type Session,
} from "@/lib/store"
import { cn } from "@/lib/utils"

const LAB_FOCUS = ["Scales and chords", "Ear training", "Play along", "Sound design", "Drums and sampling", "Step sequencer", "Arrangement", "Mixing", "Push practice", "Making a track", "Other"]

/** 12 weeks of days, Monday at the top, oldest week on the left. */
function Heatmap() {
  const p = useProgress()
  const byDay = minutesByDay(p)
  const end = mondayOf(new Date())
  const weeks = Array.from({ length: 12 }, (_, w) => {
    const mon = new Date(end)
    mon.setDate(mon.getDate() - (11 - w) * 7)
    return Array.from({ length: 7 }, (_, d) => {
      const x = new Date(mon)
      x.setDate(x.getDate() + d)
      return isoOf(x)
    })
  })
  const today = todayISO()
  const level = (m: number) => (m === 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4)
  const fill = ["", "bg-[color-mix(in_oklab,var(--s3)_30%,var(--card))]", "bg-[color-mix(in_oklab,var(--s3)_55%,var(--card))]", "bg-[color-mix(in_oklab,var(--s3)_80%,var(--card))]", "bg-[var(--s3)]"]
  const total = [...byDay.entries()].filter(([d]) => d >= weeks[0][0]).reduce((a, [, m]) => a + m, 0)
  return (
    <figure className="space-y-2">
      <div className="flex gap-2">
        <div className="text-muted-foreground grid grid-rows-7 gap-1 text-[10px] leading-none" aria-hidden="true">
          {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => <span key={i} className="flex h-4 items-center">{d}</span>)}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`Practice over the last 12 weeks: ${fmtMinutes(total)} in total`}>
          {weeks.flat().map((iso) => {
            const m = byDay.get(iso) ?? 0
            return <span key={iso} title={`${fmtDay.format(new Date(iso + "T00:00:00"))}: ${m ? fmtMinutes(m) : "no practice"}`} className={cn("size-4 rounded-none", iso > today ? "opacity-0" : m ? fill[level(m)] : "bg-pad-empty", iso === today && "outline-1 outline-offset-1 outline-foreground")} />
          })}
        </div>
      </div>
      <figcaption className="text-muted-foreground text-sm">Last 12 weeks. Darker squares are longer sessions: under 30 minutes, under an hour, under two, two or more.</figcaption>
    </figure>
  )
}

export function PracticePage() {
  const p = useProgress()
  const cur = SPRINTS[sprintForWeek(currentWeek(p).week)]
  const defFocus = `Sprint ${cur.n}: ${cur.short}`
  const [date, setDate] = useState(todayISO()), [minutes, setMinutes] = useState(""), [focus, setFocus] = useState(defFocus), [note, setNote] = useState("")
  const [err, setErr] = useState(false)
  const [undo, setUndo] = useState<{ item: Session; index: number } | null>(null)
  const minRef = useRef<HTMLInputElement>(null), undoRef = useRef<HTMLButtonElement>(null)
  const { current, longest } = streaks(p)
  const week = minutesThisWeek(p)
  const list = p.sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const since = isoOf(new Date(Date.now() - 30 * 86400000))
  const byFocus = Object.entries(p.sessions.filter((s) => s.date >= since).reduce<Record<string, number>>((a, s) => ({ ...a, [s.focus]: (a[s.focus] ?? 0) + s.minutes }), {})).sort((a, b) => b[1] - a[1])
  const maxFocus = byFocus[0]?.[1] ?? 1

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const m = Math.round(Number(minutes))
    if (!m || m < 1 || m > 600) { setErr(true); minRef.current?.focus(); return }
    update((d) => { (d.sessions ??= []).push({ id: uid(), date, minutes: m, focus, note: note.trim() }) })
    setMinutes(""); setNote(""); setErr(false); setUndo(null); setDate(todayISO())
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Practice log">Log each session, or run the timer while you practice. Streaks count days in a row with any practice.</PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1"><p className="text-muted-foreground text-sm">Current streak</p><p className="font-display text-3xl font-medium tabular-nums">{current} day{current === 1 ? "" : "s"}</p><p className="text-muted-foreground text-sm">Longest: {longest}</p></CardContent></Card>
        <Card><CardContent className="space-y-2"><p className="text-muted-foreground text-sm">This week</p><p className="font-display text-3xl font-medium tabular-nums">{fmtMinutes(week)}</p><Progress value={Math.min(100, (week / WEEKLY_GOAL_MIN) * 100)} aria-label="Weekly practice goal" /><p className="text-muted-foreground text-sm">Plan: about {WEEKLY_GOAL_MIN / 60} hours a week</p></CardContent></Card>
        <Card><CardContent className="space-y-1"><p className="text-muted-foreground text-sm">Sessions logged</p><p className="font-display text-3xl font-medium tabular-nums">{p.sessions.length}</p><p className="text-muted-foreground text-sm">{fmtMinutes(p.sessions.reduce((a, s) => a + s.minutes, 0))} in total</p></CardContent></Card>
      </div>

      <Block title="Timer"><PracticeTimer onStop={(m) => { setMinutes(String(m)); setDate(todayISO()); requestAnimationFrame(() => minRef.current?.focus()) }} /></Block>

      <Block title="Log a session">
        <form onSubmit={add} noValidate className="grid max-w-4xl items-start gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_7rem_minmax(0,14rem)_minmax(0,1fr)_auto]">
          <div className="grid gap-1.5"><Label htmlFor="pr-date">Date</Label><Input id="pr-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="pr-min">Minutes</Label>
            <Input ref={minRef} id="pr-min" type="number" inputMode="numeric" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="60" aria-invalid={err || undefined} aria-describedby={err ? "pr-min-err" : undefined} className="text-base tabular-nums sm:text-sm" />
            {err && <span id="pr-min-err" className="text-destructive text-sm">Enter minutes between 1 and 600.</span>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pr-focus">Focus</Label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger id="pr-focus" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup><SelectLabel>Sprints</SelectLabel>{SPRINTS.map((s) => { const v = `Sprint ${s.n}: ${s.short}`; return <SelectItem key={v} value={v}>{v}</SelectItem> })}</SelectGroup>
                <SelectGroup><SelectLabel>Labs and other</SelectLabel>{LAB_FOCUS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="pr-note">Note (optional)</Label><Input id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Swung hats at 58%, finally clicked" autoComplete="off" className="text-base sm:text-sm" /></div>
          <Button type="submit" className="sm:mt-[22px]">Log session</Button>
        </form>
      </Block>

      <Block title="Consistency"><Heatmap /></Block>

      {byFocus.length > 0 && (
        <Block title="Where the time went" description="Last 30 days.">
          <ul className="grid max-w-2xl gap-2 text-sm">
            {byFocus.map(([f, m]) => (
              <li key={f} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_5.5rem] items-center gap-3">
                <span className="truncate">{f}</span>
                <span className="h-2.5 rounded-sm bg-[var(--s3)]" style={{ width: `${(m / maxFocus) * 100}%` }} />
                <span className="text-muted-foreground text-right tabular-nums">{fmtMinutes(m)}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {undo && (
        <p className="text-sm" role="status">Removed the session from {fmtDay.format(new Date(undo.item.date + "T00:00:00"))}.{" "}
          <Button ref={undoRef} variant="link" className="h-auto p-0" onClick={() => { update((d) => { d.sessions.splice(undo.index, 0, undo.item) }); setUndo(null) }}>Undo</Button>
        </p>
      )}
      {list.length > 0 && (
        <Block title="Sessions">
          <ul className="max-w-3xl divide-y border-y">
            {list.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <div><span className="font-semibold">{fmtDay.format(new Date(s.date + "T00:00:00"))}</span><span className="text-muted-foreground"> · {fmtMinutes(s.minutes)} · {s.focus}</span></div>
                  {s.note && <div className="text-muted-foreground">{s.note}</div>}
                </div>
                <Button variant="ghost" size="sm" aria-label={`Remove session from ${fmtDay.format(new Date(s.date + "T00:00:00"))}`} onClick={() => {
                  const index = p.sessions.findIndex((x) => x.id === s.id)
                  update((d) => { d.sessions.splice(index, 1) })
                  setUndo({ item: s, index })
                  requestAnimationFrame(() => undoRef.current?.focus())
                }}>Remove</Button>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  )
}
