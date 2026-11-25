import { useMemo, useState } from "react"
import type { DrumFill } from "@/lib/transcribe-core"
import { cn } from "@/lib/utils"
import { chordName, noteName, roman, type ChordEv, type DrumEv, type NoteEv } from "./parts-model"
import { LIVE, PART_COLOR } from "./parts-play"

/** “Bar 3 of 8 · beat 2”, with a thin bar for the whole window. */
export function Progress({ step, bars, note }: { step: number; bars: number; note?: string }) {
  const on = step >= 0
  const bar = Math.floor(step / 16) + 1, beat = Math.floor((step % 16) / 4) + 1
  return (
    <div className="min-w-0 space-y-1.5" aria-live="off">
      <p className="text-muted-foreground text-sm tabular-nums">
        {on ? <><span className="text-foreground font-medium">Bar {bar}</span> of {bars} · beat {beat}{note ? <> · <span className="text-foreground">{note}</span></> : null}</> : `${bars} bar${bars > 1 ? "s" : ""}`}
      </p>
      <div className="bg-muted h-1 w-full" aria-hidden>
        <div className="h-full" style={{ width: on ? `${Math.min(100, (step / (bars * 16)) * 100)}%` : 0, background: LIVE }} />
      </div>
    </div>
  )
}

/** Bar numbers over a lane, counted within the section. */
export function Ruler({ bars, first }: { bars: number; first: number }) {
  return (
    <div className="text-muted-foreground grid text-xs tabular-nums" style={{ gridTemplateColumns: `repeat(${bars}, minmax(0,1fr))` }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => <span key={i} className="border-l border-border pl-1">{first + i}</span>)}
    </div>
  )
}

/** A vertical line at the playing step, over whatever lane it’s placed in. */
export function Playhead({ step, total }: { step: number; total: number }) {
  if (step < 0) return null
  return <div className="pointer-events-none absolute inset-y-0 w-0.5" style={{ left: `${(step / total) * 100}%`, background: LIVE }} aria-hidden />
}

const sounding = (n: { step: number; len: number }, step: number) => step >= n.step && step < n.step + n.len

/** A piano roll: one row per semitone, the sounding note filled in the live colour. */
/** A note’s length in plain terms: “1 bar”, “2 beats”, “8th”, or ms when it isn’t on the grid. */
function noteLength(len: number, stepMs?: number) {
  if (Math.abs(len - Math.round(len)) > 0.05) return stepMs ? `${Math.round(len * stepMs)} ms` : `${len.toFixed(1)} 16ths`
  const l = Math.round(len)
  if (l % 16 === 0) return `${l / 16} bar${l > 16 ? "s" : ""}`
  if (l % 4 === 0) return `${l / 4} beat${l > 4 ? "s" : ""}`
  if (l === 2) return "8th"
  if (l === 1) return "16th"
  if (l === 6) return "dotted quarter"
  if (l === 3) return "dotted 8th"
  return `${l} 16ths`
}

/** Where a step falls, written the way Live’s arrangement position is: bar.beat.sixteenth. */
function notePlace(step: number, firstBar: number) {
  const s = Math.max(0, Math.round(step)), bar = firstBar + Math.floor(s / 16), beat = Math.floor((s % 16) / 4) + 1
  return `${bar}.${beat}.${(s % 4) + 1}`
}

export function Roll({ notes, bars, step, label, className, names = true, color = "var(--foreground)", firstBar = 1, stepMs }: { notes: NoteEv[]; bars: number; step: number; label: string; className?: string; names?: boolean; color?: string; firstBar?: number; stepMs?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = bars * 16
  const lo = notes.length ? Math.min(...notes.map((x) => x.midi)) - 1 : 48, hi = notes.length ? Math.max(...notes.map((x) => x.midi)) + 1 : 60
  const rows = Math.max(names ? 8 : 6, hi - lo + 1), top = lo + rows - 1
  const rowList = useMemo(() => Array.from({ length: rows }, (_, i) => top - i), [rows, top])
  const roll = (
    <div className={cn("relative bg-muted", className ?? "h-40")}>
      <svg viewBox={`0 0 ${W} ${rows}`} preserveAspectRatio="none" className="absolute inset-0 size-full" role="img" aria-label={label}>
        {rowList.filter((m) => [1, 3, 6, 8, 10].includes(m % 12)).map((m) => <rect key={m} x={0} y={top - m} width={W} height={1} fill="var(--border)" opacity={0.35} />)}
        {Array.from({ length: bars * 4 }, (_, i) => <line key={i} x1={i * 4} x2={i * 4} y1={0} y2={rows} stroke="var(--border)" strokeWidth={i % 4 === 0 ? 0.25 : 0.1} />)}
        {notes.map((x, i) => {
          const live = sounding(x, step), on = hover === i
          const xs = Math.max(0, x.step), ws = Math.max(0.3, Math.min(x.len, W - x.step) - 0.1)
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover((h) => (h === i ? null : h))}>
              <rect x={xs + 0.05} y={top - x.midi + 0.1} width={ws} height={0.8} fill={color} opacity={live || on ? 1 : 0.55 + Math.min(0.3, x.vel / 250)} stroke={live || on ? "var(--foreground)" : "none"} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
              {/* A taller invisible target, so thin bars are easy to point at. */}
              <rect x={xs} y={top - x.midi - 0.4} width={ws + 0.1} height={1.8} fill="transparent" />
            </g>
          )
        })}
      </svg>
      <Playhead step={step} total={W} />
      {hover !== null && notes[hover] && (() => {
        const x = notes[hover], left = ((Math.max(0, x.step) + Math.min(x.len, W - Math.max(0, x.step)) / 2) / W) * 100, topPct = ((top - x.midi) / rows) * 100
        const shift = left < 12 ? "0%" : left > 88 ? "-100%" : "-50%"
        return (
          <div role="tooltip" className="pointer-events-none absolute z-10 bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background tabular-nums"
            style={{ left: `${left}%`, top: `${topPct}%`, transform: `translate(${shift}, calc(-100% - 6px))` }}>
            <span className="font-medium">{noteName(x.midi)}</span> · at {notePlace(x.step, firstBar)} · {noteLength(x.len, stepMs)}
          </div>
        )
      })()}
    </div>
  )
  if (!names) return roll
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
      <div className={cn("grid text-[11px] leading-none", className ?? "h-40")} style={{ gridTemplateRows: `repeat(${rows}, minmax(0,1fr))` }} aria-hidden>
        {rowList.map((m) => <span key={m} className="text-muted-foreground flex min-h-0 items-center">{m % 12 === 0 || m === lo + 1 ? noteName(m) : ""}</span>)}
      </div>
      {roll}
    </div>
  )
}

/** Drums at a glance: kick, snare and hats as ticks on one strip per sound. */
export function DrumStrip({ hits, bars, step }: { hits: DrumEv[]; bars: number; step: number }) {
  const W = bars * 16
  const rowOf = (l: DrumEv["lane"]) => (l === "Kick" ? 0 : l === "Snare" ? 1 : 2)
  return (
    <div className="relative h-14 bg-muted">
      <svg viewBox={`0 0 ${W} 3`} preserveAspectRatio="none" className="absolute inset-0 size-full" role="img" aria-label="Drum hits: kick, snare and hats">
        {Array.from({ length: bars * 4 }, (_, i) => <line key={i} x1={i * 4} x2={i * 4} y1={0} y2={3} stroke="var(--border)" strokeWidth={i % 4 === 0 ? 0.25 : 0.1} />)}
        {hits.map((h, i) => {
          const live = step >= h.step && step < h.step + 1
          return <rect key={i} x={h.step + 0.1} y={rowOf(h.lane) + 0.15} width={0.6} height={0.7} fill={PART_COLOR.drums} opacity={live ? 1 : 0.35 + h.vel * 0.5} stroke={live ? "var(--foreground)" : "none"} vectorEffect="non-scaling-stroke" />
        })}
      </svg>
      <Playhead step={step} total={W} />
    </div>
  )
}

/** One box per bar with its chord; the bar that’s playing is filled. */
export function ChordStrip({ chords, step, keyRoot, minor, size = "sm" }: { chords: ChordEv[]; step: number; keyRoot: number; minor: boolean; size?: "sm" | "lg" }) {
  const liveBar = step >= 0 ? Math.floor(step / 16) : -1
  return (
    <ol className={cn("grid gap-px", size === "lg" ? "grid-cols-4 sm:grid-cols-8" : "")} style={size === "sm" ? { gridTemplateColumns: `repeat(${chords.length}, minmax(0,1fr))` } : undefined}>
      {chords.map((c, i) => {
        const live = i === liveBar, r = c.chord ? roman(c.chord, keyRoot, minor) : null
        return (
          <li key={i} className={cn("min-w-0 border", size === "lg" ? "px-2 py-2" : "px-1 py-1 sm:px-2", live ? "border-foreground" : c.chord && c.chord.conf < 0.3 ? "border-dashed border-foreground/30" : "border-foreground/20")} style={{ background: c.chord ? `color-mix(in oklab, ${PART_COLOR.chords} ${live ? 55 : 14}%, transparent)` : undefined }}>
            <span className={cn("block overflow-hidden font-medium whitespace-nowrap", size === "sm" && "text-xs sm:text-sm")}>{c.chord ? chordName(c.chord) : "–"}</span>
            {size === "lg" && <span className={cn("block truncate text-xs", live ? "text-foreground/80" : "text-muted-foreground")}>{c.chord ? (r?.label ?? "outside the key") + (c.chord.conf < 0.3 ? " · unsure" : "") : "no clear chord"}</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** One bar with a fill’s hits as ticks, taller for louder hits. */
export function FillStrip({ fill }: { fill: DrumFill }) {
  return (
    <svg viewBox="0 0 16 4" preserveAspectRatio="none" className="h-8 w-full bg-muted" role="img" aria-label={`${fill.hits.length} hits from step ${fill.from + 1}`}>
      <rect x={0} y={0} width={fill.from} height={4} fill="var(--border)" opacity={0.5} />
      {[4, 8, 12].map((x) => <line key={x} x1={x} x2={x} y1={0} y2={4} stroke="var(--border)" strokeWidth={0.08} />)}
      {fill.hits.map((h, i) => <rect key={i} x={h.pos + 0.04} y={4 - (1.2 + 2.6 * h.v)} width={0.22} height={1.2 + 2.6 * h.v} fill={PART_COLOR.drums} />)}
    </svg>
  )
}
