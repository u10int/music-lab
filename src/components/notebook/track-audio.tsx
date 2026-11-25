import { useEffect, useMemo, useRef, useState } from "react"
import { Flag, Loader2, Pause, Play, Trash2, Upload } from "lucide-react"
import { stop as stopAppAudio } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROOTS } from "@/data/labs"
import { analyzeFile } from "@/lib/audio-analysis"
import { deleteProofFile, MAX_AUDIO_BYTES, proofUrl, saveProofFile } from "@/lib/proofs"
import { uid, type RefNote } from "@/lib/store"
import { cn } from "@/lib/utils"

const mmss = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0")
const keyName = (root: number, minor: boolean) => `${ROOTS[root]} ${minor ? "minor" : "major"}`
const sure = (c: number) => (c >= 0.6 ? "clear" : c >= 0.3 ? "likely" : "a rough guess")

/** Upload an audio file, analyse it, and store both with the reference. */
export function AudioUpload({ n, edit, compact }: { n: RefNote; edit: (fn: (d: RefNote) => void) => void; compact?: boolean }) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const take = async (file: File) => {
    setError(null)
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac|aiff?|webm)$/i.test(file.name)) return setError("That isn’t an audio file. Try an MP3, WAV, M4A or FLAC.")
    if (file.size > MAX_AUDIO_BYTES) return setError("Files can be up to 50 MB. Export an MP3 or M4A instead of WAV.")
    try {
      setStatus("Listening for tempo, key and sections…")
      const analysis = await analyzeFile(file)
      setStatus("Saving the file…")
      const path = await saveProofFile(`nb-${n.id}-${Date.now()}`, file, MAX_AUDIO_BYTES)
      const old = n.audio?.path
      edit((d) => {
        d.audio = { path, name: file.name, size: file.size, analysis }
        d.tempo = analysis.tempo
        d.key = { root: analysis.keyRoot, minor: analysis.minor }
        if (!d.title && !d.artist) {
          const base = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")
          const [a, ...rest] = base.split(" - ")
          if (rest.length) { d.artist = a.trim(); d.title = rest.join(" - ").trim() } else d.title = base.trim()
        }
      })
      if (old) void deleteProofFile(old)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that file.")
    } finally {
      setStatus(null)
    }
  }

  const pick = (
    <input ref={input} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aif,.aiff" className="sr-only" tabIndex={-1}
      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void take(f) }} />
  )
  if (compact) {
    return (
      <>
        {pick}
        <Button variant="ghost" size="sm" disabled={!!status} onClick={() => input.current?.click()}>{status ? <Loader2 className="animate-spin" /> : <Upload />}{status ?? "Replace audio"}</Button>
        {error && <p className="text-destructive basis-full text-sm" role="alert">{error}</p>}
      </>
    )
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void take(f) }}
      className={cn("flex flex-col items-start gap-3 border border-dashed p-6 transition-[background-color,border-color] duration-150", over ? "border-foreground bg-muted" : "border-foreground/30")}>
      {pick}
      <div className="space-y-1">
        <p className="font-semibold">Add the track’s audio</p>
        <Caption className="max-w-xl">Drop an MP3, WAV, M4A or FLAC here (up to 50 MB). The notebook works out the tempo, key and loudness, draws the waveform and suggests where the sections start. Then you can pin notes to any moment.</Caption>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!!status} onClick={() => input.current?.click()}>{status ? <Loader2 className="animate-spin" /> : <Upload />}{status ? "Working…" : "Choose a file"}</Button>
        {status && <span className="text-sm" role="status">{status}</span>}
      </div>
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
      <Caption>Signed in, the file is saved privately to your account. Otherwise it stays in this browser.</Caption>
    </div>
  )
}

/**
 * A waveform player for the reference: section markers across the top, note
 * pins along the bottom, like comments on a SoundCloud waveform.
 */
export function TrackPlayer({ n, edit, onMark }: { n: RefNote; edit: (fn: (d: RefNote) => void) => void; onMark: (t: number) => void }) {
  const a = n.audio!.analysis
  const audio = useRef<HTMLAudioElement>(null)
  // The playable URL, tagged with the file it belongs to so a new file never plays the old one.
  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null)
  const path = n.audio!.path
  const src = loaded?.path === path ? loaded.url : null
  const missing = loaded?.path === path && !loaded.url
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [draft, setDraft] = useState("")
  const [draftAt, setDraftAt] = useState<number | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const noteInput = useRef<HTMLInputElement>(null)
  const dur = a.duration
  const { setRoot, setScale } = useKey()
  const comments = useMemo(() => [...(n.comments ?? [])].sort((x, y) => x.t - y.t), [n.comments])

  useEffect(() => {
    let live = true
    void proofUrl(path).then((url) => { if (live) setLoaded({ path, url }) })
    return () => { live = false }
  }, [path])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => { setTime(audio.current?.currentTime ?? 0); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const seek = (t: number) => {
    const v = Math.max(0, Math.min(dur, t))
    if (audio.current) audio.current.currentTime = v
    setTime(v)
  }
  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (el.paused) { stopAppAudio(); void el.play() } else el.pause()
  }
  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    const t = Math.round((draftAt ?? time) * 10) / 10
    edit((d) => { (d.comments ??= []).push({ id: uid(), t, text }) })
    setDraft("")
    setDraftAt(null)
  }

  // Space plays and pauses, M marks a section, N jumps to the note box.
  const live = useRef({ toggle, time, onMark })
  useEffect(() => { live.current = { toggle, time, onMark } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el?.closest("input, textarea, select, [contenteditable], [role=combobox]") || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === "Space" && el?.tagName !== "BUTTON") { e.preventDefault(); live.current.toggle() }
      else if (e.key === "m") live.current.onMark(live.current.time)
      else if (e.key === "n") { e.preventDefault(); noteInput.current?.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const bars = 180
  const peaks = useMemo(() => Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * a.peaks.length) / bars), to = Math.max(from + 1, Math.floor(((i + 1) * a.peaks.length) / bars))
    return Math.max(...a.peaks.slice(from, to))
  }), [a.peaks])
  const at = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * dur
  }
  const pct = (t: number) => `${(t / dur) * 100}%`
  const markers = [...n.markers].sort((x, y) => x.t - y.t)

  return (
    <div className="space-y-5">
      {src && <audio ref={audio} src={src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(e) => !playing && setTime(e.currentTarget.currentTime)} />}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <div className="space-y-1">
          <dt className="text-muted-foreground text-sm">Tempo</dt>
          <dd className="text-stat font-medium tabular-nums">{a.tempo}<span className="text-muted-foreground ml-1 text-sm font-normal">BPM</span></dd>
          <dd className="text-muted-foreground text-xs">{a.tempoAlt.length ? `Or ${a.tempoAlt.join(" / ")} if it feels half or double time` : ""}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-sm">Key</dt>
          <dd className="text-stat font-medium">{ROOTS[a.keyRoot]}<span className="text-muted-foreground ml-1 text-sm font-normal">{a.minor ? "minor" : "major"}</span></dd>
          <dd className="text-muted-foreground text-xs">{sure(a.keyConf).replace(/^./, (x) => x.toUpperCase())}. Next best: {a.keyAlt.map(([r, m]) => keyName(r, m)).join(", ")}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-sm">Loudness</dt>
          <dd className="text-stat font-medium tabular-nums">{a.rms}<span className="text-muted-foreground ml-1 text-sm font-normal">dB</span></dd>
          <dd className="text-muted-foreground text-xs">Average level. Peaks reach about {a.peak} dB.</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-sm">Length</dt>
          <dd className="text-stat font-medium tabular-nums">{mmss(dur)}</dd>
          <dd className="text-muted-foreground text-xs tabular-nums">About {Math.round((a.end * a.tempo) / 240)} bars</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {n.tempo !== a.tempo && <Button variant="outline" size="sm" onClick={() => edit((d) => { d.tempo = a.tempo })}>Use {a.tempo} BPM for bar numbers</Button>}
        <Button variant="outline" size="sm" onClick={() => { setRoot(a.keyRoot); setScale(a.minor ? "minor" : "major") }}>Practice in {keyName(a.keyRoot, a.minor)}</Button>
      </div>

      <div className="space-y-2">
        <div className="relative h-5" aria-hidden="true">
          {markers.map((m, i) => (
            <button key={m.id} type="button" tabIndex={-1} onClick={() => seek(m.t)} title={m.label}
              className="absolute top-0 -translate-x-px truncate border-l border-foreground pl-1 text-left text-[11px] leading-5 hover:underline"
              style={{ left: pct(m.t), maxWidth: `min(9rem, calc(${pct((markers[i + 1]?.t ?? dur) - m.t)} - 2px))` }}>{m.label}</button>
          ))}
        </div>
        <div
          role="slider" tabIndex={0} aria-label="Position in the track" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(time)} aria-valuetext={`${mmss(time)} of ${mmss(dur)}`}
          onKeyDown={(e) => {
            const to = e.key === "ArrowRight" ? time + 5 : e.key === "ArrowLeft" ? time - 5 : e.key === "Home" ? 0 : e.key === "End" ? dur : null
            if (to !== null) { e.preventDefault(); seek(to) }
          }}
          onPointerDown={(e) => seek(at(e))} onPointerMove={(e) => setHover(at(e))} onPointerLeave={() => setHover(null)}
          className="relative flex h-28 cursor-pointer touch-none items-end gap-px outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {markers.map((m) => <span key={m.id} className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: pct(m.t) }} />)}
          {peaks.map((v, i) => (
            <span key={i} className={cn("pointer-events-none flex-1 transition-[background-color] duration-75", (i + 0.5) / bars <= time / dur ? "bg-foreground" : "bg-foreground/25")} style={{ height: `${Math.max(3, v * 100)}%` }} />
          ))}
          <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#23782b]" style={{ left: pct(time) }} />
          {hover !== null && <span className="pointer-events-none absolute -top-6 -translate-x-1/2 bg-foreground px-1.5 py-0.5 text-[11px] text-background tabular-nums" style={{ left: pct(hover) }}>{mmss(hover)}</span>}
        </div>
        <div className="relative h-6">
          {comments.map((c, i) => (
            <button key={c.id} type="button" onClick={() => { seek(c.t); setActive(c.id) }} onMouseEnter={() => setActive(c.id)} onFocus={() => setActive(c.id)}
              aria-label={`Note at ${mmss(c.t)}: ${c.text}`}
              className={cn("group absolute top-0 grid size-5 -translate-x-1/2 place-items-center text-[10px] font-semibold tabular-nums", active === c.id ? "bg-[#23782b] text-white" : "bg-foreground text-background")} style={{ left: pct(c.t) }}>
              {i + 1}
              <span className="pointer-events-none absolute top-6 left-1/2 z-10 hidden w-56 -translate-x-1/2 border bg-popover p-2 text-left text-xs font-normal text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                <span className="text-muted-foreground tabular-nums">{mmss(c.t)}</span> {c.text}
              </span>
            </button>
          ))}
          {draftAt !== null && <span className="absolute top-0 size-5 -translate-x-1/2 border-2 border-dashed border-foreground" style={{ left: pct(draftAt) }} aria-hidden="true" />}
        </div>
      </div>

      {missing ? (
        <p className="text-sm" role="alert">The audio file isn’t available here. It may have been saved in another browser before you signed in. Replace the audio to play it.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={toggle} disabled={!src} className={cn("min-w-28", playing && "bg-[#23782b] text-white hover:bg-[#1c6623]")}>
            {!src ? <Loader2 className="animate-spin" /> : playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}{playing ? "Pause" : "Play"}
          </Button>
          <span className="text-sm tabular-nums">{mmss(time)} / {mmss(dur)}</span>
          <span className="text-muted-foreground text-sm tabular-nums">Bar {Math.floor((time * (n.tempo || a.tempo)) / 240) + 1}</span>
          <Button variant="outline" onClick={() => onMark(time)}><Flag />Mark a section here</Button>
          <span className="text-muted-foreground ml-auto hidden text-xs lg:inline">Space play · M mark a section · N add a note · ← → skip 5 s</span>
        </div>
      )}

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addNote() }}>
        <div className="relative min-w-0 flex-1">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm tabular-nums">{mmss(draftAt ?? time)}</span>
          <Input ref={noteInput} aria-label={`Note at ${mmss(draftAt ?? time)}`} placeholder="Add a note at this moment" value={draft} className="pl-14"
            onFocus={() => draftAt === null && setDraftAt(time)} onChange={(e) => { if (draftAt === null) setDraftAt(time); setDraft(e.target.value) }}
            onBlur={() => !draft && setDraftAt(null)} onKeyDown={(e) => { if (e.key === "Escape") { setDraft(""); setDraftAt(null); e.currentTarget.blur() } }} />
        </div>
        <Button type="submit" variant="outline" disabled={!draft.trim()}>Add note</Button>
      </form>

      {comments.length > 0 && (
        <ol className="divide-y border-y">
          {comments.map((c, i) => (
            <li key={c.id} className={cn("grid grid-cols-[1.5rem_3.25rem_minmax(0,1fr)_auto] items-center gap-2 py-2 transition-[background-color] duration-150", active === c.id && "bg-muted")} onMouseEnter={() => setActive(c.id)}>
              <span className="text-muted-foreground text-xs font-semibold tabular-nums">{i + 1}</span>
              <button type="button" className="text-left text-sm tabular-nums underline-offset-2 hover:underline" onClick={() => { seek(c.t); setActive(c.id); if (audio.current?.paused) toggle() }} aria-label={`Play from ${mmss(c.t)}`}>{mmss(c.t)}</button>
              <Input aria-label={`Note at ${mmss(c.t)}`} value={c.text} className="h-8 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input"
                onChange={(e) => edit((d) => { const x = d.comments?.find((y) => y.id === c.id); if (x) x.text = e.target.value })} />
              <Button variant="ghost" size="icon-sm" aria-label={`Delete the note at ${mmss(c.t)}`} onClick={() => edit((d) => { d.comments = d.comments?.filter((y) => y.id !== c.id) })}><Trash2 /></Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** The analysis's guesses at sections and low-end gaps, to accept with one click. */
export function Suggestions({ n, edit }: { n: RefNote; edit: (fn: (d: RefNote) => void) => void }) {
  const a = n.audio!.analysis
  const [confirm, setConfirm] = useState(false)
  const gaps = a.dropouts.filter((g) => !(n.comments ?? []).some((c) => Math.abs(c.t - g.t) < 0.5))
  const same = n.markers.length === a.sections.length && a.sections.every((s, i) => Math.abs([...n.markers].sort((x, y) => x.t - y.t)[i].t - s.t) < 0.2)
  const apply = () => {
    edit((d) => { d.markers = a.sections.map((s) => ({ id: uid(), t: s.t, label: s.label, energy: s.energy, note: "" })) })
    setConfirm(false)
  }
  if (same && !gaps.length) return null
  return (
    <div className="space-y-3 border-t pt-4">
      {!same && (
        <div className="space-y-2">
          <p className="text-sm"><span className="font-semibold">Suggested sections: </span>
            {a.sections.map((s, i) => <span key={i} className="whitespace-nowrap">{i > 0 && " · "}<span className="tabular-nums">{mmss(s.t)}</span> {s.label}</span>)}
          </p>
          <Caption>Found where the low end comes in or drops out and where the energy changes, snapped to bars. Check them by ear: builds and drops are guesses.</Caption>
          <div className="flex flex-wrap items-center gap-2">
            {!confirm ? (
              <Button variant="outline" size="sm" onClick={() => (n.markers.length ? setConfirm(true) : apply())}>Use these sections</Button>
            ) : (
              <>
                <span className="text-sm">This replaces your {n.markers.length} sections.</span>
                <Button variant="destructive" size="sm" onClick={apply}>Replace sections</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
              </>
            )}
          </div>
        </div>
      )}
      {gaps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm"><span className="font-semibold">Low end cuts out at </span>{gaps.map((g) => `${mmss(g.t)} (${g.len} s)`).join(", ")}.</p>
          <Button variant="ghost" size="sm" onClick={() => edit((d) => { for (const g of gaps) (d.comments ??= []).push({ id: uid(), t: g.t, text: `Kick and bass drop out for ${g.len} s` }) })}>Add as notes</Button>
        </div>
      )}
    </div>
  )
}
