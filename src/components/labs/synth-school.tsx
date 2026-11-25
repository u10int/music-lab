import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum, mtof } from "@/audio/engine"
import { fxChain, voice, type Patch } from "@/audio/patch"
import { toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { SoundCard } from "@/components/labs/genre-sounds"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg, TabSwitch } from "@/components/seg"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { SCALES } from "@/data/labs"
import { familyOptions, normalizeFamily, type Family } from "@/data/patterns"
import { CONCEPTS, SYNTH_STEPS, SYNTHS, type Concept, type SynthId } from "@/data/synths"
import { usePref } from "@/lib/store"
import { cn } from "@/lib/utils"

/* ---------- How a synth works ---------- */

const FLOW: [string, string][] = [
  ["Oscillators", "Make the raw tone: saw, square, sine or a wavetable. Unison stacks detuned copies."],
  ["Filter", "Removes part of the spectrum. Low-pass darkens; resonance adds a peak at the cutoff."],
  ["Amp", "Shapes the volume of each note with an envelope: attack, decay, sustain, release."],
  ["Effects", "Distortion, chorus, delay and reverb after the synth, in the synth or in Live."],
]

/** The signal path every synth here shares, with modulation feeding into it. */
export function SignalFlow() {
  return (
    <div className="space-y-3">
      <ol className="grid gap-px border bg-border sm:grid-cols-4" aria-label="Signal path">
        {FLOW.map(([name, what], i) => (
          <li key={name} className="relative space-y-1 bg-background p-4">
            <p className="font-semibold"><span className="text-muted-foreground mr-2 tabular-nums">{i + 1}</span>{name}</p>
            <p className="text-muted-foreground text-sm text-pretty">{what}</p>
            {i < FLOW.length - 1 && <span aria-hidden="true" className="absolute top-4 -right-2 z-10 hidden bg-background px-0.5 text-sm sm:block">→</span>}
          </li>
        ))}
      </ol>
      <div className="border border-dashed p-4">
        <p className="font-semibold">Modulation</p>
        <p className="text-muted-foreground text-sm text-pretty">Envelopes and LFOs don’t make sound: they move other knobs over time. An envelope on the filter makes a pluck; an LFO on the filter makes a wobble; an envelope on pitch makes a punchy 808. Every synth below has these four stages and these modulators; only the names and layout differ.</p>
      </div>
    </div>
  )
}

/* ---------- Concept demos ---------- */

interface DemoKnob { id: string; label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string }
const KNOBS: Record<Concept["id"], DemoKnob[]> = {
  unison: [
    { id: "voices", label: "Voices", min: 1, max: 9, step: 1, value: 1, fmt: (v) => String(v) },
    { id: "detune", label: "Detune", min: 0, max: 60, step: 1, value: 25, fmt: (v) => v + " cents" },
  ],
  filterenv: [
    { id: "amt", label: "Envelope amount", min: 0, max: 8000, step: 50, value: 3500, fmt: (v) => Math.round(v) + " Hz" },
    { id: "decay", label: "Decay", min: 0.03, max: 1.2, step: 0.01, value: 0.15, fmt: (v) => Math.round(v * 1000) + " ms" },
  ],
  glide: [{ id: "glide", label: "Glide time", min: 0, max: 0.35, step: 0.005, value: 0.08, fmt: (v) => (v ? Math.round(v * 1000) + " ms" : "Off") }],
  lfo: [
    { id: "rate", label: "Rate", min: 0, max: 3, step: 1, value: 1, fmt: (v) => ["1/4", "1/8", "1/8 triplet", "1/16"][v] },
    { id: "depth", label: "Depth", min: 0, max: 1500, step: 10, value: 700, fmt: (v) => Math.round(v) + " Hz" },
  ],
  drive: [{ id: "drive", label: "Drive", min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => Math.round(v * 100) + "%" }],
  pitchenv: [
    { id: "semis", label: "Depth", min: 0, max: 48, step: 1, value: 24, fmt: (v) => v + " semitones" },
    { id: "time", label: "Time", min: 0.01, max: 0.4, step: 0.005, value: 0.04, fmt: (v) => Math.round(v * 1000) + " ms" },
  ],
  fm: [
    { id: "ratio", label: "Ratio", min: 0.5, max: 5, step: 0.01, value: 3.5, fmt: (v) => v.toFixed(2) + "×" },
    { id: "index", label: "Amount", min: 0, max: 8, step: 0.1, value: 3, fmt: (v) => v.toFixed(1) },
  ],
  sub: [{ id: "sub", label: "Sub level", min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => Math.round(v * 100) + "%" }],
}

const TEMPO = 140
/** A bar of notes for each concept: [16th step, length in 16ths, scale degree, octave]. */
const PHRASES: Record<Concept["id"], [number, number, number | number[], number][]> = {
  unison: [[0, 15, [0, 2, 4], 3]],
  filterenv: Array.from({ length: 8 }, (_, i) => [i * 2, 1.5, [0, 2, 4, 7, 4, 2, 0, 2][i], 3] as [number, number, number, number]),
  glide: [[0, 4.5, 0, 1], [4, 2.5, 4, 1], [6, 4.5, 0, 2], [10, 2.5, 3, 1], [12, 4, 0, 1]],
  lfo: [[0, 16, 0, 1]],
  drive: [[0, 6, 0, 1], [8, 3, 0, 1], [12, 4, -2, 1]],
  pitchenv: [[0, 3, 0, 1], [6, 3, 0, 1], [10, 2, 0, 1], [12, 4, 4, 1]],
  fm: [[0, 3, 0, 4], [4, 3, 2, 4], [8, 3, 4, 4], [12, 3, 2, 4]],
  sub: [[0, 8, 0, 1], [8, 8, 5, 0]],
}

function patchFor(id: Concept["id"], v: Record<string, number>): Patch {
  switch (id) {
    case "unison": return { layers: [{ wave: "sawtooth", voices: v.voices, detune: v.voices > 1 ? v.detune : 0 }], filter: { cutoff: 5000 }, amp: { a: 0.02, d: 0.3, s: 0.9, r: 0.3 }, level: 0.12 }
    case "filterenv": return { layers: [{ wave: "sawtooth", voices: 2, detune: 8 }], filter: { cutoff: 350, q: 3, env: v.amt, decay: v.decay }, amp: { a: 0.002, d: 0.5, s: 0.4, r: 0.1 }, level: 0.14 }
    case "glide": return { layers: [{ wave: "sawtooth" }], sub: 0.5, filter: { cutoff: 900, q: 2 }, amp: { a: 0.005, d: 0.3, s: 0.9, r: 0.08 }, glide: v.glide, level: 0.2 }
    case "lfo": return { layers: [{ wave: "sawtooth", voices: 2, detune: 10 }], sub: 0.5, filter: { cutoff: 500, q: 4 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.1 }, lfo: { target: "cutoff", beats: [1, 0.5, 1 / 3, 0.25][v.rate], depth: v.depth }, level: 0.18 }
    case "drive": return { layers: [{ wave: "sine" }], filter: { cutoff: 5000 }, amp: { a: 0.003, d: 1.2, s: 0.5, r: 0.15 }, pitch: { semis: 12, time: 0.04 }, drive: v.drive, level: 0.32 }
    case "pitchenv": return { layers: [{ wave: "sine" }], filter: { cutoff: 5000 }, amp: { a: 0.002, d: 0.5, s: 0, r: 0.1 }, pitch: v.semis ? { semis: v.semis, time: v.time } : undefined, drive: 0.2, level: 0.35 }
    case "sub": return { layers: [{ wave: "sawtooth", voices: 3, detune: 35 }], sub: v.sub, filter: { cutoff: 700, q: 1 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.1 }, level: 0.16 }
    default: return { layers: [{ wave: "sine" }], filter: { cutoff: 8000 }, amp: { a: 0.002, d: 0.4, s: 0, r: 0.2 }, level: 0.2 }
  }
}

/** Two-operator FM: a sine modulator pushing a sine carrier's frequency. The index falls over the note, like a bell. */
function fmNote(c: BaseAudioContext, out: AudioNode, t: number, midi: number, dur: number, ratio: number, index: number) {
  const f = mtof(midi), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain()
  car.frequency.value = f
  mod.frequency.value = f * ratio
  mg.gain.setValueAtTime(index * f * ratio, t)
  mg.gain.exponentialRampToValueAtTime(Math.max(1, index * f * ratio * 0.15), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.18, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4)
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out)
  car.start(t); mod.start(t); car.stop(t + dur + 0.45); mod.stop(t + dur + 0.45)
}

function ConceptCard({ c }: { c: Concept }) {
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const knobs = KNOBS[c.id]
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(knobs.map((k) => [k.id, k.value])))
  const live = useRef({ vals, root, iv })
  useEffect(() => { live.current = { vals, root, iv } })
  const id = "concept-" + c.id
  const midiOf = (deg: number, oct: number) => {
    const { root: r, iv: s } = live.current, o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7
    return 12 * (oct + 2 + o) + r + s[d]
  }
  const play = () => {
    let timer = 0
    toggle(id, 3600, (ctx, bus, t0) => {
      const fx = fxChain(ctx, bus)
      fx.set({ reverb: c.id === "unison" || c.id === "fm" ? 0.25 : 0.08 }, TEMPO)
      const bar = 240 / TEMPO, s16 = bar / 16
      let next = t0 + 0.05
      const tick = () => {
        while (next < horizon(ctx) + 0.1) {
          const v = live.current.vals, patch = patchFor(c.id, v)
          let prev: number | undefined
          for (const [st, len, deg, oct] of PHRASES[c.id]) {
            for (const d of Array.isArray(deg) ? deg : [deg]) {
              const m = midiOf(d, oct)
              if (c.id === "fm") fmNote(ctx, fx.input, next + st * s16, m, len * s16, v.ratio, v.index)
              else voice(ctx, fx.input, next + st * s16, m, len * s16, patch, TEMPO, c.id === "glide" ? prev : undefined)
              prev = m
            }
          }
          // A kick and clap under the bass demos, so you hear the bass against a beat.
          if (c.id === "drive" || c.id === "pitchenv" || c.id === "lfo" || c.id === "glide") { drum(ctx, bus, next, "kick", 0.4); drum(ctx, bus, next + 8 * s16, "clap", 0.35) }
          next += bar
        }
      }
      tick()
      timer = startClock(tick)
    }, undefined, () => stopClock(timer))
  }
  return (
    <article className="flex min-w-0 flex-col gap-4 border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{c.name}</h3>
        <PlayButton id={id} label="Play" onPlay={play} />
      </div>
      <p className="text-sm text-pretty">{c.what}</p>
      <p className="text-muted-foreground text-sm text-pretty">Heard in: {c.heard}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {knobs.map((k) => (
          <div key={k.id} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Label htmlFor={`${c.id}-${k.id}`}>{k.label}</Label>
              <output className="text-muted-foreground text-xs tabular-nums">{k.fmt(vals[k.id])}</output>
            </div>
            <Slider id={`${c.id}-${k.id}`} min={k.min} max={k.max} step={k.step} value={[vals[k.id]]} onValueChange={([x]) => setVals((p) => ({ ...p, [k.id]: x }))} />
          </div>
        ))}
      </div>
      <dl className="grid gap-x-3 gap-y-1.5 border-t pt-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
        {SYNTHS.map((s) => (
          <div key={s.id} className="contents">
            <dt className="text-muted-foreground">{s.name}</dt>
            <dd className="text-pretty">{c.where[s.id]}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

export function ConceptDemos() {
  return (
    <div className="space-y-4">
      <Caption className="max-w-3xl">Press play, then move the knobs while it loops. Each card ends with where the same control lives in Wavetable, Drift, Massive and Spire, so you can find it in whichever synth you open.</Caption>
      <div className="grid gap-4 lg:grid-cols-2">{CONCEPTS.map((c) => <ConceptCard key={c.id} c={c} />)}</div>
    </div>
  )
}

/* ---------- The synths themselves ---------- */

export function SynthGuides() {
  const [id, setId] = usePref<SynthId>("synth-guide", "wavetable")
  const s = SYNTHS.find((x) => x.id === id) ?? SYNTHS[0]
  return (
    <div className="space-y-5">
      <TabSwitch label="Synth" value={id} onChange={setId} options={SYNTHS.map((x) => [x.id, x.name] as [SynthId, string])} />
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">{s.maker} · {s.kind}</p>
        <p className="text-lead max-w-3xl text-pretty">{s.best}</p>
      </div>
      <dl className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {s.layout.map(([name, what]) => (
          <div key={name} className="space-y-1 bg-background p-4">
            <dt className="font-semibold">{name}</dt>
            <dd className="text-muted-foreground text-sm text-pretty">{what}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2">
        <h3 className="font-semibold">{s.kind === "Plugin" ? `Using ${s.name} in Live` : "Tips"}</h3>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm">
          {s.tips.map((t) => <li key={t} className="text-pretty">{t}</li>)}
        </ul>
      </div>
    </div>
  )
}

/* ---------- Synth sounds with builds for every synth ---------- */

export function SynthSounds() {
  const [stored, setFam] = usePref<Family | "all">("synth-sound-family", "all")
  const fam = normalizeFamily(stored)
  const all = GENRE_SOUNDS.filter((s) => SYNTH_STEPS[s.id])
  const list = all.filter((s) => fam === "all" || s.family === fam)
  return (
    <div className="space-y-4">
      <Seg label="Genre" value={fam} onChange={setFam} options={familyOptions((g) => all.some((s) => s.family === g))} />
      <Caption className="max-w-3xl">Each sound plays in your key over its drums. Open “How to make it” and pick Live, Massive or Spire for a step-by-step build in that synth. Your choice is remembered on every card.</Caption>
      <div className={cn("grid gap-4 lg:grid-cols-2")}>{list.map((s) => <SoundCard key={s.id} s={s} />)}</div>
    </div>
  )
}
