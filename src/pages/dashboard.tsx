import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import { PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { ProgressBoard } from "@/components/progress-board"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { SPRINTS } from "@/data/sprints"
import { countDone, currentWeek, fmtDay, fmtMinutes, minutesThisWeek, sprintForWeek, startDate, streaks, TOTAL, update, useProgress, weekOf } from "@/lib/store"

const DAY_SLOT: Record<number, ["mon" | "mid" | "fri" | "wknd", string]> = { 1: ["mon", "Monday"], 2: ["mid", "Tuesday to Thursday"], 3: ["mid", "Tuesday to Thursday"], 4: ["mid", "Tuesday to Thursday"], 5: ["fri", "Friday"], 6: ["wknd", "Weekend"], 0: ["wknd", "Weekend"] }

export function Dashboard() {
  const p = useProgress()
  const cur = currentWeek(p)
  const si = sprintForWeek(cur.week), s = SPRINTS[si]
  const done = countDone(p)
  const when = cur.week < 1 ? `Starts ${fmtDay.format(startDate(p))}` : cur.week > 12 ? "All 12 weeks complete" : `Week ${cur.week} of 12`
  const weekInSprint = cur.week >= 1 && cur.week <= 12 ? (cur.week - 1) % 2 : 0
  const slot = cur.day >= 0 ? DAY_SLOT[cur.day] : null
  const shippedWeeks = new Set(p.exports.map((e) => weekOf(p, e.date)).filter((w) => w >= 1 && w <= 12)).size
  const skillsDone = s.skills.filter((_, i) => p.done[s.id + "-" + i]).length

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2" style={{ ["--c" as string]: `var(${s.c})` }}>
          <CardHeader>
            <CardTitle className="font-sans text-base">{cur.week < 1 ? "First up" : cur.week > 12 ? "Last sprint" : "This week"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--c)]" />
              <span className="font-display text-xl font-bold">Sprint {s.n}: {s.title}</span>
            </div>
            <p className="text-pretty">{s.goal}</p>
            {slot && cur.week >= 1 && cur.week <= 12 && (
              <p className="text-sm"><span className="font-semibold">{slot[1]}:</span> {s.weeks[weekInSprint][slot[0]]}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Button asChild><Link to="/today">Start today's session</Link></Button>
              <Link to={`/sprints/${s.n}`} className="inline-flex items-center gap-1.5 text-sm font-medium underline">Open sprint {s.n} <ArrowRight className="size-4" /></Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-sans text-base">{when}</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <div className="flex justify-between"><span>All skills and deliverables</span><span className="tabular-nums">{done} of {TOTAL}</span></div>
              <Progress value={(done / TOTAL) * 100} aria-label="Overall progress" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span>Sprint {s.n} skills</span><span className="tabular-nums">{skillsDone} of {s.skills.length}</span></div>
              <Progress value={(skillsDone / s.skills.length) * 100} aria-label={`Sprint ${s.n} progress`} />
            </div>
            <div className="flex justify-between"><span>Practice this week</span><Link to="/practice" className="tabular-nums underline">{fmtMinutes(minutesThisWeek(p))}{streaks(p).current > 1 ? ` · ${streaks(p).current}-day streak` : ""}</Link></div>
            <div className="flex justify-between"><span>Weeks with an export</span><Link to="/exports" className="tabular-nums underline">{shippedWeeks} of 12</Link></div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Progress</h2>
        <ProgressBoard current={si} />
      </section>
    </div>
  )
}
