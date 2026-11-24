import { useRef, useState } from "react"
import { Block, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currentWeek, fmtDay, sprintForWeek, todayISO, uid, update, useProgress, weekOf, type ExportEntry } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ExportsPage() {
  const p = useProgress()
  const list = p.exports.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const weeks = new Set(list.map((e) => weekOf(p, e.date)).filter((w) => w >= 1 && w <= 12))
  const cur = currentWeek(p).week
  const [date, setDate] = useState(todayISO()), [note, setNote] = useState(""), [err, setErr] = useState(false)
  const [undo, setUndo] = useState<{ item: ExportEntry; index: number } | null>(null)
  const noteRef = useRef<HTMLInputElement>(null), dateRef = useRef<HTMLInputElement>(null), undoRef = useRef<HTMLButtonElement>(null)
  const day = (iso: string) => fmtDay.format(new Date(iso + "T00:00:00"))

  return (
    <div className="space-y-10">
      <PageHeader title="Weekly exports">{weeks.size ? `${weeks.size} of 12 weeks shipped.` : "Log each Sunday export here. Even 30 seconds counts."}</PageHeader>
      <div role="img" aria-label={weeks.size ? "Weeks with an export: " + [...weeks].sort((x, y) => x - y).join(", ") : "No weeks shipped yet"} className="grid max-w-2xl grid-cols-12 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
          <span key={w} className="grid justify-items-center gap-1">
            <i className={cn("block aspect-square w-full rounded-md border-[1.5px] border-pad-edge", weeks.has(w) && "border-transparent bg-[var(--s3)]", w === cur && "outline-2 outline-offset-2 outline-foreground")} />
            <span className="text-muted-foreground text-xs tabular-nums">{w}</span>
          </span>
        ))}
      </div>
      <form
        noValidate
        className="grid max-w-3xl items-start gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!date) { setErr(true); dateRef.current?.focus(); return }
          update((d) => { d.exports.push({ id: uid(), date, note: note.trim() }) })
          setNote(""); setDate(todayISO()); setErr(false); setUndo(null)
          noteRef.current?.focus()
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="exp-date">Date</Label>
          <Input ref={dateRef} id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={err || undefined} aria-describedby={err ? "exp-date-err" : undefined} />
          {err && <span id="exp-date-err" className="text-destructive text-sm">Choose the date you exported.</span>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="exp-note">What you exported</Label>
          <Input ref={noteRef} id="exp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="8-bar loop with swung hats, 30 seconds" autoComplete="off" className="text-base sm:text-sm" />
        </div>
        <Button type="submit" variant="outline" className="sm:mt-[22px]">Log export</Button>
      </form>
      {undo && (
        <p className="text-sm" role="status">
          Removed the export from {day(undo.item.date)}.{" "}
          <Button ref={undoRef} variant="link" className="h-auto p-0" onClick={() => { update((d) => { d.exports.splice(undo.index, 0, undo.item) }); setUndo(null) }}>Undo</Button>
        </p>
      )}
      {list.length > 0 && (
        <Block title="Log">
          <ul className="max-w-3xl divide-y border-y">
            {list.map((e) => {
              const w = weekOf(p, e.date)
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <div><span className="font-semibold">{day(e.date)}</span><span className="text-muted-foreground"> · {w >= 1 && w <= 12 ? `Week ${w}, Sprint ${sprintForWeek(w) + 1}` : "Outside the 12 weeks"}</span></div>
                    {e.note && <div className="text-muted-foreground">{e.note}</div>}
                  </div>
                  <Button variant="ghost" size="sm" aria-label={`Remove export from ${day(e.date)}`} onClick={() => {
                    const index = p.exports.findIndex((x) => x.id === e.id)
                    update((d) => { d.exports.splice(index, 1) })
                    setUndo({ item: e, index })
                    requestAnimationFrame(() => undoRef.current?.focus())
                  }}>Remove</Button>
                </li>
              )
            })}
          </ul>
        </Block>
      )}
    </div>
  )
}
