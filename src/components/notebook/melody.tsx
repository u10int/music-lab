import { useEffect, useMemo, useState } from "react"
import { AudioLines, Loader2, RefreshCw, X } from "lucide-react"
import { tone } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { toGrid, type GridNote } from "@/lib/melody-grid"
import { hasWebGpu, splitAndTranscribe, type StemsProgress } from "@/lib/stems"
import { usePref, type RefNote } from "@/lib/store"
import type { PartSection, Parts } from "@/lib/transcribe-core"

const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
const noteName = (m: number) => NOTE[m % 12] + (Math.floor(m / 12) - 2)
const PAGE = 8

const PHASE: Record<StemsProgress["phase"], string> = {
  download: "Downloading the stem model (first time only)",
  load: "Starting the stem model",
  separate: "Splitting the stems",
  notes: "Finding the notes",
}

export function MelodyBlock({ parts, sec, edit, pid, getAudio }: {
  parts: Parts; sec: PartSection; edit: (fn: (d: RefNote) => void) => void; pid: string; getAudio: () => Promise<Blob>
}) {
  const [snap, setSnap] = usePref<boolean>("parts-snap", true)
  const [prog, setProg] = useState<StemsProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpu, setGpu] = useState<boolean | null>(null)
  const [ctrl, setCtrl] = useState<AbortController | null>(null)
  // Back to the first page whenever the section changes.
  const [pageAt, setPageAt] = useState({ bar: sec.startBar, page: "0" })
  const page = pageAt.bar === sec.startBar ? pageAt.page : "0"
  const setPage = (p: string) => setPageAt({ bar: sec.startBar, page: p })
  useEffect(() => { void hasWebGpu().then(setGpu) }, [])

  const step = 60 / parts.tempo / 4
  const barMs = 16 * step * 1000
  const run = async () => {
    setError(null); setBusy(true); setProg(null)
    const c = new AbortController()
    setCtrl(c)
    try {
      const blob = await getAudio()
      const { melody } = await splitAndTranscribe(blob, barMs, setProg, c.signal)
      edit((d) => { if (d.audio?.parts) d.audio.parts.melody = melody })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false); setProg(null); setCtrl(null)
    }
  }

  const pages = Math.max(1, Math.ceil(sec.bars / PAGE))
  const pg = Math.min(pages - 1, +page)
  const from = sec.startBar + pg * PAGE, bars = Math.min(PAGE, sec.startBar + sec.bars - from)
  const lines = useMemo(() => {
    const m = parts.melody
    if (!m) return null
    const cut = (ns: GridNote[]) => ns.filter((x) => x.step >= from * 16 && x.step < (from + bars) * 16).map((x) => ({ ...x, step: x.step - from * 16 }))
    return { vocals: cut(toGrid(m.vocals, parts, snap)), lead: cut(toGrid(m.lead, parts, snap)) }
  }, [parts, snap, from, bars])

  const play = (what: "vocals" | "lead" | "both") => {
    if (!lines) return
    toggle(`${pid}-mel-${what}`, bars * 16 * step + 0.6, (c, bus, t0) => {
      if (what !== "lead") for (const x of lines.vocals) tone(c, bus, t0 + x.step * step, x.midi, x.len * step * 0.95, { wave: "triangle", cutoff: 3200, level: 0.16, env: { a: 0.02, d: 0.2, s: 0.8, r: 0.08 } })
      if (what !== "vocals") for (const x of lines.lead) tone(c, bus, t0 + x.step * step, x.midi, x.len * step * 0.9, { wave: "square", cutoff: 2200, level: 0.06, env: { a: 0.005, d: 0.15, s: 0.5, r: 0.06 } })
    })
  }

  const runner = (
    <div className="space-y-3">
      {busy ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{prog ? PHASE[prog.phase] : "Reading the audio"}</span>
            <span className="text-muted-foreground tabular-nums">{prog?.detail}</span>
          </div>
          <Progress value={prog ? Math.round(prog.p * 100) : 0} aria-label="Progress" />
          <Button variant="ghost" size="sm" onClick={() => ctrl?.abort()}><X />Stop</Button>
        </div>
      ) : (
        <Button variant={parts.melody ? "ghost" : "default"} size={parts.melody ? "sm" : "default"} onClick={run}>
          {parts.melody ? <RefreshCw /> : <AudioLines />}{parts.melody ? "Split and transcribe again" : "Split stems and find the notes"}
        </Button>
      )}
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
    </div>
  )

  if (!parts.melody || !lines) {
    return (
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">Vocals and melody</h3>
        <Caption>
          Splits the track into stems (vocals, drums, bass and the rest) with an AI model that runs in your browser, then writes the sung line and the top instrument line as notes.
          The first time downloads the model, about 170 MB; your browser keeps it after that.
          {gpu === false ? " This browser can’t use your graphics card for it, so it runs on the CPU and can take 10 minutes or more." : " On a recent computer it takes a minute or two."}
        </Caption>
        {runner}
      </div>
    )
  }

  const empty = !lines.vocals.length && !lines.lead.length
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Vocals and melody</h3>
        <div className="flex items-center gap-2">
          <Switch id={`${pid}-snap`} checked={snap} onCheckedChange={setSnap} />
          <Label htmlFor={`${pid}-snap`} className="text-sm font-normal">Snap to 16ths</Label>
        </div>
      </div>
      {pages > 1 && <Seg label="Bars" value={String(pg)} onChange={setPage} options={Array.from({ length: pages }, (_, i): [string, string] => [String(i), `Bars ${i * PAGE + 1}–${Math.min(sec.bars, (i + 1) * PAGE)}`])} />}
      {empty ? <Caption>No vocals or lead line in these bars.</Caption> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {([["vocals", "Vocals", "No singing in these bars."], ["lead", "Lead melody", "No lead line in these bars."]] as const).map(([k, title, none]) => (
            <div key={k} className="space-y-3">
              <h4 className="text-sm font-semibold">{title}</h4>
              {lines[k].length ? (
                <>
                  <NoteRoll notes={lines[k]} bars={bars} label={`${title} notes`} />
                  <p className="text-sm text-pretty">{[...new Set(lines[k].map((x) => noteName(x.midi)))].join(" · ")}</p>
                  <PlayButton id={`${pid}-mel-${k}`} label={`Play ${title.toLowerCase()}`} onPlay={() => play(k)} />
                </>
              ) : <Caption>{none}</Caption>}
            </div>
          ))}
        </div>
      )}
      <Caption>Sung notes are rounded to the nearest semitone, so slides and vibrato show as their main note. The lead is the highest line in the instruments; long held chords are left out. Both MIDI downloads include these lines; the full-track file also has every instrument note.</Caption>
      {lines.vocals.length > 0 && lines.lead.length > 0 && <PlayButton id={`${pid}-mel-both`} label="Play both" onPlay={() => play("both")} />}
      {runner}
    </div>
  )
}

/** A piano roll for one line of notes. */
function NoteRoll({ notes, bars, label }: { notes: GridNote[]; bars: number; label: string }) {
  const lo = Math.min(...notes.map((x) => x.midi)) - 1, hi = Math.max(...notes.map((x) => x.midi)) + 1
  const rows = Math.max(8, hi - lo + 1), W = bars * 16
  const top = lo + rows - 1
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2" aria-label={label} role="img">
      <div className="grid h-40 text-[11px] leading-none" style={{ gridTemplateRows: `repeat(${rows}, minmax(0,1fr))` }}>
        {Array.from({ length: rows }, (_, i) => top - i).map((m) => <span key={m} className="text-muted-foreground flex min-h-0 items-center overflow-visible">{m % 12 === 0 ? noteName(m) : ""}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${rows}`} preserveAspectRatio="none" className="h-40 w-full bg-muted">
        {Array.from({ length: rows }, (_, i) => top - i).filter((m) => [1, 3, 6, 8, 10].includes(m % 12)).map((m) => <rect key={m} x={0} y={top - m} width={W} height={1} fill="var(--border)" opacity={0.35} />)}
        {Array.from({ length: bars * 4 }, (_, i) => <line key={i} x1={i * 4} x2={i * 4} y1={0} y2={rows} stroke="var(--border)" strokeWidth={i % 4 === 0 ? 0.25 : 0.1} />)}
        {notes.map((x, i) => <rect key={i} x={x.step + 0.05} y={top - x.midi + 0.1} width={Math.max(0.3, x.len - 0.1)} height={0.8} fill="var(--foreground)" opacity={0.45 + Math.min(0.55, x.vel / 150)} />)}
      </svg>
    </div>
  )
}
