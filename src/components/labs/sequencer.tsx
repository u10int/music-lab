import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { Download, Eraser } from "lucide-react"
import { audio, drum, KIND_OF, masterBus, tone, type DrumKind } from "@/audio/engine"
import { bindTempo, setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Caption, SECTION_TITLE } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { FAMILIES, PATTERNS } from "@/data/patterns"
import { downloadFile, TICKS_PER_16TH, writeMidi } from "@/lib/midi-file"
import { usePref } from "@/lib/store"
import { noteName, theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { MidiOutPicker } from "@/components/midi-out-picker"
import { Toolbar } from "@/components/toolbar"
import { Field } from "@/components/field"
import { browserSound, sendNote } from "@/midi/midi-out"

const MAX_STEPS = 32
/** Drum Rack pad notes: C1 is the first pad, matching General MIDI drum notes. */
const LANES: { id: DrumKind; name: string; note: number }[] = [
  { id: "kick", name: "Kick", note: 36 },
  { id: "snare", name: "Snare", note: 38 },
  { id: "clap", name: "Clap", note: 39 },
  { id: "hat", name: "Closed hat", note: 42 },
  { id: "ohat", name: "Open hat", note: 46 },
  { id: "shaker", name: "Shaker", note: 70 },
  { id: "rim", name: "Rim", note: 37 },
  { id: "tom", name: "Tom", note: 45 },
  { id: "ride", name: "Ride", note: 51 },
  { id: "cowbell", name: "Cowbell", note: 56 },
]
type Sound = "pluck" | "bass" | "lead"
const SOUND: Record<Sound, { oct: number; o: Parameters<typeof tone>[5] }> = {
  pluck: { oct: 0, o: { wave: "sawtooth", env: { a: 0.003, d: 0.22, s: 0, r: 0.15 }, cutoff: 2400, q: 2, level: 0.16 } },
  bass: { oct: -2, o: { wave: "sawtooth", env: { a: 0.005, d: 0.15, s: 0.6, r: 0.08 }, cutoff: 700, q: 1.5, detune: 12, level: 0.3 } },
  lead: { oct: 0, o: { wave: "square", env: { a: 0.01, d: 0.2, s: 0.6, r: 0.15 }, cutoff: 3200, detune: 6, level: 0.11 } },
}
/** Drum steps hold 0 for off, otherwise velocity × 2: 1 is a quiet hit and 2 a full one. */
type Seq = { tempo: number; swing: number; drums: Record<string, number[]>; melody: (number | null)[]; sound: Sound; bars?: 1 | 2 }
const empty = (): Seq => ({ tempo: 124, swing: 0, drums: Object.fromEntries(LANES.map((l) => [l.id, Array(MAX_STEPS).fill(0)])), melody: Array(MAX_STEPS).fill(null), sound: "pluck", bars: 1 })
/** Older saved patterns were one bar long; pad everything to two bars. */
function normalize(s: Seq): Seq {
  const pad = <T,>(xs: T[] | undefined, fill: T) => Array.from({ length: MAX_STEPS }, (_, i) => xs?.[i] ?? fill)
  return { ...s, bars: s.bars ?? 1, drums: Object.fromEntries(LANES.map((l) => [l.id, pad(s.drums?.[l.id], 0)])), melody: pad(s.melody, null) }
}
/** MIDI velocity for a drum step. */
const velOf = (v: number) => Math.max(1, Math.min(127, Math.round((v / 2) * 127)))
const live: { current: { seq: Seq; T: ReturnType<typeof theory> } | null } = { current: null }

export function Sequencer() {
  const { root, scale } = useKey()
  const T = theory(root, scale)
  const [stored, setSeq] = usePref<Seq>("sequencer", empty())
  const seq = normalize(stored)
  const N = (seq.bars ?? 1) * 16
  const step = usePos("seq")
  const playing = usePlayingId() === "seq"
  live.current ??= { seq, T }
  useEffect(() => {
    live.current = { seq, T }
  })
  const [velLane, setVelLane] = useState<DrumKind>("hat")
  // Drag to paint: the first cell decides whether the drag adds or clears.
  const drag = useRef<{ mode: boolean; work: Seq } | null>(null)
  useEffect(() => {
    const up = () => { drag.current = null }
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [])
  const withDrum = (base: Seq, lane: string, i: number, v: number): Seq => ({ ...base, drums: { ...base.drums, [lane]: base.drums[lane].map((x, j) => (j === i ? v : x)) } })
  const withNote = (base: Seq, deg: number, i: number, on: boolean): Seq => ({ ...base, melody: base.melody.map((x, j) => (j !== i ? x : on ? deg : x === deg ? null : x)) })
  const paint = (start: (base: Seq) => [boolean, Seq], cont: (base: Seq, mode: boolean) => Seq) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      const [mode, work] = start(seq)
      drag.current = { mode, work }
      setSeq(work)
    },
    onPointerEnter: () => {
      const d = drag.current
      if (!d) return
      d.work = cont(d.work, d.mode)
      setSeq(d.work)
    },
    onClick: (e: React.MouseEvent) => {
      // Keyboard presses arrive as clicks with no pointer behind them.
      if (e.detail === 0) setSeq(start(seq)[1])
    },
  })
  const drumCell = (lane: DrumKind, i: number) => paint(
    (b) => { const on = !(b.drums[lane][i] > 0); setVelLane(lane); return [on, withDrum(b, lane, i, on ? 2 : 0)] },
    (b, on) => withDrum(b, lane, i, on ? (b.drums[lane][i] || 2) : 0),
  )
  const noteCell = (deg: number, i: number) => paint(
    (b) => { const on = b.melody[i] !== deg; return [on, withNote(b, deg, i, on)] },
    (b, on) => withNote(b, deg, i, on),
  )
  // Velocity lane: press and drag across it to set how hard each hit plays.
  const setVel = (e: React.PointerEvent<HTMLElement>) => {
    const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-vstep]")
    if (!cell) return
    const i = +cell.dataset.vstep!, r = cell.getBoundingClientRect()
    const cur = (drag.current?.work ?? seq).drums[velLane][i]
    if (!cur) return
    const v = Math.max(0.1, Math.min(2, (1 - (e.clientY - r.top) / r.height) * 2))
    const work = withDrum(drag.current?.work ?? seq, velLane, i, Math.round(v * 20) / 20)
    drag.current = { mode: true, work }
    setSeq(work)
  }

  const midiFor = (deg: number, s = seq.sound) => 48 + T.pc + (deg === 7 ? 12 : T.sc.iv[deg]) + SOUND[s].oct * 12 - (T.pc > 7 ? 12 : 0)

  const play = () => {
    const queue: { step: number; at: number }[] = []
    let timer = 0
    toggle("seq", 3600, (c, bus, t0) => {
      let next = t0, k = 0
      const tick = () => {
        const { seq: s, T: th } = live.current!
        const sixteenth = 60 / s.tempo / 4
        while (next < horizon(c)) {
          const i = k % ((s.bars ?? 1) * 16), at = next + (i % 2 ? s.swing * sixteenth : 0)
          const local = browserSound()
          for (const l of LANES) {
            const v = s.drums[l.id]?.[i] ?? 0
            if (!v) continue
            if (local) drum(c, bus, at, l.id, v / 2)
            sendNote(c, at, l.note, velOf(v), sixteenth * 0.5, 9)
          }
          const deg = s.melody[i]
          if (deg !== null && deg !== undefined) {
            const m = 48 + th.pc + (deg === 7 ? 12 : th.sc.iv[deg]) + SOUND[s.sound].oct * 12 - (th.pc > 7 ? 12 : 0)
            if (local) tone(c, bus, at, m, sixteenth * 0.9, SOUND[s.sound].o)
            sendNote(c, at, m, 100, sixteenth * 0.9, 0)
          }
          queue.push({ step: i, at: at - t0 })
          next += sixteenth
          k++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.step
      setPos(cur)
    }, () => stopClock(timer))
    bindTempo("seq", {
      get: () => live.current!.seq.tempo, min: 70, max: 180,
      set: (v) => { const n = { ...live.current!.seq, tempo: v }; live.current = { ...live.current!, seq: n }; setSeq(n) },
    })
  }

  const loadPreset = (id: string) => {
    const p = PATTERNS.find((x) => x.id === id)
    if (!p) return
    const drums = empty().drums
    for (const [name, steps, ghost = []] of p.rows) {
      const lane = KIND_OF[name]
      if (lane) drums[lane] = Array.from({ length: MAX_STEPS }, (_, i) => (steps.includes(i + 1) ? 2 : ghost.includes(i + 1) ? 1 : 0))
    }
    setSeq({ ...seq, drums, tempo: p.tempo, swing: p.swing ?? 0, bars: p.length === 32 ? 2 : 1 })
  }
  const exportMidi = (what: "drums" | "melody") => {
    const notes = []
    for (let i = 0; i < N; i++) {
        const tick = i * TICKS_PER_16TH + (i % 2 ? Math.round(seq.swing * TICKS_PER_16TH) : 0)
        if (what === "drums") {
          for (const l of LANES) { const v = seq.drums[l.id]?.[i] ?? 0; if (v) notes.push({ tick, note: l.note, velocity: velOf(v), duration: TICKS_PER_16TH / 2, channel: 9 }) }
        } else {
          const d = seq.melody[i]
          if (d !== null) notes.push({ tick, note: midiFor(d), velocity: 100, duration: TICKS_PER_16TH - 2 })
        }
      }
    const name = what === "drums" ? "Drums" : `${T.names[0]} ${T.sc.name} ${seq.sound}`
    downloadFile(writeMidi([{ name, notes, length: N * TICKS_PER_16TH }], seq.tempo), `music-lab-${what}-${seq.tempo}bpm.mid`)
  }

  const bars = Array.from({ length: N / 16 }, (_, b) => b)
  const head = (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-end gap-2" aria-hidden="true">
      <span />
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
        {bars.map((bar) => (
          <div key={bar} className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((b) => <span key={b} className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((k) => <span key={k} className="text-muted-foreground text-[11px] whitespace-nowrap tabular-nums">{k === 0 ? (b === 0 && bars.length > 1 ? `Bar ${bar + 1}` : b + 1) : ""}</span>)}</span>)}
          </div>
        ))}
      </div>
    </div>
  )
  const cells = (render: (i: number) => React.ReactNode) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
      {bars.map((bar) => (
        <div key={bar} className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((b) => <span key={b} className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((k) => render(bar * 16 + b * 4 + k))}</span>)}
        </div>
      ))}
    </div>
  )
  const cellCls = (on: boolean) => cn("block aspect-square w-full touch-manipulation rounded-none border-[1.5px] border-pad-edge transition-[background-color] duration-75 select-none", on && "border-transparent")

  return (
    <div className="space-y-8">
      <Toolbar
        transport={<PlayButton id="seq" label="Play loop" primary onPlay={play} />}
        actions={<>
          <Button variant="ghost" size="sm" onClick={() => setSeq({ ...empty(), tempo: seq.tempo, swing: seq.swing, sound: seq.sound })}><Eraser />Clear</Button>
          <Button variant="outline" size="sm" onClick={() => exportMidi("drums")}><Download />Export drums</Button>
          <Button variant="outline" size="sm" onClick={() => exportMidi("melody")}><Download />Export melody</Button>
        </>}
      >
        <Field label="Tempo" htmlFor="tempo" value={<>{seq.tempo} BPM</>} className="w-40">
          <Slider id="tempo" min={70} max={180} step={1} value={[seq.tempo]} onValueChange={([v]) => setSeq({ ...seq, tempo: v })} aria-label="Tempo" />
        </Field>
        <Field label="Swing" htmlFor="swing" value={<>{Math.round(seq.swing * 100)}%</>} className="w-40">
          <Slider id="swing" min={0} max={0.6} step={0.01} value={[seq.swing]} onValueChange={([v]) => setSeq({ ...seq, swing: v })} aria-label="Swing" />
        </Field>
        <Field label="Length">
          <Seg label="Pattern length" value={String(seq.bars ?? 1)} onChange={(v) => {
            const two = v === "2"
            // Going to two bars copies bar 1 into an empty bar 2, so there's something to vary.
            const empty2 = LANES.every((l) => seq.drums[l.id].slice(16).every((x) => !x)) && seq.melody.slice(16).every((x) => x === null)
            setSeq(two && empty2 ? { ...seq, bars: 2, drums: Object.fromEntries(LANES.map((l) => [l.id, [...seq.drums[l.id].slice(0, 16), ...seq.drums[l.id].slice(0, 16)]])), melody: [...seq.melody.slice(0, 16), ...seq.melody.slice(0, 16)] } : { ...seq, bars: two ? 2 : 1 })
          }} options={[["1", "1 bar"], ["2", "2 bars"]]} />
        </Field>
        <Field label="Start from" htmlFor="preset">
          <Select value="" onValueChange={loadPreset}>
            <SelectTrigger id="preset" size="sm" className="w-48"><SelectValue placeholder="A genre pattern" /></SelectTrigger>
            <SelectContent>
              {FAMILIES.filter(([f]) => f !== "all" && PATTERNS.some((p) => p.family === f)).map(([f, label]) => (
                <SelectGroup key={f}>
                  <SelectLabel>{label}</SelectLabel>
                  {PATTERNS.filter((p) => p.family === f).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Toolbar>
      {playing && <Caption>Edits play on the next pass, so you can build the loop while it runs.</Caption>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={SECTION_TITLE}>Drums</h2>

        </div>
        <div className="overflow-x-auto">
          <div className={cn("grid gap-1.5", N > 16 ? "min-w-[960px]" : "min-w-[520px]")}>
            {head}
            {LANES.map((l) => (
              <div key={l.id} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 text-sm">
                <button type="button" className="truncate text-left hover:underline" onClick={() => { const c = auditionBus(); if (c) drum(c.ctx, c.out, c.ctx.currentTime + 0.01, l.id) }}>{l.name}</button>
                {cells((i) => {
                  const v = seq.drums[l.id]?.[i] ?? 0
                  return (
                    <button key={i} type="button" aria-label={`${l.name}, step ${i + 1}: ${v ? `velocity ${velOf(v)}` : "off"}`} aria-pressed={v > 0} {...drumCell(l.id, i)} data-ph={step === i || undefined}
                      className={cellCls(v > 0)} style={v ? { background: `color-mix(in oklab, var(--s1) ${Math.round(25 + 75 * (v / 2))}%, var(--card))` } : undefined} />
                  )
                })}
              </div>
            ))}
            <div className="grid grid-cols-[88px_minmax(0,1fr)] items-stretch gap-2 pt-2 text-sm">
              <div className="grid content-start gap-1">
                <span className="text-muted-foreground text-xs">Velocity</span>
                <Select value={velLane} onValueChange={(v) => setVelLane(v as DrumKind)}>
                  <SelectTrigger size="sm" className="h-7 w-full px-2 text-xs" aria-label="Velocity lane"><SelectValue /></SelectTrigger>
                  <SelectContent>{LANES.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="cursor-ns-resize touch-none select-none" role="group" aria-label={`Velocity of ${LANES.find((l) => l.id === velLane)!.name.toLowerCase()} hits: drag up or down`}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setVel(e) }}
                onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setVel(e) }}>
                {cells((i) => {
                  const v = seq.drums[velLane]?.[i] ?? 0
                  return (
                    <span key={i} data-vstep={i} className={cn("relative block h-14 border-b", v ? "bg-pad-empty" : "")}>
                      {v > 0 && <span className="absolute inset-x-0 bottom-0 bg-[var(--s1)]" style={{ height: `${(v / 2) * 100}%` }} />}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <Caption>Click a step to add a hit, or drag across steps to paint several; start on a hit to erase. Drag up and down in the velocity lane to set how hard each hit plays. Exported drums use Drum Rack pad notes, so kick lands on C1.</Caption>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={SECTION_TITLE}>Melody</h2>
          <div className="flex flex-wrap items-end gap-3">
            <KeyPicker idPrefix="sq" />
            <Seg label="Sound" value={seq.sound} onChange={(v) => setSeq({ ...seq, sound: v })} options={[["pluck", "Pluck"], ["bass", "Bass"], ["lead", "Lead"]]} />

          </div>
        </div>
        <div className="overflow-x-auto">
          <div className={cn("grid gap-1", N > 16 ? "min-w-[960px]" : "min-w-[520px]")}>
            {[7, 6, 5, 4, 3, 2, 1, 0].map((deg) => (
              <div key={deg} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 text-sm">
                <span className={cn("tabular-nums", deg % 7 === 0 && "font-semibold")}>{T.names[deg % 7]}<span className="text-muted-foreground text-xs"> {noteName(midiFor(deg)).replace(/^\D+/, "")}</span></span>
                {cells((i) => {
                  const on = seq.melody[i] === deg
                  return (
                    <button key={i} type="button" aria-label={`${T.names[deg % 7]}, step ${i + 1}${on ? ", on" : ""}`} aria-pressed={on} {...noteCell(deg, i)} data-ph={step === i || undefined}
                      className={cn(cellCls(on), "aspect-[1.4]", on && "bg-[var(--s5)]", !on && deg % 7 === 0 && "bg-[color-mix(in_oklab,var(--s4)_14%,var(--card))]")} />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <Caption>One note per step, from the key you pick. Rows are the scale from the root up to the octave. Change the key and the melody follows.</Caption>
      </section>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Play it on your instruments in Live</h2>
        <MidiOutPicker idPrefix="sq" channels={<>The melody goes out on channel 1 and drums on channel 10, using Drum Rack pad notes. Make a MIDI track for each and set its input channel to match.</>} />
      </section>
    </div>
  )
}

function auditionBus() {
  const ctx = audio()
  return ctx ? { ctx, out: masterBus() } : null
}
