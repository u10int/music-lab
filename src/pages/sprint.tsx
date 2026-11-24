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
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { SPRINTS } from "@/data/sprints"
import { currentWeek, fmtDay, update, useProgress, weekStart } from "@/lib/store"
import { cn } from "@/lib/utils"

const LAB: Record<string, [string, () => React.ReactNode]> = {
  s1: ["The Push drum layout and starter patterns", () => <div className="space-y-10"><DrumLayouts /><DrumPatterns /></div>],
  s2: ["Scales and chords on the grid", () => <ScalesLab />],
  s3: ["Synth playground", () => <div className="space-y-4"><SynthLab /><p className="text-sm">Want to hear the sounds for your genres? <Link to="/labs/sound-design" className="underline">Play the genre sounds</Link>.</p></div>],
  s4: ["How Slice mode maps a loop to pads", () => <SliceLab />],
  s5: ["Arrangement map", () => <div className="space-y-4"><ArrangementMap /><p className="text-sm">Ready to plan your own? <Link to="/planner" className="underline">Open the track planner</Link>.</p></div>],
  s6: ["Mix references", () => <MixLab />],
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
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm">Weeks {w1}–{w1 + 1}, {fmtDay.format(weekStart(p, w1))} to {fmtDay.format(end)}{isNow ? " · Current sprint" : ""}</p>
        <h1 className="flex items-center gap-3 text-4xl leading-[1.1] font-medium sm:text-5xl"><span aria-hidden="true" className="size-3 rounded-full bg-[var(--c)]" />Sprint {s.n}: {s.title}</h1>
        <p className="max-w-2xl text-lg text-pretty">{s.goal}</p>
      </header>

      <SkillList s={s} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1"><h2 className="font-sans text-base font-semibold tracking-normal">Done when</h2><p className="text-pretty">{s.done}</p></div>
            <div className="space-y-1"><h2 className="font-sans text-base font-semibold tracking-normal">When to use the mouse</h2><p className="text-pretty">{s.mouse}</p></div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans text-base font-semibold tracking-normal">Deliverable</h2>
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
                  return (
                    <div key={d} className={cn("rounded-lg border bg-card p-3 text-sm", today && "border-foreground")}>
                      <div className="text-muted-foreground mb-1 flex justify-between text-xs"><span>{d}</span>{today && <span className="text-foreground font-semibold">Today</span>}</div>
                      <div className="text-pretty">{t}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </Block>

      <Card><CardContent className="space-y-6"><h2 className="text-xl font-medium">{LAB[s.id][0]}</h2>{LAB[s.id][1]()}</CardContent></Card>
      {s.id === "s2" && <Card><CardContent className="space-y-4"><h2 className="text-xl font-medium">Ear training</h2><EarTraining /></CardContent></Card>}
      <SprintShortcuts sprintId={s.id} />
      <References s={s} />
      <Resources s={s} />
      <Stuck s={s} />
    </div>
  )
}
