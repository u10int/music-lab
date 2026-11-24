import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useKey } from "@/components/key-picker"
import { StuckPanel, withFrom } from "@/components/today/parts"
import { fmtClock, type TimerSession } from "@/components/practice-timer"
import { buildDay } from "@/lib/day"
import { setPref, todayISO, update, usePref, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * One step at a time: the instruction, a countdown for it, the tool it needs
 * open right below, and Back and Next. Next ticks the step off on the day's
 * plan. Starts the practice timer if it isn't running.
 */
export function PracticeModePage() {
  const p = useProgress()
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const sel = params.get("day") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("day")!) ? params.get("day")! : today
  const isToday = sel === today
  const { root, scale } = useKey()
  const [short] = usePref<boolean>("short-" + sel, false)
  const D = buildDay(p, sel, { root, scale, short })
  const items = [
    ...D.warm.map((w) => ({ ...w, kind: "Warm-up", title: w.text.split(/[.:]/)[0] })),
    ...D.steps.map((s) => ({ ...s, kind: "Session" })),
  ]
  const [checks, setChecks] = usePref<Record<string, boolean>>("today-" + sel, {})
  const firstOpen = Math.max(0, items.findIndex((it) => !checks[it.id]))
  const idx = Math.min(items.length - 1, Math.max(0, Number(params.get("step") ?? firstOpen)))
  const go = (i: number) => setParams((sp) => { sp.set("step", String(i)); return sp }, { replace: true })
  const it = items[idx]

  // Practice timer for the whole session.
  const [timerStart] = usePref<number | null>("timer-start", null)
  useEffect(() => {
    if (timerStart || !items.length) return
    setPref<TimerSession>("timer-session", { href: "/today" + (isToday ? "" : `?day=${sel}`), label: D.inPlan ? `Sprint ${D.s.n} · Day ${D.sprintDay} of 14` : "Practice session" })
    setPref("timer-start", Date.now())
    }, [])

  if (!D.plan || !it) {
    return (
      <div className="space-y-4">
        <p>There’s no plan for this day.</p>
        <Button variant="outline" asChild><Link to="/today">Back to Today</Link></Button>
      </div>
    )
  }
  const done = items.filter((x) => checks[x.id]).length
  const next = () => {
    const nx = { ...checks, [it.id]: true }
    setChecks(nx)
    if (D.steps.length && D.steps.every((st) => nx[st.id]) && !p.daysDone?.[sel]) update((d) => { d.daysDone ??= {}; d.daysDone[sel] = true })
    if (idx < items.length - 1) go(idx + 1)
  }
  const internal = it.link && !/^https?:/.test(it.link.to)
  const embedSrc = internal ? withFrom(it.link!.to, sel, isToday).replace("from=today", "embed=1") : null
  const finished = done === items.length
  const backHref = "/today" + (isToday ? "" : `?day=${sel}`)

  return (
    <div className="space-y-6" style={{ ["--c" as string]: `var(${D.s.c})` }}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to={backHref}><ArrowLeft />Back to the plan</Link></Button>
        <p className="text-muted-foreground text-sm">Sprint {D.s.n} · {D.slotName} · {D.s.weeks[D.weekInSprint][D.slot]}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span>{it.kind} · {idx + 1} of {items.length}</span>
          <span className="text-muted-foreground">{done} done</span>
        </div>
        <Progress value={(done / items.length) * 100} aria-hidden="true" className="h-1 [&>div]:bg-[var(--c)]" />
        <ol className="flex flex-wrap gap-1" aria-label="Steps">
          {items.map((x, i) => (
            <li key={x.id}>
              <button type="button" onClick={() => go(i)} aria-current={i === idx ? "step" : undefined} aria-label={`${x.kind} ${i + 1}: ${x.title}${checks[x.id] ? ", done" : ""}`}
                className={cn("grid size-7 place-items-center border text-xs tabular-nums", i === idx ? "border-foreground bg-foreground text-background" : checks[x.id] ? "border-transparent bg-[color-mix(in_oklab,var(--c)_25%,transparent)]" : "border-foreground/30 hover:border-foreground")}>
                {checks[x.id] && i !== idx ? <Check className="size-3.5" /> : i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <section aria-live="polite" className="grid gap-6 border-y border-foreground py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0 space-y-3">
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">{it.kind}{it.tag && <span className="border border-foreground/40 px-1 text-xs text-foreground">{it.tag}</span>}<span className="tabular-nums">· {it.min} min</span></p>
          <h1 className="text-3xl leading-tight font-medium text-balance sm:text-4xl">{it.kind === "Session" ? it.title : it.text}</h1>
          {it.kind === "Session" && <p className="max-w-3xl text-lg text-pretty">{it.text}</p>}
          {it.link && !internal && <Button variant="outline" asChild><a href={it.link.to} target="_blank" rel="noopener">{it.link.label}<ArrowUpRight /></a></Button>}
        </div>
        <StepTimer key={it.id} min={it.min} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={idx === 0} onClick={() => go(idx - 1)}><ArrowLeft />Previous</Button>
        <Button size="lg" onClick={next}>{idx === items.length - 1 ? <><Check />Finish</> : <>Done, next step<ArrowRight /></>}</Button>
        {finished && <span className="text-sm" role="status">Every step is done. <Link to={backHref} className="underline">Back to the plan</Link> to reflect and log your time.</span>}
      </div>

      <StuckPanel smaller={D.smaller} stuck={D.stuck} sel={sel} isToday={isToday} />

      {embedSrc && (
        <section aria-label={it.link!.label} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">{it.link!.label}</h2>
            <Link to={withFrom(it.link!.to, sel, isToday)} className="text-sm underline">Open full page</Link>
          </div>
          <iframe key={embedSrc} src={embedSrc} title={it.link!.label} className="h-[75vh] w-full border" />
        </section>
      )}
    </div>
  )
}

/** A countdown for one step. Keyed by step, so it resets when the step changes. */
function StepTimer({ min }: { min: number }) {
  const [left, setLeft] = useState(min * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  const over = left === 0
  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <p className={cn("text-5xl font-medium tabular-nums", over && "text-[#23782b]")} role="timer" aria-label={`${Math.ceil(left / 60)} minutes left on this step`}>{fmtClock(left)}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={over} onClick={() => setRunning(!running)}>{running && !over ? <><Pause />Pause</> : <><Play />Start step timer</>}</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Reset the step timer" onClick={() => { setRunning(false); setLeft(min * 60) }}><RotateCcw /></Button>
      </div>
      {over && <p className="text-sm" role="status">Time’s up. Wrap this step and move on.</p>}
    </div>
  )
}
