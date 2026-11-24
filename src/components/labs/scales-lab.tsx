import { useState } from "react"
import { tone } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PadGrid, type Pad } from "@/components/pad-grid"
import { QwertyPiano } from "@/components/qwerty-piano"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { usePref } from "@/lib/store"
import { chordMidi, theory, type Theory } from "@/lib/theory"
import { cn } from "@/lib/utils"

type Layout = "key" | "chr"
/** Each chord tap gets a fresh id so a second tap replays instead of stopping. */
let chordSeq = 0

function pushCells(T: Theory, chordIdx: number, layout: Layout): Pad[][] {
  const ch = T.chords[chordIdx]
  let shape: [number, number][] = []
  if (layout === "key") {
    for (let r = 0; r < 8 && !shape.length; r++)
      for (let c = 0; c < 8; c++)
        if (c + 3 * r === ch.d && c + 2 <= 7 && r + 1 <= 7) {
          shape = [[r, c], [r, c + 2], [r + 1, c + 1]]
          break
        }
  } else {
    const f5 = ch.t5 - 5
    outer: for (const s of [ch.r, ch.r + 12, ch.r + 24])
      for (let r = 0; r < 7; r++) {
        const c = s - 5 * r
        if (c >= 0 && c + Math.max(ch.t3, f5) <= 7) {
          shape = [[r, c], [r, c + ch.t3], [r + 1, c + f5]]
          break outer
        }
      }
  }
  const rows: Pad[][] = []
  for (let r = 7; r >= 0; r--) {
    const row: Pad[] = []
    for (let c = 0; c < 8; c++) {
      let deg: number | null
      if (layout === "key") deg = (c + 3 * r) % 7
      else {
        const pc = (T.pc + c + 5 * r) % 12, i = T.pcs.indexOf(pc)
        deg = i === -1 ? null : i
      }
      const hit = shape.some(([a, b]) => a === r && b === c)
      row.push({ tone: hit ? "hit" : deg === null ? "off" : deg === 0 ? "root" : "in", label: deg === null ? "" : T.names[deg] })
    }
    rows.push(row)
  }
  return rows
}

const chordOpts = { wave: "triangle" as const, env: { a: 0.01, d: 0.6, s: 0.5, r: 0.4 }, cutoff: 3000, level: 0.16 }
const bassOpts = { wave: "sine" as const, env: { a: 0.01, d: 0.5, s: 0.7, r: 0.3 }, cutoff: 4000, level: 0.3 }

export function ScalesLab({ hideKey = false }: { hideKey?: boolean }) {
  const { root, scale } = useKey()
  const [layout, setLayout] = usePref<Layout>("layout", "key")
  const [chord, setChord] = useState(0)
  const T = theory(root, scale), ch = T.chords[Math.min(chord, 6)]
  const keyName = T.names[0] + " " + T.sc.name.toLowerCase()

  const playChord = (i: number) => {
    setChord(i)
    const m = chordMidi(T, T.chords[i])
    toggle("chord-" + i + "-" + chordSeq++, 1.4, (c, bus, t) => {
      m.notes.forEach((n) => tone(c, bus, t, n, 1.1, chordOpts))
      tone(c, bus, t, m.bass, 1.1, bassOpts)
    })
  }
  const playProg = (i: number) => {
    const prog = T.progs[i], len = 1.1
    let cur = -1
    toggle("prog-" + i, prog.length * len, (c, bus, t) =>
      prog.forEach((d, k) => {
        const m = chordMidi(T, T.chords[d])
        m.notes.forEach((n) => tone(c, bus, t + k * len, n, len * 0.85, { ...chordOpts, env: { ...chordOpts.env, r: 0.3 } }))
        tone(c, bus, t + k * len, m.bass, len * 0.85, { ...bassOpts, env: { ...bassOpts.env, r: 0.2 } })
      }),
      (el) => {
        const k = Math.floor(el / len)
        if (k !== cur && k >= 0 && k < prog.length) {
          cur = k
          setChord(prog[k])
        }
      },
    )
  }
  const playScale = () => {
    const step = 0.24, seq = [0, 1, 2, 3, 4, 5, 6, 7]
    toggle("scale", seq.length * step + 0.3, (c, bus, t) =>
      seq.forEach((d, k) => {
        const midi = 60 + T.pc + (d === 7 ? 12 : T.chords[d].r) - (T.pc > 7 ? 12 : 0)
        tone(c, bus, t + k * step, midi, step * 0.9, { wave: "triangle", env: { a: 0.01, d: 0.2, s: 0.5, r: 0.15 }, cutoff: 3000, level: 0.2 })
      }),
    )
  }

  return (
    <div className="space-y-6" style={{ ["--c" as string]: "var(--s2)" }}>
      <div className="flex flex-wrap items-end gap-3">
        {!hideKey && <KeyPicker idPrefix="sl" />}
        <Seg label="Push layout" value={layout} onChange={setLayout} options={[["key", "In Key"], ["chr", "Chromatic"]]} />
        <PlayButton id="scale" label="Play scale" onPlay={playScale} />
      </div>
      <div className="space-y-1">
        <p><span className="font-semibold">{keyName}:</span> {T.names.join(" ")}</p>
        <Caption>{T.sc.note}</Caption>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <figure className="space-y-3">
          <PadGrid rows={pushCells(T, ch.d, layout)} label={`Push grid in ${layout === "key" ? "In Key" : "Chromatic"} layout for ${keyName}. ${ch.name} shape highlighted.`} />
          <figcaption className="text-muted-foreground text-sm">
            {layout === "key"
              ? "In Key: every pad is in the scale. Right is the next scale note, up a row is a fourth. The bottom-left pad is the root."
              : "Chromatic: right is one semitone, up a row is a fourth. Blank pads are outside the scale."}{" "}
            Tinted pads are the root. The filled pads are one hand shape for {ch.name}.
          </figcaption>
        </figure>
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-semibold">Chords in this key</h3>
            <Caption>Tap a chord to hear it and see its shape.</Caption>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {T.chords.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === ch.d}
                  onClick={() => playChord(i)}
                  className={cn(
                    "grid gap-0.5 rounded-md border border-pad-edge bg-card px-1 py-2 text-sm transition-[background-color,scale] duration-150 active:scale-[0.96]",
                    i === ch.d && "border-transparent bg-[var(--s2)] text-[var(--on-accent)]",
                  )}
                >
                  <b>{c.roman}</b>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Progressions to try</h3>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {T.progs.map((p, i) => (
                <button key={i} type="button" onClick={() => playProg(i)} className="grid rounded-md border border-pad-edge bg-card px-3 py-2 text-left text-sm transition-[scale] duration-150 active:scale-[0.96]">
                  <b>{p.map((d) => T.chords[d].roman).join("–")}</b>
                  <span className="text-muted-foreground">{p.map((d) => T.chords[d].name).join("–")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <QwertyPiano scale={T.pcs} names={T.names} root={T.pc} chord={ch.pcs} label={`Piano in ${keyName}. Scale notes are marked; the ${ch.name} chord is shaded.`} />
    </div>
  )
}
