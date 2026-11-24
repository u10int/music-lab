import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { Block, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { SPRINTS } from "@/data/sprints"
import { weakSpots } from "@/lib/adaptive"
import { fmtDay, fmtMinutes, isoOf, mondayOf, todayISO, update, useProgress, WEEKLY_GOAL_MIN, type Score } from "@/lib/store"
import { cn } from "@/lib/utils"

const QUIZ: Record<string, [string, string]> = {
  chords: ["Chord quality", "/labs/ear"], intervals: ["Intervals", "/labs/ear"], progressions: ["Progressions", "/labs/ear"],
  degrees: ["Scale degrees", "/labs/ear"], keys: ["Major or minor", "/labs/ear"], "mix-eq": ["EQ bands", "/labs/ear"],
  "mix-comp": ["Compression", "/labs/ear"], "mix-side": ["Sidechain", "/labs/ear"], match: ["Match the sound", "/labs/sound-design"],
}
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const skillName = (k: string) => {
  if (k.startsWith("ship-")) {
    const s = SPRINTS.find((x) => x.id === k.slice(5))
    return s ? `Shipped the Sprint ${s.n} deliverable` : k
  }
  const [sid, i] = k.split("-"), s = SPRINTS.find((x) => x.id === sid)
  return s?.skills[+i] ? `${s.skills[+i]} (Sprint ${s.n})` : k
}
const pct = (s: Score) => (s.total ? Math.round((s.right / s.total) * 100) : 0)

export function ReviewPage() {
  const p = useProgress()
  const [offset, setOffset] = useState(0)
  const mon = mondayOf(new Date())
  mon.setDate(mon.getDate() - offset * 7)
  const days = DAYS.map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return isoOf(d) })
  const monISO = days[0], sunISO = days[6]
  const inWeek = (iso: string) => iso >= monISO && iso <= sunISO
  const prevMon = new Date(mon)
  prevMon.setDate(mon.getDate() - 7)
  const lastGoal = p.reviews?.[isoOf(prevMon)]?.goal?.trim()
  const r = p.reviews?.[monISO] ?? { well: "", hard: "", goal: "" }
  const setR = (k: keyof typeof r, v: string) => update((d) => { d.reviews ??= {}; d.reviews[monISO] = { ...(d.reviews[monISO] ?? { well: "", hard: "", goal: "" }), [k]: v } })

  const sessions = p.sessions.filter((s) => inWeek(s.date)).sort((a, b) => a.date.localeCompare(b.date))
  const perDay = days.map((iso) => sessions.filter((s) => s.date === iso).reduce((a, s) => a + s.minutes, 0))
  const minutes = perDay.reduce((a, b) => a + b, 0), practiced = perDay.filter(Boolean).length
  const learned = Object.entries(p.doneAt ?? {}).filter(([k, iso]) => inWeek(iso) && (k.startsWith("ship-") ? p.shipped[k.slice(5)] : p.done[k])).map(([k]) => k)
  const exports = p.exports.filter((e) => inWeek(e.date))
  const ear: Record<string, Score> = {}
  for (const iso of days) for (const [q, s] of Object.entries(p.earDays?.[iso] ?? {})) {
    const e = (ear[q] ??= { right: 0, total: 0 })
    e.right += s.right
    e.total += s.total
  }
  const earTotal = Object.values(ear).reduce((a, s) => ({ right: a.right + s.right, total: a.total + s.total }), { right: 0, total: 0 })
  const weak = Object.entries(p.earDetail ?? {}).flatMap(([q, d]) => weakSpots(d).map((w) => ({ ...w, q }))).sort((a, b) => a.acc - b.acc).slice(0, 5)
  const top = Math.max(150, ...perDay)
  const thisWeek = offset === 0, future = monISO > todayISO()

  const next: string[] = []
  if (minutes < WEEKLY_GOAL_MIN * 0.75) next.push(`You practiced ${fmtMinutes(minutes)} of the ${fmtMinutes(WEEKLY_GOAL_MIN)} goal. Block out the weekday hour in your calendar.`)
  if (!exports.length && !future) next.push("No export this week. Bounce even 30 seconds on Sunday and log it.")
  if (weak[0]) next.push(`Your weakest ear training answer is ${weak[0].key} in ${QUIZ[weak[0].q]?.[0].toLowerCase() ?? weak[0].q} (${Math.round(weak[0].acc * 100)}%). Keep “Focus on weak spots” on.`)
  if (!learned.length && !future) next.push("No skills ticked off. Pick one walkthrough and finish it this week.")

  return (
    <div className="space-y-10">
      <PageHeader title="Weekly review" actions={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setOffset(offset + 1)}><ChevronLeft /></Button>
          <Button variant="outline" size="sm" disabled={thisWeek} onClick={() => setOffset(0)}>This week</Button>
          <Button variant="outline" size="icon" aria-label="Next week" disabled={thisWeek} onClick={() => setOffset(offset - 1)}><ChevronRight /></Button>
        </div>
      }>
        {fmtDay.format(new Date(monISO + "T00:00:00"))} – {fmtDay.format(new Date(sunISO + "T00:00:00"))}. Look back at the week, then set one goal for the next. Sunday is a good time.
      </PageHeader>

      {lastGoal && (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-muted-foreground text-sm">The goal you set for this week</p>
          <p className="mt-1 text-lg text-pretty">{lastGoal}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2.5 rounded-xl border bg-card p-5">
          <p className="text-muted-foreground text-sm">Practice</p>
          <p className="font-display text-3xl leading-none font-extrabold tabular-nums">{fmtMinutes(minutes)}</p>
          <Progress value={Math.min(100, (minutes / WEEKLY_GOAL_MIN) * 100)} aria-hidden="true" className="h-1.5 [&>div]:bg-[var(--s3)]" />
          <p className="text-muted-foreground text-sm">{practiced} of 7 days · goal {fmtMinutes(WEEKLY_GOAL_MIN)}</p>
        </div>
        <div className="space-y-2.5 rounded-xl border bg-card p-5">
          <p className="text-muted-foreground text-sm">Skills ticked off</p>
          <p className="font-display text-3xl leading-none font-extrabold tabular-nums">{learned.length}</p>
          <p className="text-muted-foreground text-sm">{learned.length ? "See the list below" : "None this week"}</p>
        </div>
        <div className="space-y-2.5 rounded-xl border bg-card p-5">
          <p className="text-muted-foreground text-sm">Ear training</p>
          <p className="font-display text-3xl leading-none font-extrabold tabular-nums">{earTotal.total ? `${pct(earTotal)}%` : "–"}</p>
          <p className="text-muted-foreground text-sm">{earTotal.total ? `${earTotal.right} of ${earTotal.total} right` : "No questions answered"}</p>
        </div>
        <div className="space-y-2.5 rounded-xl border bg-card p-5">
          <p className="text-muted-foreground text-sm">Exports</p>
          <p className="font-display text-3xl leading-none font-extrabold tabular-nums">{exports.length}</p>
          <p className="text-muted-foreground text-sm">{exports.length ? exports.map((e) => e.note || "Untitled").join(", ") : <Link to="/exports" className="underline">Log an export</Link>}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Each day">
          <ol className="grid grid-cols-7 gap-2" aria-label="Minutes practiced each day">
            {days.map((iso, i) => (
              <li key={iso} className="flex flex-col items-center gap-1.5">
                <span className="relative h-24 w-full overflow-hidden rounded-md bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)]" aria-hidden="true">
                  <span className="absolute inset-x-0 bottom-0 rounded-md bg-[var(--s3)]" style={{ height: `${(perDay[i] / top) * 100}%` }} />
                </span>
                <span className={cn("text-xs", iso === todayISO() ? "font-semibold" : "text-muted-foreground")}>{DAYS[i]}</span>
                <span className="text-[11px] tabular-nums">{perDay[i] ? `${perDay[i]}m` : "–"}<span className="sr-only"> minutes on {DAYS[i]}</span></span>
              </li>
            ))}
          </ol>
          {sessions.some((s) => s.note) && (
            <ul className="space-y-2 text-sm">
              {sessions.filter((s) => s.note).map((s) => (
                <li key={s.id}><span className="text-muted-foreground">{DAYS[days.indexOf(s.date)]}:</span> {s.note}</li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Ear training">
          {Object.keys(ear).length ? (
            <ul className="divide-y rounded-xl border bg-card text-sm">
              {Object.entries(ear).map(([q, s]) => (
                <li key={q} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link to={QUIZ[q]?.[1] ?? "/labs/ear"} className="hover:underline">{QUIZ[q]?.[0] ?? q}</Link>
                  <span className="text-muted-foreground tabular-nums">{s.right} of {s.total} · {pct(s)}%</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground text-sm">No ear training this week.</p>}
          {weak.length > 0 && (
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">Weak spots overall</p>
              <ul className="text-muted-foreground space-y-1">
                {weak.map((w) => <li key={w.q + w.key}>{w.key} <span className="text-xs">({QUIZ[w.q]?.[0] ?? w.q}, {Math.round(w.acc * 100)}% of {w.total})</span></li>)}
              </ul>
            </div>
          )}
        </Block>
      </div>

      {learned.length > 0 && (
        <Block title="Skills ticked off">
          <ul className="list-disc space-y-1 pl-5 text-sm">{learned.map((k) => <li key={k}>{skillName(k)}</li>)}</ul>
        </Block>
      )}

      {next.length > 0 && !future && (
        <Block title="For next week">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{next.map((t) => <li key={t} className="text-pretty">{t}</li>)}</ul>
        </Block>
      )}

      <Block title="Reflect" description="A few sentences each. They’re saved with your progress, and next week’s review shows your goal at the top.">
        <div className="grid gap-4 lg:grid-cols-3">
          {([["well", "What went well?", "Something you can now do, a sound you’re proud of"], ["hard", "What was hard?", "Where you got stuck or slowed down"], ["goal", "One goal for next week", "Specific and small, like “finish the Note Repeat walkthrough”"]] as const).map(([k, label, ph]) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={"rv-" + k}>{label}</Label>
              <Textarea id={"rv-" + k} rows={4} placeholder={ph} value={r[k]} onChange={(e) => setR(k, e.target.value)} />
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}
