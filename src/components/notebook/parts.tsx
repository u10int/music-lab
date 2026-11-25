import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { AudioLines, Download, Grid3x3, ListMusic, Loader2, RefreshCw } from "lucide-react"
import { drum, tone, type DrumKind } from "@/audio/engine"
import { setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { Caption, SECTION_TITLE } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { analyzeParts } from "@/lib/audio-analysis"
import { downloadFile, TICKS_PER_16TH, writeMidi, type MidiNote, type MidiTrack } from "@/lib/midi-file"
import { proofUrl } from "@/lib/proofs"
import { setPref, usePref, type RefNote } from "@/lib/store"
import type { BarChord, DrumPart, PartLane, Parts } from "@/lib/transcribe-core"
import { cn } from "@/lib/utils"

const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10]
const LANE: Record<PartLane, { kind: DrumKind; note: number; name: string; seq: string }> = {
  Kick: { kind: "kick", note: 36, name: "Kick", seq: "kick" },
  Snare: { kind: "clap", note: 38, name: "Snare / clap", seq: "snare" },
  Hat: { kind: "hat", note: 42, name: "Hats", seq: "hat" },
}
const chordName = (c: BarChord) => NOTE[c.root] + (c.minor ? "m" : "")
const noteName = (m: number) => NOTE[m % 12] + (Math.floor(m / 12) - 2)

/** The chord as a Roman numeral in the key, or null when it isn’t one of the key’s own chords. */
function roman(c: BarChord, keyRoot: number, minor: boolean) {
  const sc = minor ? MINOR : MAJOR
  const deg = sc.indexOf(((c.root - keyRoot) % 12 + 12) % 12)
  if (deg < 0) return null
  const third = (sc[(deg + 2) % 7] - sc[deg] + 12) % 12, fifth = (sc[(deg + 4) % 7] - sc[deg] + 12) % 12
  if ((third === 3) !== c.minor || fifth !== 7) return null
  return { deg, label: c.minor ? ROMAN[deg].toLowerCase() : ROMAN[deg] }
}

/** The shortest chord cycle (1, 2, 4 or 8 bars) that most of the section repeats. */
function cycle(chords: (BarChord | null)[]) {
  const key = (c: BarChord | null) => (c ? chordName(c) : "-")
  for (const p of [1, 2, 4, 8]) {
    if (chords.length < p * 2) continue
    let same = 0, n = 0
    for (let i = p; i < chords.length; i++) { n++; if (key(chords[i]) === key(chords[i - p])) same++ }
    if (n && same / n >= 0.7) return p
  }
  return Math.min(8, chords.length)
}

function drumHits(d: DrumPart) {
  return d.rows.flatMap(([lane, on, ghost]) => [...on.map((s) => ({ lane, s: s - 1, vel: 1 })), ...ghost.map((s) => ({ lane, s: s - 1, vel: 0.4 }))])
}

export function PartsPanel({ n, edit }: { n: RefNote; edit: (fn: (d: RefNote) => void) => void }) {
  const a = n.audio!.analysis, parts = n.audio!.parts
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setError(null)
    setStatus("Finding the drums, bass and chords…")
    try {
      const url = await proofUrl(n.audio!.path)
      if (!url) throw new Error("The audio file isn’t available in this browser.")
      const blob = await (await fetch(url)).blob()
      const p = await analyzeParts(blob, a)
      if (!p) throw new Error("Couldn’t find a steady beat to line the parts up with.")
      edit((d) => { if (d.audio) d.audio.parts = p })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setStatus(null)
    }
  }

  return (
    <section aria-labelledby="parts-h" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl space-y-1">
          <h2 id="parts-h" className={SECTION_TITLE}>Drums, bass and chords</h2>
          <Caption>A transcription of the full mix to start from, not an exact copy. It’s best on clear, steady grooves; layered drums, busy percussion and 808s under the kick confuse it. Click a drum step to fix it.</Caption>
        </div>
        {parts && <Button variant="ghost" size="sm" disabled={!!status} onClick={run}>{status ? <Loader2 className="animate-spin" /> : <RefreshCw />}Analyse again</Button>}
      </div>
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
      {parts ? <PartsView key={n.audio!.path} n={n} parts={parts} edit={edit} /> : (
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-foreground/30 p-5">
          <p className="text-sm">This track was analysed before parts were added.</p>
          <Button disabled={!!status} onClick={run}>{status ? <Loader2 className="animate-spin" /> : <AudioLines />}{status ?? "Find drums, bass and chords"}</Button>
        </div>
      )}
    </section>
  )
}

function PartsView({ n, parts, edit }: { n: RefNote; parts: Parts; edit: (fn: (d: RefNote) => void) => void }) {
  const a = n.audio!.analysis
  const sections = parts.sections
  const dropIdx = sections.findIndex((s) => s.drums && /drop/i.test(s.label)), drumIdx = sections.findIndex((s) => s.drums)
  const first = dropIdx >= 0 ? dropIdx : Math.max(0, drumIdx)
  const [pick, setPick] = useState(String(first))
  const si = Math.min(sections.length - 1, +pick), sec = sections[si]
  const navigate = useNavigate()
  const [seq] = usePref<Record<string, unknown> | null>("sequencer", null)
  const [prog] = usePref<Record<string, unknown> | null>("progression", null)
  const step = 60 / parts.tempo / 4
  const mmss = (t: number) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0")
  const at = (bar: number) => parts.t0 + bar * 16 * step

  // This section’s chords, its repeating cycle, and its bass for those bars.
  const secChords = parts.chords.slice(sec.startBar, sec.startBar + sec.bars)
  const p = cycle(secChords)
  const shown = secChords.slice(0, Math.max(p, Math.min(4, secChords.length)))
  const loopBars = Math.max(1, Math.min(sec.bars, shown.length || 4))
  const bassNotes = parts.bass.filter((b) => b.step >= sec.startBar * 16 && b.step < (sec.startBar + loopBars) * 16).map((b) => ({ ...b, step: b.step - sec.startBar * 16 }))
  const romans = shown.map((c) => (c ? roman(c, a.keyRoot, a.minor) : null))
  const diatonic = shown.length > 0 && romans.every(Boolean)

  const setDrums = (fn: (d: DrumPart) => void) => edit((d) => { const s = d.audio?.parts?.sections[si]; if (s?.drums) fn(s.drums) })
  const cycleCell = (li: number, s: number) => setDrums((d) => {
    const row = d.rows[li], on = row[1].includes(s), ghost = row[2].includes(s)
    row[1] = row[1].filter((x) => x !== s); row[2] = row[2].filter((x) => x !== s)
    if (!on && !ghost) row[1].push(s)
    else if (on) row[2].push(s)
    row[1].sort((x, y) => x - y); row[2].sort((x, y) => x - y)
  })

  /* ---------- Playback ---------- */
  const pid = `parts-${n.id}-${si}`
  const play = (what: "drums" | "bass" | "chords" | "all") => {
    const bars = what === "drums" ? (sec.drums?.length === 32 ? 2 : 1) : loopBars
    const reps = Math.max(1, Math.ceil(16 / bars))
    toggle(`${pid}-${what}`, reps * bars * 16 * step + 0.5, (c, bus, t0) => {
      for (let r = 0; r < reps; r++) {
        const base = t0 + r * bars * 16 * step
        if ((what === "drums" || what === "all") && sec.drums) {
          const L = sec.drums.length
          for (let rep = 0; rep < (bars * 16) / L; rep++) for (const h of drumHits(sec.drums)) drum(c, bus, base + (rep * L + h.s) * step, LANE[h.lane].kind, h.vel * 0.6)
        }
        if (what === "bass" || what === "all") for (const b of bassNotes) tone(c, bus, base + b.step * step, b.midi + 12, b.len * step * 0.95, { wave: "sawtooth", cutoff: 500, q: 2, level: 0.22, env: { a: 0.005, d: 0.2, s: 0.7, r: 0.05 } })
        if (what === "chords" || what === "all") shown.slice(0, bars).forEach((ch, i) => {
          if (!ch) return
          const root = 48 + ((ch.root - 0) % 12)
          for (const iv of [0, ch.minor ? 3 : 4, 7]) tone(c, bus, base + i * 16 * step, root + iv + (root + iv < 55 ? 12 : 0), 16 * step * 0.95, { wave: "triangle", cutoff: 2200, level: 0.07, env: { a: 0.02, d: 0.6, s: 0.6, r: 0.3 } })
        })
      }
    }, (el) => setPos(el < 0 ? -1 : Math.floor(el / step) % (bars * 16)))
  }

  /* ---------- MIDI ---------- */
  const drumTrack = (d: DrumPart, from: number, bars: number): MidiTrack => {
    const notes: MidiNote[] = []
    for (let b = 0; b < bars; b += d.length / 16) for (const h of drumHits(d)) {
      const s = b * 16 + h.s
      if (s < bars * 16) notes.push({ tick: (from * 16 + s) * TICKS_PER_16TH, note: LANE[h.lane].note, velocity: Math.round(h.vel * 110), duration: TICKS_PER_16TH / 2, channel: 9 })
    }
    return { name: "Drums", notes }
  }
  const chordNotes = (list: (BarChord | null)[], from: number): MidiNote[] => list.flatMap((ch, i) => {
    if (!ch) return []
    const root = 48 + ch.root
    return [0, ch.minor ? 3 : 4, 7].map((iv) => ({ tick: (from + i) * 16 * TICKS_PER_16TH, note: root + iv + (root + iv < 55 ? 12 : 0), velocity: 90, duration: 16 * TICKS_PER_16TH - 2, channel: 2 }))
  })
  const title = (n.title || "reference").replace(/[^\w-]+/g, "-").toLowerCase()
  const sectionMidi = () => {
    const tracks: MidiTrack[] = []
    if (sec.drums) tracks.push({ ...drumTrack(sec.drums, 0, loopBars), length: loopBars * 16 * TICKS_PER_16TH })
    if (bassNotes.length) tracks.push({ name: "Bass", notes: bassNotes.map((b) => ({ tick: b.step * TICKS_PER_16TH, note: b.midi, velocity: 100, duration: b.len * TICKS_PER_16TH - 2, channel: 1 })), length: loopBars * 16 * TICKS_PER_16TH })
    if (shown.some(Boolean)) tracks.push({ name: "Chords", notes: chordNotes(shown.slice(0, loopBars), 0), length: loopBars * 16 * TICKS_PER_16TH })
    downloadFile(writeMidi(tracks, parts.tempo), `${title}-${sec.label.toLowerCase()}-${Math.round(parts.tempo)}bpm.mid`)
  }
  const fullMidi = () => {
    const drums: MidiNote[] = sections.flatMap((s) => (s.drums ? drumTrack(s.drums, s.startBar, s.bars).notes : []))
    const tracks: MidiTrack[] = [
      { name: "Drums", notes: drums },
      { name: "Bass", notes: parts.bass.map((b) => ({ tick: b.step * TICKS_PER_16TH, note: b.midi, velocity: 100, duration: b.len * TICKS_PER_16TH - 2, channel: 1 })) },
      { name: "Chords", notes: chordNotes(parts.chords, 0) },
    ].map((t) => ({ ...t, length: parts.bars * 16 * TICKS_PER_16TH }))
    downloadFile(writeMidi(tracks, parts.tempo), `${title}-full-${Math.round(parts.tempo)}bpm.mid`)
  }
  const toSequencer = () => {
    if (!sec.drums) return
    const len = sec.drums.length
    const drums: Record<string, number[]> = {}
    for (const [lane, on, ghost] of sec.drums.rows) drums[LANE[lane].seq] = Array.from({ length: 32 }, (_, i) => {
      const s = (i % len) + 1
      return on.includes(s) ? 2 : ghost.includes(s) ? 1 : 0
    })
    setPref("sequencer", { melody: Array(32).fill(null), sound: "pluck", ...(seq ?? {}), tempo: Math.round(parts.tempo), swing: 0, bars: len === 32 ? 2 : 1, drums: { ...((seq?.drums as Record<string, number[]>) ?? {}), kick: [], snare: [], clap: [], hat: [], ...drums } })
    navigate("/labs/sequencer")
  }
  const toProgressions = () => {
    const degs = romans.slice(0, 8).map((r) => r!.deg)
    setPref("root", a.keyRoot)
    setPref("scale", a.minor ? "minor" : "major")
    setPref("progression", { sevenths: false, lead: true, sound: "keys", rhythm: "held", pattern: "prog", ...(prog ?? {}), chords: degs, tempo: Math.round(parts.tempo) })
    navigate("/labs/progressions")
  }

  const playing = usePlayingId()
  const pos = usePos(`${pid}-drums`)
  const allPos = usePos(`${pid}-all`)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Seg label="Section" value={String(si)} onChange={setPick} options={sections.map((s, i) => [String(i), `${s.label} · ${mmss(at(s.startBar))}`])} />
        <p className="text-muted-foreground text-sm tabular-nums">Bars {sec.startBar + 1}–{sec.startBar + sec.bars} · {parts.tempo} BPM · first downbeat at {parts.t0.toFixed(2)} s</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <PlayButton id={`${pid}-all`} label="Play all three" onPlay={() => play("all")} />
        <Button variant="outline" size="sm" onClick={sectionMidi}><Download />MIDI for this section</Button>
        <Button variant="ghost" size="sm" onClick={fullMidi}><Download />MIDI for the whole track</Button>
      </div>

      {/* Drums */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Drums</h3>
          {sec.drums && <span className="text-muted-foreground text-sm">{sec.drums.conf >= 0.7 ? "Consistent bars" : sec.drums.conf >= 0.4 ? "Some bars differ" : "Bars vary a lot: check by ear"}</span>}
        </div>
        {sec.drums ? (
          <>
            <div className="overflow-x-auto">
              <div className="grid min-w-[36rem] gap-1" role="grid" aria-label={`Drum pattern, ${sec.drums.length} steps`}>
                {sec.drums.rows.map(([lane, on, ghost], li) => (
                  <div key={lane} role="row" className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
                    <span role="rowheader" className="text-sm">{LANE[lane].name}</span>
                    <div className={cn("grid gap-px", sec.drums!.length === 32 ? "grid-cols-[repeat(32,minmax(0,1fr))]" : "grid-cols-16")}>
                      {Array.from({ length: sec.drums!.length }, (_, i) => {
                        const s = i + 1, isOn = on.includes(s), isGhost = ghost.includes(s)
                        const live = (playing === `${pid}-drums` ? pos : playing === `${pid}-all` ? allPos % sec.drums!.length : -1) === i
                        return (
                          <button key={i} type="button" role="gridcell" aria-label={`${LANE[lane].name}, step ${s}: ${isOn ? "hit" : isGhost ? "quiet hit" : "off"}`}
                            onClick={() => cycleCell(li, s)}
                            className={cn("h-8 transition-[background-color] duration-75", isOn ? "bg-foreground" : isGhost ? "bg-foreground/35" : i % 4 === 0 ? "bg-border" : "bg-muted", live && "outline-2 outline-[#23782b] -outline-offset-2")} />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Caption>Dark: a hit in most bars. Light: quieter or only some bars. Click a step to cycle hit, quiet hit and off.</Caption>
            <div className="flex flex-wrap gap-2">
              <PlayButton id={`${pid}-drums`} label="Play drums" onPlay={() => play("drums")} />
              <Button variant="outline" size="sm" onClick={toSequencer}><Grid3x3 />Open in step sequencer</Button>
            </div>
          </>
        ) : <Caption>No steady drums in this section.</Caption>}
      </div>

      <div className="grid gap-6 border-t pt-4 lg:grid-cols-2">
        {/* Bass */}
        <div className="space-y-3">
          <h3 className="font-semibold">Bass, first {loopBars} bar{loopBars > 1 ? "s" : ""}</h3>
          {bassNotes.length ? (
            <>
              <BassRoll notes={bassNotes} bars={loopBars} />
              <p className="text-sm text-pretty">{[...new Set(bassNotes.map((b) => noteName(b.midi)))].join(" · ")}</p>
              <PlayButton id={`${pid}-bass`} label="Play bass" onPlay={() => play("bass")} />
            </>
          ) : <Caption>No clear bass line in these bars.</Caption>}
        </div>

        {/* Chords */}
        <div className="space-y-3">
          <h3 className="font-semibold">Chords{p <= shown.length && shown.length > 1 ? `, repeating every ${p} bar${p > 1 ? "s" : ""}` : ""}</h3>
          {shown.some(Boolean) ? (
            <>
              <ol className="grid grid-cols-4 gap-1.5">
                {shown.map((c, i) => (
                  <li key={i} className={cn("border px-3 py-2", c && c.conf < 0.3 ? "border-dashed border-foreground/30" : "border-foreground/25")}>
                    <span className="block font-medium">{c ? chordName(c) : "–"}</span>
                    <span className="text-muted-foreground block text-xs">{c ? (romans[i]?.label ?? "outside the key") + (c.conf < 0.3 ? " · unsure" : "") : "no clear chord"}</span>
                  </li>
                ))}
              </ol>
              <Caption>In {NOTE[a.keyRoot]} {a.minor ? "minor" : "major"}. Triads only: 7ths and 9ths show as their basic chord.</Caption>
              <div className="flex flex-wrap gap-2">
                <PlayButton id={`${pid}-chords`} label="Play chords" onPlay={() => play("chords")} />
                {diatonic && <Button variant="outline" size="sm" onClick={toProgressions}><ListMusic />Open in progression builder</Button>}
              </div>
            </>
          ) : <Caption>No clear chords in this section.</Caption>}
        </div>
      </div>
    </div>
  )
}

/** A small piano roll for the bass notes. */
function BassRoll({ notes, bars }: { notes: { step: number; len: number; midi: number }[]; bars: number }) {
  const lo = Math.min(...notes.map((n) => n.midi)), hi = Math.max(...notes.map((n) => n.midi))
  const rows = Math.max(5, hi - lo + 1), W = bars * 16
  const rowsArr = useMemo(() => Array.from({ length: rows }, (_, i) => hi - i), [rows, hi])
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2" aria-label="Bass notes" role="img">
      <div className="grid text-[11px] leading-none" style={{ gridTemplateRows: `repeat(${rows}, minmax(0,1fr))` }}>
        {rowsArr.map((m) => <span key={m} className="text-muted-foreground flex items-center">{m % 12 === 0 || m === lo || m === hi ? noteName(m) : ""}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${rows}`} preserveAspectRatio="none" className="h-32 w-full bg-muted">
        {Array.from({ length: bars * 4 }, (_, i) => <line key={i} x1={i * 4} x2={i * 4} y1={0} y2={rows} stroke="var(--border)" strokeWidth={i % 4 === 0 ? 0.25 : 0.1} />)}
        {notes.map((n, i) => <rect key={i} x={n.step + 0.05} y={hi - n.midi + 0.1} width={Math.max(0.4, n.len - 0.1)} height={0.8} fill="var(--foreground)" />)}
      </svg>
    </div>
  )
}
