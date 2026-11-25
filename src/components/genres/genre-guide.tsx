import { ExternalLink } from "lucide-react"
import { tone } from "@/audio/engine"
import { setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { PlayButton } from "@/components/play-button"
import { GENRE_GUIDE, refUrl, type Ref } from "@/data/genre-guide"
import type { Tell } from "@/data/genre-tells"
import { genreInfo } from "@/data/genres"
import type { Family } from "@/data/patterns"
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

export function Tells({ tells }: { tells: Tell[] }) {
  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
      {tells.map((t) => (
        <div key={t.name} className="space-y-2 border-t pt-3">
          <h3 className="font-semibold">{t.name}</h3>
          <p className="text-sm text-pretty">{t.intro}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{t.moves.map((m) => <li key={m} className="text-pretty">{m}</li>)}</ul>
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
