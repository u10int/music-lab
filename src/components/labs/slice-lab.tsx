import { useMemo, useState } from "react"
import { drum, hit } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PadGrid, type Pad } from "@/components/pad-grid"
import { PlayButton } from "@/components/play-button"
import { REORDER, SLICE_HITS } from "@/data/labs"

function waveformPath(W: number, H: number) {
  const N = 480, amp: Record<string, [number, number]> = { kick: [1, 0.09], snare: [0.75, 0.05], hat: [0.35, 0.018] }
  let top = "", bot = ""
  for (let i = 0; i <= N; i++) {
    const x = i / N
    let v = 0.02
    for (const [k, p] of SLICE_HITS) {
      const dt = x - p
      if (dt >= 0) v += amp[k][0] * Math.exp(-dt / amp[k][1])
    }
    v = Math.min(1, v) * (0.75 + 0.25 * Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1))
    const px = (x * W).toFixed(1), h = H / 2
    top += (i ? " L" : "M") + px + " " + (h - v * h * 0.92).toFixed(1)
    bot = " L" + px + " " + (h + v * h * 0.92).toFixed(1) + bot
  }
  return top + bot + " Z"
}

export function SliceLab() {
  const [slice, setSlice] = useState<number | null>(null)
  const W = 640, H = 120
  const wave = useMemo(() => waveformPath(W, H), [])
  const playSlices = (id: string, order: number[]) => {
    const step = 60 / 100 / 2
    toggle(id, order.length * step, (c, bus, t) => order.forEach((s, k) => drum(c, bus, t + k * step, SLICE_HITS[s][0])), (el) => {
      const k = Math.floor(el / step)
      setSlice(k >= 0 && k < order.length ? order[k] : null)
    }, () => setSlice(null))
  }
  const pads: Pad[][] = []
  for (let r = 3; r >= 0; r--) {
    const row: Pad[] = []
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c
      row.push(i < 8 ? { tone: slice === i ? "hit" : "in", label: i + 1, aria: `Play slice ${i + 1}, ${SLICE_HITS[i][0]}`, onPress: () => { setSlice(i); hit(SLICE_HITS[i][0]) } } : { tone: "empty" })
    }
    pads.push(row)
  }
  return (
    <div className="space-y-6" style={{ ["--c" as string]: "var(--s4)" }}>
      <Caption>Simpler's Slice mode cuts a loop at each hit and puts one slice on each pad, starting bottom-left. Tap a pad to hear its slice, then play the loop in a new order.</Caption>
      <div className="relative pt-5">
        {SLICE_HITS.map(([, p], i) => (
          <span key={i} className="text-muted-foreground absolute top-0 -translate-x-0 pl-1 text-xs tabular-nums" style={{ left: `${p * 100}%` }}>{i + 1}</span>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="vsvg wide" role="img" aria-label={`Drum loop waveform cut into 8 slices at each hit${slice !== null ? ", slice " + (slice + 1) + " selected" : ""}`}>
          <path className="vwave" d={wave} />
          {SLICE_HITS.map(([, p], i) => {
            const x0 = p * W, x1 = (i < 7 ? SLICE_HITS[i + 1][1] : 1) * W
            return (
              <g key={i}>
                {slice === i && <rect className="vsel" x={x0} y={0} width={x1 - x0} height={H} />}
                <line className="vmark" x1={x0} y1={0} x2={x0} y2={H} />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <PadGrid rows={pads} cols={4} label="Slice pads" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <PlayButton id="loop" label="Play the loop" onPlay={() => playSlices("loop", SLICE_HITS.map((_, i) => i))} />
            <PlayButton id="reorder" label="Play it rearranged" onPlay={() => playSlices("reorder", REORDER)} />
          </div>
          <p className="text-sm">Rearranged order: {REORDER.map((i) => i + 1).join(" · ")}</p>
          <ul className="space-y-1.5 text-sm">
            <li><b>Classic</b> plays the whole sample from one pad, pitched across the keys. Good for chords from a vocal.</li>
            <li><b>One-Shot</b> plays the sample once per hit at its own pitch. Good for single drums and FX.</li>
            <li><b>Slice</b> is this view. Good for reordering breaks and chopping phonk vocals.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
