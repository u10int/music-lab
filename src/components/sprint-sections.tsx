import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Block } from "@/components/page"
import { Seg } from "@/components/seg"
import { GENRES, GNAME, KIND, RES, STUCK, type Sprint } from "@/data/sprints"
import { safeUrl, uid, update, useProgress, type RefTrack } from "@/lib/store"

const ext = { target: "_blank", rel: "noopener" }

export function Resources({ s }: { s: Sprint }) {
  return (
    <Block title="Resources for this sprint">
      <ul className="divide-y border-y">
        {(RES[s.id] ?? []).map((r) => (
          <li key={r.t} className="grid gap-0.5 py-3 text-sm">
            <div>
              {r.links ? (
                <><span className="font-semibold">{r.t}:</span> {r.links.map(([l, u], i) => <span key={u}>{i > 0 && ", "}<a className="underline" href={u} {...ext}>{l}</a></span>)}</>
              ) : (
                <a className="font-medium underline" href={r.u} {...ext}>{r.t}</a>
              )}
            </div>
            <div className="text-muted-foreground text-pretty">{KIND[r.k] ?? r.k} · {r.n}</div>
          </li>
        ))}
      </ul>
    </Block>
  )
}

export function Stuck({ s }: { s: Sprint }) {
  const p = useProgress()
  const f = p.genre
  const items = (STUCK[s.id] ?? []).filter((r) => r.g === "any" || f === "all" || r.g === f)
  return (
    <Block title="Stuck or need ideas?" description="Genre references for this sprint's skills." actions={<Seg label="Show ideas for" value={f} onChange={(v) => update((d) => { d.genre = v })} options={GENRES} />}>
      <ul className="divide-y border-y">
        {items.map((r) => (
          <li key={r.t + r.src} className="grid gap-0.5 py-3 text-sm">
            <div><a className="font-medium underline" href={r.u} {...ext}>{r.t}</a><span className="text-muted-foreground"> · {r.src}{r.g !== "any" ? " · " + GNAME[r.g] : ""}</span></div>
            <div className="text-muted-foreground text-pretty">{r.n}</div>
          </li>
        ))}
      </ul>
    </Block>
  )
}

export function References({ s }: { s: Sprint }) {
  const p = useProgress()
  const list = p.refs[s.id] ?? []
  const [track, setTrack] = useState(""), [borrow, setBorrow] = useState(""), [url, setUrl] = useState("")
  const [err, setErr] = useState(false)
  const [undo, setUndo] = useState<{ item: RefTrack; index: number } | null>(null)
  const trackRef = useRef<HTMLInputElement>(null)
  const undoRef = useRef<HTMLButtonElement>(null)
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!track.trim()) {
      setErr(true)
      trackRef.current?.focus()
      return
    }
    update((d) => { (d.refs[s.id] ??= []).push({ id: uid(), track: track.trim(), borrow: borrow.trim(), url: safeUrl(url) }) })
    setTrack(""); setBorrow(""); setUrl(""); setErr(false); setUndo(null)
    trackRef.current?.focus()
  }
  const remove = (r: RefTrack, index: number) => {
    update((d) => { d.refs[s.id].splice(index, 1) })
    setUndo({ item: r, index })
    requestAnimationFrame(() => undoRef.current?.focus())
  }
  return (
    <Block title="Reference tracks" description="The tracks you're studying this sprint and what you're taking from each.">
      {list.length ? (
        <ul className="divide-y border-y">
          {list.map((r, i) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                {r.url ? <a className="font-medium break-words underline" href={r.url} {...ext}>{r.track}</a> : <span className="font-medium">{r.track}</span>}
                {r.borrow && <div className="text-muted-foreground">{r.borrow}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r, i)} aria-label={`Remove ${r.track}`}>Remove</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No reference tracks yet. Add the one you're pulling ideas from, like the drums from a phonk track or the build from a progressive house tune.</p>
      )}
      {undo && (
        <p className="text-sm" role="status">
          Removed “{undo.item.track}”.{" "}
          <Button ref={undoRef} variant="link" className="h-auto p-0" onClick={() => { update((d) => { (d.refs[s.id] ??= []).splice(undo.index, 0, undo.item) }); setUndo(null) }}>Undo</Button>
        </p>
      )}
      <form onSubmit={add} noValidate className="grid items-start gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="ref-track">Track</Label>
          <Input ref={trackRef} id="ref-track" value={track} onChange={(e) => setTrack(e.target.value)} placeholder="ODESZA – Line of Sight" autoComplete="off" aria-invalid={err || undefined} aria-describedby={err ? "ref-track-err" : undefined} className="text-base sm:text-sm" />
          {err && <span id="ref-track-err" className="text-destructive text-sm">Enter the track name, for example ODESZA – Line of Sight.</span>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ref-borrow">What you're taking from it</Label>
          <Input id="ref-borrow" value={borrow} onChange={(e) => setBorrow(e.target.value)} placeholder="Sparse verse drums, fills at phrase ends" autoComplete="off" className="text-base sm:text-sm" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ref-url">Link (optional)</Label>
          <Input id="ref-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/track/…" autoComplete="off" className="text-base sm:text-sm" />
        </div>
        <Button type="submit" variant="outline" className="md:mt-[22px]">Add reference</Button>
      </form>
    </Block>
  )
}
