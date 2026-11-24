import { useEffect, useState } from "react"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Block, Caption, PageHeader, Steps } from "@/components/page"
import { PadGrid, type Pad } from "@/components/pad-grid"
import { Piano } from "@/components/piano"
import { PlayableGrid } from "@/components/push/notes-lab"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { detectChord, intervalName } from "@/lib/chords"
import { noteName, NOTE_NAMES, theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { connectMidi, midiSupported, onNote, setMonitor, useMidi } from "@/midi/midi"

/** Push in User Mode sends notes 36–99 from the bottom-left pad, eight per row. */
function UserModeGrid({ held }: { held: number[] }) {
  const rows: Pad[][] = []
  for (let r = 7; r >= 0; r--)
    rows.push(Array.from({ length: 8 }, (_, c) => {
      const n = 36 + r * 8 + c
      return { tone: held.includes(n) ? "hit" : "in", label: held.includes(n) ? noteName(n) : "" }
    }))
  return <PadGrid rows={rows} label={held.length ? "Pads held: " + held.map(noteName).join(", ") : "Push pad grid in User Mode, nothing held"} />
}

function Readout() {
  const { held } = useMidi()
  const sorted = held.slice().sort((a, b) => a - b)
  const chord = detectChord(sorted)
  const text = !sorted.length ? "Play something" : chord ? chord.name : sorted.length === 2 ? intervalName(sorted[0], sorted[1]) : sorted.map(noteName).join(" ")
  const sub = !sorted.length ? "Hold notes to see what they are." : chord ? `${chord.quality[0].toUpperCase() + chord.quality.slice(1)}${chord.inversion ? ", inverted" : ""} · ${sorted.map(noteName).join(" ")}` : sorted.map(noteName).join(" ")
  return (
    <div className="space-y-1" aria-live="polite">
      <p className={cn("font-display text-4xl font-medium tabular-nums", !sorted.length && "text-muted-foreground/60")}>{text}</p>
      <p className="text-muted-foreground text-sm">{sub}</p>
    </div>
  )
}

type Drill = "scale" | "chord"

function ScaleDrill() {
  const { root, scale } = useKey()
  return <ScaleRun key={root + scale} root={root} scale={scale} />
}

function ScaleRun({ root, scale }: { root: number; scale: string }) {
  const T = theory(root, scale)
  const [target] = useState(() => [...T.pcs, T.pcs[0]])
  const [run, setRun] = useState({ pos: 0, miss: null as number | null, runs: 0 })
  const { pos, miss, runs } = run
  useEffect(
    () =>
      onNote((n) =>
        setRun((r) => {
          if (n % 12 !== target[r.pos]) return { ...r, miss: n }
          return r.pos + 1 === target.length ? { pos: 0, miss: null, runs: r.runs + 1 } : { ...r, pos: r.pos + 1, miss: null }
        }),
      ),
    [target],
  )
  return (
    <div className="space-y-4">
      <Caption>Play {T.names[0]} {T.sc.name.toLowerCase()} from the root up to the root an octave higher, in any octave. A wrong note doesn't reset you; find the right one and keep going.</Caption>
      <ol className="flex flex-wrap gap-2" aria-label="Scale notes">
        {target.map((pc, i) => (
          <li key={i} className={cn("grid size-11 place-items-center rounded-lg border text-sm font-semibold", i < pos && "border-transparent bg-[var(--s3)] text-[var(--on-accent)]", i === pos && "border-foreground border-2")}>
            {T.names[T.pcs.indexOf(pc)]}
          </li>
        ))}
      </ol>
      <p className="text-sm" role="status">
        {miss !== null ? `${NOTE_NAMES[miss % 12]} isn't next. Look for ${T.names[T.pcs.indexOf(target[pos])]}.` : pos === 0 ? (runs ? `Clean run. ${runs} so far.` : "Start on the root.") : `Next: ${T.names[T.pcs.indexOf(target[pos])]}`}
      </p>
    </div>
  )
}

function ChordDrill() {
  const { root, scale } = useKey()
  const T = theory(root, scale)
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [solved, setSolved] = useState(false)
  const { held } = useMidi()
  const ch = T.chords[idx % 7]
  const heldPcs = [...new Set(held.map((n) => n % 12))].sort()
  const match = heldPcs.length === 3 && [...ch.pcs].sort().every((p, i) => p === heldPcs[i])
  useEffect(() => {
    if (match && !solved) {
      setSolved(true)
      setScore((s) => s + 1)
      const t = setTimeout(() => {
        setIdx((i) => (i + 1 + Math.floor(Math.random() * 5)) % 7)
        setSolved(false)
      }, 700)
      return () => clearTimeout(t)
    }
  }, [match, solved])
  return (
    <div className="space-y-4">
      <Caption>Hold all three notes of the chord at once. Any inversion and any octave count. Needs a controller, since a mouse can only press one pad.</Caption>
      <div className="flex flex-wrap items-baseline gap-4">
        <p className="font-display text-4xl font-medium">{ch.name}</p>
        <p className="text-muted-foreground">{ch.roman} in {T.names[0]} {T.sc.name.toLowerCase()} · {ch.notes.join(" ")}</p>
      </div>
      <p className="text-sm tabular-nums" role="status">{solved ? "Got it." : `${score} found`}</p>
      <Button variant="outline" size="sm" onClick={() => setIdx((i) => (i + 1) % 7)}>Skip</Button>
    </div>
  )
}

export function PlayAlongPage() {
  const m = useMidi()
  const [drill, setDrill] = useState<Drill>("scale")
  return (
    <div className="space-y-10">
      <PageHeader title="Play along">Connect your Push or a MIDI keyboard and the app shows what you play: note names, the chord you're holding, and where it sits on the grid. Then run the drills.</PageHeader>

      <Block title="Your controller">
        {m.status === "ready" ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span>{m.inputs.length ? <>Connected: <b>{m.inputs.join(", ")}</b></> : "MIDI is on, but no devices are connected. Plug one in and it appears here."}</span>
            <div className="flex items-center gap-2">
              <Switch id="monitor" checked={m.monitor} onCheckedChange={setMonitor} />
              <Label htmlFor="monitor">Play notes through the app</Label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={() => void connectMidi()} disabled={!midiSupported()}>Connect MIDI</Button>
            {(!midiSupported() || m.status === "unsupported") && <p className="text-sm">This browser doesn't support Web MIDI. Use Chrome or Edge on a computer.</p>}
            {m.status === "denied" && <p className="text-destructive text-sm">MIDI access was blocked. Allow it in the site settings for this page, then try again.</p>}
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Using Push with the browser</summary>
          <div className="mt-3 max-w-2xl space-y-2">
            <Steps items={[
              "Live normally controls Push. Switch Push to User Mode so its pads send plain MIDI notes the browser can read. The Push manual explains how for your model.",
              "In User Mode the pads send notes 36 to 99, starting at the bottom-left pad and going eight per row. The grid below mirrors that.",
              "A MIDI keyboard needs no setup. Plug it in before or after connecting.",
              "Turn off “Play notes through the app” if Live is also playing the notes, so you don't hear them twice.",
            ]} />
          </div>
        </details>
      </Block>

      <Block title="What you're playing">
        <Readout />
        <div className="grid items-start gap-8 md:grid-cols-2">
          <figure className="space-y-2">
            <UserModeGrid held={m.held} />
            <figcaption className="text-muted-foreground text-sm">Push pads in User Mode.</figcaption>
          </figure>
          <figure className="space-y-2">
            <Piano scale={[]} names={[]} root={-1} held={m.held} label={"Piano, held notes: " + (m.held.map(noteName).join(", ") || "none")} />
            <figcaption className="text-muted-foreground text-sm">Held notes on a piano, any octave.</figcaption>
          </figure>
        </div>
      </Block>

      <Block title="Drills" actions={<Seg label="Drill" value={drill} onChange={setDrill} options={[["scale", "Scale run"], ["chord", "Find the chord"]]} />}>
        <div className="flex flex-wrap items-end gap-3"><KeyPicker idPrefix="pa" /></div>
        {drill === "scale" ? <ScaleDrill /> : <ChordDrill />}
      </Block>

      <Block title="No controller? Tap the grid" description="The scale run works with the on-screen pads too.">
        <PlayableGrid />
      </Block>
    </div>
  )
}
