import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Link, useSearchParams } from "react-router"
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
import { currentWeek, fmtMinutes, isoOf, minutesByDay, minutesThisWeek, sprintForWeek, streaks, todayISO, uid, update, usePref, useProgress, weekOf, weekStart, WEEKLY_GOAL_MIN, type Progress as Prog } from "@/lib/store"
import { cn } from "@/lib/utils"

const SLOT: Record<number, ["mon" | "mid" | "fri" | "wknd", string]> = { 1: ["mon", "Monday: learn"], 2: ["mid", "Practice day"], 3: ["mid", "Practice day"], 4: ["mid", "Practice day"], 5: ["fri", "Friday: reference"], 6: ["wknd", "Weekend: build"], 0: ["wknd", "Weekend: build"] }
const PLAN_MIN: Record<string, number> = { mon: 60, mid: 60, fri: 60, wknd: 150 }

const longDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" })
const dayDone = (p: Prog, iso: string, mins: Map<string, number>) => !!p.daysDone?.[iso] || (mins.get(iso) ?? 0) >= PLAN_MIN[SLOT[new Date(iso + "T00:00:00").getDay()][0]]

/** The current sprint's 14 days: done, missed or still to come. Past days open so you can catch up. */
function SprintDays({ p, w1, sel, onPick }: { p: Prog; w1: number; sel: string; onPick: (iso: string) => void }) {
  const today = todayISO(), mins = minutesByDay(p)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = weekStart(p, w1)
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    return { iso, d, done: dayDone(p, iso, mins), future: iso > today, isToday: iso === today }
  })
  const missed = days.filter((x) => !x.future && !x.isToday && !x.done)
  return (
    <section aria-labelledby="days-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="days-h" className="text-sm font-medium">This sprint, day by day</h2>
        <p className="text-muted-foreground text-sm">
          {missed.length ? <>{missed.length} {missed.length === 1 ? "day" : "days"} to catch up. <button type="button" className="text-foreground underline" onClick={() => onPick(missed[missed.length - 1].iso)}>Open the latest</button></> : "Nothing missed so far."}
        </p>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:grid-cols-14">
        {days.map((x) => {
          const state = x.done ? "done" : x.future ? "upcoming" : x.isToday ? "today" : "missed"
          return (
            <li key={x.iso}>
              <button type="button" disabled={x.future} onClick={() => onPick(x.iso)} aria-current={x.iso === sel ? "date" : undefined}
                aria-label={`${longDay.format(x.d)}: ${state}`}
                className={cn("grid w-full gap-1 border px-1 py-2 text-center text-xs leading-tight tabular-nums transition-[background-color,border-color] duration-150 disabled:cursor-default",
                  x.iso === sel ? "border-foreground bg-foreground text-background" : x.done ? "border-transparent bg-[color-mix(in_oklab,var(--c)_22%,transparent)] hover:border-foreground" : state === "missed" ? "border-dashed border-foreground/50 hover:border-foreground" : x.future ? "border-transparent text-muted-foreground opacity-60" : "border-foreground/30 hover:border-foreground")}>
                <span>{x.d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className="text-base font-medium">{x.d.getDate()}</span>
                <span className="flex h-3.5 items-center justify-center" aria-hidden="true">
                  {x.done ? <Check className="size-3.5" /> : state === "missed" ? <span className="text-[10px]">Missed</span> : x.isToday ? <span className="text-[10px]">Today</span> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function TodayPage() {
  const p = useProgress()
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const asked = params.get("day")
  // A past day you're catching up on, or today.
  const sel = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today
  const isToday = sel === today
  const selDate = new Date(sel + "T00:00:00")
  const pick = (iso: string) => setParams((sp) => { if (iso === today) sp.delete("day"); else sp.set("day", iso); return sp })
  const cur = currentWeek(p)
  const week = isToday ? cur.week : weekOf(p, sel)
  const si = sprintForWeek(week), s = SPRINTS[si]
  const day = selDate.getDay()
  const [slot, slotName] = SLOT[day]
  const inPlan = week >= 1 && week <= 12
  const weekInSprint = inPlan ? (week - 1) % 2 : 0
  const [checks, setChecks] = usePref<Record<string, boolean>>("today-" + sel, {})
  const due = dueCards(p).length
  const minutesMap = minutesByDay(p)
  const minutes = minutesMap.get(sel) ?? 0
  const markedDone = !!p.daysDone?.[sel]
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
    update((d) => { d.sessions.push({ id: uid(), date: sel, minutes: m, focus: `Sprint ${s.n}: ${s.short}`, note: note.trim() }) })
    setLogged(`Logged ${fmtMinutes(m)}${isToday ? "" : ` on ${longDay.format(selDate)}`}.`)
    setMins("")
    setNote("")
  }

  const weekMin = minutesThisWeek(p)
  const plan = PLAN_MIN[slot]
  const minsRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-10" style={{ ["--c" as string]: `var(${s.c})` }}>
      <PageHeader title={isToday ? "Today" : "Catching up"}>
        {longDay.format(selDate)}
        {inPlan ? ` · Week ${week} of 12` : week < 1 ? " · The plan hasn't started yet" : " · The 12 weeks are done"}
        {!isToday && <> · <button type="button" className="text-foreground inline-flex items-center gap-1 underline" onClick={() => pick(today)}><ArrowLeft className="size-3.5" />Back to today</button></>}
      </PageHeader>

      {cur.week >= 1 && cur.week <= 12 && <SprintDays p={p} w1={sprintForWeek(cur.week) * 2 + 1} sel={sel} onPick={pick} />}

      <section aria-labelledby="focus-h" className="overflow-hidden rounded-2xl border bg-[color-mix(in_oklab,var(--c)_7%,var(--card))]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--c)]" />
              <Link to={`/sprints/${s.n}`} className="font-medium hover:underline">Sprint {s.n}: {s.title}</Link>
              <span className="text-muted-foreground">· {slotName}</span>
            </p>
            <h2 id="focus-h" className="font-display max-w-2xl text-2xl leading-tight font-medium text-balance sm:text-3xl">{s.weeks[weekInSprint][slot]}</h2>
            {day === 0 && isToday && <p className="text-sm">It’s Sunday: export something, even 30 seconds, and <Link to="/exports" className="underline">log the export</Link>, then do your <Link to="/review" className="underline">weekly review</Link>.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant={markedDone ? "default" : "outline"} size="sm" aria-pressed={markedDone} onClick={() => update((d) => { d.daysDone ??= {}; d.daysDone[sel] = !markedDone })}>
                <Check />{markedDone ? "Day marked done" : "Mark this day done"}
              </Button>
              {!isToday && <span className="text-muted-foreground text-sm">Sessions you log below count for {longDay.format(selDate)}.</span>}
            </div>
            <div className="pt-2"><PracticeTimer onStop={(m) => { setMins(String(m)); requestAnimationFrame(() => minsRef.current?.focus()) }} /></div>
          </div>
          <div className="flex items-center gap-5 lg:flex-col lg:gap-3">
            <Ring value={markedDone ? 1 : minutes / plan} size={132} stroke={11} label={`${minutes} of ${plan} planned minutes${isToday ? " today" : ""}`}>
              <div className="leading-tight">
                <p className="font-display text-2xl font-medium tabular-nums">{minutes}</p>
                <p className="text-muted-foreground text-xs">of {plan} min</p>
              </div>
            </Ring>
            <div className="space-y-0.5 text-sm lg:text-center">
              <p className="font-medium">{minutes >= plan || markedDone ? (isToday ? "Today’s plan is done" : "This day is done") : minutes ? `${plan - minutes} min to go` : `About ${fmtMinutes(plan)} planned`}</p>
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
        <Caption>Logged against Sprint {s.n} on {isToday ? "today" : longDay.format(selDate)}. Use the practice log to pick a different focus.</Caption>
      </Block>
    </div>
  )
}
