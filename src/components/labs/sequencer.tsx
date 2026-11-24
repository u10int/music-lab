import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { Download, Eraser } from "lucide-react"
import { audio, drum, KIND_OF, masterBus, tone, type DrumKind } from "@/audio/engine"
import { toggle, usePlayingId } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { FAMILIES, PATTERNS } from "@/data/patterns"
import { downloadFile, TICKS_PER_16TH, writeMidi } from "@/lib/midi-file"
import { usePref } from "@/lib/store"
import { noteName, theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { MidiOutPicker } from "@/components/midi-out-picker"
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
/** 0 = off, 1 = on, 2 = accent. */
type Seq = { tempo: number; swing: number; drums: Record<string, number[]>; melody: (number | null)[]; sound: Sound; bars?: 1 | 2 }
const empty = (): Seq => ({ tempo: 124, swing: 0, drums: Object.fromEntries(LANES.map((l) => [l.id, Array(MAX_STEPS).fill(0)])), melody: Array(MAX_STEPS).fill(null), sound: "pluck", bars: 1 })
/** Older saved patterns were one bar long; pad everything to two bars. */
function normalize(s: Seq): Seq {
  const pad = <T,>(xs: T[] | undefined, fill: T) => Array.from({ length: MAX_STEPS }, (_, i) => xs?.[i] ?? fill)
  return { ...s, bars: s.bars ?? 1, drums: Object.fromEntries(LANES.map((l) => [l.id, pad(s.drums?.[l.id], 0)])), melody: pad(s.melody, null) }
}
const VEL = [0, 60, 120]

export function Sequencer() {
  const { root, scale } = useKey()
  const T = theory(root, scale)
  const [stored, setSeq] = usePref<Seq>("sequencer", empty())
  const seq = normalize(stored)
  const N = (seq.bars ?? 1) * 16
  const [step, setStep] = useState(-1)
  const playing = usePlayingId() === "seq"
  const ref = useRef({ seq, T })
  useEffect(() => {
    ref.current = { seq, T }
  })

  const midiFor = (deg: number, s = seq.sound) => 48 + T.pc + (deg === 7 ? 12 : T.sc.iv[deg]) + SOUND[s].oct * 12 - (T.pc > 7 ? 12 : 0)

  const play = () => {
    const queue: { step: number; at: number }[] = []
    let timer = 0
    toggle("seq", 3600, (c, bus, t0) => {
      let next = t0, k = 0
      const tick = () => {
        const { seq: s, T: th } = ref.current
        const sixteenth = 60 / s.tempo / 4
        while (next < horizon(c)) {
          const i = k % ((s.bars ?? 1) * 16), at = next + (i % 2 ? s.swing * sixteenth : 0)
          const local = browserSound()
          for (const l of LANES) {
            const v = s.drums[l.id]?.[i] ?? 0
            if (!v) continue
            if (local) drum(c, bus, at, l.id, v === 2 ? 1 : 0.45)
            sendNote(c, at, l.note, VEL[v], sixteenth * 0.5, 9)
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
      setStep(cur)
    }, () => {
      stopClock(timer)
      setStep(-1)
    })
  }

  const cycle = (lane: string, i: number) => setSeq({ ...seq, drums: { ...seq.drums, [lane]: seq.drums[lane].map((v: number, j: number) => (j === i ? (v + 1) % 3 : v)) } })
  const setNote = (deg: number, i: number) => setSeq({ ...seq, melody: seq.melody.map((v, j) => (j === i ? (v === deg ? null : deg) : v)) })
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
          for (const l of LANES) { const v = seq.drums[l.id]?.[i] ?? 0; if (v) notes.push({ tick, note: l.note, velocity: VEL[v], duration: TICKS_PER_16TH / 2, channel: 9 }) }
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
  const cellCls = (on: boolean, i: number) => cn("block aspect-square w-full rounded-[4px] border-[1.5px] border-pad-edge transition-[background-color,scale] duration-100 active:scale-[0.96]", on && "border-transparent", step === i && "outline-2 outline-offset-1 outline-foreground")

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <PlayButton id="seq" label="Play loop" size="default" onPlay={play} />
        <div className="grid w-40 gap-2">
          <div className="flex justify-between text-sm"><Label htmlFor="tempo">Tempo</Label><output className="text-muted-foreground tabular-nums">{seq.tempo} BPM</output></div>
          <Slider id="tempo" min={70} max={180} step={1} value={[seq.tempo]} onValueChange={([v]) => setSeq({ ...seq, tempo: v })} aria-label="Tempo" />
        </div>
        <div className="grid w-40 gap-2">
          <div className="flex justify-between text-sm"><Label htmlFor="swing">Swing</Label><output className="text-muted-foreground tabular-nums">{Math.round(seq.swing * 100)}%</output></div>
          <Slider id="swing" min={0} max={0.6} step={0.01} value={[seq.swing]} onValueChange={([v]) => setSeq({ ...seq, swing: v })} aria-label="Swing" />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Length</span>
          <Seg label="Pattern length" value={String(seq.bars ?? 1)} onChange={(v) => {
            const two = v === "2"
            // Going to two bars copies bar 1 into an empty bar 2, so there's something to vary.
            const empty2 = LANES.every((l) => seq.drums[l.id].slice(16).every((x) => !x)) && seq.melody.slice(16).every((x) => x === null)
            setSeq(two && empty2 ? { ...seq, bars: 2, drums: Object.fromEntries(LANES.map((l) => [l.id, [...seq.drums[l.id].slice(0, 16), ...seq.drums[l.id].slice(0, 16)]])), melody: [...seq.melody.slice(0, 16), ...seq.melody.slice(0, 16)] } : { ...seq, bars: two ? 2 : 1 })
          }} options={[["1", "1 bar"], ["2", "2 bars"]]} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="preset">Start from</Label>
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
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSeq({ ...empty(), tempo: seq.tempo, swing: seq.swing, sound: seq.sound })}><Eraser />Clear</Button>
      </div>
      {playing && <Caption>Edits play on the next pass, so you can build the loop while it runs.</Caption>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Drums</h3>
          <Button variant="outline" size="sm" onClick={() => exportMidi("drums")}><Download />Export drums .mid</Button>
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
                    <button key={i} type="button" aria-label={`${l.name}, step ${i + 1}: ${["off", "quiet", "full"][v]}`} aria-pressed={v > 0} onClick={() => cycle(l.id, i)}
                      className={cn(cellCls(v > 0, i), v === 1 && "bg-[color-mix(in_oklab,var(--s1)_35%,var(--card))]", v === 2 && "bg-[var(--s1)]")} />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <Caption>Click a step for a quiet hit, again for a full hit, again to clear. Exported drums use Drum Rack pad notes, so kick lands on C1.</Caption>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-semibold">Melody</h3>
          <div className="flex flex-wrap items-end gap-3">
            <KeyPicker idPrefix="sq" />
            <Seg label="Sound" value={seq.sound} onChange={(v) => setSeq({ ...seq, sound: v })} options={[["pluck", "Pluck"], ["bass", "Bass"], ["lead", "Lead"]]} />
            <Button variant="outline" size="sm" onClick={() => exportMidi("melody")}><Download />Export melody .mid</Button>
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
                    <button key={i} type="button" aria-label={`${T.names[deg % 7]}, step ${i + 1}${on ? ", on" : ""}`} aria-pressed={on} onClick={() => setNote(deg, i)}
                      className={cn(cellCls(on, i), "aspect-[1.4]", on && "bg-[var(--s5)]", !on && deg % 7 === 0 && "bg-[color-mix(in_oklab,var(--s4)_14%,var(--card))]")} />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <Caption>One note per step, from the key you pick. Rows are the scale from the root up to the octave. Change the key and the melody follows.</Caption>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Play it on your instruments in Live</h3>
        <MidiOutPicker idPrefix="sq" channels={<>The melody goes out on channel 1 and drums on channel 10, using Drum Rack pad notes. Make a MIDI track for each and set its input channel to match.</>} />
      </section>
    </div>
  )
}

function auditionBus() {
  const ctx = audio()
  return ctx ? { ctx, out: masterBus() } : null
}
