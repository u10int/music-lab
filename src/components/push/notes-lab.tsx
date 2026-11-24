import { useState } from "react"
import { playNote } from "@/audio/engine"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Block, Caption } from "@/components/page"
import { PadGrid, PadLegend, type Pad, type PadTone } from "@/components/pad-grid"
import { Seg } from "@/components/seg"
import { SCALES, spellScale } from "@/data/labs"
import { SHARP } from "@/data/push"
import { usePref } from "@/lib/store"
import { noteName } from "@/lib/theory"

type Mode = "key" | "chr"
type Rows = "4ths" | "3rds" | "seq"
const ROW_CAP: Record<Rows, string> = {
  "4ths": "Up a row is a fourth, three scale notes higher. A triad is the root, the pad two to the right and the pad one up and one right.",
  "3rds": "Up a row is a third, two scale notes higher, so chords stack straight up a column.",
  seq: "The rows continue left to right like a keyboard laid out in lines, eight scale notes per row.",
}

/** Playable 64-pad grid in the chosen key, scale, mode and row interval. */
export function PlayableGrid({ onNote }: { onNote?: (midi: number) => void }) {
  const { root, scale } = useKey()
  const [mode, setMode] = usePref<Mode>("note-mode", "key")
  const [rowsMode, setRowsMode] = usePref<Rows>("note-rows", "4ths")
  const [lit, setLit] = useState<number | null>(null)
  const sc = SCALES.find((s) => s.id === scale) ?? SCALES[0], iv = sc.iv
  const names = spellScale(root, iv)
  const inKey = mode === "key", step = { "4ths": 3, "3rds": 2, seq: 8 }[inKey ? rowsMode : "4ths"]
  const base = 36 + root + (root > 5 ? -12 : 0) + 12
  const rows: Pad[][] = []
  for (let r = 7; r >= 0; r--) {
    const row: Pad[] = []
    for (let c = 0; c < 8; c++) {
      let midi: number, label: string, isRoot: boolean, isIn: boolean
      if (inKey) {
        const d = c + r * step
        midi = base + 12 * Math.floor(d / 7) + iv[d % 7]
        label = names[d % 7]
        isRoot = d % 7 === 0
        isIn = true
      } else {
        midi = base + c + r * 5
        const pc = (((midi - base) % 12) + 12) % 12, idx = iv.indexOf(pc)
        isIn = idx > -1
        isRoot = pc === 0
        label = isIn ? names[idx] : SHARP[(root + pc) % 12]
      }
      const m = midi
      row.push({
        tone: (isRoot ? "root" : isIn ? "in" : "off") as PadTone,
        label,
        active: lit === m,
        aria: noteName(m) + (isRoot ? ", root" : ""),
        onPress: () => {
          playNote(m)
          onNote?.(m)
          setLit(m)
          setTimeout(() => setLit((x) => (x === m ? null : x)), 180)
        },
      })
    }
    rows.push(row)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <KeyPicker idPrefix="pg" />
        <Seg label="Note mode" value={mode} onChange={setMode} options={[["key", "In Key"], ["chr", "Chromatic"]]} />
        {inKey && <Seg label="Row interval" value={rowsMode} onChange={setRowsMode} options={[["4ths", "4ths"], ["3rds", "3rds"], ["seq", "Sequential"]]} />}
      </div>
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure className="space-y-3">
          <PadGrid rows={rows} label={`Playable Push pads in ${names[0]} ${sc.name.toLowerCase()}, ${inKey ? "In Key" : "Chromatic"}`} />
          <figcaption className="text-muted-foreground text-sm">
            Tap the pads to hear them.{" "}
            {inKey
              ? `In Key: only the notes of ${names[0]} ${sc.name.toLowerCase()} are on the grid, so you can't play a wrong note. ${ROW_CAP[rowsMode]}`
              : "Chromatic: every note is playable and the ones outside the key are unlit. Up a row is a fourth, five semitones, the same as the 4ths layout on a guitar or bass."}
          </figcaption>
        </figure>
        <div className="space-y-4">
          <PadLegend items={[["root", "Root note, shown in the track's color on Push"], ["in", "In the scale"], ...(inKey ? [] : [["off", "Outside the scale, unlit on Push"] as [PadTone, string]])]} />
          <p className="text-sm">Press Scale to change the key, the scale, In Key or Chromatic, and the row interval. Octave Up and Down shift the whole grid. With Fixed off, the lower-left pad is always the root.</p>
        </div>
      </div>
    </div>
  )
}

export function SequencingLayouts() {
  const half = (fn: (r: number, c: number) => PadTone, n: number) => Array.from({ length: n }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ tone: fn(r, c) })))
  const top = half(() => "step", 4)
  const bottom = half((r, c) => ((c + (3 - r) * 3) % 7 === 0 ? "root" : "in"), 4)
  const melody = [0, 2, 4, 2, 0, 3, 4, 1]
  const seq = half((r, c) => (r === 7 ? "root" : r === 7 - melody[c] ? "play" : "in"), 8)
  return (
    <Block title="Sequencing melodies" description="Press Layout on an instrument track to cycle these with 64 Notes, the playing layout above.">
      <div className="grid items-start gap-6 md:grid-cols-3">
        <figure className="space-y-2">
          <PadGrid rows={[...top, ...bottom]} label="Melodic + 32 Notes layout: 32 steps on the top half, notes to play on the bottom half" />
          <figcaption className="text-muted-foreground text-sm"><span className="text-foreground font-semibold">Melodic + 32 Notes.</span> Play or hold a note on the bottom half, then tap steps on the top half to place it.</figcaption>
        </figure>
        <figure className="space-y-2">
          <PadGrid rows={seq} label="Melodic Sequencer layout: columns are steps, rows are scale notes with the root on the bottom row" />
          <figcaption className="text-muted-foreground text-sm"><span className="text-foreground font-semibold">Melodic Sequencer.</span> Columns are steps and rows are pitches, like a tiny piano roll. The bottom row is the root. Slide the touch strip to move through the scale, Shift and slide for octaves.</figcaption>
        </figure>
        <figure className="space-y-2">
          <svg viewBox="0 0 220 220" className="mx-auto block h-auto w-full max-w-[220px]" role="img" aria-label="One pad with three gestures: press harder for pressure, slide your finger up or down for slide, rock left or right for pitch bend">
            <rect className="hw-pad" style={{ fill: "color-mix(in oklab, var(--s4) 40%, var(--card))" }} x={60} y={60} width={100} height={100} rx={12} />
            <circle cx={110} cy={110} r={10} fill="var(--foreground)" />
            <path fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M110 52 V20 M110 168 V200 M100 30 L110 18 L120 30 M100 190 L110 202 L120 190 M52 110 H20 M168 110 H200 M30 100 L18 110 L30 120 M190 100 L202 110 L190 120" />
            <text className="vtext" x={110} y={12} textAnchor="middle">Slide</text>
            <text className="vtext" x={14} y={98}>Bend</text>
            <text className="vtext" x={110} y={146} textAnchor="middle">Press</text>
          </svg>
          <figcaption className="text-muted-foreground text-sm"><span className="text-foreground font-semibold">MPE expression.</span> Each pad senses pressure, sliding up and down, and side-to-side bend, per note. Drift, Wavetable and Meld can route these to any parameter. Set the mode in Setup, under Expression.</figcaption>
        </figure>
      </div>
      <Caption>Diagram melodies are examples, not what your Push will show.</Caption>
    </Block>
  )
}
