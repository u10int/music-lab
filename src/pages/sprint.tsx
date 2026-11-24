import { Link, Navigate, useParams } from "react-router"
import { ArrangementMap } from "@/components/labs/arrangement-map"
import { DrumPatterns } from "@/components/labs/drum-lab"
import { EarTraining } from "@/components/labs/ear-training"
import { MixLab } from "@/components/labs/mix-lab"
import { ScalesLab } from "@/components/labs/scales-lab"
import { SliceLab } from "@/components/labs/slice-lab"
import { SynthLab } from "@/components/labs/synth-lab"
import { Block } from "@/components/page"
import { DrumLayouts } from "@/components/push/drum-layouts"
import { SprintShortcuts } from "@/components/push/recording"
import { References, Resources, Stuck } from "@/components/sprint-sections"
import { SkillList } from "@/components/skill-list"
import { SprintProofs, SprintRetro } from "@/components/today/retro"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { SPRINTS } from "@/data/sprints"
import { currentWeek, fmtDay, isoOf, minutesByDay, todayISO, update, useProgress, weekStart, type Progress } from "@/lib/store"
import { cn } from "@/lib/utils"

const LAB: Record<string, [string, () => React.ReactNode]> = {
  s1: ["The Push drum layout and starter patterns", () => <div className="space-y-10"><DrumLayouts /><DrumPatterns /></div>],
  s2: ["Scales and chords on the grid", () => <ScalesLab />],
  s3: ["Synth playground", () => <div className="space-y-4"><SynthLab /><p className="text-sm">Want to hear the sounds for your genres? <Link to="/labs/sound-design" className="underline">Play the genre sounds</Link>.</p></div>],
  s4: ["How Slice mode maps a loop to pads", () => <SliceLab />],
  s5: ["Arrangement map", () => <div className="space-y-4"><ArrangementMap /><p className="text-sm">Ready to plan your own? <Link to="/planner" className="underline">Open the track planner</Link>.</p></div>],
  s6: ["Mix references", () => <MixLab />],
}

/** Big progress figure, the sprint's 14 days with practice minutes, and the goal. */
function SprintHeader({ p, s, w1, end, isNow }: { p: Progress; s: (typeof SPRINTS)[number]; w1: number; end: Date; isNow: boolean }) {
  const keys = s.skills.map((_, i) => s.id + "-" + i), learned = keys.filter((k) => p.done[k]).length
  const pct = Math.round(((learned + (p.shipped[s.id] ? 1 : 0)) / (keys.length + 1)) * 100)
  const mins = minutesByDay(p), today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = weekStart(p, w1)
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    return { iso, d, m: mins.get(iso) ?? 0, isToday: iso === today, future: iso > today }
  })
  const total = days.reduce((a, x) => a + x.m, 0), top = Math.max(120, ...days.map((x) => x.m))
  const learnedDays = new Set(keys.map((k) => p.doneAt?.[k]).filter(Boolean))
  return (
    <header className="space-y-6">
      <div className="grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Sprint {s.n} of 6 · Weeks {w1}–{w1 + 1}, {fmtDay.format(weekStart(p, w1))} to {fmtDay.format(end)}{isNow ? " · Now" : ""}</p>
          <h1 className="text-title font-medium text-balance">{s.title}</h1>
          <p className="text-lead max-w-2xl text-pretty">{s.goal}</p>
        </div>
        <div className="flex items-end gap-5 md:justify-end">
          <p className="leading-none">
            <span className="block text-7xl font-medium tabular-nums sm:text-8xl">{pct}<span className="text-3xl">%</span></span>
          </p>
          <dl className="grid gap-1 pb-1 text-sm tabular-nums">
            <div className="flex gap-2"><dt className="text-muted-foreground">Skills</dt><dd>{learned} of {keys.length}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground">Deliverable</dt><dd>{p.shipped[s.id] ? "Shipped" : "Not yet"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground">Practiced</dt><dd>{total >= 60 ? `${Math.floor(total / 60)} h ${total % 60} m` : `${total} min`}</dd></div>
          </dl>
        </div>
      </div>
      <div className="border-t border-foreground pt-3">
        <ol className="grid grid-cols-14 gap-1" aria-label="Practice minutes on each day of this sprint">
          {days.map((x, i) => (
            <li key={x.iso} className={cn("grid min-w-0 gap-1.5", i === 7 && "border-l border-foreground/30 pl-1")}>
              <span className="relative block h-16 bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)]" aria-hidden="true">
                <span className="absolute inset-x-0 bottom-0 bg-[var(--c)] transition-[height] duration-500" style={{ height: `${(x.m / top) * 100}%` }} />
                {learnedDays.has(x.iso) && <span className="absolute top-1 left-1/2 size-1.5 -translate-x-1/2 bg-foreground" />}
              </span>
              <span className={cn("truncate text-center text-[11px] leading-tight tabular-nums", x.isToday ? "font-semibold" : "text-muted-foreground")}>
                {x.d.toLocaleDateString(undefined, { weekday: "narrow" })}<span className="hidden sm:inline"> {x.d.getDate()}</span>
              </span>
              <span className="sr-only">{fmtDay.format(x.d)}: {x.future ? "upcoming" : `${x.m} minutes`}{x.isToday ? ", today" : ""}{learnedDays.has(x.iso) ? ", learned a skill" : ""}</span>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 text-xs">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2 bg-[var(--c)]" aria-hidden="true" />Minutes practiced</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-1.5 bg-foreground" aria-hidden="true" />Learned a skill</span>
        </p>
      </div>
    </header>
  )
}

export function SprintPage() {
  const { n } = useParams()
  const p = useProgress()
  const s = SPRINTS.find((x) => String(x.n) === n)
  if (!s) return <Navigate to="/" replace />
  const cur = currentWeek(p)
  const dayCol = ({ 1: 0, 2: 1, 3: 1, 4: 1, 5: 2, 6: 3, 0: 3 } as Record<number, number>)[cur.day]
  const w1 = s.n * 2 - 1
  const end = weekStart(p, w1 + 1)
  end.setDate(end.getDate() + 6)
  const isNow = cur.week === w1 || cur.week === w1 + 1

  return (
    <div className="space-y-10" style={{ ["--c" as string]: `var(${s.c})` }}>
      <SprintHeader p={p} s={s} w1={w1} end={end} isNow={isNow} />

      <SkillList s={s} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1"><h2 className="font-sans font-semibold">Done when</h2><p className="text-pretty">{s.done}</p></div>
            <div className="space-y-1"><h2 className="font-sans font-semibold">When to use the mouse</h2><p className="text-pretty">{s.mouse}</p></div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans font-semibold">Deliverable</h2>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Checkbox checked={!!p.shipped[s.id]} onCheckedChange={(v) => update((d) => { d.shipped[s.id] = v === true })} />Shipped
              </Label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid h-full grid-rows-[auto_1fr] gap-1.5">
              <Label htmlFor={"log-" + s.id} className="text-base font-semibold">Practice log</Label>
              <Textarea id={"log-" + s.id} value={p.log[s.id] ?? ""} onChange={(e) => update((d) => { d.log[s.id] = e.target.value })} placeholder="Swing at 58% finally felt right. Note Repeat still awkward. Next: groove pool?" className="min-h-24 text-base sm:text-sm" />
          </CardContent>
        </Card>
      </div>

      <Block title="Week by week">
        <div className="space-y-3">
          {s.weeks.map((w, wi) => {
            const wn = w1 + wi, isThis = cur.week === wn
            const slots: [string, string][] = [["Mon", w.mon], ["Tue–Thu", w.mid], ["Fri", w.fri], ["Weekend", w.wknd]]
            return (
              <div key={wn} className="grid gap-2 md:grid-cols-[110px_repeat(4,minmax(0,1fr))]">
                <div className="text-sm"><b className="block">Week {wn}</b><span className="text-muted-foreground">{fmtDay.format(weekStart(p, wn))}</span></div>
                {slots.map(([d, t], ci) => {
                  const today = isThis && dayCol === ci
                  const first = weekStart(p, wn)
                  first.setDate(first.getDate() + [0, 1, 4, 5][ci])
                  return (
                    <Link key={d} to={`/today?day=${isoOf(first)}`} className={cn("group flex flex-col border bg-card p-3 text-sm transition-[border-color] duration-150 hover:border-foreground", today && "border-foreground")}>
                      <div className="text-muted-foreground mb-1 flex justify-between text-xs"><span>{d}</span>{today && <span className="text-foreground font-semibold">Today</span>}</div>
                      <div className="text-pretty">{t}</div>
                      <span className="text-muted-foreground mt-auto pt-2 text-xs group-hover:text-foreground group-hover:underline">Open the plan</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </Block>

      <SprintProofs p={p} s={s} />
      <SprintRetro p={p} s={s} />

      <Card><CardContent className="space-y-6"><h2 className="text-heading font-medium">{LAB[s.id][0]}</h2>{LAB[s.id][1]()}</CardContent></Card>
      {s.id === "s2" && <Card><CardContent className="space-y-4"><h2 className="text-heading font-medium">Ear training</h2><EarTraining /></CardContent></Card>}
      <SprintShortcuts sprintId={s.id} />
      <References s={s} />
      <Resources s={s} />
      <Stuck s={s} />
    </div>
  )
}
