import { useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import { Block, Caption, PageHeader } from "@/components/page"
import { PracticeTimer } from "@/components/practice-timer"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Ring, WeekStrip } from "@/components/stats"
import { SKILL_GUIDES } from "@/data/skill-guides"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SPRINTS } from "@/data/sprints"
import { dueCards } from "@/lib/cards"
import { currentWeek, fmtMinutes, minutesByDay, minutesThisWeek, sprintForWeek, streaks, todayISO, uid, update, usePref, useProgress, WEEKLY_GOAL_MIN } from "@/lib/store"
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

  const weekMin = minutesThisWeek(p)
  const plan = PLAN_MIN[slot]
  const minsRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-10" style={{ ["--c" as string]: `var(${s.c})` }}>
      <PageHeader title="Today">
        {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        {inPlan ? ` · Week ${cur.week} of 12` : cur.week < 1 ? " · The plan hasn't started yet" : " · The 12 weeks are done"}
      </PageHeader>

      <section aria-labelledby="focus-h" className="overflow-hidden rounded-2xl border bg-[color-mix(in_oklab,var(--c)_7%,var(--card))]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--c)]" />
              <Link to={`/sprints/${s.n}`} className="font-medium hover:underline">Sprint {s.n}: {s.title}</Link>
              <span className="text-muted-foreground">· {slotName}</span>
            </p>
            <h2 id="focus-h" className="font-display max-w-2xl text-2xl leading-tight font-medium text-balance sm:text-3xl">{s.weeks[weekInSprint][slot]}</h2>
            {day === 0 && <p className="text-sm">It’s Sunday: export something, even 30 seconds, and <Link to="/exports" className="underline">log the export</Link>, then do your <Link to="/review" className="underline">weekly review</Link>.</p>}
            <div className="pt-2"><PracticeTimer onStop={(m) => { setMins(String(m)); requestAnimationFrame(() => minsRef.current?.focus()) }} /></div>
          </div>
          <div className="flex items-center gap-5 lg:flex-col lg:gap-3">
            <Ring value={minutes / plan} size={132} stroke={11} label={`${minutes} of ${plan} planned minutes today`}>
              <div className="leading-tight">
                <p className="font-display text-2xl font-medium tabular-nums">{minutes}</p>
                <p className="text-muted-foreground text-xs">of {plan} min</p>
              </div>
            </Ring>
            <div className="space-y-0.5 text-sm lg:text-center">
              <p className="font-medium">{minutes >= plan ? "Today’s plan is done" : minutes ? `${plan - minutes} min to go` : `About ${fmtMinutes(plan)} planned`}</p>
              <p className="text-muted-foreground">{current > 0 ? `${current}-day streak` : "Log a session to start a streak"}</p>
            </div>
          </div>
        </div>
      </section>

      <Block title="This week" description={`${fmtMinutes(weekMin)} of your ${fmtMinutes(WEEKLY_GOAL_MIN)} weekly goal. The dashed line is each day’s plan.`} actions={<Link to="/practice" className="text-sm underline">Practice log</Link>}>
        <WeekStrip p={p} />
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="warm-h" className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 id="warm-h" className="font-semibold">Warm-up</h2>
              <p className="text-muted-foreground text-sm">About 15 minutes before the main task.</p>
            </div>
            <span className="text-muted-foreground text-sm tabular-nums">{doneCount} of {warmups.length}</span>
          </div>
          <Progress value={(doneCount / warmups.length) * 100} aria-hidden="true" className="h-1.5 [&>div]:bg-[var(--c)]" />
          <ul className="-mx-2">
            {warmups.map(([k, text, to, label]) => (
              <li key={k} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60">
                <Checkbox id={"w-" + k} checked={!!checks[k]} onCheckedChange={(v) => setChecks({ ...checks, [k]: v === true })} />
                <Label htmlFor={"w-" + k} className={cn("flex-1 leading-snug font-normal", checks[k] && "text-muted-foreground line-through")}>{text}</Label>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild><Link to={to} aria-label={`Open ${label}`}><ArrowRight /></Link></Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="skills-h" className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 id="skills-h" className="font-semibold">Skills to work toward</h2>
              <p className="text-muted-foreground text-sm">Walk through the steps on Push, then tick it once it sticks.</p>
            </div>
            <Link to={`/sprints/${s.n}`} className="text-sm whitespace-nowrap underline">All skills</Link>
          </div>
          {nextSkills.length ? (
            <ul className="space-y-3">
              {nextSkills.map(({ k, key }) => {
                const g = SKILL_GUIDES[key], n = p.skillSteps?.[key]?.length ?? 0, total = g?.steps.length ?? 1
                return (
                  <li key={key} className="space-y-3 rounded-lg border p-3.5">
                    <div className="flex items-start gap-3">
                      <Checkbox id={"t-" + key} checked={!!p.done[key]} onCheckedChange={(v) => update((d) => { d.done[key] = v === true })} className="mt-0.5" />
                      <Label htmlFor={"t-" + key} className="flex-1 leading-snug font-medium">{k}</Label>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-7">
                      <Progress value={(n / total) * 100} aria-label={`${n} of ${total} steps`} className="h-1.5 min-w-16 flex-1 basis-20 [&>div]:bg-[var(--c)]" />
                      <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{n} of {total} steps{g ? ` · ${g.min} min` : ""}</span>
                      <Button size="sm" variant={n ? "default" : "outline"} asChild><Link to={`/sprints/${s.n}?skill=${key}`}>{n ? "Continue" : "Start"}</Link></Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm">Every skill in this sprint is ticked off. Focus on the deliverable: {s.goal}</p>
          )}
        </section>
      </div>

      <Block title="Log a session" description="Stopping the timer fills in the minutes. Sessions count toward your streak and weekly goal.">
        <form onSubmit={log} className="grid max-w-3xl items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
          <div className="grid gap-1.5"><Label htmlFor="td-min">Minutes</Label><Input ref={minsRef} id="td-min" type="number" inputMode="numeric" min={1} max={600} value={mins} onChange={(e) => setMins(e.target.value)} placeholder={String(plan)} className="text-base tabular-nums sm:text-sm" /></div>
          <div className="grid gap-1.5"><Label htmlFor="td-note">What happened (optional)</Label><Input id="td-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What worked, what was slow, next question" autoComplete="off" className="text-base sm:text-sm" /></div>
          <Button type="submit" disabled={!Number(mins)}>Log session</Button>
        </form>
        {logged && <p className="text-sm" role="status">{logged} <Link to="/practice" className="underline">See the practice log</Link>.</p>}
        <Caption>Logged against Sprint {s.n}. Use the practice log to pick a different focus or date.</Caption>
      </Block>
    </div>
  )
}
