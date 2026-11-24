import { useRef, useState } from "react"
import { ArrowLeft, Check, Play, Settings2 } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { Caption, PageHeader, SECTION_TITLE } from "@/components/page"
import { TabSwitch } from "@/components/seg"
import { Switch } from "@/components/ui/switch"
import { useKey } from "@/components/key-picker"
import { ListeningSheet, PlanLink, ProofBox, ReflectionCard, StuckPanel, WeeklyChallenge, YourWork } from "@/components/today/parts"
import { buildDay, PLAN_MIN, SLOT } from "@/lib/day"
import { PracticeTimer } from "@/components/practice-timer"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Ring } from "@/components/stats"
import { SKILL_GUIDES } from "@/data/skill-guides"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currentWeek, fmtMinutes, isoOf, minutesByDay, sprintForWeek, streaks, todayISO, uid, update, usePref, useProgress, weekStart, type Progress as Prog } from "@/lib/store"
import { cn } from "@/lib/utils"

export { PLAN_MIN, SLOT }
const DAY_LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const isRest = (p: Prog, d: Date) => !!p.practiceDays && !p.practiceDays.includes(d.getDay())

const longDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" })
/** A plan day is done once its planned minutes are logged, or it's marked done by hand. */
export const dayDone = (p: Prog, iso: string, mins: Map<string, number>) => !!p.daysDone?.[iso] || (mins.get(iso) ?? 0) >= PLAN_MIN[SLOT[new Date(iso + "T00:00:00").getDay()][0]]

/** The current sprint's 14 days: done, missed or still to come. Past days open so you can catch up. */
function SprintDays({ p, w1, sel, onPick }: { p: Prog; w1: number; sel: string; onPick: (iso: string) => void }) {
  const today = todayISO(), mins = minutesByDay(p)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = weekStart(p, w1)
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    return { iso, d, done: dayDone(p, iso, mins), future: iso > today, isToday: iso === today, rest: isRest(p, d) }
  })
  const missed = days.filter((x) => !x.future && !x.isToday && !x.done && !x.rest)
  return (
    <section aria-labelledby="days-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="days-h" className="font-sans font-semibold">This sprint, day by day</h2>
        <p className="text-muted-foreground text-sm">
          {missed.length ? <>{missed.length} {missed.length === 1 ? "day" : "days"} to catch up. <button type="button" className="text-foreground underline" onClick={() => onPick(missed[missed.length - 1].iso)}>Open the latest</button>{missed.length >= 3 && <> or <button type="button" className="text-foreground underline" onClick={() => update((d) => { const st = new Date(d.start + "T00:00:00"); st.setDate(st.getDate() + 7); d.start = isoOf(st) })}>push the plan back a week</button></>}</> : "Nothing missed so far."}
        </p>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:grid-cols-14">
        {days.map((x) => {
          const state = x.done ? "done" : x.rest ? "rest day" : x.future ? "upcoming" : x.isToday ? "today" : "missed"
          return (
            <li key={x.iso}>
              <button type="button" onClick={() => onPick(x.iso)} aria-current={x.iso === sel ? "date" : undefined}
                aria-label={`${longDay.format(x.d)}: ${state}`}
                className={cn("grid w-full gap-1 border px-1 py-2 text-center text-xs leading-tight tabular-nums transition-[background-color,border-color] duration-150 disabled:cursor-default",
                  x.iso === sel ? "border-foreground bg-foreground text-background" : x.done ? "border-transparent bg-[color-mix(in_oklab,var(--c)_22%,transparent)] hover:border-foreground" : state === "missed" ? "border-dashed border-foreground/50 hover:border-foreground" : x.future ? "border-transparent text-muted-foreground hover:border-foreground/40" : "border-foreground/30 hover:border-foreground")}>
                <span>{x.d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className="text-base font-medium">{x.d.getDate()}</span>
                <span className="flex h-3.5 items-center justify-center" aria-hidden="true">
                  {x.done ? <Check className="size-3.5" /> : state === "missed" ? <span className="text-[10px]">Missed</span> : x.isToday ? <span className="text-[10px]">Today</span> : x.rest ? <span className="text-[10px]">Rest</span> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
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

/** Day options behind one button: the 30-minute version and which days you practice. */
function DayOptions({ p, short, setShort }: { p: Prog; short: boolean; setShort: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const days = p.practiceDays ?? [0, 1, 2, 3, 4, 5, 6]
  const toggleDay = (n: number) => update((d) => { const cur = d.practiceDays ?? [0, 1, 2, 3, 4, 5, 6]; d.practiceDays = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort() })
  return (
    <>
      <Button variant="ghost" size="sm" aria-expanded={open} aria-controls="day-options" onClick={() => setOpen(!open)}><Settings2 />Options{short ? " · 30 min" : ""}</Button>
      {open && (
        <div id="day-options" className="basis-full space-y-3 border p-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={short} onCheckedChange={setShort} />
            <span><span className="font-medium">30-minute version.</span> <span className="text-muted-foreground">One warm-up and the first steps of the session.</span></span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Practice days</span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Practice days">
              {[1, 2, 3, 4, 5, 6, 0].map((n) => (
                <button key={n} type="button" aria-pressed={days.includes(n)} onClick={() => toggleDay(n)}
                  className={cn("h-8 min-w-11 border px-2 text-sm", days.includes(n) ? "border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground")}>{DAY_LETTERS[n]}</button>
              ))}
            </div>
            <span className="text-muted-foreground text-sm">Other days are rest days and never count as missed.</span>
          </div>
        </div>
      )}
    </>
  )
}

/** A heading for a part of the plan, with a count and time on the right. */
function PartHead({ id, n, title, meta }: { id: string; n?: number; title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className={SECTION_TITLE}>{n !== undefined && <span className="text-muted-foreground mr-2 tabular-nums">{n}</span>}{title}</h2>
      {meta && <span className="text-muted-foreground text-sm tabular-nums">{meta}</span>}
    </div>
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
  const pick = (iso: string) => setParams((sp) => { if (iso === today) sp.delete("day"); else sp.set("day", iso); return sp })
  const cur = currentWeek(p)
  const { root, scale } = useKey()
  const [short, setShort] = usePref<boolean>("short-" + sel, false)
  const D = buildDay(p, sel, { root, scale, short })
  const { s, week, inPlan, slot, slotName, day, weekInSprint, sprintDay, plan, steps, warm, planMin } = D
  const selDate = D.date
  const [checks, setChecks] = usePref<Record<string, boolean>>("today-" + sel, {})
  const tick = (k: string, v: boolean) => {
    const next = { ...checks, [k]: v }
    setChecks(next)
    // Checking off the last session step finishes the day.
    if (v && k.startsWith("s-") && steps.length && steps.every((st) => next[st.id]) && !p.daysDone?.[sel]) update((d) => { d.daysDone ??= {}; d.daysDone[sel] = true })
  }
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

  const check = plan?.check ?? []
  const stepsDone = steps.filter((st) => checks[st.id]).length
  const warmDone = warm.filter((w) => checks[w.id]).length
  const allSteps = steps.length > 0 && stepsDone === steps.length
  const total = [...warm, ...steps].reduce((a, x) => a + x.min, 0)
  const L = (link: { to: string; label: string }) => <PlanLink link={link} sel={sel} isToday={isToday} variant="ghost" />
  const dayIsDone = markedDone || allSteps || minutes >= planMin
  const practiceHref = `/today/practice${isToday ? "" : `?day=${sel}`}`
  const title = isToday ? "Today" : future ? "Coming up" : "Catching up"

  const [wrap, setWrap] = usePref<"log" | "reflect" | "proof">("today-wrap", "log")
  return (
    <div className="space-y-10" style={{ ["--c" as string]: `var(${s.c})` }}>
      <PageHeader title={title}>
        {longDay.format(selDate)}
        {inPlan ? ` · Week ${week} of 12` : week < 1 ? " · The plan hasn't started yet" : " · The 12 weeks are done"}
        {!isToday && <> · <button type="button" className="text-foreground inline-flex items-center gap-1 underline" onClick={() => pick(today)}><ArrowLeft className="size-3.5" />Back to today</button></>}
      </PageHeader>

      {cur.week >= 1 && cur.week <= 12 && <SprintDays p={p} w1={sprintForWeek(cur.week) * 2 + 1} sel={sel} onPick={pick} />}

      {/* The day at a glance, with the one thing to do next */}
      <section aria-labelledby="focus-h" className="border-y border-foreground py-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0 space-y-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span aria-hidden="true" className="size-2.5 bg-[var(--c)]" />
              <Link to={`/sprints/${s.n}`} className="font-medium hover:underline">Sprint {s.n}: {s.title}</Link>
              <span className="text-muted-foreground">· {slotName}{slot === "mid" ? ` · day ${day - 1} of 3` : ""} · about {fmtMinutes(total || planMin)}</span>
            </p>
            <h2 id="focus-h" className="max-w-3xl text-headline font-medium text-balance">{s.weeks[weekInSprint][slot]}</h2>
            {plan && <p className="text-lead max-w-2xl text-pretty"><span className="text-muted-foreground">By the end: </span>{plan.outcome}</p>}
            {plan?.variant && (
              <div className="max-w-2xl space-y-2 bg-muted/60 p-4">
                <div className="flex flex-wrap gap-1.5" role="list" aria-label="This practice block's three days">
                  {plan.variants.map((v, i) => (
                    <span key={v.label} role="listitem" className={cn("border px-2 py-0.5 text-xs", i === day - 2 ? "border-foreground bg-foreground text-background" : "border-foreground/25 text-muted-foreground")}>{["Tue", "Wed", "Thu"][i]} · {v.label}</span>
                  ))}
                </div>
                <p className="text-sm text-pretty"><span className="font-medium">Today’s focus. </span>{plan.variant.focus}</p>
              </div>
            )}
            {!future && plan && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-3 pt-2">
                <Button size="lg" asChild><Link to={practiceHref}><Play className="fill-current" />{stepsDone ? "Continue in practice mode" : "Start practice mode"}</Link></Button>
                <PracticeTimer compact label={inPlan ? `Sprint ${s.n} · Day ${sprintDay} of 14` : "Practice session"} onStop={(m) => { setMins(String(m)); setWrap("log"); requestAnimationFrame(() => minsRef.current?.focus()) }} />
                <Button variant={markedDone ? "default" : "outline"} size="sm" aria-pressed={markedDone} onClick={() => update((d) => { d.daysDone ??= {}; d.daysDone[sel] = !markedDone })}><Check />{markedDone ? "Day done" : "Mark day done"}</Button>
                <DayOptions p={p} short={short} setShort={setShort} />
              </div>
            )}
            {future && <p className="text-muted-foreground text-sm">A preview. Practice mode and logging open on the day.</p>}
          </div>
          {!future && (
            <div className="flex items-center gap-5 lg:flex-col lg:gap-3">
              <Ring value={markedDone ? 1 : minutes / planMin} size={120} stroke={10} label={`${minutes} of ${planMin} planned minutes${isToday ? " today" : ""}`}>
                <div className="space-y-1"><p className="text-stat font-medium tabular-nums">{minutes}</p><p className="text-muted-foreground text-xs">of {planMin} min</p></div>
              </Ring>
              <div className="space-y-0.5 text-sm lg:text-center">
                <p className="font-medium">{dayIsDone ? (isToday ? "Today’s plan is done" : "This day is done") : `${stepsDone} of ${steps.length} steps`}</p>
                <p className="text-muted-foreground">{current > 0 ? `${current}-day streak` : "No streak yet"}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {plan && (
        <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* The plan, in the order you do it */}
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="warm-h" className="space-y-2">
              <PartHead id="warm-h" n={1} title="Warm up" meta={`${warmDone} of ${warm.length} · ${warm.reduce((a, x) => a + x.min, 0)} min`} />
              <ul className="divide-y border-y">
                {warm.map((w) => (
                  <CheckRow key={w.id} id={w.id} on={!!checks[w.id]} set={(v) => tick(w.id, v)}
                    meta={<span className="text-muted-foreground flex gap-2 text-xs tabular-nums">{w.tag && <span className="border border-foreground/40 px-1 text-foreground">{w.tag}</span>}{w.min} min</span>}
                    link={w.link && L(w.link)}>{w.text}</CheckRow>
                ))}
              </ul>
            </section>

            <section aria-labelledby="steps-h" className="space-y-2">
              <PartHead id="steps-h" n={2} title="Session" meta={`${stepsDone} of ${steps.length} · ${steps.reduce((a, x) => a + x.min, 0)} min`} />
              <Progress value={(stepsDone / Math.max(1, steps.length)) * 100} aria-hidden="true" className="h-1 [&>div]:bg-[var(--c)]" />
              <ol className="divide-y border-b">
                {steps.map((st, i) => (
                  <CheckRow key={st.id} id={st.id} on={!!checks[st.id]} set={(v) => tick(st.id, v)}
                    meta={<p className={cn("text-sm text-pretty", checks[st.id] ? "text-muted-foreground" : "")}>{st.text}</p>}
                    link={st.link && L(st.link)}>
                    <span className="flex flex-wrap items-baseline gap-2"><span className="text-muted-foreground tabular-nums">{i + 1}</span><span className="font-medium">{st.title}</span>{st.tag && <span className="border border-foreground/40 px-1 text-xs">{st.tag}</span>}<span className="text-muted-foreground text-xs tabular-nums">{st.min} min</span></span>
                  </CheckRow>
                ))}
              </ol>
              <StuckPanel smaller={D.smaller} stuck={D.stuck} sel={sel} isToday={isToday} />
            </section>

            {slot === "fri" && !future && <ListeningSheet p={p} sprintId={s.id} />}

            {!future && (
              <section aria-labelledby="wrap-h" className="space-y-4">
                <PartHead id="wrap-h" n={3} title="Wrap up" meta={dayIsDone ? "Day done" : undefined} />
                <TabSwitch label="Wrap up" value={wrap} onChange={setWrap} options={[["log", "Log time"], ["reflect", p.reflections?.[sel] ? "Reflect ✓" : "Reflect"], ["proof", (p.proofs ?? []).some((x) => x.date === sel) ? "Proof ✓" : "Proof of work"]]} />
                {wrap === "log" && (
                  <div className="space-y-3">
                    <form onSubmit={log} className="grid items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                      <div className="grid gap-1.5"><Label htmlFor="td-min">Minutes</Label><Input ref={minsRef} id="td-min" type="number" inputMode="numeric" min={1} max={600} value={mins} onChange={(e) => setMins(e.target.value)} placeholder={String(planMin)} className="text-base tabular-nums sm:text-sm" /></div>
                      <div className="grid gap-1.5"><Label htmlFor="td-note">What happened (optional)</Label><Input id="td-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What worked, what was slow" autoComplete="off" className="text-base sm:text-sm" /></div>
                      <Button type="submit" disabled={!Number(mins)}>Log session</Button>
                    </form>
                    {logged && <p className="text-sm" role="status">{logged} <button type="button" className="underline" onClick={() => setWrap("reflect")}>Reflect next</button>.</p>}
                    <Caption>Stopping the timer fills in the minutes. Logged against Sprint {s.n} on {isToday ? "today" : longDay.format(selDate)}.</Caption>
                  </div>
                )}
                {wrap === "reflect" && <ReflectionCard bare p={p} date={sel} skills={plan.skills.map((i) => ({ key: s.id + "-" + i, name: s.skills[i] }))} />}
                {wrap === "proof" && <ProofBox bare p={p} date={sel} sprintId={s.id} titles={steps.map((st) => st.title!).filter(Boolean)} />}
              </section>
            )}
          </div>

          {/* Reference for the day: what done looks like, the skills, your material, the week's challenge */}
          <aside className="min-w-0 space-y-10">
            <section aria-labelledby="check-h" className="space-y-2">
              <PartHead id="check-h" title="Done when" />
              <ul className="divide-y border-y">
                {check.map((c, i) => <CheckRow key={i} id={`c${i}`} on={!!checks["c" + i]} set={(v) => tick("c" + i, v)}>{c}</CheckRow>)}
              </ul>
              {plan.tip && <p className="text-sm text-pretty"><span className="font-medium">Tip. </span>{plan.tip}</p>}
            </section>
            <section aria-labelledby="skills-h" className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="skills-h" className={SECTION_TITLE}>Skills</h2>
                <Link to={`/sprints/${s.n}`} className="text-sm whitespace-nowrap underline">All skills</Link>
              </div>
              <ul className="divide-y border-y">
                {plan.skills.map((idx) => {
                  const key = s.id + "-" + idx, g = SKILL_GUIDES[key], n = p.skillSteps?.[key]?.length ?? 0, learned = !!p.done[key]
                  return (
                    <li key={key} className="flex items-center gap-3 py-2.5">
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
            <YourWork p={p} sel={sel} isToday={isToday} />
            {inPlan && <WeeklyChallenge p={p} week={week} sel={sel} isToday={isToday} />}
          </aside>
        </div>
      )}
    </div>
  )
}
