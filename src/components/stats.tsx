import { Link } from "react-router"
import { SPRINTS } from "@/data/sprints"
import { fmtDay, isoOf, minutesByDay, mondayOf, todayISO, weekStart, type Progress } from "@/lib/store"
import { cn } from "@/lib/utils"

/** A progress ring. `value` is 0–1; children sit in the middle. */
export function Ring({ value, size = 120, stroke = 10, label, children, className }: { value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode; className?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value))
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[color-mix(in_oklab,var(--c,var(--foreground))_16%,transparent)]" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          className="stroke-[var(--c,var(--foreground))] transition-[stroke-dashoffset] duration-500 ease-out" style={{ opacity: v ? 1 : 0 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

const DAY_PLAN: Record<number, [string, number]> = { 1: ["Learn", 60], 2: ["Practice", 60], 3: ["Practice", 60], 4: ["Practice", 60], 5: ["Reference", 60], 6: ["Build", 150], 0: ["Build", 150] }
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Monday to Sunday: minutes practiced each day against that day's plan. */
export function WeekStrip({ p }: { p: Progress }) {
  const days = minutesByDay(p), mon = mondayOf(new Date()), today = todayISO()
  const cols = DAY_NAMES.map((name, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const iso = isoOf(d), [kind, plan] = DAY_PLAN[d.getDay()]
    return { name, iso, kind, plan, min: days.get(iso) ?? 0, isToday: iso === today, future: iso > today }
  })
  const top = Math.max(150, ...cols.map((c) => c.min))
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Practice this week">
      {cols.map((c) => {
        const met = c.min >= c.plan
        return (
          <li key={c.iso} className={cn("flex min-w-0 flex-col gap-2 rounded-lg p-1.5 sm:p-2", c.isToday && "bg-[color-mix(in_oklab,var(--c)_12%,transparent)]")}>
            <div className="relative h-24 overflow-hidden rounded-md bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]" aria-hidden="true">
              <span className="absolute inset-x-0 border-t border-dashed border-[color-mix(in_oklab,var(--foreground)_25%,transparent)]" style={{ bottom: `${(c.plan / top) * 100}%` }} />
              <span className={cn("absolute inset-x-0 bottom-0 rounded-md transition-[height] duration-500 ease-out", met ? "bg-[var(--c)]" : "bg-[color-mix(in_oklab,var(--c)_55%,transparent)]")} style={{ height: `${(c.min / top) * 100}%` }} />
            </div>
            <div className="min-w-0 text-center leading-tight">
              <p className={cn("text-xs font-semibold", c.isToday ? "text-foreground" : "text-muted-foreground")}>{c.name}</p>
              <p className="text-muted-foreground hidden truncate text-[11px] sm:block">{c.kind}</p>
              <p className="text-[11px] tabular-nums">{c.future ? "" : c.min ? `${c.min}m` : "–"}</p>
            </div>
            <span className="sr-only">{c.name}, {c.kind} day: {c.min} of {c.plan} minutes{c.isToday ? ", today" : ""}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** The 12 weeks as six colored sprint segments, with a marker on the current week. */
export function SprintTimeline({ p, week }: { p: Progress; week: number }) {
  return (
    <div className="space-y-2">
      <div className="relative grid grid-cols-6 gap-1">
        {SPRINTS.map((s, i) => {
          const w1 = i * 2 + 1, part = week < w1 ? 0 : week >= w1 + 2 ? 1 : (week - w1 + 0.5) / 2
          return (
            <Link key={s.id} to={`/sprints/${s.n}`} aria-label={`Sprint ${s.n}: ${s.title}, weeks ${w1}–${w1 + 1}`}
              className="group grid gap-1.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" style={{ ["--sc" as string]: `var(${s.c})` }}>
              <span className="relative h-2.5 overflow-hidden rounded-none bg-[color-mix(in_oklab,var(--sc)_22%,transparent)]">
                <span className="absolute inset-y-0 left-0 rounded-none bg-[var(--sc)] transition-[width] duration-500" style={{ width: `${part * 100}%` }} />
              </span>
              <span className={cn("truncate text-xs group-hover:underline", week >= w1 && week <= w1 + 1 ? "text-foreground font-semibold" : "text-muted-foreground")}>
                <span className="tabular-nums">{s.n}</span><span className="hidden sm:inline"> · {s.short}</span>
              </span>
            </Link>
          )
        })}
      </div>
      <p className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span>{fmtDay.format(weekStart(p, 1))}</span>
        <span>{fmtDay.format(new Date(weekStart(p, 12).getTime() + 6 * 86400000))}</span>
      </p>
    </div>
  )
}

/** Practice minutes per day for the last `weeks` weeks, one column per week. */
export function PracticeHeatmap({ p, weeks = 16 }: { p: Progress; weeks?: number }) {
  const days = minutesByDay(p), today = todayISO()
  const first = mondayOf(new Date())
  first.setDate(first.getDate() - (weeks - 1) * 7)
  const level = (m: number) => (m === 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4)
  const shade = ["bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]", "bg-[color-mix(in_oklab,var(--s3)_35%,transparent)]", "bg-[color-mix(in_oklab,var(--s3)_60%,transparent)]", "bg-[color-mix(in_oklab,var(--s3)_82%,transparent)]", "bg-[var(--s3)]"]
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const x = new Date(first)
    x.setDate(first.getDate() + w * 7 + d)
    const iso = isoOf(x)
    return { iso, m: days.get(iso) ?? 0, future: iso > today, x }
  }))
  let total = 0, active = 0
  cols.flat().forEach((c) => { total += c.m; if (c.m) active++ })
  return (
    <div className="space-y-3">
      <div className="flex gap-1 pb-1" role="img" aria-label={`Practice over the last ${weeks} weeks: ${active} days, ${Math.round(total / 60)} hours`}>
        <div className="text-muted-foreground grid shrink-0 grid-rows-7 gap-1 pr-1 text-[10px] leading-none" aria-hidden="true">
          {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => <span key={i} className="flex items-center">{d}</span>)}
        </div>
        {cols.map((col, w) => (
          <div key={w} className="grid max-w-5 min-w-0 flex-1 grid-rows-7 gap-1">
            {col.map((c) => (
              <span key={c.iso} title={c.future ? undefined : `${fmtDay.format(c.x)}: ${c.m ? c.m + " min" : "no practice"}`}
                className={cn("aspect-square w-full rounded-none", c.future ? "bg-transparent" : shade[level(c.m)], c.iso === today && "ring-1 ring-foreground ring-offset-1 ring-offset-card")} />
            ))}
          </div>
        ))}
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="tabular-nums">{active} days · {Math.round(total / 60)} hours in {weeks} weeks</span>
        <span className="flex items-center gap-1" aria-hidden="true">Less{shade.map((s, i) => <span key={i} className={cn("size-3 rounded-none", s)} />)}More</span>
      </div>
    </div>
  )
}
