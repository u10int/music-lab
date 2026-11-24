import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SECTION_TITLE } from "@/components/page"
import { ProofList } from "@/components/today/parts"
import type { Sprint } from "@/data/sprints"
import { isoOf, minutesByDay, todayISO, update, weekStart, type Progress } from "@/lib/store"

/** Everything attached as proof during this sprint. */
export function SprintProofs({ p, s }: { p: Progress; s: Sprint }) {
  const proofs = (p.proofs ?? []).filter((x) => x.sprint === s.id)
  return (
    <section aria-labelledby="pf-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pf-h" className={SECTION_TITLE}>Proof of work</h2>
        <span className="text-muted-foreground text-sm tabular-nums">{proofs.length} {proofs.length === 1 ? "item" : "items"}</span>
      </div>
      {proofs.length ? <ProofList proofs={proofs} /> : <p className="text-muted-foreground text-sm">Nothing yet. Attach screenshots, recordings or notes from the Today page and they collect here.</p>}
    </section>
  )
}

/** End of sprint: the numbers, then three questions. What you carry forward shows up in the next sprint's warm-ups. */
export function SprintRetro({ p, s }: { p: Progress; s: Sprint }) {
  const saved = p.retros?.[s.id]
  const [well, setWell] = useState(saved?.well ?? "")
  const [change, setChange] = useState(saved?.change ?? "")
  const [carry, setCarry] = useState(saved?.carry ?? "")
  const [msg, setMsg] = useState("")
  const w1 = s.n * 2 - 1, start = weekStart(p, w1), end = weekStart(p, w1 + 2)
  const mins = minutesByDay(p)
  let total = 0, days = 0
  for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const m = mins.get(isoOf(d)) ?? 0
    total += m
    if (m) days++
  }
  const keys = s.skills.map((_, i) => s.id + "-" + i)
  const learned = keys.filter((k) => p.done[k]).length, checked = keys.filter((k) => p.skillTests?.[k]).length
  const confs = keys.map((k) => p.skillConf?.[k]).filter((x): x is number => !!x)
  const conf = confs.length ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1) : "–"
  const proofs = (p.proofs ?? []).filter((x) => x.sprint === s.id).length
  const ended = todayISO() >= isoOf(new Date(end.getTime() - 86400000)) || !!p.shipped[s.id]
  const stats: [string, string][] = [["Practiced", `${Math.floor(total / 60)} h ${total % 60} m`], ["Days practiced", `${days} of 14`], ["Skills learned", `${learned} of ${keys.length}`], ["Skill checks passed", String(checked)], ["Average confidence", conf === "–" ? "–" : `${conf} of 5`], ["Proofs", String(proofs)], ["Deliverable", p.shipped[s.id] ? "Shipped" : "Not yet"]]
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    update((d) => { (d.retros ??= {})[s.id] = { well: well.trim(), change: change.trim(), carry: carry.trim(), at: todayISO() } })
    setMsg("Saved. What you carry forward will show up in the next sprint’s warm-ups.")
  }
  return (
    <section aria-labelledby="rt-h" className="space-y-4">
      <div className="space-y-1">
        <h2 id="rt-h" className={SECTION_TITLE}>Sprint retrospective</h2>
        <p className="text-muted-foreground text-sm">{ended ? "The sprint is done. Look at the numbers, then write three lines." : "Fill this in on the last weekend of the sprint, or once you ship the deliverable."}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px border bg-border sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([k, v]) => <div key={k} className="bg-background p-3"><dt className="text-muted-foreground text-xs">{k}</dt><dd className="text-lg font-medium tabular-nums">{v}</dd></div>)}
      </dl>
      <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1.5"><Label htmlFor="rt-well">What went well</Label><Textarea id="rt-well" value={well} onChange={(e) => setWell(e.target.value)} className="min-h-20 text-base sm:text-sm" /></div>
        <div className="grid gap-1.5"><Label htmlFor="rt-change">What you’d change</Label><Textarea id="rt-change" value={change} onChange={(e) => setChange(e.target.value)} className="min-h-20 text-base sm:text-sm" /></div>
        <div className="grid gap-1.5"><Label htmlFor="rt-carry">One thing to carry into the next sprint</Label><Textarea id="rt-carry" value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="Keep velocity varied on every part" className="min-h-20 text-base sm:text-sm" /></div>
        <div className="flex items-center gap-3 md:col-span-3"><Button type="submit" size="sm">{saved ? "Update retrospective" : "Save retrospective"}</Button>{msg && <span className="text-sm" role="status">{msg}</span>}</div>
      </form>
    </section>
  )
}
