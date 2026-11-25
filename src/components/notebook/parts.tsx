import { Fragment, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { AudioLines, ChevronDown, Download, Grid3x3, ListMusic, Loader2, RefreshCw, Volume2, VolumeX, X } from "lucide-react"
import { drum } from "@/audio/engine"
import { setPos, toggle } from "@/audio/playback"
import { Caption, SECTION_TITLE } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg, TabSwitch } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { analyzeParts } from "@/lib/audio-analysis"
import { melodyTracks } from "@/lib/melody-grid"
import { downloadFile, writeMidi } from "@/lib/midi-file"
import { proofUrl } from "@/lib/proofs"
import { setPref, usePref, type RefNote } from "@/lib/store"
import type { DrumFill, DrumPart, Parts } from "@/lib/transcribe-core"
import { cn } from "@/lib/utils"
import { ChordStrip, DrumStrip, FillStrip, Progress, Roll, Ruler } from "./parts-lanes"
import { nowNote, PART_COLOR, tint, usePlayhead } from "./parts-play"
import { barHits, chordName, cycle, GRID_NAME, LANE, LANES, mmss, NOTE, noteName, partsTracks, roman, scheduleWindow, windowOf, type Lane } from "./parts-model"
import { StemsRunner } from "./stems-runner"

const PAGE = 8
type Tab = "overview" | "drums" | "bass" | "chords" | "vocals"

export function PartsPanel({ n, edit }: { n: RefNote; edit: (fn: (d: RefNote) => void) => void }) {
  const a = n.audio!.analysis, parts = n.audio!.parts
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const getAudio = async () => {
    const url = await proofUrl(n.audio!.path)
    if (!url) throw new Error("The audio file isn’t available in this browser.")
    return (await fetch(url)).blob()
  }
  const run = async () => {
    setError(null)
    setStatus("Finding the drums, bass and chords…")
    try {
      const p = await analyzeParts(await getAudio(), a)
      if (!p) throw new Error("Couldn’t find a steady beat to line the parts up with.")
      // Keep the vocals and melody: splitting the stems again takes a while.
      edit((d) => { if (d.audio) d.audio.parts = { ...p, melody: d.audio.parts?.melody } })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setStatus(null)
    }
  }

  return (
    <section aria-labelledby="parts-h" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl space-y-1">
          <h2 id="parts-h" className={SECTION_TITLE}>Parts</h2>
          <Caption>Drums, bass, chords, vocals and melody, transcribed from the audio as a starting point rather than an exact copy. Click a drum step to fix it.</Caption>
        </div>
        {parts && !parts.fromStems && <Button variant="ghost" size="sm" disabled={!!status} onClick={run}>{status ? <Loader2 className="animate-spin" /> : <RefreshCw />}Analyse again</Button>}
      </div>
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
      {parts ? <PartsView key={n.audio!.path} n={n} parts={parts} edit={edit} getAudio={getAudio} /> : (
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-foreground/30 p-5">
          <p className="text-sm">This track was analysed before parts were added.</p>
          <Button disabled={!!status} onClick={run}>{status ? <Loader2 className="animate-spin" /> : <AudioLines />}{status ?? "Find the parts"}</Button>
        </div>
      )}
    </section>
  )
}

function PartsView({ n, parts, edit, getAudio }: { n: RefNote; parts: Parts; edit: (fn: (d: RefNote) => void) => void; getAudio: () => Promise<Blob> }) {
  const a = n.audio!.analysis
  const sections = parts.sections
  const dropIdx = sections.findIndex((s) => s.drums && /drop/i.test(s.label)), drumIdx = sections.findIndex((s) => s.drums)
  const [pick, setPick] = useState(String(dropIdx >= 0 ? dropIdx : Math.max(0, drumIdx)))
  const si = Math.min(sections.length - 1, +pick), sec = sections[si]
  const [tab, setTab] = useState<Tab>("overview")
  const navigate = useNavigate()
  const [seq] = usePref<Record<string, unknown> | null>("sequencer", null)
  const [prog] = usePref<Record<string, unknown> | null>("progression", null)
  const [snap, setSnap] = usePref<boolean>("parts-snap", true)
  const [muted, setMuted] = usePref<Lane[]>("parts-muted", [])
  const step = 60 / parts.tempo / 4
  const at = (bar: number) => parts.t0 + bar * 16 * step

  // Up to 8 bars at a time; back to the first page when the section changes.
  const [pageAt, setPageAt] = useState({ si, page: 0 })
  const pages = Math.max(1, Math.ceil(sec.bars / PAGE))
  const page = pageAt.si === si ? Math.min(pages - 1, pageAt.page) : 0
  const from = sec.startBar + page * PAGE, bars = Math.max(1, Math.min(PAGE, sec.startBar + sec.bars - from))
  const w = useMemo(() => windowOf(parts, sec, from, bars, snap), [parts, sec, from, bars, snap])

  // The chord cycle over the whole section, for the progression builder.
  const secChords = parts.chords.slice(sec.startBar, sec.startBar + sec.bars)
  const cyc = cycle(secChords)
  const loop = secChords.slice(0, Math.max(cyc, Math.min(4, secChords.length)))
  const romans = loop.map((c) => (c ? roman(c, a.keyRoot, a.minor) : null))
  const diatonic = loop.length > 0 && romans.every(Boolean)

  /* ---------- Playback ---------- */
  const pid = `parts-${n.id}-${si}-${from}`
  const { what, step: pos } = usePlayhead(pid)
  const lanesOn = LANES.map(([k]) => k).filter((k) => !muted.includes(k))
  const play = (id: string, lanes: Lane[]) => toggle(`${pid}-${id}`, bars * 16 * step + 0.6, (c, bus, t0) => scheduleWindow(c, bus, t0, w, step, new Set(lanes)), (el) => setPos(el < 0 ? -1 : Math.floor((el / step) * 4) / 4))
  const chordNow = pos >= 0 ? w.chords[Math.floor(pos / 16)]?.chord : null
  const readout = what === "bass" ? nowNote(w.bass, pos) : what === "vocals" ? nowNote(w.vocals, pos) : what === "lead" ? nowNote(w.lead, pos) : chordNow ? chordName(chordNow) : undefined

  /* ---------- Drums editing ---------- */
  const setDrums = (fn: (d: DrumPart) => void) => edit((d) => { const s = d.audio?.parts?.sections[si]; if (s?.drums) fn(s.drums) })
  const cycleCell = (li: number, s: number) => setDrums((d) => {
    const row = d.rows[li], on = row[1].includes(s), ghost = row[2].includes(s)
    row[1] = row[1].filter((x) => x !== s); row[2] = row[2].filter((x) => x !== s)
    if (!on && !ghost) row[1].push(s)
    else if (on) row[2].push(s)
    row[1].sort((x, y) => x - y); row[2].sort((x, y) => x - y)
  })
  const fills = sec.fills ?? []
  const fillSig = (f: DrumFill) => `${f.lane}|${f.grid}|${f.from}`
  // Removing a repeating figure removes every bar of it.
  const removeFill = (f: DrumFill) => edit((d) => { const s = d.audio?.parts?.sections[si]; if (s?.fills) s.fills = s.fills.filter((x) => (f.groove ? !(x.groove && fillSig(x) === fillSig(f)) : !(x.bar === f.bar && x.lane === f.lane))) })
  const fillRows = [
    ...Object.values(fills.filter((f) => f.groove).reduce<Record<string, { f: DrumFill; bars: number }>>((m, f) => {
      const k = fillSig(f)
      m[k] = m[k] ? { ...m[k], bars: m[k].bars + 1 } : { f, bars: 1 }
      return m
    }, {})),
    ...fills.filter((f) => !f.groove).map((f) => ({ f, bars: 1 })),
  ]
  /** The bar before a fill, then the fill bar. */
  const playFill = (f: DrumFill) => {
    if (!sec.drums) return
    const rel = f.bar - sec.startBar, d = sec.drums
    const inBar = fills.filter((x) => x.bar === f.bar)
    toggle(`${pid}-fill-${f.bar}-${f.lane}`, 32 * step + 0.5, (c, bus, t0) => {
      for (const h of barHits(d, Math.max(0, rel - 1), [])) drum(c, bus, t0 + h.pos * step, LANE[h.lane].kind, h.vel * 0.6)
      for (const h of barHits(d, rel, inBar)) drum(c, bus, t0 + (16 + h.pos) * step, LANE[h.lane].kind, h.vel * 0.6)
    })
  }

  /* ---------- MIDI and other tools ---------- */
  const title = (n.title || "reference").replace(/[^\w-]+/g, "-").toLowerCase()
  const sectionMidi = () => downloadFile(writeMidi([...partsTracks(parts, sec, sec.startBar, sec.bars), ...melodyTracks(parts, sec.startBar, sec.bars, snap, false)], parts.tempo), `${title}-${sec.label.toLowerCase()}-${Math.round(parts.tempo)}bpm.mid`)
  const fullMidi = () => downloadFile(writeMidi([...partsTracks(parts, null, 0, parts.bars), ...melodyTracks(parts, 0, parts.bars, snap, true)], parts.tempo), `${title}-full-${Math.round(parts.tempo)}bpm.mid`)
  const toSequencer = () => {
    if (!sec.drums) return
    const len = sec.drums.length
    const drums: Record<string, number[]> = {}
    for (const [lane, on, ghost] of sec.drums.rows) drums[LANE[lane].seq] = Array.from({ length: 32 }, (_, i) => {
      const s = (i % len) + 1
      return on.includes(s) ? 2 : ghost.includes(s) ? 1 : 0
    })
    setPref("sequencer", { melody: Array(32).fill(null), sound: "pluck", ...(seq ?? {}), tempo: Math.round(parts.tempo), swing: 0, bars: len === 32 ? 2 : 1, drums: { ...((seq?.drums as Record<string, number[]>) ?? {}), kick: [], snare: [], clap: [], hat: [], ohat: [], ...drums } })
    navigate("/labs/sequencer")
  }
  const toProgressions = () => {
    setPref("root", a.keyRoot)
    setPref("scale", a.minor ? "minor" : "major")
    setPref("progression", { sevenths: false, lead: true, sound: "keys", rhythm: "held", pattern: "prog", ...(prog ?? {}), chords: romans.slice(0, 8).map((r) => r!.deg), tempo: Math.round(parts.tempo) })
    navigate("/labs/progressions")
  }

  const hasMelody = !!parts.melody
  const empty = (text: string, tall = false) => <div className={cn("text-muted-foreground flex items-center bg-muted/50 px-3 text-xs", tall ? "h-20" : "h-14")}>{text}</div>
  const firstInSec = from - sec.startBar + 1

  return (
    <div className="space-y-5">
      <StemsRunner n={n} parts={parts} edit={edit} getAudio={getAudio} />

      <div className="space-y-2">
        <Seg label="Section" value={String(si)} onChange={setPick} options={sections.map((s, i) => [String(i), `${s.label} · ${mmss(at(s.startBar))}`])} />
        <p className="text-muted-foreground text-sm tabular-nums">Bars {sec.startBar + 1}–{sec.startBar + sec.bars} of the track · {Math.round(parts.tempo * 10) / 10} BPM · {NOTE[a.keyRoot]} {a.minor ? "minor" : "major"}</p>
      </div>

      {/* Transport: what plays, where it is, and the exports. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlayButton id={`${pid}-section`} label={pages > 1 ? `Play bars ${firstInSec}–${firstInSec + bars - 1}` : "Play section"} onPlay={() => play("section", lanesOn)} />
            {pages > 1 && <Seg label="Bars" value={String(page)} onChange={(v) => setPageAt({ si, page: +v })} options={Array.from({ length: pages }, (_, i): [string, string] => [String(i), `${i * PAGE + 1}–${Math.min(sec.bars, (i + 1) * PAGE)}`])} />}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download />Export MIDI<ChevronDown /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={sectionMidi}>This section ({sec.label}, {sec.bars} bars)</DropdownMenuItem>
              <DropdownMenuItem onSelect={fullMidi}>The whole track</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Progress step={pos} bars={bars} note={readout} />
      </div>

      <TabSwitch label="Part" value={tab} onChange={setTab} options={[["overview", "Overview"], ["drums", "Drums"], ["bass", "Bass"], ["chords", "Chords"], ["vocals", "Vocals & melody"]]} />

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-3">
            <span className="text-muted-foreground text-xs">Bar</span>
            <Ruler bars={bars} first={firstInSec} />
            {LANES.map(([k, label]) => {
              const off = muted.includes(k)
              const melodyLane = k === "vocals" || k === "lead"
              return (
                <Fragment key={k}>
                  <Toggle variant="outline" size="sm" pressed={!off} onPressedChange={(on) => setMuted(on ? muted.filter((x) => x !== k) : [...muted, k])}
                    aria-label={`Include ${label.toLowerCase()} when playing`} className="w-full justify-start gap-1.5 px-2 font-normal data-[state=off]:text-muted-foreground">
                    {off ? <VolumeX /> : <Volume2 />}{label}
                  </Toggle>
                  <div className={cn("min-w-0", off && "opacity-40")}>
                    {k === "drums" && (w.drums.length ? <DrumStrip hits={w.drums} bars={bars} step={pos} /> : empty("No steady drums"))}
                    {k === "bass" && (w.bass.length ? <Roll notes={w.bass} bars={bars} step={pos} names={false} className="h-16" label="Bass notes" color={PART_COLOR.bass} /> : empty("No clear bass"))}
                    {k === "chords" && <div className="relative"><ChordStrip chords={w.chords} step={pos} keyRoot={a.keyRoot} minor={a.minor} /></div>}
                    {melodyLane && (!hasMelody ? empty("Split the stems to see this") : w[k].length ? <Roll notes={w[k]} bars={bars} step={pos} names={false} className="h-20" label={`${label} notes`} color={PART_COLOR[k]} /> : empty(k === "vocals" ? "No singing in these bars" : "No lead line in these bars"))}
                  </div>
                </Fragment>
              )
            })}
          </div>
          <Caption>Switch a part off to leave it out when you press play.</Caption>
        </div>
      )}

      {tab === "drums" && (
        <div className="space-y-4">
          {sec.drums ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{sec.drums.length === 32 ? "Two-bar pattern" : "One-bar pattern"}</h3>
                <span className="text-muted-foreground text-sm">{sec.drums.conf >= 0.7 ? "Consistent bars" : sec.drums.conf >= 0.4 ? "Some bars differ" : "Bars vary a lot: check by ear"}</span>
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[36rem] gap-1" role="grid" aria-label={`Drum pattern, ${sec.drums.length} steps`}>
                  {sec.drums.rows.map(([lane, on, ghost], li) => (
                    <div key={lane} role="row" className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
                      <span role="rowheader" className="text-sm">{LANE[lane].name}</span>
                      <div className={cn("grid gap-px", sec.drums!.length === 32 ? "grid-cols-[repeat(32,minmax(0,1fr))]" : "grid-cols-16")}>
                        {Array.from({ length: sec.drums!.length }, (_, i) => {
                          const s = i + 1, isOn = on.includes(s), isGhost = ghost.includes(s)
                          const live = pos >= 0 && Math.floor(pos) % sec.drums!.length === i
                          return (
                            <button key={i} type="button" role="gridcell" aria-label={`${LANE[lane].name}, step ${s}: ${isOn ? "hit" : isGhost ? "quiet hit" : "off"}`}
                              onClick={() => cycleCell(li, s)}
                              className={cn("h-8 transition-[background-color] duration-75", !isOn && !isGhost && (i % 4 === 0 ? "bg-border" : "bg-muted"))}
                              style={{ background: isOn ? PART_COLOR.drums : isGhost ? tint(PART_COLOR.drums, 40) : undefined, ...(live ? { outline: "2px solid var(--foreground)", outlineOffset: -2 } : {}) }} />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Caption>Solid: a hit in most bars. Pale: quieter or only some bars. Click a step to cycle hit, quiet hit and off. Playing these bars includes any fills below.</Caption>
              <div className="flex flex-wrap gap-2">
                <PlayButton id={`${pid}-drums`} label="Play drums" onPlay={() => play("drums", ["drums"])} />
                <Button variant="outline" size="sm" onClick={toSequencer}><Grid3x3 />Open in step sequencer</Button>
              </div>
              {fillRows.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-semibold">Fills and rolls</h4>
                  <Caption>Where the hats or snare play more than the pattern: fills at the end of a phrase, and triplet or 32nd figures that repeat through the section.</Caption>
                  <ul className="divide-y border-y">
                    {fillRows.map(({ f, bars: count }) => {
                      const rel = f.bar - sec.startBar
                      const desc = `${f.lane === "Hat" ? "Hats" : "Snare"} in ${GRID_NAME[f.grid]} from beat ${Math.floor(f.from / 4) + 1}`
                      return (
                        <li key={`${f.bar}-${f.lane}`} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center">
                          <div className="min-w-0">
                            {f.groove
                              ? <p className="text-sm font-medium">Repeats in {count} of {sec.bars} bars <span className="text-muted-foreground font-normal tabular-nums">· first at {mmss(at(f.bar))}</span></p>
                              : <p className="text-sm font-medium">Bar {rel + 1} <span className="text-muted-foreground font-normal tabular-nums">· {mmss(at(f.bar))}</span></p>}
                            <p className="text-muted-foreground text-sm">{desc}{f.groove ? ", part of the groove" : ", leading into the next phrase"}</p>
                          </div>
                          <FillStrip fill={f} />
                          <div className="flex gap-1">
                            <PlayButton id={`${pid}-fill-${f.bar}-${f.lane}`} label="Play" onPlay={() => playFill(f)} />
                            <Button variant="ghost" size="sm" onClick={() => removeFill(f)} aria-label={f.groove ? `Remove the repeating ${desc.toLowerCase()}` : `Remove the fill in bar ${rel + 1}`}><X />Remove</Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : <Caption>No steady drums in this section.</Caption>}
        </div>
      )}

      {tab === "bass" && (
        <div className="space-y-3">
          {w.bass.length ? (
            <>
              <Roll notes={w.bass} bars={bars} step={pos} className="h-48" label="Bass notes" color={PART_COLOR.bass} />
              <p className="text-sm text-pretty">{[...new Set(w.bass.map((b) => noteName(b.midi)))].join(" · ")}</p>
              <Caption>{parts.fromStems ? "From the bass stem." : "From the low end of the full mix; splitting the stems makes this cleaner."} Notes are held for the bar unless the bass clearly moves.</Caption>
              <PlayButton id={`${pid}-bass`} label="Play bass" onPlay={() => play("bass", ["bass"])} />
            </>
          ) : <Caption>No clear bass line in these bars.</Caption>}
        </div>
      )}

      {tab === "chords" && (
        <div className="space-y-3">
          {w.chords.some((c) => c.chord) ? (
            <>
              <ChordStrip chords={w.chords} step={pos} keyRoot={a.keyRoot} minor={a.minor} size="lg" />
              <Caption>
                {cyc < secChords.length ? `The section repeats every ${cyc} bar${cyc > 1 ? "s" : ""}. ` : ""}
                In {NOTE[a.keyRoot]} {a.minor ? "minor" : "major"}. Triads only: 7ths and 9ths show as their basic chord.
              </Caption>
              <div className="flex flex-wrap gap-2">
                <PlayButton id={`${pid}-chords`} label="Play chords" onPlay={() => play("chords", ["chords"])} />
                {diatonic && <Button variant="outline" size="sm" onClick={toProgressions}><ListMusic />Open in progression builder</Button>}
              </div>
            </>
          ) : <Caption>No clear chords in these bars.</Caption>}
        </div>
      )}

      {tab === "vocals" && (
        <div className="space-y-4">
          {!hasMelody ? (
            <Caption>Vocals and melody need the stems: use Split stems above. It writes the sung line and the top instrument line as notes.</Caption>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Switch id={`${pid}-snap`} checked={snap} onCheckedChange={setSnap} />
                <Label htmlFor={`${pid}-snap`} className="text-sm font-normal">Snap to 16ths</Label>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {([["vocals", "Vocals", "No singing in these bars."], ["lead", "Lead melody", "No lead line in these bars."]] as const).map(([k, label, none]) => (
                  <div key={k} className="space-y-3">
                    <h3 className="font-semibold">{label}</h3>
                    {w[k].length ? (
                      <>
                        <div className="relative"><Roll notes={w[k]} bars={bars} step={pos} className="h-48" label={`${label} notes`} color={PART_COLOR[k]} /></div>
                        <PlayButton id={`${pid}-${k}`} label={`Play ${label.toLowerCase()}`} onPlay={() => play(k, [k])} />
                      </>
                    ) : <Caption>{none}</Caption>}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {w.vocals.length > 0 && <PlayButton id={`${pid}-sing`} label="Play vocals with chords and drums" onPlay={() => play("sing", ["vocals", "chords", "drums"])} />}
              </div>
              <Caption>Sung notes are rounded to the nearest semitone, so slides and vibrato show as their main note; each syllable is its own note. The lead is the highest instrument line, with long held chords left out.</Caption>
            </>
          )}
        </div>
      )}
    </div>
  )
}
