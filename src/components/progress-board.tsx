import { useState } from "react"
import { Link } from "react-router"
import { SPRINTS } from "@/data/sprints"
import { update, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

const ROWS = 7

/** The 6×7 pad board: one column per sprint, one pad per skill, the last pad is the deliverable. */
export function ProgressBoard({ current }: { current: number }) {
  const p = useProgress()
  const [info, setInfo] = useState<{ text: string; st: string } | null>(null)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid max-w-3xl min-w-[480px] grid-cols-6 gap-2">
          {SPRINTS.map((s, si) => (
            <div key={s.id} className="grid gap-1.5" style={{ ["--c" as string]: `var(${s.c})` }}>
              <Link
                to={`/sprints/${s.n}`}
                aria-label={`Sprint ${s.n}: ${s.title}`}
                aria-current={si === current ? "true" : undefined}
                className={cn("flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-accent", si === current && "bg-accent")}
              >
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--c)]" />
                <span className="font-semibold tabular-nums">{s.n}</span>
                <span className="truncate">{s.short}</span>
              </Link>
              {Array.from({ length: ROWS }, (_, r) => {
                const ship = r === ROWS - 1
                if (!ship && r >= s.skills.length) return <span key={r} aria-hidden="true" className="aspect-[1.6] rounded-md bg-pad-empty" />
                const key = s.id + "-" + r
                const on = ship ? !!p.shipped[s.id] : !!p.done[key]
                const label = ship ? `Sprint ${s.n} deliverable shipped` : `Sprint ${s.n}: ${s.skills[r]}`
                const i = ship ? { text: `Sprint ${s.n} deliverable: ${s.goal}`, st: on ? "Shipped" : "Not shipped" } : { text: `Sprint ${s.n}, skill ${r + 1}: ${s.skills[r]}`, st: on ? "Done" : "Not done" }
                return (
                  <button
                    key={r}
                    type="button"
                    aria-label={label}
                    aria-pressed={on}
                    onMouseEnter={() => setInfo(i)}
                    onFocus={() => setInfo(i)}
                    onMouseLeave={() => setInfo(null)}
                    onBlur={() => setInfo(null)}
                    onClick={() => update((d) => { if (ship) d.shipped[s.id] = !on; else d.done[key] = !on })}
                    className={cn(
                      "relative aspect-[1.6] cursor-pointer rounded-md border-[1.5px] border-pad-edge bg-card transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.96]",
                      on && "border-transparent bg-[var(--c)]",
                      ship && !on && "border-dashed",
                      ship && "after:absolute after:top-1/2 after:left-1/2 after:size-3.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border-[1.5px] after:border-current after:opacity-60",
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground flex min-h-10 flex-wrap items-baseline justify-between gap-x-4 text-sm" aria-hidden="true">
        {info ? <><span className="text-foreground">{info.text}</span><span>{info.st}</span></> : "Point at or tab to a pad to see what it tracks. Click to mark it done."}
      </p>
    </div>
  )
}
