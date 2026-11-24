import { useState } from "react"
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react"
import { Block, Caption, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LANES, SECTIONS, ST_SHORT, ST_TXT, type LaneState } from "@/data/labs"
import { uid, update, useProgress, type TrackPlan } from "@/lib/store"
import { cn } from "@/lib/utils"

const CELL: Record<LaneState, string> = {
  on: "bg-[var(--s5)] text-white",
  off: "bg-transparent shadow-[inset_0_0_0_1px_var(--border)]",
  half: "bg-[linear-gradient(90deg,transparent_50%,var(--s5)_50%)] shadow-[inset_0_0_0_1px_var(--border)]",
  filt: "bg-[color-mix(in_oklab,var(--s5)_35%,var(--card))]",
  riser: "bg-foreground/10",
  impact: "bg-foreground/10",
  sweep: "bg-foreground/10",
}
const CYCLE: LaneState[] = ["off", "on", "filt", "half"]
const FX_CYCLE: LaneState[] = ["off", "riser", "impact", "sweep"]
const BARS = [2, 4, 8, 16, 32]
const mmss = (s: number) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0")

function template(): TrackPlan {
  const sections = SECTIONS.map(([name, bars, energy]) => ({ id: uid(), name, bars, energy }))
  return {
    title: "My progressive house track",
    tempo: 122,
    sections,
    lanes: LANES.map(([name, st]) => ({ id: uid(), name, fx: name === "FX", cells: Object.fromEntries(sections.map((s, i) => [s.id, st[i]])) })),
  }
}
function blank(): TrackPlan {
  const sections = [["Intro", 8, 2], ["Verse", 16, 4], ["Build", 8, 6], ["Drop", 16, 9], ["Outro", 8, 2]].map(([name, bars, energy]) => ({ id: uid(), name: name as string, bars: bars as number, energy: energy as number }))
  return { title: "Untitled track", tempo: 124, sections, lanes: ["Drums", "Bass", "Chords", "Lead", "FX"].map((name) => ({ id: uid(), name, fx: name === "FX", cells: {} })) }
}

export function PlannerPage() {
  const p = useProgress()
  const [confirming, setConfirming] = useState(false)
  const plan = p.plan
  const edit = (fn: (d: TrackPlan) => void) => update((d) => { if (d.plan) fn(d.plan) })

  if (!plan)
    return (
      <div className="space-y-10">
        <PageHeader title="Track planner">Sketch your track before you build it: the sections, how long each is, how intense it should feel, and which parts play where. This is the Sprint 5 map, made editable for your own track.</PageHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => update((d) => { d.plan = template() })}>Start from the progressive house map</Button>
          <Button variant="outline" onClick={() => update((d) => { d.plan = blank() })}>Start with a simple outline</Button>
        </div>
      </div>
    )

  const total = plan.sections.reduce((a, s) => a + s.bars, 0), barS = (4 * 60) / plan.tempo
  const starts = plan.sections.map((_, i) => plan.sections.slice(0, i).reduce((a, s) => a + s.bars, 0))
  const move = (i: number, dir: -1 | 1) => edit((d) => { const j = i + dir; if (j < 0 || j >= d.sections.length) return; [d.sections[i], d.sections[j]] = [d.sections[j], d.sections[i]] })

  return (
    <div className="space-y-10">
      <PageHeader title="Track planner">Click a cell to change what that part does in that section. Changes save as you go.</PageHeader>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid w-full max-w-sm gap-1.5"><Label htmlFor="pl-title">Track</Label><Input id="pl-title" value={plan.title} onChange={(e) => edit((d) => { d.title = e.target.value })} className="text-base sm:text-sm" /></div>
        <div className="grid w-24 gap-1.5"><Label htmlFor="pl-tempo">Tempo</Label><Input id="pl-tempo" type="number" inputMode="numeric" min={60} max={200} value={plan.tempo} onChange={(e) => edit((d) => { d.tempo = Math.max(60, Math.min(200, Number(e.target.value) || 120)) })} className="text-base tabular-nums sm:text-sm" /></div>
        <p className="text-muted-foreground pb-2 text-sm tabular-nums">{total} bars · {mmss(total * barS)}</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <table style={{ minWidth: 170 + plan.sections.length * 132 }} className="w-full table-fixed border-separate border-spacing-x-[3px] border-spacing-y-1.5 text-sm">
          <colgroup><col className="w-40" />{plan.sections.map((s) => <col key={s.id} />)}</colgroup>
          <thead>
            <tr>
              <td />
              {plan.sections.map((s, i) => (
                <th key={s.id} scope="col" className="space-y-1 text-left align-bottom font-normal">
                  <Input aria-label={`Section ${i + 1} name`} value={s.name} onChange={(e) => edit((d) => { d.sections[i].name = e.target.value })} className="h-8 px-2 font-semibold" />
                  <div className="flex items-center gap-1">
                    <Select value={String(s.bars)} onValueChange={(v) => edit((d) => { d.sections[i].bars = +v })}>
                      <SelectTrigger size="sm" className="h-7 w-full min-w-0 px-2 text-xs" aria-label={`${s.name} length`}><SelectValue /></SelectTrigger>
                      <SelectContent>{BARS.map((b) => <SelectItem key={b} value={String(b)}>{b} bars</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-1 text-xs tabular-nums">
                    <span>{mmss(starts[i] * barS)}</span>
                    <span className="ml-auto flex">
                      <Button variant="ghost" size="icon" className="size-6" aria-label={`Move ${s.name} earlier`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-6" aria-label={`Move ${s.name} later`} disabled={i === plan.sections.length - 1} onClick={() => move(i, 1)}><ArrowRight className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-6" aria-label={`Delete ${s.name}`} disabled={plan.sections.length <= 1} onClick={() => edit((d) => { d.sections.splice(i, 1) })}><Trash2 className="size-3.5" /></Button>
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="text-left font-normal">Energy</th>
              {plan.sections.map((s, i) => (
                <td key={s.id} className="align-bottom">
                  <div className="flex h-10 min-w-0 items-end gap-1">
                    <span aria-hidden="true" className="block min-w-2 flex-1 rounded-sm bg-foreground/70" style={{ height: `${s.energy * 10}%` }} />
                    <Select value={String(s.energy)} onValueChange={(v) => edit((d) => { d.sections[i].energy = +v })}>
                      <SelectTrigger size="sm" className="h-7 w-14 px-1.5 text-xs tabular-nums" aria-label={`${s.name} energy, 1 to 10`}><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 10 }, (_, k) => <SelectItem key={k} value={String(k + 1)}>{k + 1}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </td>
              ))}
            </tr>
            {plan.lanes.map((l, li) => (
              <tr key={l.id}>
                <th scope="row" className="font-normal">
                  <div className="flex items-center gap-1">
                    <Input aria-label={`Part ${li + 1} name`} value={l.name} onChange={(e) => edit((d) => { d.lanes[li].name = e.target.value })} className="h-8 px-2" />
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Delete ${l.name}`} onClick={() => edit((d) => { d.lanes.splice(li, 1) })}><Trash2 className="size-3.5" /></Button>
                  </div>
                </th>
                {plan.sections.map((s) => {
                  const st = (l.cells[s.id] as LaneState) ?? "off", cyc = l.fx ? FX_CYCLE : CYCLE
                  const next = cyc[(cyc.indexOf(st) + 1) % cyc.length]
                  return (
                    <td key={s.id}>
                      <button type="button" aria-label={`${l.name} in ${s.name}: ${ST_TXT[st]}. Change to ${ST_TXT[next]}`} onClick={() => edit((d) => { d.lanes[li].cells[s.id] = next })}
                        className={cn("block h-8 w-full truncate rounded px-1.5 text-left text-[11px] transition-[background-color,scale] duration-150 active:scale-[0.97]", CELL[st])}>
                        {ST_SHORT[st] ?? (st === "filt" ? "Filtered" : st === "half" ? "Enters" : "")}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => edit((d) => { d.sections.push({ id: uid(), name: "New section", bars: 8, energy: 5 }) })}><Plus />Add section</Button>
        <Button variant="outline" size="sm" onClick={() => edit((d) => { d.lanes.splice(Math.max(0, d.lanes.length - 1), 0, { id: uid(), name: "New part", cells: {} }) })}><Plus />Add part</Button>
        <Button variant="outline" size="sm" onClick={() => edit((d) => { d.lanes.push({ id: uid(), name: "FX", fx: true, cells: {} }) })}><Plus />Add FX lane</Button>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-hidden="true">
        {(["on", "filt", "half", "off"] as LaneState[]).map((s) => <span key={s} className="inline-flex items-center gap-2"><i className={cn("inline-block h-3 w-5 rounded-sm", CELL[s])} />{ST_TXT[s]}</span>)}
        <span>FX lanes cycle through riser, impact and sweep.</span>
      </div>
      <Block title="Using the plan">
        <Caption>Build one Session scene per section, then perform them into the Arrangement in order. Aim for an energy curve that dips before each drop, and change something every 8 or 16 bars so the track never sits still.</Caption>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Delete this plan? This can't be undone.</span>
            <Button variant="destructive" size="sm" onClick={() => { update((d) => { d.plan = null }); setConfirming(false) }}>Delete plan</Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Keep it</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setConfirming(true)}>Start a new plan…</Button>
        )}
      </Block>
    </div>
  )
}
