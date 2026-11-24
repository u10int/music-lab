import { Block, Caption, Steps } from "@/components/page"
import { PadGrid, PadLegend, type Pad, type PadTone } from "@/components/pad-grid"
import { Seg } from "@/components/seg"
import { REPEAT_RATES } from "@/data/push"
import { usePref } from "@/lib/store"

type DrumLayout = "loop" | "vel" | "64"
const LAYOUTS: [DrumLayout, string][] = [["loop", "Loop Selector"], ["vel", "16 Velocities"], ["64", "64 Pads"]]

function drumRows(layout: DrumLayout): Pad[][] {
  const rows: Pad[][] = []
  if (layout === "64") {
    for (let r = 0; r < 8; r++) rows.push(Array.from({ length: 8 }, (_, c) => ({ tone: "drum" as PadTone, label: r === 7 && c === 0 ? "1" : "" })))
    return rows
  }
  for (let r = 0; r < 4; r++)
    rows.push(Array.from({ length: 8 }, (_, c) => {
      const s = r * 8 + c + 1, beat = (s - 1) % 4 === 0
      return { tone: (beat ? "beat" : "step") as PadTone, label: beat ? String(s) : "" }
    }))
  for (let r = 0; r < 4; r++)
    rows.push(Array.from({ length: 8 }, (_, c): Pad => {
      if (c < 4) return { tone: "drum", label: String((3 - r) * 4 + c + 1) }
      if (layout === "vel") {
        const v = (3 - r) * 4 + (c - 4) + 1
        return { tone: "vel", style: { ["--v" as string]: Math.round(12 + v * 5) } }
      }
      return { tone: "loop", label: String(r * 4 + (c - 4) + 1) }
    }))
  return rows
}

const CAPTION: Record<DrumLayout, string> = {
  loop: "The default. Pick a drum on the lower left, then tap steps above to place hits for that drum. The lower right sets the clip's loop length and which page of the clip you're viewing.",
  vel: "Same as Loop Selector, but the lower right becomes 16 velocity pads, quietest at the lower left. Tap one, then tap steps to place hits at that velocity.",
  "64": "Every pad is a drum, for finger-drumming big kits or chopped samples. Hold Layout to bring up loop length pads on the top row.",
}

export function DrumLayouts() {
  const [layout, setLayout] = usePref<DrumLayout>("drum-layout", "loop")
  const legend: [PadTone, string, React.CSSProperties?][] = layout === "64"
    ? [["drum", "Drum pads, numbered from the lower left"]]
    : [
        ["step", "32 steps, two bars of 16ths. The numbered steps are the beats"],
        ["drum", "16 drum pads. Pad 1 is C1, usually the kick"],
        layout === "vel" ? ["vel", "Velocity, low to high", { ["--v" as string]: 60 }] : ["loop", "Loop length and clip pages"],
      ]
  return (
    <Block title="Drum Rack layouts" description="Press Layout to switch between these on a Drum Rack track." actions={<Seg label="Drum layout" value={layout} onChange={setLayout} options={LAYOUTS} />}>
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure className="space-y-3">
          <PadGrid rows={drumRows(layout)} label={`Push pads in the ${LAYOUTS.find((x) => x[0] === layout)![1]} layout`} />
          <figcaption className="text-muted-foreground text-sm">{CAPTION[layout]}</figcaption>
        </figure>
        <PadLegend items={legend} />
      </div>
    </Block>
  )
}

export function BeatSteps() {
  return (
    <Block title="Program a beat">
      <Steps items={[
        "Tap a drum pad on the lower left to select it. It plays, so you can audition sounds.",
        "Tap steps to add or remove hits for that drum. Press Accent first to place them at full velocity.",
        "Hold one or more steps and turn the encoders to edit just those notes, like velocity, length and nudge for off-grid swing.",
        "Hold Delete and tap a drum pad to clear all of its notes from the clip.",
        "Hold Quantize to set Swing and the quantize grid. Quantize plus a drum pad quantizes only that drum.",
      ]} />
    </Block>
  )
}

export function NoteRepeat() {
  const rows: Pad[][] = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ tone: (r >= 4 && c < 4 ? "drum" : "empty") as PadTone })))
  return (
    <Block title="Note Repeat for hats and rolls">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure className="space-y-3">
          <PadGrid rows={rows} label="Pads with the Repeat Intervals buttons to the right, labelled from 1/32t at the top to 1/4 at the bottom" side={REPEAT_RATES.slice().reverse().map((l) => ({ label: l, on: l === "1/16" }))} />
          <Caption>With Repeat on, the buttons right of the pads pick the rate. The current one lights up.</Caption>
        </figure>
        <Steps items={[
          "Press Repeat to turn it on, or hold it for a quick momentary roll.",
          "Pick a rate: 1/8 or 1/16 for steady hats, 1/16t or 1/32 for rolls into the next bar.",
          "Hold a drum pad. Press harder for louder hits, which is how you get rolls that swell.",
          "Record while you do it to capture the roll into the clip. Swing applies to repeats too.",
        ]} />
      </div>
    </Block>
  )
}
