import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { Block, Caption, PageHeader, SECTION_TITLE } from "@/components/page"
import { dayPlan } from "@/data/days"
import { PracticeTimer } from "@/components/practice-timer"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Ring, WeekStrip } from "@/components/stats"
import { SKILL_GUIDES } from "@/data/skill-guides"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SPRINTS } from "@/data/sprints"
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
              <button type="button" onClick={() => onPick(x.iso)} aria-current={x.iso === sel ? "date" : undefined}
                aria-label={`${longDay.format(x.d)}: ${state}`}
                className={cn("grid w-full gap-1 border px-1 py-2 text-center text-xs leading-tight tabular-nums transition-[background-color,border-color] duration-150 disabled:cursor-default",
                  x.iso === sel ? "border-foreground bg-foreground text-background" : x.done ? "border-transparent bg-[color-mix(in_oklab,var(--c)_22%,transparent)] hover:border-foreground" : state === "missed" ? "border-dashed border-foreground/50 hover:border-foreground" : x.future ? "border-transparent text-muted-foreground hover:border-foreground/40" : "border-foreground/30 hover:border-foreground")}>
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

/** Adds from=today (and the day, when catching up) to an in-app link, so the tool shows a way back. */
function withFrom(to: string, sel: string, isToday: boolean) {
  if (/^https?:/.test(to)) return to
  const [path, hash = ""] = to.split("#")
  const extra = "from=today" + (isToday ? "" : `&day=${sel}`)
  return path + (path.includes("?") ? "&" : "?") + extra + (hash ? "#" + hash : "")
}

function PlanLink({ to, label, sel, isToday }: { to: string; label: string; sel: string; isToday: boolean }) {
  const href = withFrom(to, sel, isToday)
  return /^https?:/.test(to)
    ? <Button variant="outline" size="sm" asChild><a href={href} target="_blank" rel="noopener">{label}<ArrowUpRight /></a></Button>
    : <Button variant="outline" size="sm" asChild><Link to={href}>{label}<ArrowRight /></Link></Button>
}

/** A checkable row: checkbox, text, optional minutes and link. */
function CheckRow({ id, on, set, children, meta, link }: { id: string; on: boolean; set: (v: boolean) => void; children: React.ReactNode; meta?: React.ReactNode; link?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <Checkbox id={id} checked={on} onCheckedChange={(v) => set(v === true)} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={id} className={cn("block leading-snug font-normal", on && "text-muted-foreground line-through decoration-foreground/30")}>{children}</Label>
        {meta}
      </div>
      {link && <div className="shrink-0">{link}</div>}
    </li>
  )
}

export function TodayPage() {
  const p = useProgress()
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const asked = params.get("day")
  // Today, a past day you're catching up on, or a coming day to preview.
  const sel = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today
  const isToday = sel === today, future = sel > today
  const selDate = new Date(sel + "T00:00:00")
  const pick = (iso: string) => setParams((sp) => { if (iso === today) sp.delete("day"); else sp.set("day", iso); return sp })
  const cur = currentWeek(p)
  const week = isToday ? cur.week : weekOf(p, sel)
  const inPlan = week >= 1 && week <= 12
  const si = sprintForWeek(week), s = SPRINTS[si]
  const day = selDate.getDay()
  const [slot, slotName] = SLOT[day]
  const weekInSprint = inPlan ? (week - 1) % 2 : 0
  const plan = dayPlan(s.id, (weekInSprint + 1) as 1 | 2, slot, slot === "mid" ? day - 2 : 0)
  const [checks, setChecks] = usePref<Record<string, boolean>>("today-" + sel, {})
  const tick = (k: string, v: boolean) => setChecks({ ...checks, [k]: v })
  const minutes = minutesByDay(p).get(sel) ?? 0
  const markedDone = !!p.daysDone?.[sel]
  const { current } = streaks(p)
  const [mins, setMins] = useState(""), [note, setNote] = useState(""), [logged, setLogged] = useState<string | null>(null)
  const minsRef = useRef<HTMLInputElement>(null)

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
  const planMin = PLAN_MIN[slot]
  const steps = plan?.steps ?? [], warm = plan?.warmup ?? [], check = plan?.check ?? []
  const stepsDone = steps.filter((_, i) => checks["s" + i]).length
  const warmDone = warm.filter((_, i) => checks["w" + i]).length
  const allSteps = steps.length > 0 && stepsDone === steps.length
  const total = [...warm, ...steps].reduce((a, x) => a + x.min, 0)
  const L = (to: string, label: string) => <PlanLink to={to} label={label} sel={sel} isToday={isToday} />
  const title = isToday ? "Today" : future ? "Coming up" : "Catching up"

  return (
    <div className="space-y-10" style={{ ["--c" as string]: `var(${s.c})` }}>
      <PageHeader title={title}>
        {longDay.format(selDate)}
        {inPlan ? ` · Week ${week} of 12` : week < 1 ? " · The plan hasn't started yet" : " · The 12 weeks are done"}
        {!isToday && <> · <button type="button" className="text-foreground inline-flex items-center gap-1 underline" onClick={() => pick(today)}><ArrowLeft className="size-3.5" />Back to today</button></>}
      </PageHeader>

      {cur.week >= 1 && cur.week <= 12 && <SprintDays p={p} w1={sprintForWeek(cur.week) * 2 + 1} sel={sel} onPick={pick} />}

      <section aria-labelledby="focus-h" className="border-y border-foreground">
        <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0 space-y-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span aria-hidden="true" className="size-2.5 bg-[var(--c)]" />
              <Link to={`/sprints/${s.n}`} className="font-medium hover:underline">Sprint {s.n}: {s.title}</Link>
              <span className="text-muted-foreground">· {slotName}{slot === "mid" ? ` · day ${day - 1} of 3` : ""} · about {fmtMinutes(total || planMin)}</span>
            </p>
            <h2 id="focus-h" className="max-w-3xl text-3xl leading-tight font-medium text-balance sm:text-4xl">{s.weeks[weekInSprint][slot]}</h2>
            {plan && <p className="max-w-2xl text-lg text-pretty"><span className="text-muted-foreground">By the end: </span>{plan.outcome}</p>}
            {plan?.variant && (
              <div className="max-w-2xl space-y-2 border bg-card p-4">
                <div className="flex flex-wrap gap-1.5" role="list" aria-label="This practice block's three days">
                  {plan.variants.map((v, i) => (
                    <span key={v.label} role="listitem" className={cn("border px-2 py-0.5 text-xs", i === day - 2 ? "border-foreground bg-foreground text-background" : "border-foreground/25 text-muted-foreground")}>
                      {["Tue", "Wed", "Thu"][i]} · {v.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-pretty"><span className="font-medium">Today’s focus. </span>{plan.variant.focus}</p>
              </div>
            )}
            {!future && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <PracticeTimer label={`Sprint ${s.n} · ${slotName}, ${selDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`} onStop={(m) => { setMins(String(m)); requestAnimationFrame(() => minsRef.current?.focus()) }} />
                <Button variant={markedDone ? "default" : allSteps ? "default" : "outline"} size="sm" aria-pressed={markedDone} onClick={() => update((d) => { d.daysDone ??= {}; d.daysDone[sel] = !markedDone })}>
                  <Check />{markedDone ? "Day marked done" : "Mark this day done"}
                </Button>
              </div>
            )}
          </div>
          {!future && (
            <div className="flex items-center gap-5 lg:flex-col lg:gap-3">
              <Ring value={markedDone ? 1 : minutes / planMin} size={128} stroke={10} label={`${minutes} of ${planMin} planned minutes${isToday ? " today" : ""}`}>
                <div className="leading-tight">
                  <p className="text-2xl font-medium tabular-nums">{minutes}</p>
                  <p className="text-muted-foreground text-xs">of {planMin} min</p>
                </div>
              </Ring>
              <div className="space-y-0.5 text-sm lg:text-center">
                <p className="font-medium">{minutes >= planMin || markedDone ? (isToday ? "Today’s plan is done" : "This day is done") : `${stepsDone} of ${steps.length} steps`}</p>
                <p className="text-muted-foreground">{current > 0 ? `${current}-day streak` : "Log a session to start a streak"}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {plan && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <section aria-labelledby="warm-h" className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="warm-h" className={SECTION_TITLE}>1. Warm up</h2>
                <span className="text-muted-foreground text-sm tabular-nums">{warmDone} of {warm.length} · {warm.reduce((a, x) => a + x.min, 0)} min</span>
              </div>
              <p className="text-muted-foreground text-sm">Short drills that bring back earlier skills and set up today’s session.</p>
              <ul className="divide-y border-y">
                {warm.map((w, i) => (
                  <CheckRow key={i} id={`w${i}`} on={!!checks["w" + i]} set={(v) => tick("w" + i, v)}
                    meta={<span className="text-muted-foreground text-xs tabular-nums">{w.min} min</span>}
                    link={w.link && L(w.link.to, w.link.label)}>{w.text}</CheckRow>
                ))}
              </ul>
            </section>

            <section aria-labelledby="steps-h" className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="steps-h" className={SECTION_TITLE}>2. The session</h2>
                <span className="text-muted-foreground text-sm tabular-nums">{stepsDone} of {steps.length} · {steps.reduce((a, x) => a + x.min, 0)} min</span>
              </div>
              <Progress value={(stepsDone / Math.max(1, steps.length)) * 100} aria-hidden="true" className="h-1 [&>div]:bg-[var(--c)]" />
              <ol className="divide-y border-b">
                {steps.map((st, i) => (
                  <CheckRow key={i} id={`s${i}`} on={!!checks["s" + i]} set={(v) => tick("s" + i, v)}
                    meta={<p className={cn("text-sm text-pretty", checks["s" + i] ? "text-muted-foreground" : "")}>{st.detail}</p>}
                    link={st.link && L(st.link.to, st.link.label)}>
                    <span className="flex items-baseline gap-2"><span className="text-muted-foreground tabular-nums">{i + 1}</span><span className="font-medium">{st.title}</span><span className="text-muted-foreground text-xs tabular-nums">{st.min} min</span></span>
                  </CheckRow>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-10">
            <section aria-labelledby="check-h" className="space-y-2">
              <h2 id="check-h" className={SECTION_TITLE}>3. Done when</h2>
              <ul className="divide-y border-y">
                {check.map((c, i) => (
                  <CheckRow key={i} id={`c${i}`} on={!!checks["c" + i]} set={(v) => tick("c" + i, v)}>{c}</CheckRow>
                ))}
              </ul>
              {plan.tip && <p className="text-sm text-pretty"><span className="font-medium">Tip. </span>{plan.tip}</p>}
            </section>

            <section aria-labelledby="skills-h" className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="skills-h" className={SECTION_TITLE}>Skills this builds</h2>
                <Link to={`/sprints/${s.n}`} className="text-sm whitespace-nowrap underline">All skills</Link>
              </div>
              <ul className="divide-y border-y">
                {plan.skills.map((idx) => {
                  const key = s.id + "-" + idx, g = SKILL_GUIDES[key], n = p.skillSteps?.[key]?.length ?? 0, learned = !!p.done[key]
                  return (
                    <li key={key} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{s.skills[idx]}</p>
                        {g && <p className={cn("text-xs tabular-nums", learned ? "text-foreground" : "text-muted-foreground")}>{learned ? "Learned" : `${n} of ${g.steps.length} walkthrough steps`}</p>}
                      </div>
                      <Button size="sm" variant="ghost" asChild><Link to={`/sprints/${s.n}?skill=${key}`}>{learned ? "Review" : n ? "Continue" : "Walk through"}</Link></Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </aside>
        </div>
      )}

      {!future && (
        <Block title="Log the session" description="Stopping the timer fills in the minutes. Sessions count toward your streak and weekly goal.">
          <form onSubmit={log} className="grid max-w-3xl items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
            <div className="grid gap-1.5"><Label htmlFor="td-min">Minutes</Label><Input ref={minsRef} id="td-min" type="number" inputMode="numeric" min={1} max={600} value={mins} onChange={(e) => setMins(e.target.value)} placeholder={String(planMin)} className="text-base tabular-nums sm:text-sm" /></div>
            <div className="grid gap-1.5"><Label htmlFor="td-note">What happened (optional)</Label><Input id="td-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What worked, what was slow, next question" autoComplete="off" className="text-base sm:text-sm" /></div>
            <Button type="submit" disabled={!Number(mins)}>Log session</Button>
          </form>
          {logged && <p className="text-sm" role="status">{logged} <Link to="/practice" className="underline">See the practice log</Link>.</p>}
          <Caption>Logged against Sprint {s.n} on {isToday ? "today" : longDay.format(selDate)}.</Caption>
        </Block>
      )}

      {isToday && (
        <Block title="This week" description={`${fmtMinutes(weekMin)} of your ${fmtMinutes(WEEKLY_GOAL_MIN)} weekly goal. The dashed line is each day’s plan.`} actions={<Link to="/practice" className="text-sm underline">Practice log</Link>}>
          <WeekStrip p={p} />
        </Block>
      )}
    </div>
  )
}
