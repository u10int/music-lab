import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
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
import { Push3, type ControlId, type PadLook } from "@/components/push/push3"

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

const ORANGE = "#f0a020", BLUE = "#5a8cff", GREEN = "#3fbf4a", OFF = "#3a3a3a", DIM = "#4a4a4a"

/**
 * Push 3 on screen, for practice away from the hardware. With a Drum Rack, the
 * pads use Push’s 64-pad drum layout: the top half steps through two bars for
 * the selected pad, the bottom left plays the 16 pads, and the bottom right
 * picks a velocity. With an instrument, the pads are the In Key layout.
 * Play, Tap Tempo, Accent, Delete, Octave and Metronome-free practice all work
 * from the drawn buttons; pads you press on a connected Push light up too.
 */
type Target = { pad: [number, number] } | { control: ControlId }
interface Guide { id: string; title: string; intro: string; mode: "drums" | "notes"; clear?: boolean; steps: { text: string; target: Target }[] }
// Pads are [row from the top, column]. Drum pad i sits at row 7 − ⌊i/4⌋, column i % 4; step s at row ⌊s/8⌋, column s % 8.
const dp = (i: number): Target => ({ pad: [7 - Math.floor(i / 4), i % 4] })
const st = (s: number): Target => ({ pad: [Math.floor(s / 8), s % 8] })
const vp = (i: number): Target => ({ pad: [7 - Math.floor(i / 4), 4 + (i % 4)] })
/** Guided practice: the next pad or button lights up, and the guide moves on when you press it. */
export const GUIDES: Guide[] = [
  { id: "four", title: "Four on the floor", intro: "Program a house beat the way you would on Push. Starts from an empty pattern.", mode: "drums", clear: true, steps: [
    { text: "Select the Kick pad, bottom left.", target: dp(0) },
    { text: "Press step 1 in the top row.", target: st(0) }, { text: "Step 5.", target: st(4) }, { text: "Step 9: first pad of the second row.", target: st(8) }, { text: "Step 13.", target: st(12) },
    { text: "Select the Clap pad.", target: dp(3) },
    { text: "Clap on step 5.", target: st(4) }, { text: "And step 13.", target: st(12) },
    { text: "Select the Hat pad.", target: dp(6) },
    { text: "Offbeat hats: step 3.", target: st(2) }, { text: "Step 7.", target: st(6) }, { text: "Step 11.", target: st(10) }, { text: "Step 15.", target: st(14) },
    { text: "Press Play to hear it.", target: { control: "play" } },
  ] },
  { id: "velocity", title: "Velocity and Accent", intro: "Quiet hats against loud ones, using the 16 velocity pads and Accent.", mode: "drums", clear: true, steps: [
    { text: "Select the Hat pad.", target: dp(6) },
    { text: "Pick velocity 64 in the bottom-right block.", target: vp(7) },
    { text: "Quiet hats on step 3.", target: st(2) }, { text: "Step 7.", target: st(6) }, { text: "Step 11.", target: st(10) }, { text: "Step 15.", target: st(14) },
    { text: "Turn on Accent: every new hit is full velocity.", target: { control: "accent" } },
    { text: "Loud hat on step 1.", target: st(0) }, { text: "Step 9.", target: st(8) },
    { text: "Turn Accent off again.", target: { control: "accent" } },
    { text: "Press Play and listen to the loud and quiet hats.", target: { control: "play" } },
  ] },
  { id: "triad", title: "A triad in Note mode", intro: "Find the root, third and fifth in the In Key layout, then move up an octave.", mode: "drums", steps: [
    { text: "Press Note to switch to the instrument track.", target: { control: "note" } },
    { text: "Play the root: the blue pad, bottom left.", target: { pad: [7, 0] } },
    { text: "The third: two pads to the right.", target: { pad: [7, 2] } },
    { text: "The fifth: up one row and one to the right.", target: { pad: [6, 1] } },
    { text: "Move up an octave with Octave up.", target: { control: "octaveUp" } },
    { text: "Play the root again, an octave higher.", target: { pad: [7, 0] } },
  ] },
]

export function VirtualPush() {
  const [mode, setMode] = usePref<"drums" | "notes">("vpush-mode", "drums")
  // Drum state
  const [stored, setSeq] = usePref<Seq>("vpush", EMPTY)
  const seq: Seq = stored?.steps?.length === 16 ? stored : EMPTY
  const [sel, setSel] = useState(0)
  const [vel, setVel] = useState(110)
  const [accent, setAccent] = useState(false)
  const [lit, setLit] = useState<number[]>([])
  const step = usePos("vpush")
  const playing = usePlayingId() === "vpush"
  live.current ??= seq
  useEffect(() => {
    live.current = seq
  })
  // Note state
  const { root, scale } = useKey()
  const [oct, setOct] = useState(0)
  const [litNotes, setLitNotes] = useState<number[]>([])
  const sc = SCALES.find((x) => x.id === scale) ?? SCALES[0], iv = sc.iv, names = spellScale(root, iv)
  const base = 36 + root + (root > 5 ? -12 : 0) + 12 + oct * 12
  const taps = useRef<number[]>([])
  // Guided practice
  const [params, setParams] = useSearchParams()
  const [guideId, setGuideId] = useState<string | null>(() => GUIDES.some((g) => g.id === params.get("guide")) ? params.get("guide") : null)
  const [gStep, setGStep] = useState(0)
  const [gMiss, setGMiss] = useState(false)
  const guide = GUIDES.find((g) => g.id === guideId) ?? null
  const gTarget = guide?.steps[gStep]?.target
  const startGuide = (id: string) => {
    const g = GUIDES.find((x) => x.id === id)!
    if (g.clear) setSeq({ ...seq, steps: seq.steps.map((row) => row.map(() => 0)) })
    setMode(g.mode)
    setOct(0)
    setAccent(false)
    setGuideId(id)
    setGStep(0)
    setGMiss(false)
    setParams((sp) => { sp.set("guide", id); return sp }, { replace: true })
  }
  const endGuide = () => { setGuideId(null); setParams((sp) => { sp.delete("guide"); return sp }, { replace: true }) }
  /** Checks a press against the guide's next target. */
  const follow = (t: Target) => {
    if (!guide || !gTarget) return
    const hit = "pad" in t && "pad" in gTarget ? t.pad[0] === gTarget.pad[0] && t.pad[1] === gTarget.pad[1] : "control" in t && "control" in gTarget && t.control === gTarget.control
    if (hit) { setGStep((x) => x + 1); setGMiss(false) } else setGMiss(true)
  }
  // Starting a guide from a link clears the pattern once.
  const startedFromLink = useRef(false)
  useEffect(() => {
    if (startedFromLink.current || !guideId) return
    startedFromLink.current = true
    startGuide(guideId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, v: T, ms = 140) => {
    set((l) => [...l, v])
    setTimeout(() => set((l) => { const k = l.indexOf(v); return k < 0 ? l : [...l.slice(0, k), ...l.slice(k + 1)] }), ms)
  }
  useEffect(() => onNote((n) => {
    if (n >= 36 && n < 52) flash(setLit, n - 36)
    flash(setLitNotes, n, 180)
  }), [])

  const strike = (i: number, v = vel) => {
    const p = DRUM_PADS[i], vv = accent ? 127 : v
    if (browserSound()) hit(p.kind, (vv / 127) * (p.vel ?? 1))
    tapNote(36 + i, vv)
    flash(setLit, i)
  }
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
  const toggleStep = (s: number) => setSeq({ ...seq, steps: seq.steps.map((row, p) => (p !== sel ? row : row.map((v, j) => (j !== s ? v : v ? 0 : accent ? 127 : vel)))) })

  const onControl = (id: ControlId) => {
    follow({ control: id })
    if (id === "play") play()
    else if (id === "note") setMode(mode === "drums" ? "notes" : "drums")
    else if (id === "accent") setAccent((a) => !a)
    else if (id === "delete" && mode === "drums") setSeq({ ...seq, steps: seq.steps.map((row, p) => (p === sel ? row.map(() => 0) : row)) })
    else if (id === "octaveUp" && mode === "notes") setOct((o) => Math.min(2, o + 1))
    else if (id === "octaveDown" && mode === "notes") setOct((o) => Math.max(-2, o - 1))
    else if (id === "tapTempo") {
      // Tap Tempo: the average of the last few taps sets the tempo.
      const now = performance.now(), t = taps.current.filter((x) => now - x < 2500)
      t.push(now)
      taps.current = t.slice(-5)
      if (t.length >= 2) {
        const gaps = t.slice(1).map((x, i) => x - t[i]), avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
        const bpm = Math.round(Math.max(60, Math.min(180, 60000 / avg)))
        live.current = { ...seq, tempo: bpm }
        setSeq({ ...seq, tempo: bpm })
      }
    }
  }

  const drumPad = (r: number, c: number): PadLook => {
    if (r < 4) {
      const s = r * 8 + c, v = seq.steps[sel][s]
      return { fill: step === s ? GREEN : v ? mix(ORANGE, 0.4 + (v / 127) * 0.6) : s % 4 === 0 ? DIM : OFF, aria: `Step ${s + 1} for ${DRUM_PADS[sel].name}${v ? `, velocity ${v}` : ""}`, pressed: v > 0 }
    }
    if (c < 4) {
      const i = (7 - r) * 4 + c, has = seq.steps[i].some(Boolean)
      return { fill: lit.includes(i) ? "#ffffff" : sel === i ? ORANGE : has ? mix(ORANGE, 0.45) : mix(ORANGE, 0.2), label: DRUM_PADS[i].name, ink: lit.includes(i) || sel === i ? "#111" : "#eee", aria: `${DRUM_PADS[i].name} pad, ${noteName(36 + i)}`, pressed: sel === i }
    }
    const i = (7 - r) * 4 + (c - 4), v = Math.round(((i + 1) / 16) * 127), on = Math.abs(vel - v) < 4
    return { fill: on ? "#ffffff" : mix(BLUE, 0.15 + (i / 15) * 0.55), label: String(v), ink: on ? "#111" : "#ddd", aria: `Velocity ${v}`, pressed: on }
  }
  const onDrumPad = (r: number, c: number) => {
    follow({ pad: [r, c] })
    if (r < 4) return toggleStep(r * 8 + c)
    if (c < 4) { const i = (7 - r) * 4 + c; setSel(i); strike(i); return }
    const i = (7 - r) * 4 + (c - 4), v = Math.round(((i + 1) / 16) * 127)
    setVel(v)
    strike(sel, v)
  }
  const noteAt = (r: number, c: number) => { const d = c + (7 - r) * 3; return { d, m: base + 12 * Math.floor(d / 7) + iv[d % 7] } }
  const notePad = (r: number, c: number): PadLook => {
    const { d, m } = noteAt(r, c), isRoot = d % 7 === 0, on = litNotes.includes(m)
    return { fill: on ? GREEN : isRoot ? BLUE : "#555", label: names[d % 7], ink: on || isRoot ? "#111" : "#eee", aria: `${noteName(m)}${isRoot ? ", root" : ""}` }
  }
  const onNotePad = (r: number, c: number) => {
    follow({ pad: [r, c] })
    const { m } = noteAt(r, c); playNote(m); tapNote(m); flash(setLitNotes, m, 180) }

  const status = mode === "drums"
    ? `${DRUM_PADS[sel].name} pad (${noteName(36 + sel)}) · velocity ${accent ? "127, Accent on" : vel} · ${seq.tempo} BPM${playing ? ` · step ${step + 1} of 32` : ""}`
    : `${names[0]} ${sc.name.toLowerCase()}, In Key in 4ths, from ${noteName(base)}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Track type">
        {(["drums", "notes"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={cn("h-7 border px-3 text-xs transition-[background-color,color] duration-150", mode === m ? "border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground")}>
            {m === "drums" ? "Drum Rack track" : "Instrument track"}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">{status}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-y py-3">
        <span className="text-sm font-medium">Guided practice</span>
        {GUIDES.map((g) => (
          <Button key={g.id} size="sm" variant={guideId === g.id ? "default" : "outline"} aria-pressed={guideId === g.id} onClick={() => (guideId === g.id ? endGuide() : startGuide(g.id))}>{g.title}</Button>
        ))}
      </div>
      {guide && (
        <div className="space-y-2 border border-foreground p-4" role="status" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{guide.title}</p>
            <span className="text-muted-foreground text-sm tabular-nums">{Math.min(gStep + 1, guide.steps.length)} of {guide.steps.length}</span>
          </div>
          {gStep < guide.steps.length ? (
            <p className="text-lg">{guide.steps[gStep].text}{gMiss && <span className="text-muted-foreground text-sm"> Not that one: press the outlined {"pad" in guide.steps[gStep].target ? "pad" : "button"}.</span>}</p>
          ) : (
            <p className="text-lg">Done. Try it on your Push the same way, without the outlines.</p>
          )}
          <div className="flex gap-2">
            {gStep >= guide.steps.length && <Button size="sm" variant="outline" onClick={() => startGuide(guide.id)}>Again</Button>}
            <Button size="sm" variant="ghost" onClick={endGuide}>End guide</Button>
          </div>
        </div>
      )}
      <Push3 selected={gTarget && "control" in gTarget ? gTarget.control : null} highlightPad={gTarget && "pad" in gTarget ? gTarget.pad : null}
        pad={mode === "drums" ? drumPad : notePad} onPad={mode === "drums" ? onDrumPad : onNotePad} onControl={onControl}
        lit={{ play: playing ? "#23782b" : false, note: true, accent, tapTempo: false, delete: false, octaveUp: false, octaveDown: false }} />
    </div>
  )
}

/** A color mixed toward the pad-off gray: 0 is off, 1 is full color. */
function mix(color: string, k: number) {
  return `color-mix(in oklab, ${color} ${Math.round(k * 100)}%, #2e2e2e)`
}
