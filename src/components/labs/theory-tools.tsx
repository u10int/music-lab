import { useEffect, useState } from "react"
import { Eraser } from "lucide-react"
import { tone, type ToneOptions } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { Piano } from "@/components/piano"
import { PlayButton } from "@/components/play-button"
import { Button } from "@/components/ui/button"
import { NOTE_NAMES, theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { onNote } from "@/midi/midi"

const KEYS: ToneOptions = { wave: "triangle", env: { a: 0.01, d: 0.6, s: 0.5, r: 0.3 }, cutoff: 3000, level: 0.13 }
const BASS: ToneOptions = { wave: "sine", env: { a: 0.01, d: 0.4, s: 0.7, r: 0.2 }, cutoff: 4000, level: 0.26 }
/** Keys named the way they're usually written. */
const MAJOR_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
const MINOR_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"]
const keyLabel = (pc: number, minor: boolean) => (minor ? MINOR_NAMES[pc] + "m" : MAJOR_NAMES[pc])

/** Triad from intervals above a root, placed around middle C, with a bass note. */
function voiced(rootPc: number, ivs: number[]) {
  let base = 60 + rootPc
  while (base > 66) base -= 12
  return { notes: ivs.map((i) => base + i), bass: base - 24 }
}
let seq = 0
function playChords(id: string, chords: { notes: number[]; bass: number }[], len = 0.9) {
  toggle(id + "-" + seq++, chords.length * len + 0.4, (c, bus, t) => {
    chords.forEach((ch, k) => {
      ch.notes.forEach((n) => tone(c, bus, t + k * len, n, len * 0.85, KEYS))
      tone(c, bus, t + k * len, ch.bass, len * 0.85, BASS)
    })
  })
}

/* ---------- Circle of fifths ---------- */

export function CircleOfFifths() {
  const { root, scale, setRoot, setScale } = useKey()
  const minorKey = scale !== "major"
  // Position on the circle: C at the top, each step a fifth clockwise.
  const pos = (pc: number) => (pc * 7) % 12
  const majorAt = (i: number) => (i * 7) % 12
  const relMajor = minorKey ? (root + 3) % 12 : root
  const cur = pos(relMajor)
  const near = new Set([cur, (cur + 1) % 12, (cur + 11) % 12])
  const T = theory(root, minorKey ? "minor" : "major")
  const acc = (i: number) => (i === 0 ? "No sharps or flats" : i <= 6 ? `${i} sharp${i > 1 ? "s" : ""}${i === 6 ? " (or 6 flats)" : ""}` : `${12 - i} flat${12 - i > 1 ? "s" : ""}`)

  const pick = (pc: number, minor: boolean) => {
    setRoot(pc)
    setScale(minor ? "minor" : "major")
    playChords("cof", [voiced(pc, minor ? [0, 3, 7] : [0, 4, 7])], 1.2)
  }
  const R = 150, r1 = 145, r2 = 100, r3 = 62
  const arc = (i: number, ro: number, ri: number) => {
    const a0 = ((i - 0.5) / 12) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2
    const p = (rad: number, a: number) => `${R + rad * Math.cos(a)} ${R + rad * Math.sin(a)}`
    return `M${p(ro, a0)} A${ro} ${ro} 0 0 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 0 0 ${p(ri, a0)} Z`
  }
  const label = (i: number, rad: number) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    return { x: R + rad * Math.cos(a), y: R + rad * Math.sin(a) }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <svg viewBox="0 0 300 300" className="w-full max-w-[340px]" role="group" aria-label="Circle of fifths. Outer ring major keys, inner ring relative minor keys.">
        {Array.from({ length: 12 }, (_, i) => {
          const maj = majorAt(i), min = (maj + 9) % 12
          const selMaj = !minorKey && i === cur, selMin = minorKey && i === cur
          const lo = label(i, (r1 + r2) / 2), li = label(i, (r2 + r3) / 2)
          return (
            <g key={i}>
              <path d={arc(i, r1, r2)} role="button" tabIndex={0} aria-label={`${keyLabel(maj, false)} major, ${acc(i)}`} aria-pressed={selMaj}
                onClick={() => pick(maj, false)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(maj, false) } }}
                className={cn("cursor-pointer stroke-[var(--card)] outline-none transition-[fill] duration-150 focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:3]", selMaj ? "fill-[var(--s5)]" : near.has(i) ? "fill-[color-mix(in_oklab,var(--s5)_30%,var(--muted))]" : "fill-[var(--muted)] hover:fill-[var(--accent)]")} strokeWidth={2} />
              <path d={arc(i, r2, r3)} role="button" tabIndex={0} aria-label={`${keyLabel(min, true).replace("m", "")} minor`} aria-pressed={selMin}
                onClick={() => pick(min, true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(min, true) } }}
                className={cn("cursor-pointer stroke-[var(--card)] outline-none transition-[fill] duration-150 focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:3]", selMin ? "fill-[var(--s4)]" : near.has(i) ? "fill-[color-mix(in_oklab,var(--s4)_26%,var(--card))]" : "fill-[var(--card)] hover:fill-[var(--accent)]")} strokeWidth={2} />
              <text x={lo.x} y={lo.y} dy="0.35em" textAnchor="middle" className={cn("pointer-events-none text-[14px] font-semibold", selMaj ? "fill-white dark:fill-[var(--on-accent)]" : "fill-[var(--foreground)]")}>{keyLabel(maj, false)}</text>
              <text x={li.x} y={li.y} dy="0.35em" textAnchor="middle" className={cn("pointer-events-none text-[11px]", selMin ? "fill-[var(--on-accent)] font-semibold" : "fill-[var(--muted-foreground)]")}>{keyLabel(min, true)}</text>
            </g>
          )
        })}
        <text x={R} y={R - 6} textAnchor="middle" className="fill-[var(--foreground)] text-[15px] font-semibold">{keyLabel(root, minorKey)}{minorKey ? "" : " major"}</text>
        <text x={R} y={R + 14} textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px]">{acc(cur)}</text>
      </svg>
      <div className="space-y-4 text-sm">
        <p className="text-pretty">Each step clockwise adds a sharp, each step counter-clockwise adds a flat. Keys next to each other share six of their seven notes, so chords borrowed from a neighbor sound smooth. The highlighted keys are the closest relatives of {keyLabel(root, minorKey)}.</p>
        <div className="space-y-2">
          <h3 className="font-semibold">Chords in {T.names[0]} {minorKey ? "minor" : "major"}</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {T.chords.map((ch) => (
              <Button key={ch.d} variant="outline" className="h-auto flex-col gap-0.5 py-2" onClick={() => playChords("cof-ch", [voiced((root + ch.r) % 12, [0, ch.t3, ch.t5])])}>
                <b>{ch.roman}</b><span className="text-xs font-normal">{ch.name}</span>
              </Button>
            ))}
          </div>
        </div>
        <Caption>Clicking a key sets it for every lab in the app. The inner ring is each major key’s relative minor: same notes, different home.</Caption>
      </div>
    </div>
  )
}

/* ---------- Modes ---------- */

const MODES = [
  { name: "Lydian", iv: [0, 2, 4, 6, 7, 9, 11], vs: "♯4", mood: "Dreamy, floating, bright. Film scores and ambient.", use: "Ambient, ODESZA-style, synthwave" },
  { name: "Ionian (major)", iv: [0, 2, 4, 5, 7, 9, 11], vs: "", mood: "Bright and resolved. The reference point.", use: "Future bass, house, pop" },
  { name: "Mixolydian", iv: [0, 2, 4, 5, 7, 9, 10], vs: "♭7", mood: "Major but bluesy and laid-back.", use: "Disco house, funk, rock" },
  { name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10], vs: "♭3 ♭7", mood: "Minor with a hopeful raised 6th. Soulful.", use: "Deep house, lo-fi, techno" },
  { name: "Aeolian (natural minor)", iv: [0, 2, 3, 5, 7, 8, 10], vs: "♭3 ♭6 ♭7", mood: "Sad and serious. The default minor.", use: "Wave, trance, progressive house" },
  { name: "Phrygian", iv: [0, 1, 3, 5, 7, 8, 10], vs: "♭2 ♭3 ♭6 ♭7", mood: "Dark and tense, with a menacing flat 2nd.", use: "Phonk, hard techno, dubstep" },
  { name: "Locrian", iv: [0, 1, 3, 5, 6, 8, 10], vs: "♭2 ♭3 ♭5 ♭6 ♭7", mood: "Unstable. Its root chord is diminished.", use: "Tension, horror textures" },
]

export function ModesExplorer() {
  const { root } = useKey()
  const [sel, setSel] = useState(4)
  const m = MODES[sel]
  const play = (i: number) => {
    setSel(i)
    const iv = MODES[i].iv, base = 60 + root - (root > 6 ? 12 : 0)
    toggle("mode-" + i, 4.2, (c, bus, t) => {
      const third = iv[2], fifth = iv[4]
      ;[base, base + third, base + fifth].forEach((n) => tone(c, bus, t, n, 3.9, { ...KEYS, level: 0.07 }))
      tone(c, bus, t, base - 24, 3.9, BASS)
      ;[...iv, 12].forEach((x, k) => tone(c, bus, t + 0.3 + k * 0.4, base + 12 + x, 0.36, { ...KEYS, level: 0.16 }))
    })
  }
  const pcs = m.iv.map((x) => (root + x) % 12)
  return (
    <div className="space-y-5">
      <Caption>Modes are the major scale started from a different note. Here every mode starts on {NOTE_NAMES[root]}, so you can hear how each changed note shifts the mood. They run from brightest to darkest.</Caption>
      <div className="grid gap-2">
        {MODES.map((x, i) => (
          <div key={x.name} className={cn("grid gap-2 border bg-card p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center", i === sel && "border-foreground")}>
            <div>
              <p className="font-medium">{x.name}</p>
              <p className="text-muted-foreground text-xs">{x.vs ? `Major with ${x.vs}` : "The major scale"}</p>
            </div>
            <div className="min-w-0 text-sm">
              <p className="text-pretty">{x.mood}</p>
              <p className="text-muted-foreground text-xs">Heard in {x.use.toLowerCase()}</p>
            </div>
            <PlayButton id={"mode-" + i} label="Play" onPlay={() => play(i)} />
          </div>
        ))}
      </div>
      <Piano scale={pcs} names={pcs.map((p) => NOTE_NAMES[p])} root={root} label={`${NOTE_NAMES[root]} ${m.name} on a piano`} />
      <Caption>The piano shows {NOTE_NAMES[root]} {m.name.toLowerCase()}. Live’s Scale setting and Push’s Scale menu include all of these modes.</Caption>
    </div>
  )
}

/* ---------- Borrowed chords ---------- */

interface Borrow { roman: string; from: string; semis: number; ivs: number[]; why: string; demo: [number, number[]][] }
const MAJ = [0, 4, 7], MIN = [0, 3, 7], DIM = [0, 3, 6]
const BORROW_MAJOR: Borrow[] = [
  { roman: "iv", from: "parallel minor", semis: 5, ivs: MIN, why: "The minor four. Instantly bittersweet, a favorite just before returning home.", demo: [[0, MAJ], [5, MAJ], [5, MIN], [0, MAJ]] },
  { roman: "♭VI", from: "parallel minor", semis: 8, ivs: MAJ, why: "Big and cinematic. ♭VI–♭VII–I is the epic ending in trance and film music.", demo: [[0, MAJ], [8, MAJ], [10, MAJ], [0, MAJ]] },
  { roman: "♭VII", from: "Mixolydian", semis: 10, ivs: MAJ, why: "Rock and disco’s favorite. Sounds confident, not sad.", demo: [[0, MAJ], [10, MAJ], [5, MAJ], [0, MAJ]] },
  { roman: "♭III", from: "parallel minor", semis: 3, ivs: MAJ, why: "A bold, unexpected lift. Great for a chorus change.", demo: [[0, MAJ], [3, MAJ], [5, MAJ], [0, MAJ]] },
  { roman: "ii°", from: "parallel minor", semis: 2, ivs: DIM, why: "Dark tension that wants to move to V.", demo: [[0, MAJ], [2, DIM], [7, MAJ], [0, MAJ]] },
]
const BORROW_MINOR: Borrow[] = [
  { roman: "V", from: "harmonic minor", semis: 7, ivs: MAJ, why: "The major five pulls hard back to i. Classic in trance and phonk.", demo: [[0, MIN], [8, MAJ], [7, MAJ], [0, MIN]] },
  { roman: "IV", from: "Dorian", semis: 5, ivs: MAJ, why: "Brightens a minor loop without leaving it. Deep house and lo-fi love it.", demo: [[0, MIN], [5, MAJ], [0, MIN], [5, MAJ]] },
  { roman: "I", from: "parallel major", semis: 0, ivs: MAJ, why: "The Picardy third: ending a minor piece on a major chord.", demo: [[0, MIN], [5, MIN], [7, MAJ], [0, MAJ]] },
  { roman: "♭II", from: "Phrygian", semis: 1, ivs: MAJ, why: "The Neapolitan. Menacing and dramatic, all over phonk and dubstep.", demo: [[0, MIN], [1, MAJ], [0, MIN], [1, MAJ]] },
]
const ROMANS_MAJ = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"]

export function BorrowedChords() {
  const { root, scale } = useKey()
  const minor = scale !== "major"
  const list = minor ? BORROW_MINOR : BORROW_MAJOR
  const nm = (semis: number, ivs: number[]) => (minor ? MINOR_NAMES : MAJOR_NAMES)[(root + semis) % 12] + (ivs === MIN ? "m" : ivs === DIM ? "dim" : "")
  const demoName = (b: Borrow) => b.demo.map(([s, iv]) => {
    const r = ROMANS_MAJ[s]
    return iv === MIN ? r.toLowerCase() : iv === DIM ? r.toLowerCase() + "°" : r
  }).join("–")
  return (
    <div className="space-y-4">
      <Caption>Borrowing takes a chord from a key that shares the same root, like {MAJOR_NAMES[root]} minor’s chords in {MAJOR_NAMES[root]} major. It adds color without changing key. You’re in {keyLabel(root, minor)}{minor ? " (minor)" : " major"}; switch the key at the top to hear these in another key.</Caption>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((b) => (
          <div key={b.roman} className="flex flex-col gap-3 border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{b.roman} <span className="text-muted-foreground font-normal">· {nm(b.semis, b.ivs)}</span></p>
                <p className="text-muted-foreground text-xs">From the {b.from}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => playChords("borrow", [voiced((root + b.semis) % 12, b.ivs)], 1.2)}>Chord</Button>
            </div>
            <p className="text-sm text-pretty">{b.why}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm">{demoName(b)} <span className="text-xs">({b.demo.map(([s, iv]) => nm(s, iv)).join(" ")})</span></span>
              <Button variant="ghost" size="sm" onClick={() => playChords("borrow-demo", b.demo.map(([s, iv]) => voiced((root + s) % 12, iv)))}>Hear it in a progression</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Find the key ---------- */

const MAJOR_IV = [0, 2, 4, 5, 7, 9, 11]
function rankKeys(pcs: number[], first: number | null) {
  const set = new Set(pcs), out: { root: number; minor: boolean; score: number; missing: number[] }[] = []
  for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
    const tonicMaj = minor ? (r + 3) % 12 : r
    const scale = new Set(MAJOR_IV.map((x) => (tonicMaj + x) % 12))
    const inside = [...set].filter((p) => scale.has(p)).length, outside = set.size - inside
    let score = inside * 2 - outside * 3
    if (set.has(r)) score += 1.5
    if (set.has((r + (minor ? 3 : 4)) % 12)) score += 0.5
    if (set.has((r + 7) % 12)) score += 0.5
    if (first === r) score += 1
    out.push({ root: r, minor, score, missing: [...set].filter((p) => !scale.has(p)) })
  }
  return out.sort((a, b) => b.score - a.score)
}

export function FindKey() {
  const { setRoot, setScale } = useKey()
  const [notes, setNotes] = useState<number[]>([])
  useEffect(() => onNote((n) => setNotes((xs) => (xs.includes(n % 12) ? xs : [...xs, n % 12]))), [])
  const toggleNote = (pc: number) => setNotes((xs) => (xs.includes(pc) ? xs.filter((x) => x !== pc) : [...xs, pc]))
  const ranked = notes.length ? rankKeys(notes, notes[0]).slice(0, 4) : []
  const best = ranked[0]?.score ?? 0
  return (
    <div className="space-y-4">
      <Caption>Play the notes of a melody or bassline you’re trying to figure out, on Push, a keyboard or the buttons below. The best-fitting keys appear as you go. The first note you add counts a little extra, since songs often start on the root.</Caption>
      <Piano scale={notes} names={notes.map((p) => NOTE_NAMES[p])} root={notes[0] ?? -1} held={[]} label="Notes you've added" onPlay={(m) => toggleNote(m % 12)} />
      <div className="flex flex-wrap items-center gap-2">
        {NOTE_NAMES.map((n, pc) => (
          <Button key={n} variant="outline" size="sm" aria-pressed={notes.includes(pc)} onClick={() => toggleNote(pc)} className={cn("w-12", notes.includes(pc) && "border-transparent bg-[var(--s5)] text-white hover:bg-[var(--s5)] hover:text-white")}>{n}</Button>
        ))}
        <Button variant="ghost" size="sm" disabled={!notes.length} onClick={() => setNotes([])}><Eraser />Clear</Button>
      </div>
      {ranked.length > 0 && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {ranked.map((k, i) => (
            <li key={k.root + "" + k.minor} className={cn("flex items-center justify-between gap-3 border bg-card p-3", i === 0 && "border-foreground")}>
              <div className="min-w-0">
                <p className="font-medium">{keyLabel(k.root, k.minor).replace(/m$/, "")} {k.minor ? "minor" : "major"}{i === 0 && k.score === best ? <span className="text-muted-foreground font-normal"> · best fit</span> : null}</p>
                <p className="text-muted-foreground text-xs">{k.missing.length ? `${k.missing.map((p) => NOTE_NAMES[p]).join(", ")} ${k.missing.length > 1 ? "are" : "is"} outside this key` : "Every note fits"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setRoot(k.root); setScale(k.minor ? "minor" : "major") }}>Use this key</Button>
            </li>
          ))}
        </ol>
      )}
      {notes.length > 0 && notes.length < 4 && <Caption>A few more notes will narrow it down. Relative keys like C major and A minor share every note, so listen for which one feels like home.</Caption>}
    </div>
  )
}
