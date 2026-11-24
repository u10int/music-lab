import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SKILL_GUIDES } from "@/data/skill-guides"
import type { Sprint } from "@/data/sprints"
import { update, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

const stepsDone = (p: ReturnType<typeof useProgress>, key: string) => p.skillSteps?.[key] ?? []

function setStep(key: string, i: number, on: boolean) {
  update((d) => {
    d.skillSteps ??= {}
    const cur = new Set(d.skillSteps[key] ?? [])
    if (on) cur.add(i)
    else cur.delete(i)
    d.skillSteps[key] = [...cur].sort((a, b) => a - b)
  })
}
const setLearned = (key: string, on: boolean) => update((d) => { d.done[key] = on })

/** The sprint's skills as a checklist, each with a step-by-step walkthrough in a side panel. */
export function SkillList({ s }: { s: Sprint }) {
  const p = useProgress()
  const [params, setParams] = useSearchParams()
  const keys = s.skills.map((_, i) => s.id + "-" + i)
  const openKey = keys.includes(params.get("skill") ?? "") ? params.get("skill")! : null
  const open = (key: string | null) => setParams((sp) => { if (key) sp.set("skill", key); else sp.delete("skill"); return sp }, { replace: !!openKey && !!key })
  const doneN = keys.filter((k) => p.done[k]).length

  return (
    <section className="space-y-4" aria-labelledby="skills-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="skills-h" className="font-sans text-base font-semibold tracking-normal">Skills</h2>
          <p className="text-muted-foreground text-sm">Each skill has a short walkthrough to follow on Push. Tick a skill once you can do it without the steps.</p>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">{doneN} of {keys.length} learned</span>
      </div>
      <Progress value={(doneN / keys.length) * 100} aria-hidden="true" className="[&>div]:bg-[var(--c)]" />
      <ol className="divide-y rounded-xl border bg-card">
        {s.skills.map((title, i) => {
          const key = keys[i], g = SKILL_GUIDES[key], learned = !!p.done[key], n = stepsDone(p, key).length
          const status = learned ? "Learned" : !g ? "" : n === 0 ? "Not started" : n >= g.steps.length ? "All steps done" : `${n} of ${g.steps.length} steps`
          return (
            <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <Checkbox id={key} checked={learned} onCheckedChange={(v) => setLearned(key, v === true)} aria-describedby={key + "-meta"} />
              <div className="min-w-0 flex-1">
                <Label htmlFor={key} className={cn("leading-snug font-normal", learned && "text-muted-foreground")}>{title}</Label>
                {g && <p id={key + "-meta"} className="text-muted-foreground mt-0.5 text-xs tabular-nums">{g.min} min · {status}</p>}
              </div>
              {g && (
                <Button variant={n > 0 && !learned ? "default" : "outline"} size="sm" className="ml-7 sm:ml-0" onClick={() => open(key)}>
                  {learned ? "Review" : n > 0 ? "Continue" : "Walk through"}
                </Button>
              )}
            </li>
          )
        })}
      </ol>

      <Sheet open={!!openKey} onOpenChange={(o) => { if (!o) open(null) }}>
        <SheetContent className="w-full gap-0 overflow-y-auto overscroll-contain sm:max-w-lg">
          {openKey && <Walkthrough s={s} skey={openKey} onGo={open} />}
        </SheetContent>
      </Sheet>
    </section>
  )
}

function Walkthrough({ s, skey, onGo }: { s: Sprint; skey: string; onGo: (k: string) => void }) {
  const p = useProgress()
  const i = +skey.split("-")[1], g = SKILL_GUIDES[skey]
  const done = new Set(stepsDone(p, skey)), learned = !!p.done[skey]
  const current = g.steps.findIndex((_, k) => !done.has(k))
  const prev = i > 0 ? `${s.id}-${i - 1}` : null, next = i < s.skills.length - 1 ? `${s.id}-${i + 1}` : null

  return (
    <>
      <SheetHeader className="gap-2 border-b p-5 pr-12">
        <p className="text-muted-foreground text-sm">Sprint {s.n} · Skill {i + 1} of {s.skills.length}</p>
        <SheetTitle className="text-lg leading-snug">{s.skills[i]}</SheetTitle>
        <SheetDescription className="text-pretty">{g.why}</SheetDescription>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm"><Clock className="size-4" />About {g.min} minutes</p>
      </SheetHeader>

      <div className="space-y-8 p-5">
        <section className="space-y-3" aria-labelledby="wt-steps">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="wt-steps" className="font-semibold">Steps</h3>
            <span className="text-muted-foreground text-sm tabular-nums">{done.size} of {g.steps.length}</span>
          </div>
          <ol className="space-y-2">
            {g.steps.map((t, k) => {
              const on = done.has(k), isCur = k === current
              const id = `${skey}-step-${k}`
              return (
                <li key={k} className={cn("rounded-lg border p-3 transition-[border-color,background-color] duration-150", isCur ? "border-foreground bg-card" : "border-transparent", on && "text-muted-foreground")}>
                  <div className="grid grid-cols-[auto_1.25rem_minmax(0,1fr)] items-start gap-2">
                    <Checkbox id={id} checked={on} onCheckedChange={(v) => setStep(skey, k, v === true)} className="mt-0.5" />
                    <span aria-hidden="true" className="text-sm font-semibold tabular-nums">{k + 1}</span>
                    <Label htmlFor={id} className="text-sm leading-relaxed font-normal text-pretty">{t}</Label>
                  </div>
                  {isCur && (
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" data-wt-next="" onClick={() => {
                        setStep(skey, k, true)
                        // Keep keyboard focus on the walkthrough: the next step's button, or the learned button at the end.
                        requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-wt-next], [data-wt-learned]")?.focus())
                      }}><Check />{k === g.steps.length - 1 ? "Done" : "Done, next step"}</Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold">You’ve got it when</h3>
          <p className="text-sm text-pretty">{g.check}</p>
        </section>
        <section className="space-y-1.5">
          <h3 className="font-semibold">Practice</h3>
          <p className="text-sm text-pretty">{g.drill}</p>
          {g.tip && <p className="text-muted-foreground text-sm text-pretty">Tip: {g.tip}</p>}
        </section>
        {g.links.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold">Open in Music Lab</h3>
            <ul className="flex flex-wrap gap-2">
              {g.links.map(([label, to]) => <li key={to + label}><Button variant="outline" size="sm" asChild><Link to={to}>{label}</Link></Button></li>)}
            </ul>
          </section>
        )}
      </div>

      <SheetFooter className="sticky bottom-0 gap-3 border-t bg-background p-4">
        <Button data-wt-learned="" variant={learned ? "outline" : "default"} onClick={() => setLearned(skey, !learned)}>
          {learned ? "Mark as not learned yet" : "I can do this: mark as learned"}
        </Button>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={!prev} onClick={() => prev && onGo(prev)}><ArrowLeft />Previous skill</Button>
          <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onGo(next)}>Next skill<ArrowRight /></Button>
        </div>
      </SheetFooter>
    </>
  )
}
