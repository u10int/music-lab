import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { ArrowRight, ArrowUpRight, FileAudio, ImageIcon, LifeBuoy, NotebookPen, Paperclip, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useKey } from "@/components/key-picker"
import { SECTION_TITLE } from "@/components/page"
import type { DayLink } from "@/data/days"
import { CHALLENGES, LISTEN } from "@/data/learning"
import { SCALES } from "@/data/labs"
import { SPRINTS } from "@/data/sprints"
import { deleteProofFile, proofUrl, saveProofFile } from "@/lib/proofs"
import { fmtDay, todayISO, uid, update, usePref, type Proof, type Progress } from "@/lib/store"
import { theory } from "@/lib/theory"
import { cn } from "@/lib/utils"

/** Adds from=today (and the day, when catching up) to an in-app link, so the tool shows a way back. */
export function withFrom(to: string, sel: string, isToday: boolean) {
  if (/^https?:/.test(to)) return to
  const [path, hash = ""] = to.split("#")
  const extra = "from=today" + (isToday ? "" : `&day=${sel}`)
  return path + (path.includes("?") ? "&" : "?") + extra + (hash ? "#" + hash : "")
}
export function PlanLink({ link, sel, isToday, variant = "outline" }: { link: DayLink; sel: string; isToday: boolean; variant?: "outline" | "ghost" | "default" }) {
  const href = withFrom(link.to, sel, isToday)
  return /^https?:/.test(link.to)
    ? <Button variant={variant} size="sm" asChild><a href={href} target="_blank" rel="noopener">{link.label}<ArrowUpRight /></a></Button>
    : <Button variant={variant} size="sm" asChild><Link to={href}>{link.label}<ArrowRight /></Link></Button>
}

/* ---------------- Stuck ---------------- */

/** One tap for help: a smaller version of the day, the usual mistakes, and where to read more. */
export function StuckPanel({ smaller, stuck, sel, isToday }: { smaller?: string; stuck?: { mistakes: string[]; help: DayLink[] }; sel: string; isToday: boolean }) {
  const [open, setOpen] = useState(false)
  if (!smaller && !stuck) return null
  return (
    <div className="border-y">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 py-3 text-left text-sm font-medium">
        <LifeBuoy className="size-4" aria-hidden="true" />I’m stuck<span className="text-muted-foreground ml-auto text-xs font-normal">{open ? "Hide" : "Show help"}</span>
      </button>
      {open && (
        <div className="grid gap-5 pb-4 text-sm md:grid-cols-3">
          {smaller && <div className="space-y-1"><p className="font-medium">Do a smaller version</p><p className="text-pretty">{smaller}</p></div>}
          {stuck && <div className="space-y-1"><p className="font-medium">Common mistakes</p><ul className="list-disc space-y-1 pl-4 text-pretty">{stuck.mistakes.map((m) => <li key={m}>{m}</li>)}</ul></div>}
          {stuck && <div className="space-y-2"><p className="font-medium">Read or watch</p><div className="flex flex-wrap gap-2">{stuck.help.map((h) => <PlanLink key={h.to} link={h} sel={sel} isToday={isToday} />)}</div></div>}
        </div>
      )}
    </div>
  )
}

/* ---------------- Proof of work ---------------- */

function ProofMedia({ p }: { p: Proof }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (p.path) proofUrl(p.path).then((u) => { if (live) setUrl(u) })
    return () => { live = false }
  }, [p.path])
  if (!p.path) return null
  if (!url) return <div className="bg-muted h-24 animate-pulse" aria-label="Loading" />
  return p.kind === "image"
    ? <a href={url} target="_blank" rel="noopener"><img src={url} alt={p.title || p.name || "Proof image"} className="max-h-56 w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" /></a>
    : <audio controls src={url} className="w-full" preload="none" />
}

/** A list of proofs, newest first, with images and audio inline. */
export function ProofList({ proofs, compact }: { proofs: Proof[]; compact?: boolean }) {
  const remove = async (pr: Proof) => {
    if (pr.path) await deleteProofFile(pr.path).catch(() => {})
    update((d) => { d.proofs = (d.proofs ?? []).filter((x) => x.id !== pr.id) })
  }
  if (!proofs.length) return null
  return (
    <ul className={cn("grid gap-4", !compact && "sm:grid-cols-2 lg:grid-cols-3")}>
      {proofs.map((pr) => (
        <li key={pr.id} className="space-y-2 border p-3">
          <ProofMedia p={pr} />
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{pr.title || (pr.kind === "note" ? "Note" : pr.name)}</p>
              <p className="text-muted-foreground text-xs">{fmtDay.format(new Date(pr.date + "T00:00:00"))}</p>
              {pr.note && <p className="mt-1 text-sm text-pretty whitespace-pre-line">{pr.note}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${pr.title || "proof"}`} onClick={() => remove(pr)}><Trash2 /></Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Attach a note, an image or an audio file to a day as proof of what you made. */
export function ProofBox({ p, date, sprintId, titles }: { p: Progress; date: string; sprintId: string; titles: string[] }) {
  const [title, setTitle] = useState(titles[0] ?? "")
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const mine = (p.proofs ?? []).filter((x) => x.date === date)
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim() && !file) return setMsg("Add a note or choose a file.")
    setBusy(true)
    setMsg("")
    try {
      const id = uid()
      const kind: Proof["kind"] = file ? (file.type.startsWith("audio/") ? "audio" : "image") : "note"
      const path = file ? await saveProofFile(id, file) : undefined
      update((d) => { (d.proofs ??= []).unshift({ id, date, sprint: sprintId, title, kind, note: note.trim(), path, name: file?.name }) })
      setNote("")
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      setMsg("Saved.")
    } catch (err) {
      setMsg(`Couldn’t save the file: ${(err as Error).message} Try a smaller file or a different format.`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-labelledby="proof-h" className="space-y-3">
      <h2 id="proof-h" className={SECTION_TITLE}>Proof of work</h2>
      <p className="text-muted-foreground text-sm">Attach what you made today: a screenshot of the clip, a recording of the loop, or a note. Each sprint page collects them.</p>
      <form onSubmit={add} className="grid gap-3 border p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pr-title">For</Label>
          <Input id="pr-title" list="pr-titles" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Which step or idea" className="text-base sm:text-sm" />
          <datalist id="pr-titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pr-note">Note</Label>
          <Textarea id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you made, what you'd change" className="min-h-16 text-base sm:text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} id="pr-file" type="file" accept="image/*,audio/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip />{file ? "Change file" : "Attach image or audio"}</Button>
          {file && <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">{file.type.startsWith("audio/") ? <FileAudio className="size-4" /> : <ImageIcon className="size-4" />}{file.name}</span>}
          <Button type="submit" size="sm" disabled={busy} className="ml-auto">{busy ? "Saving…" : "Save proof"}</Button>
        </div>
        {msg && <p className="text-sm" role="status">{msg}</p>}
      </form>
      <ProofList proofs={mine} compact />
    </section>
  )
}

/* ---------------- Reflection ---------------- */

/** After the day: what clicked, what was hard, and how confident you feel about each skill. Low ratings come back in warm-ups. */
export function ReflectionCard({ p, date, skills }: { p: Progress; date: string; skills: { key: string; name: string }[] }) {
  const saved = p.reflections?.[date]
  const [clicked, setClicked] = useState(saved?.clicked ?? "")
  const [hard, setHard] = useState(saved?.hard ?? "")
  const [conf, setConf] = useState<Record<string, number>>(saved?.conf ?? {})
  const [done, setDone] = useState(false)
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    update((d) => {
      (d.reflections ??= {})[date] = { clicked: clicked.trim(), hard: hard.trim(), conf }
      d.skillConf ??= {}
      for (const [k, v] of Object.entries(conf)) d.skillConf[k] = v
    })
    setDone(true)
  }
  return (
    <section aria-labelledby="refl-h" className="space-y-3 border border-foreground p-5">
      <h2 id="refl-h" className={SECTION_TITLE}>How did it go?</h2>
      <p className="text-muted-foreground text-sm">Two lines and a rating. Skills you rate 1 or 2 come back in your warm-ups, and your notes show up in the weekly review.</p>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="rf-click">What clicked</Label><Textarea id="rf-click" value={clicked} onChange={(e) => setClicked(e.target.value)} className="min-h-16 text-base sm:text-sm" /></div>
          <div className="grid gap-1.5"><Label htmlFor="rf-hard">What was hard</Label><Textarea id="rf-hard" value={hard} onChange={(e) => setHard(e.target.value)} className="min-h-16 text-base sm:text-sm" /></div>
        </div>
        {skills.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How confident are you? 1 is lost, 5 is solid</legend>
            {skills.map((sk) => (
              <div key={sk.key} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-sm">{sk.name}</span>
                <div className="flex" role="radiogroup" aria-label={sk.name}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={conf[sk.key] === n} onClick={() => setConf({ ...conf, [sk.key]: n })}
                      className={cn("-ml-px size-8 border text-sm tabular-nums first:ml-0", conf[sk.key] === n ? "relative z-10 border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground")}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        )}
        <div className="flex items-center gap-3"><Button type="submit" size="sm">{saved ? "Update" : "Save reflection"}</Button>{done && <span className="text-sm" role="status">Saved.</span>}</div>
      </form>
    </section>
  )
}

/* ---------------- Weekly challenge ---------------- */

export function WeeklyChallenge({ p, week, sel, isToday }: { p: Progress; week: number; sel: string; isToday: boolean }) {
  const c = CHALLENGES[week - 1]
  if (!c) return null
  const done = p.challenges?.[String(week)]
  return (
    <section aria-labelledby="ch-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ch-h" className={SECTION_TITLE}>Week {week} challenge</h2>
        <span className="text-muted-foreground text-sm tabular-nums">{c.minutes} min, any day this week</span>
      </div>
      <div className="space-y-3 border p-4">
        <p className="text-lg font-medium">{c.title}</p>
        <p className="text-pretty">{c.brief}</p>
        <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-sm">{c.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {c.ref && <PlanLink link={c.ref} sel={sel} isToday={isToday} />}
          <Button size="sm" variant={done ? "default" : "outline"} aria-pressed={!!done} onClick={() => update((d) => { d.challenges ??= {}; if (done) delete d.challenges[String(week)]; else d.challenges[String(week)] = todayISO() })}>
            {done ? `Done ${fmtDay.format(new Date(done + "T00:00:00"))}` : "Mark challenge done"}
          </Button>
          <span className="text-muted-foreground text-sm">Attach the result below as proof.</span>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Listening sheet ---------------- */

/** A guided listen for Friday reference days. Saves into the reference notebook. */
export function ListeningSheet({ p, sprintId }: { p: Progress; sprintId: string }) {
  const prompts = LISTEN[sprintId] ?? []
  const s = SPRINTS.find((x) => x.id === sprintId)!
  const [pick, setPick] = useState<string>("new")
  const [title, setTitle] = useState(""), [artist, setArtist] = useState("")
  const [answers, setAnswers] = usePref<Record<string, string>>(`listen-${sprintId}-${todayISO()}`, {})
  const [msg, setMsg] = useState("")
  const save = () => {
    const lines = prompts.map((q, i) => `- ${q}: ${answers[i]?.trim() || "—"}`).join("\n")
    const block = `Listening sheet, Sprint ${s.n} (${fmtDay.format(new Date())}):\n${lines}`
    let name = title
    update((d) => {
      const n = pick !== "new" ? d.notebook.find((x) => x.id === pick) : null
      if (n) { n.notes = (n.notes ? n.notes + "\n\n" : "") + block; name = n.title }
      else d.notebook.unshift({ id: uid(), title: title.trim() || "Untitled reference", artist: artist.trim(), url: "", tempo: 0, date: todayISO(), notes: block, markers: [] })
    })
    setMsg(`Saved to your notebook${name ? ` under “${name}”` : ""}.`)
  }
  return (
    <section aria-labelledby="ls-h" className="space-y-3">
      <h2 id="ls-h" className={SECTION_TITLE}>Listening sheet</h2>
      <p className="text-muted-foreground text-sm">Loop your reference and answer each question by ear. It all goes into your reference notebook.</p>
      <div className="grid gap-4 border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ls-pick">Track</Label>
            <select id="ls-pick" value={pick} onChange={(e) => setPick(e.target.value)} className="border-input h-9 border bg-transparent px-2 text-base sm:text-sm">
              <option value="new">A new track</option>
              {p.notebook.map((n) => <option key={n.id} value={n.id}>{n.title}{n.artist ? ` · ${n.artist}` : ""}</option>)}
            </select>
          </div>
          {pick === "new" && <>
            <div className="grid gap-1.5"><Label htmlFor="ls-t">Title</Label><Input id="ls-t" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base sm:text-sm" /></div>
            <div className="grid gap-1.5"><Label htmlFor="ls-a">Artist</Label><Input id="ls-a" value={artist} onChange={(e) => setArtist(e.target.value)} className="text-base sm:text-sm" /></div>
          </>}
        </div>
        <ol className="grid gap-3">
          {prompts.map((q, i) => (
            <li key={i} className="grid gap-1.5">
              <Label htmlFor={`ls-${i}`} className="font-normal"><span className="text-muted-foreground mr-2 tabular-nums">{i + 1}</span>{q}</Label>
              <Input id={`ls-${i}`} value={answers[i] ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} className="text-base sm:text-sm" />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={save}><NotebookPen />Save to notebook</Button>
          {msg && <span className="text-sm" role="status">{msg} <Link to="/notebook" className="underline">Open it</Link></span>}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Your work ---------------- */

/** The things you've made that today's plan refers to: your key, your latest saved loop, your sequencer pattern and progression. */
export function YourWork({ p, sel, isToday }: { p: Progress; sel: string; isToday: boolean }) {
  const { root, scale } = useKey()
  const [seq] = usePref<{ drums?: Record<string, number[]>; tempo?: number } | null>("sequencer", null)
  const [prog] = usePref<{ chords?: number[] } | null>("progression", null)
  const sc = SCALES.find((x) => x.id === scale) ?? SCALES[0], T = theory(root, sc.id)
  const loop = p.loops?.[0]
  const hits = seq?.drums ? Object.values(seq.drums).reduce((a, r) => a + r.filter(Boolean).length, 0) : 0
  const items: { label: string; value: string; link: DayLink }[] = [
    { label: "Your key", value: `${T.names[0]} ${sc.name.toLowerCase()}`, link: { to: `/labs/theory?tab=chords&key=${root}&scale=${sc.id}`, label: "Chords" } },
  ]
  if (loop) items.push({ label: "Latest saved loop", value: `${loop.name}, ${fmtDay.format(new Date(loop.date + "T00:00:00"))}`, link: { to: `/labs/loop-builder?loop=${loop.id}`, label: "Open it" } })
  if (hits) items.push({ label: "Step sequencer", value: `${hits} hits at ${seq?.tempo ?? 120} BPM`, link: { to: "/labs/sequencer", label: "Open it" } })
  if (prog?.chords?.length) items.push({ label: "Your progression", value: prog.chords.map((d) => T.chords[d]?.roman ?? "").join(" – "), link: { to: "/labs/progressions", label: "Open it" } })
  return (
    <section aria-labelledby="yw-h" className="space-y-2">
      <h2 id="yw-h" className={SECTION_TITLE}>From your work</h2>
      <p className="text-muted-foreground text-sm">When the plan says “your beat” or “your key”, this is what it means.</p>
      <ul className="divide-y border-y">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1"><p className="text-muted-foreground text-xs">{it.label}</p><p className="truncate text-sm">{it.value}</p></div>
            <PlanLink link={it.link} sel={sel} isToday={isToday} variant="ghost" />
          </li>
        ))}
      </ul>
    </section>
  )
}
