import { useRef, useState } from "react"
import { Download, ExternalLink, Repeat } from "lucide-react"
import { useNavigate } from "react-router"
import { tone } from "@/audio/engine"
import { playLoop } from "@/audio/loop-player"
import { setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { PlayButton } from "@/components/play-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GENRE_GUIDE, refUrl, type Ref } from "@/data/genre-guide"
import { genreInfo } from "@/data/genres"
import { SCALES } from "@/data/labs"
import type { Family } from "@/data/patterns"
import { buildLoop, PART_NAME } from "@/lib/loop"
import { downloadFile } from "@/lib/midi-file"
import { recipeMidi, recipesFor, type Recipe } from "@/lib/recipes"
import { setPref, type LoopPart, type LoopState } from "@/lib/store"
import { theory } from "@/lib/theory"
import { cn } from "@/lib/utils"

/* ---------- Chords with the genre’s colour (7ths, 9ths) ---------- */

/** A chord on a scale degree, stacked in thirds up to the genre’s extension, with its name. */
function extChord(root: number, scale: string, d: number, ext: 0 | 7 | 9) {
  const T = theory(root, scale), iv = T.sc.iv, ch = T.chords[d]
  const at = (k: number) => iv[(d + k) % 7] + 12 * Math.floor((d + k) / 7) - iv[d]
  const semis = [0, at(2), at(4)]
  let name = ch.name
  if (ext >= 7) {
    const sev = at(6)
    semis.push(sev)
    const base = ch.name.replace(/m$|dim$|aug$/, "")
    name = ch.q === "maj" ? base + (sev === 11 ? "maj7" : "7") : ch.q === "min" ? base + (sev === 11 ? "m(maj7)" : "m7") : ch.q === "dim" ? base + (sev === 10 ? "m7♭5" : "dim7") : name
    const ninth = at(1) + 12
    if (ext === 9 && ninth === 14 && ch.q !== "dim") {
      semis.push(ninth)
      name = name.replace(/7$/, "9")
    }
  }
  let bass = 48 + root + iv[d]
  if (bass > 55) bass -= 12
  return { name, roman: ch.roman, notes: semis.map((s) => bass + s) }
}

function playChords(id: string, chords: number[][], tempo: number) {
  const bar = (60 / tempo) * 4 * 0.5
  toggle(id, bar * chords.length + 1.2, (c, bus, t0) => {
    chords.forEach((notes, i) => {
      const t = t0 + i * bar
      tone(c, bus, t, notes[0] - 12, bar * 0.95, { wave: "sine", level: 0.22, env: { a: 0.01, d: 0.4, s: 0.7, r: 0.3 } })
      for (const m of notes) tone(c, bus, t, m, bar * 0.9, { wave: "triangle", cutoff: 2400, level: 0.08, env: { a: 0.02, d: 0.6, s: 0.6, r: 0.5 } })
    })
  }, (el) => setPos(el < 0 ? -1 : Math.floor(el / bar)))
}

export function ChordMoves({ id }: { id: Family }) {
  const g = genreInfo(id)!, guide = GENRE_GUIDE[id]
  const { root } = useKey()
  const T = theory(root, g.scale)
  const rows = [{ prog: g.prog, name: "Home progression", note: g.chords }, ...guide.moves.filter((m) => m.prog.join() !== g.prog.join())]
  const tempo = Math.round((g.tempo[0] + g.tempo[1]) / 2)
  return (
    <ul className="divide-y border-y">
      {rows.map((r, i) => {
        const chords = r.prog.map((d) => extChord(root, g.scale, d, guide.ext))
        const pid = `moves-${id}-${i}`
        return <MoveRow key={pid} pid={pid} name={r.name} note={r.note} chords={chords} tempo={tempo} keyName={`${T.names[0]}`} />
      })}
    </ul>
  )
}

function MoveRow({ pid, name, note, chords, tempo, keyName }: { pid: string; name: string; note: string; chords: ReturnType<typeof extChord>[]; tempo: number; keyName: string }) {
  const playing = usePlayingId() === pid
  const pos = usePos(pid)
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0 space-y-1">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-muted-foreground text-sm text-pretty">{note}</p>
      </div>
      <ol className="grid grid-cols-4 gap-1.5" aria-label={`${name} in ${keyName}: ${chords.map((c) => c.name).join(", ")}`}>
        {chords.map((c, b) => (
          <li key={b} className={cn("grid gap-0.5 border px-3 py-2 transition-[background-color,color,border-color] duration-100", playing && pos === b ? "border-transparent bg-foreground text-background" : "border-foreground/25")}>
            <span className="leading-tight font-medium">{c.roman}</span>
            <span className={cn("text-xs", playing && pos === b ? "opacity-80" : "text-muted-foreground")}>{c.name}</span>
          </li>
        ))}
      </ol>
      <PlayButton id={pid} label="Hear it" onPlay={() => playChords(pid, chords.map((c) => c.notes), tempo)} />
    </li>
  )
}

/* ---------- The groove, sounds, tells and references ---------- */

export function PartsList({ parts }: { parts: [string, string][] }) {
  return (
    <dl className="grid gap-px border bg-border sm:grid-cols-2 xl:grid-cols-3">
      {parts.map(([k, v]) => (
        <div key={k} className="space-y-1 bg-background p-4">
          <dt className="font-semibold">{k}</dt>
          <dd className="text-muted-foreground text-sm text-pretty">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Tells({ tells }: { tells: [string, string][] }) {
  return (
    <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
      {tells.map(([k, v]) => (
        <div key={k} className="space-y-1 border-t pt-3">
          <h3 className="font-semibold">{k}</h3>
          <p className="text-sm text-pretty">{v}</p>
        </div>
      ))}
    </div>
  )
}

export function ListenTo({ refs }: { refs: Ref[] }) {
  return (
    <ol className={cn("grid border-t border-l sm:grid-cols-2", refs.length === 3 ? "lg:grid-cols-3" : "xl:grid-cols-4")}>
      {refs.map((r, i) => (
        <li key={r.artist + (r.track ?? "")} className="relative flex flex-col gap-2 border-r border-b p-4 transition-[background-color] duration-150 hover:bg-muted/60">
          <span className="text-muted-foreground text-sm tabular-nums">{i + 1}{r.year ? ` · ${r.year}` : ""}</span>
          <div>
            <a href={refUrl(r)} target="_blank" rel="noreferrer" className="font-semibold after:absolute after:inset-0 hover:underline">
              {r.track ? `“${r.track}”` : r.artist}<ExternalLink className="ml-1 inline size-3.5 align-baseline" aria-hidden="true" />
              <span className="sr-only"> (search on YouTube, opens in a new tab)</span>
            </a>
            {r.track && <p className="text-sm">{r.artist}</p>}
          </div>
          <p className="text-muted-foreground text-sm text-pretty">{r.why}</p>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Recipes ---------- */

const live: Record<string, { loop: LoopState; events: ReturnType<typeof buildLoop> }> = {}
const PART_SHORT: Record<LoopPart, string> = { drums: "D", bass: "B", chords: "C", lead: "L" }

function RecipeCard({ r, family }: { r: Recipe; family: Family }) {
  const g = genreInfo(family)!
  const { root, setScale } = useKey()
  const iv = (SCALES.find((x) => x.id === g.scale) ?? SCALES[0]).iv
  const navigate = useNavigate()
  const playing = usePlayingId()
  const [sec, setSec] = useState(-1)
  const lastSec = useRef(-1)

  const start = (pid: string, loop: LoopState) => {
    live[pid] = { loop, events: buildLoop(loop, root, iv) }
    let end = () => {}
    toggle(pid, 3600, (c, bus, t0) => { end = playLoop(c, bus, t0, () => live[pid]) }, undefined, () => end())
  }
  const withParts = (parts: LoopPart[]): LoopState => ({ ...r.loop, mix: Object.fromEntries((["drums", "bass", "chords", "lead"] as LoopPart[]).map((p) => [p, { ...r.loop.mix[p], mute: !parts.includes(p) }])) as LoopState["mix"] })
  const audition = (i: number) => {
    const pid = `recipe-${r.id}-sec`
    if (playing === pid && lastSec.current === i) { toggle(pid, 0, () => {}); setSec(-1); lastSec.current = -1; return }
    lastSec.current = i
    setSec(i)
    if (playing === pid) live[pid] = { loop: withParts(r.sections![i].parts), events: live[pid].events }
    else start(pid, withParts(r.sections![i].parts))
  }
  const open = () => {
    setPref("loop-builder", r.loop)
    setScale(g.scale)
    navigate("/labs/loop-builder")
  }
  const download = () => downloadFile(recipeMidi(r, root, iv), `music-lab-${family}-${r.id.replace(family + "-", "")}-${r.loop.tempo}bpm.mid`)
  const total = r.sections?.reduce((n, s) => n + s.bars, 0) ?? 0
  const secPlaying = playing === `recipe-${r.id}-sec`

  return (
    <li className="flex min-w-0 flex-col gap-3 border-r border-b p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Badge variant={r.kind === "Starter" ? "default" : "secondary"}>{r.kind}</Badge>
          <h3 className="text-lg font-semibold">{r.name}</h3>
          <p className="text-muted-foreground text-sm tabular-nums">{r.loop.tempo} BPM · {r.changes.join(" · ")}</p>
        </div>
        {!r.sections && <PlayButton id={`recipe-${r.id}`} label="Play" onPlay={() => start(`recipe-${r.id}`, r.loop)} />}
      </div>
      <p className="text-sm text-pretty">{r.blurb}</p>
      {r.sections && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-px" role="group" aria-label="Sections: press one to hear which parts play">
            {r.sections.map((s, i) => (
              <button key={i} type="button" onClick={() => audition(i)} aria-pressed={secPlaying && sec === i}
                style={{ flexGrow: s.bars }}
                className={cn("min-w-20 basis-0 border px-2 py-1.5 text-left transition-[background-color,color,border-color] duration-100", secPlaying && sec === i ? "border-transparent bg-[#23782b] text-white" : "border-foreground/25 hover:border-foreground")}>
                <span className="block text-sm font-medium">{s.name}</span>
                <span className={cn("block text-xs tabular-nums", secPlaying && sec === i ? "opacity-85" : "text-muted-foreground")} title={s.parts.map((p) => PART_NAME[p]).join(", ")}>{s.bars} bars · {s.parts.map((p) => PART_SHORT[p]).join("")}</span>
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{total} bars. Press a section to hear its parts: D drums, B bass, C chords, L lead.</p>
        </div>
      )}
      {r.study && (
        <p className="text-sm text-pretty"><span className="text-muted-foreground">Listen to </span>
          <a className="underline" href={refUrl(r.study)} target="_blank" rel="noreferrer">{r.study.track ? `“${r.study.track}” by ${r.study.artist}` : r.study.artist}</a>
          <span className="text-muted-foreground"> for the feel, not to copy it.</span>
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={open}><Repeat />Open in loop builder</Button>
        <Button size="sm" variant="outline" onClick={download}><Download />Download MIDI</Button>
      </div>
    </li>
  )
}

export function Recipes({ id }: { id: Family }) {
  const list = recipesFor(id)
  return <ul className="grid border-t border-l md:grid-cols-2 xl:grid-cols-3">{list.map((r) => <RecipeCard key={r.id} r={r} family={id} />)}</ul>
}

