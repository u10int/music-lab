import { useEffect, useRef, useState } from "react"
import { Play, Square } from "lucide-react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum, hit, playNote, type DrumKind } from "@/audio/engine"
import { bindTempo, setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { SCALES, spellScale } from "@/data/labs"
import { browserSound, sendNote } from "@/midi/midi-out"
import { onNote, tapNote } from "@/midi/midi"
import { usePref } from "@/lib/store"
import { noteName } from "@/lib/theory"
import { cn } from "@/lib/utils"

/** The 16 drum pads, bottom-left first, on the notes a Drum Rack starts at (C1 = 36). */
const DRUM_PADS: { kind: DrumKind; name: string; vel?: number }[] = [
  { kind: "kick", name: "Kick" }, { kind: "rim", name: "Rim" }, { kind: "snare", name: "Snare" }, { kind: "clap", name: "Clap" },
  { kind: "tom", name: "Tom" }, { kind: "shaker", name: "Shaker" }, { kind: "hat", name: "Hat" }, { kind: "cowbell", name: "Bell" },
  { kind: "hat", name: "Soft hat", vel: 0.45 }, { kind: "tom", name: "Tom 2", vel: 0.7 }, { kind: "ohat", name: "Open hat" }, { kind: "snare", name: "Ghost", vel: 0.35 },
  { kind: "ride", name: "Ride" }, { kind: "clap", name: "Soft clap", vel: 0.5 }, { kind: "rim", name: "Rim 2", vel: 0.6 }, { kind: "kick", name: "Soft kick", vel: 0.55 },
]
const STEPS = 32
type Seq = { tempo: number; steps: number[][] }
const EMPTY: Seq = {
  tempo: 124,
  steps: DRUM_PADS.map((_, i) => Array.from({ length: STEPS }, (_, s) => (i === 0 && s % 4 === 0 ? 110 : i === 3 && s % 8 === 4 ? 110 : i === 6 && s % 2 === 0 ? (s % 4 ? 80 : 50) : 0))),
}
const live: { current: Seq | null } = { current: null }

const PAD = "grid aspect-square min-w-0 place-items-center overflow-hidden text-[10px] leading-none select-none touch-none transition-[background-color] duration-75"

/**
 * A Push on screen, for practice away from the hardware. Drum mode is Push's
 * 64-pad drum layout: the top half steps through two bars for the selected
 * pad, the bottom left plays the 16 pads and the bottom right picks a velocity.
 * Note mode is the In Key grid. Notes from a connected Push or keyboard light
 * the pads, and everything is sent out as MIDI.
 */
export function VirtualPush() {
  const [mode, setMode] = usePref<"drums" | "notes">("vpush-mode", "drums")
  return (
    <div className="max-w-[560px] bg-[#161616] p-3 text-white sm:p-4" role="group" aria-label="Virtual Push">
      <div className="mb-3 flex items-center gap-1.5">
        {(["drums", "notes"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={cn("h-7 border px-3 text-xs transition-[background-color,color] duration-150", mode === m ? "border-white bg-white text-black" : "border-white/30 text-white/80 hover:border-white")}>
            {m === "drums" ? "Drum mode" : "Note mode"}
          </button>
        ))}
      </div>
      {mode === "drums" ? <DrumMode /> : <NoteMode />}
    </div>
  )
}

function Display({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex min-h-9 items-center justify-between gap-3 bg-black px-3 py-2 font-sans text-xs text-white/90 tabular-nums">{children}</div>
}

function DrumMode() {
  const [stored, setSeq] = usePref<Seq>("vpush", EMPTY)
  const seq: Seq = stored?.steps?.length === 16 ? stored : EMPTY
  const [sel, setSel] = useState(0)
  const [vel, setVel] = useState(110)
  const [lit, setLit] = useState<number[]>([])
  const step = usePos("vpush")
  const playing = usePlayingId() === "vpush"
  live.current ??= seq
  useEffect(() => {
    live.current = seq
  })

  const flash = (i: number) => {
    setLit((l) => [...l, i])
    setTimeout(() => setLit((l) => { const k = l.indexOf(i); return k < 0 ? l : [...l.slice(0, k), ...l.slice(k + 1)] }), 140)
  }
  const strike = (i: number, v = 110) => {
    const p = DRUM_PADS[i]
    if (browserSound()) hit(p.kind, (v / 127) * (p.vel ?? 1))
    tapNote(36 + i, v)
    flash(i)
  }
  // Light pads for notes played on a connected Push or pad controller.
  useEffect(() => onNote((n) => { if (n >= 36 && n < 52) flash(n - 36) }), [])

  const play = () => {
    let timer = 0
    const queue: { s: number; at: number }[] = []
    toggle("vpush", 3600, (c, bus, t0) => {
      let next = t0, k = 0
      const tick = () => {
        const s = live.current!
        const sixteenth = 60 / s.tempo / 4, local = browserSound()
        while (next < horizon(c)) {
          const i = k % STEPS
          s.steps.forEach((row, p) => {
            const v = row[i]
            if (!v) return
            if (local) drum(c, bus, next, DRUM_PADS[p].kind, (v / 127) * (DRUM_PADS[p].vel ?? 1))
            sendNote(c, next, 36 + p, v, sixteenth * 0.5, 9)
          })
          queue.push({ s: i, at: next - t0 })
          next += sixteenth
          k++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.s
      setPos(cur)
    }, () => stopClock(timer))
    bindTempo("vpush", {
      get: () => live.current!.tempo, min: 60, max: 180,
      set: (v) => { const n = { ...live.current!, tempo: v }; live.current = n; setSeq(n) },
    })
  }

  const toggleStep = (s: number) => {
    const steps = seq.steps.map((row, p) => (p !== sel ? row : row.map((v, j) => (j !== s ? v : v ? 0 : vel))))
    setSeq({ ...seq, steps })
  }
  // 8×8, top row first: rows 0–3 are steps, rows 4–7 split into drum pads (left) and velocities (right).
  const cells: React.ReactNode[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r < 4) {
        const s = r * 8 + c, v = seq.steps[sel][s], now = step === s
        cells.push(
          <button key={`${r}-${c}`} type="button" aria-pressed={v > 0} aria-label={`Step ${s + 1} for ${DRUM_PADS[sel].name}${v ? `, velocity ${v}` : ""}`}
            onPointerDown={(e) => { if (e.button === 0) toggleStep(s) }} onClick={(e) => { if (e.detail === 0) toggleStep(s) }}
            className={cn(PAD, now ? "bg-[#3fbf4a]" : v ? "" : s % 4 === 0 ? "bg-white/[0.16]" : "bg-white/[0.08]")}
            style={!now && v ? { background: `color-mix(in oklab, #f0a020 ${40 + (v / 127) * 60}%, #161616)` } : undefined} />,
        )
      } else if (c < 4) {
        const i = (7 - r) * 4 + c, has = seq.steps[i].some(Boolean), on = lit.includes(i)
        cells.push(
          <button key={`${r}-${c}`} type="button" aria-pressed={sel === i} aria-label={`${DRUM_PADS[i].name} pad, ${noteName(36 + i)}${sel === i ? ", selected" : ""}`}
            onPointerDown={(e) => { if (e.button === 0) { setSel(i); strike(i) } }} onClick={(e) => { if (e.detail === 0) { setSel(i); strike(i) } }}
            className={cn(PAD, "flex-col", on ? "bg-white text-black" : sel === i ? "bg-[#f0a020] text-black" : has ? "bg-[color-mix(in_oklab,#f0a020_45%,#161616)]" : "bg-[color-mix(in_oklab,#f0a020_18%,#161616)] text-white/80")}>
            {DRUM_PADS[i].name}
          </button>,
        )
      } else {
        const i = (7 - r) * 4 + (c - 4), v = Math.round(((i + 1) / 16) * 127), on = Math.abs(vel - v) < 4
        cells.push(
          <button key={`${r}-${c}`} type="button" aria-pressed={on} aria-label={`Velocity ${v}`}
            onPointerDown={(e) => { if (e.button === 0) { setVel(v); strike(sel, v) } }} onClick={(e) => { if (e.detail === 0) { setVel(v); strike(sel, v) } }}
            className={cn(PAD, on ? "bg-white text-black" : "text-white/70")} style={on ? undefined : { background: `color-mix(in oklab, #5a8cff ${15 + (i / 15) * 55}%, #161616)` }}>
            {v}
          </button>,
        )
      }
    }
  }
  return (
    <>
      <Display>
        <span className="truncate">{DRUM_PADS[sel].name} · {noteName(36 + sel)} · velocity {vel}</span>
        <span className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="Slower" className="px-1 text-white/70 hover:text-white" onClick={() => setSeq({ ...seq, tempo: Math.max(60, seq.tempo - 1) })}>−</button>
          {seq.tempo} BPM
          <button type="button" aria-label="Faster" className="px-1 text-white/70 hover:text-white" onClick={() => setSeq({ ...seq, tempo: Math.min(180, seq.tempo + 1) })}>+</button>
        </span>
      </Display>
      <div className="grid grid-cols-8 gap-1" role="group" aria-label="Pads: steps on top, drum pads bottom left, velocities bottom right">{cells}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" aria-pressed={playing} onClick={play}
          className={cn("inline-flex h-9 items-center gap-2 px-4 text-sm font-medium transition-[background-color] duration-150", playing ? "bg-[#23782b] text-white" : "bg-white text-black hover:bg-white/85")}>
          {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}{playing ? "Stop" : "Play"}
        </button>
        <button type="button" className="text-xs text-white/70 underline hover:text-white" onClick={() => setSeq({ ...seq, steps: seq.steps.map((row, p) => (p === sel ? row.map(() => 0) : row)) })}>Clear {DRUM_PADS[sel].name.toLowerCase()}</button>
      </div>
    </>
  )
}

function NoteMode() {
  const { root, scale } = useKey()
  const [oct, setOct] = useState(0)
  const [lit, setLit] = useState<number[]>([])
  const held = useRef(new Set<number>())
  const sc = SCALES.find((s) => s.id === scale) ?? SCALES[0], iv = sc.iv, names = spellScale(root, iv)
  const base = 36 + root + (root > 5 ? -12 : 0) + 12 + oct * 12
  const flash = (m: number) => {
    setLit((l) => [...l, m])
    setTimeout(() => setLit((l) => { const k = l.indexOf(m); return k < 0 ? l : [...l.slice(0, k), ...l.slice(k + 1)] }), 180)
  }
  useEffect(() => onNote((n) => { held.current.add(n); flash(n) }), [])
  const cells: React.ReactNode[] = []
  for (let r = 7; r >= 0; r--) {
    for (let c = 0; c < 8; c++) {
      const d = c + r * 3, m = base + 12 * Math.floor(d / 7) + iv[d % 7], isRoot = d % 7 === 0
      // The same pitch shows up on more than one pad; light them all.
      const on = lit.includes(m)
      cells.push(
        <button key={`${r}-${c}`} type="button" aria-label={`${noteName(m)}${isRoot ? ", root" : ""}`}
          onPointerDown={(e) => { if (e.button === 0) { playNote(m); tapNote(m); flash(m) } }} onClick={(e) => { if (e.detail === 0) { playNote(m); tapNote(m); flash(m) } }}
          className={cn(PAD, on ? "bg-[#3fbf4a] text-black" : isRoot ? "bg-[#5a8cff] text-black" : "bg-white/[0.12] text-white/80")}>
          {names[d % 7]}
        </button>,
      )
    }
  }
  return (
    <>
      <Display>
        <span>{names[0]} {sc.name.toLowerCase()} · In Key · 4ths</span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label="Octave down" className="px-1 text-white/70 hover:text-white" onClick={() => setOct((o) => Math.max(-2, o - 1))}>−</button>
          from {noteName(base)}
          <button type="button" aria-label="Octave up" className="px-1 text-white/70 hover:text-white" onClick={() => setOct((o) => Math.min(2, o + 1))}>+</button>
        </span>
      </Display>
      <div className="grid grid-cols-8 gap-1" role="group" aria-label={`In Key pads in ${names[0]} ${sc.name.toLowerCase()}`}>{cells}</div>
      <p className="mt-3 text-xs text-white/60">Blue pads are the root. Up a row is a fourth; a triad is the root, two pads right, and one up and one right.</p>
    </>
  )
}
