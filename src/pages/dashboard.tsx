import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import { Block, PageHeader } from "@/components/page"
import { ProgressBoard } from "@/components/progress-board"
import { PracticeHeatmap, Ring, SprintTimeline } from "@/components/stats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { SKILL_GUIDES } from "@/data/skill-guides"
import { SPRINTS } from "@/data/sprints"
import { dueCards } from "@/lib/cards"
import { countDone, currentWeek, fmtDay, fmtMinutes, minutesThisWeek, sprintForWeek, startDate, streaks, TOTAL, update, useProgress, weekOf, WEEKLY_GOAL_MIN } from "@/lib/store"
import { cn } from "@/lib/utils"

const DAY_SLOT: Record<number, ["mon" | "mid" | "fri" | "wknd", string]> = { 1: ["mon", "Monday"], 2: ["mid", "Tuesday to Thursday"], 3: ["mid", "Tuesday to Thursday"], 4: ["mid", "Tuesday to Thursday"], 5: ["fri", "Friday"], 6: ["wknd", "Weekend"], 0: ["wknd", "Weekend"] }

function Stat({ label, value, sub, children, to }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; to?: string }) {
  const body = (
    <>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-display text-3xl leading-none font-medium tabular-nums">{value}</p>
      {children}
      {sub && <p className="text-muted-foreground text-sm">{sub}</p>}
    </>
  )
  const cls = "flex flex-col gap-2.5 rounded-xl border bg-card p-5"
  return to ? <Link to={to} className={cn(cls, "transition-[background-color] duration-150 hover:bg-accent/50")}>{body}</Link> : <div className={cls}>{body}</div>
}

export function Dashboard() {
  const p = useProgress()
  const cur = currentWeek(p)
  const si = sprintForWeek(cur.week), s = SPRINTS[si]
  const done = countDone(p)
  const inPlan = cur.week >= 1 && cur.week <= 12
  const weekInSprint = inPlan ? (cur.week - 1) % 2 : 0
  const slot = cur.day >= 0 ? DAY_SLOT[cur.day] : null
  const exportWeeks = new Set(p.exports.map((e) => weekOf(p, e.date)).filter((w) => w >= 1 && w <= 12))
  const skillsDone = s.skills.filter((_, i) => p.done[s.id + "-" + i]).length
  const week = minutesThisWeek(p), { current, longest } = streaks(p)
  const nextKey = s.skills.map((_, i) => s.id + "-" + i).find((k) => !p.done[k])
  const nextIdx = nextKey ? +nextKey.split("-")[1] : -1
  const nextSteps = nextKey ? p.skillSteps?.[nextKey]?.length ?? 0 : 0
  const due = dueCards(p).length
  const status = cur.week < 1 ? `Starts ${fmtDay.format(startDate(p))}` : cur.week > 12 ? "All 12 weeks complete" : `Week ${cur.week} of 12`

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        actions={
          <div className="grid gap-1.5">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" className="w-44" value={p.start} onChange={(e) => e.target.value && update((d) => { d.start = e.target.value })} />
          </div>
        }
      >
        Ableton Live 12 and Push. Six two-week sprints, 1 hour on weekdays and 2–3 hours on weekends.
      </PageHeader>

      <section aria-labelledby="sprint-h" className="overflow-hidden rounded-2xl border bg-[color-mix(in_oklab,var(--c)_7%,var(--card))]" style={{ ["--c" as string]: `var(${s.c})` }}>
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-4">
            <p className="text-muted-foreground text-sm">{status}{inPlan ? ` · ${cur.week % 2 ? "First" : "Second"} week of Sprint ${s.n}` : ""}</p>
            <div className="space-y-2">
              <h2 id="sprint-h" className="font-display flex items-center gap-3 text-2xl leading-tight font-medium sm:text-3xl">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-[var(--c)]" />Sprint {s.n}: {s.title}
              </h2>
              <p className="max-w-2xl text-lg text-pretty">{s.goal}</p>
            </div>
            {slot && inPlan && <p className="max-w-2xl text-sm text-pretty"><span className="font-semibold">{slot[1]}:</span> {s.weeks[weekInSprint][slot[0]]}</p>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild><Link to="/today">Start today’s session</Link></Button>
              <Button variant="outline" asChild><Link to={`/sprints/${s.n}`}>Open sprint {s.n}<ArrowRight /></Link></Button>
            </div>
          </div>
          <div className="flex items-center gap-5 lg:flex-col lg:gap-3">
            <Ring value={skillsDone / s.skills.length} size={132} stroke={11} label={`${skillsDone} of ${s.skills.length} sprint ${s.n} skills learned`}>
              <div className="leading-tight">
                <p className="font-display text-2xl font-medium tabular-nums">{skillsDone}/{s.skills.length}</p>
                <p className="text-muted-foreground text-xs">skills</p>
              </div>
            </Ring>
            <p className="text-sm font-medium lg:text-center">{p.shipped[s.id] ? "Deliverable shipped" : "Deliverable not shipped yet"}</p>
          </div>
        </div>
        <div className="border-t bg-[color-mix(in_oklab,var(--card)_55%,transparent)] px-6 py-5 sm:px-8">
          <SprintTimeline p={p} week={cur.week} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Overall" value={`${Math.round((done / TOTAL) * 100)}%`} sub={`${done} of ${TOTAL} skills and deliverables`}>
          <Progress value={(done / TOTAL) * 100} aria-hidden="true" className="h-1.5" />
        </Stat>
        <Stat label="Practice this week" value={fmtMinutes(week)} sub={`Goal ${fmtMinutes(WEEKLY_GOAL_MIN)}`} to="/practice">
          <Progress value={Math.min(100, (week / WEEKLY_GOAL_MIN) * 100)} aria-hidden="true" className="h-1.5 [&>div]:bg-[var(--s3)]" />
        </Stat>
        <Stat label="Streak" value={`${current} ${current === 1 ? "day" : "days"}`} sub={longest > current ? `Longest ${longest} days` : current ? "Your longest yet" : "Practice today to start one"} to="/practice" />
        <Stat label="Weeks with an export" value={`${exportWeeks.size} of 12`} to="/exports">
          <div className="grid grid-cols-12 gap-1" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={cn("h-2 rounded-full", exportWeeks.has(i + 1) ? "bg-foreground" : i + 1 === cur.week ? "bg-[color-mix(in_oklab,var(--foreground)_30%,transparent)]" : "bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]")} />
            ))}
          </div>
        </Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="heat-h" className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="heat-h" className="font-semibold">Practice</h2>
            <Link to="/practice" className="text-sm underline">Practice log</Link>
          </div>
          <PracticeHeatmap p={p} weeks={16} />
        </section>
        <section aria-labelledby="next-h" className="flex flex-col gap-4 rounded-xl border bg-card p-5" style={{ ["--c" as string]: `var(${s.c})` }}>
          <h2 id="next-h" className="font-semibold">Up next</h2>
          {nextKey ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Skill {nextIdx + 1} of Sprint {s.n}</p>
              <p className="leading-snug font-medium">{s.skills[nextIdx]}</p>
              {SKILL_GUIDES[nextKey] && <Progress value={(nextSteps / SKILL_GUIDES[nextKey].steps.length) * 100} aria-label={`${nextSteps} of ${SKILL_GUIDES[nextKey].steps.length} steps`} className="h-1.5 [&>div]:bg-[var(--c)]" />}
              <Button size="sm" variant={nextSteps ? "default" : "outline"} asChild className="mt-1"><Link to={`/sprints/${s.n}?skill=${nextKey}`}>{nextSteps ? "Continue walkthrough" : "Start walkthrough"}</Link></Button>
            </div>
          ) : (
            <p className="text-sm">All Sprint {s.n} skills are learned. Ship the deliverable.</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 text-sm">
            <span>{due ? `${due} flashcard${due === 1 ? "" : "s"} due` : "No flashcards due"}</span>
            {due > 0 && <Link to="/flashcards" className="underline">Review</Link>}
          </div>
        </section>
      </div>

      <Block title="Skill board" description="One column per sprint, one pad per skill. The last pad in each column is the deliverable.">
        <div className="max-w-2xl"><ProgressBoard current={si} /></div>
      </Block>
    </div>
  )
}
