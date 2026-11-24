import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import { Block, Caption, PageHeader } from "@/components/page"
import { PracticeTimer } from "@/components/practice-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SPRINTS } from "@/data/sprints"
import { dueCards } from "@/lib/cards"
import { currentWeek, fmtMinutes, minutesByDay, sprintForWeek, streaks, todayISO, uid, update, usePref, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

const SLOT: Record<number, ["mon" | "mid" | "fri" | "wknd", string]> = { 1: ["mon", "Monday: learn"], 2: ["mid", "Practice day"], 3: ["mid", "Practice day"], 4: ["mid", "Practice day"], 5: ["fri", "Friday: reference"], 6: ["wknd", "Weekend: build"], 0: ["wknd", "Weekend: build"] }
const PLAN_MIN: Record<string, number> = { mon: 60, mid: 60, fri: 60, wknd: 150 }

export function TodayPage() {
  const p = useProgress()
  const today = todayISO()
  const cur = currentWeek(p)
  const si = sprintForWeek(cur.week), s = SPRINTS[si]
  const day = new Date().getDay()
  const [slot, slotName] = SLOT[day]
  const inPlan = cur.week >= 1 && cur.week <= 12
  const weekInSprint = inPlan ? (cur.week - 1) % 2 : 0
  const [checks, setChecks] = usePref<Record<string, boolean>>("today-" + today, {})
  const due = dueCards(p).length
  const minutes = minutesByDay(p).get(today) ?? 0
  const { current } = streaks(p)
  const [mins, setMins] = useState(""), [note, setNote] = useState(""), [logged, setLogged] = useState<string | null>(null)
  const nextSkills = s.skills.map((k, i) => ({ k, key: s.id + "-" + i })).filter((x) => !p.done[x.key]).slice(0, 2)

  const warmups: [string, string, string, string][] = [
    ["scale", "Play the week's scale and chords in the In Key layout", "/labs/theory", "Scales and chords"],
    ["drums", "Program a 1-bar drum pattern from memory, then delete it", "/labs/drums", "Pattern library"],
    ["cards", due ? `Review ${due} flashcard${due === 1 ? "" : "s"}` : "Flashcards: nothing due today", "/flashcards", "Flashcards"],
    ["ear", "Ten ear training questions", "/labs/ear", "Ear training"],
    ["timing", "Two minutes with the timing trainer", "/labs/timing", "Timing trainer"],
  ]
  const doneCount = warmups.filter(([k]) => checks[k]).length

  const log = (e: React.FormEvent) => {
    e.preventDefault()
    const m = Math.round(Number(mins))
    if (!m || m < 1 || m > 600) return
    update((d) => { d.sessions.push({ id: uid(), date: today, minutes: m, focus: `Sprint ${s.n}: ${s.short}`, note: note.trim() }) })
    setLogged(`Logged ${fmtMinutes(m)}.`)
    setMins("")
    setNote("")
  }

  return (
    <div className="space-y-12" style={{ ["--c" as string]: `var(${s.c})` }}>
      <PageHeader title="Today">
        {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        {inPlan ? ` · Week ${cur.week}, Sprint ${s.n}` : cur.week < 1 ? " · The plan hasn't started yet" : " · The 12 weeks are done"}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">{slotName} · about {fmtMinutes(PLAN_MIN[slot])}</p>
            <p className="flex items-center gap-2 font-display text-xl font-bold"><span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--c)]" />Sprint {s.n}: {s.title}</p>
            <p className="text-lg text-pretty">{s.weeks[weekInSprint][slot]}</p>
            {day === 0 && <p className="text-sm">It's Sunday: export something, even 30 seconds, and <Link to="/exports" className="underline">log the export</Link>.</p>}
            <Link to={`/sprints/${s.n}`} className="inline-flex items-center gap-1.5 text-sm font-medium underline">Sprint details <ArrowRight className="size-4" /></Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-muted-foreground text-sm">Practiced today</p>
            <p className="font-display text-3xl font-extrabold tabular-nums">{fmtMinutes(minutes)}</p>
            <p className="text-muted-foreground text-sm">{current > 0 ? `${current}-day streak` : "Log a session to start a streak"}</p>
          </CardContent>
        </Card>
      </div>

      <Block title="Warm-up" description={`About 15 minutes. ${doneCount} of ${warmups.length} done.`}>
        <ul className="max-w-3xl divide-y border-y">
          {warmups.map(([k, text, to, label]) => (
            <li key={k} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-3">
                <Checkbox id={"w-" + k} checked={!!checks[k]} onCheckedChange={(v) => setChecks({ ...checks, [k]: v === true })} />
                <Label htmlFor={"w-" + k} className={cn("font-normal", checks[k] && "text-muted-foreground line-through")}>{text}</Label>
              </div>
              <Link to={to} className="text-sm whitespace-nowrap underline">{label}</Link>
            </li>
          ))}
        </ul>
      </Block>

      {nextSkills.length > 0 && (
        <Block title="Skills to work toward" description="The next skills in this sprint, each with a step-by-step walkthrough. Check one off once you can do it without the steps.">
          <ul className="max-w-3xl space-y-3">
            {nextSkills.map(({ k, key }) => (
              <li key={key} className="flex items-start gap-3">
                <Checkbox id={"t-" + key} checked={!!p.done[key]} onCheckedChange={(v) => update((d) => { d.done[key] = v === true })} className="mt-0.5" />
                <Label htmlFor={"t-" + key} className="flex-1 leading-snug font-normal">{k}</Label>
                <Link to={`/sprints/${s.n}?skill=${key}`} className="text-sm whitespace-nowrap underline">{(p.skillSteps?.[key]?.length ?? 0) > 0 ? "Continue walkthrough" : "Walk through"}</Link>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Practice session" description="Start the timer when you sit down. Stopping it fills in the minutes below.">
        <PracticeTimer onStop={(m) => setMins(String(m))} />
        <form onSubmit={log} className="grid max-w-3xl items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
          <div className="grid gap-1.5"><Label htmlFor="td-min">Minutes</Label><Input id="td-min" type="number" inputMode="numeric" min={1} max={600} value={mins} onChange={(e) => setMins(e.target.value)} placeholder={String(PLAN_MIN[slot])} className="text-base tabular-nums sm:text-sm" /></div>
          <div className="grid gap-1.5"><Label htmlFor="td-note">What happened (optional)</Label><Input id="td-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What worked, what was slow, next question" autoComplete="off" className="text-base sm:text-sm" /></div>
          <Button type="submit" variant="outline" disabled={!Number(mins)}>Log session</Button>
        </form>
        {logged && <p className="text-sm" role="status">{logged} <Link to="/practice" className="underline">See the practice log</Link>.</p>}
        <Caption>Logged against Sprint {s.n}. Use the practice log to pick a different focus or date.</Caption>
      </Block>
    </div>
  )
}
