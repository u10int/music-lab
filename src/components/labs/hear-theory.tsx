import { useState } from "react"
import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
import { tone, type ToneOptions } from "@/audio/engine"
import { stop, toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { Piano } from "@/components/piano"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const KEYS: ToneOptions = { wave: "triangle", env: { a: 0.01, d: 0.6, s: 0.55, r: 0.35 }, cutoff: 3200, level: 0.14 }
const BASS: ToneOptions = { wave: "sine", env: { a: 0.01, d: 0.4, s: 0.7, r: 0.2 }, cutoff: 4000, level: 0.22 }

/* ---------- Spelling ---------- */

const ROOT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"]
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11]
const ACC: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" }
/** Spell the note `semis` above the root as scale degree `deg` (1 = root, 3 = third…), so a minor third of C is E♭, not D♯. */
function spell(rootPc: number, deg: number, semis: number) {
  const L = LET.indexOf(ROOT_NAMES[rootPc][0])
  const li = (L + deg - 1) % 7
  let a = (rootPc + semis - NAT[li]) % 12
  if (a > 6) a -= 12
  if (a < -6) a += 12
  return LET[li] + (ACC[a] ?? "")
}
/** Middle-ish register for a root: C4 up to F♯4. */
const baseOf = (rootPc: number) => 60 + rootPc - (rootPc > 6 ? 12 : 0)

/* ---------- Chord qualities ---------- */

type Third = "sus2" | "m3" | "M3" | "sus4"
type Fifth = "b5" | "5" | "#5"
type Seventh = "none" | "b7" | "7"
interface Shape { third: Third; fifth: Fifth; seventh: Seventh }

const THIRD: Record<Third, { semis: number; deg: number; label: string }> = {
  sus2: { semis: 2, deg: 2, label: "2" }, m3: { semis: 3, deg: 3, label: "♭3" }, M3: { semis: 4, deg: 3, label: "3" }, sus4: { semis: 5, deg: 4, label: "4" },
}
const FIFTH: Record<Fifth, { semis: number; label: string }> = { b5: { semis: 6, label: "♭5" }, "5": { semis: 7, label: "5" }, "#5": { semis: 8, label: "♯5" } }
const SEVENTH: Record<Seventh, { semis: number; label: string } | null> = { none: null, b7: { semis: 10, label: "♭7" }, "7": { semis: 11, label: "7" } }

interface Quality extends Shape {
  id: string; name: string; sym: string; group: "Triads" | "Sevenths" | "Suspended"
  sound: string; listen: string; heard: string
}

/** The qualities worth knowing by ear, each as a shape the builder can make. */
const QUALITIES: Quality[] = [
  { id: "maj", name: "Major", sym: "", group: "Triads", third: "M3", fifth: "5", seventh: "none",
    sound: "Bright, stable and settled. The sound of home in a major key.",
    listen: "Nothing pulls or rubs. It feels finished.",
    heard: "Uplifting piano stabs in house, the euphoric chords in progressive and trance breakdowns." },
  { id: "min", name: "Minor", sym: "m", group: "Triads", third: "m3", fifth: "5", seventh: "none",
    sound: "Darker and more inward, but just as stable. Only the third differs from major, a half step lower.",
    listen: "Still at rest, but shaded. Sing the middle note and it sounds sadder than major’s.",
    heard: "The default in techno, deep house, drum and bass and phonk." },
  { id: "dim", name: "Diminished", sym: "°", group: "Triads", third: "m3", fifth: "b5", seventh: "none",
    sound: "Tense and unstable, like something is about to happen. Two minor thirds stacked.",
    listen: "A squeezed, narrow sound that wants to move somewhere else.",
    heard: "Passing chords, suspense and horror cues, and the vii° chord that leads back home." },
  { id: "aug", name: "Augmented", sym: "+", group: "Triads", third: "M3", fifth: "#5", seventh: "none",
    sound: "Dreamy, eerie and unresolved. Two major thirds stacked, so it has no clear home.",
    listen: "Like major, but the top note is stretched too far and floats.",
    heard: "Rare in dance music. Used as a passing chord or in film-style builds." },
  { id: "maj7", name: "Major 7th", sym: "maj7", group: "Sevenths", third: "M3", fifth: "5", seventh: "7",
    sound: "Lush, soft and wistful. The 7th sits a half step under the octave and rubs gently against it.",
    listen: "Major with a shimmer on top, a little bittersweet.",
    heard: "Lo-fi, neo-soul, deep house pads and chillout." },
  { id: "dom7", name: "Dominant 7th", sym: "7", group: "Sevenths", third: "M3", fifth: "5", seventh: "b7",
    sound: "Bluesy and restless. The 3rd and ♭7 are a tritone apart, which makes it want to resolve.",
    listen: "Major at the bottom, but it leans forward, as if the next chord is coming.",
    heard: "Funk, disco, blues, gospel house. As the V7 it pulls hardest back to the home chord." },
  { id: "min7", name: "Minor 7th", sym: "m7", group: "Sevenths", third: "m3", fifth: "5", seventh: "b7",
    sound: "Smooth and mellow, softer and more relaxed than a plain minor chord.",
    listen: "Minor, but rounded off. It can loop forever without getting tense.",
    heard: "The go-to deep house, garage and lo-fi chord. Stack a few and you have a groove." },
  { id: "m7b5", name: "Half-diminished", sym: "m7♭5", group: "Sevenths", third: "m3", fifth: "b5", seventh: "b7",
    sound: "Dark and searching. Diminished with a ♭7, which softens its edge.",
    listen: "Moody and unsettled, but not as sharp as diminished.",
    heard: "The ii chord in minor keys, moody pads, jazz-tinged downtempo." },
  { id: "sus2", name: "Sus2", sym: "sus2", group: "Suspended", third: "sus2", fifth: "5", seventh: "none",
    sound: "Open and airy. With no third it’s neither major nor minor, so it floats.",
    listen: "Hollow and bright at once, like the chord hasn’t decided yet.",
    heard: "Ambient pads, melodic techno and progressive house." },
  { id: "sus4", name: "Sus4", sym: "sus4", group: "Suspended", third: "sus4", fifth: "5", seventh: "none",
    sound: "Suspended tension. The 4 wants to fall a step to the 3rd.",
    listen: "Strong and expectant. Play it, then major, and you hear it land.",
    heard: "Trance and anthem builds, often resolving sus4 to major right on the drop." },
]

function chordOf(s: Shape) {
  const parts = [{ deg: 1, semis: 0, label: "1" }, { ...THIRD[s.third] }, { deg: 5, semis: FIFTH[s.fifth].semis, label: FIFTH[s.fifth].label }]
  const sev = SEVENTH[s.seventh]
  if (sev) parts.push({ deg: 7, semis: sev.semis, label: sev.label })
  return parts
}
const same = (a: Shape, b: Shape) => a.third === b.third && a.fifth === b.fifth && a.seventh === b.seventh
/** A name for any shape the builder can make, even the unusual ones. */
function nameOf(s: Shape): { name: string; sym: string; q?: Quality } {
  const q = QUALITIES.find((x) => same(x, s))
  if (q) return { name: q.name, sym: q.sym, q }
  const extra: Record<string, [string, string]> = {
    "m3/5/7": ["Minor-major 7th", "m(maj7)"], "M3/#5/b7": ["Augmented 7th", "7♯5"], "M3/#5/7": ["Augmented major 7th", "maj7♯5"],
    "sus4/5/b7": ["7sus4", "7sus4"], "sus2/5/b7": ["7sus2", "7sus2"], "M3/b5/none": ["Major flat five", "(♭5)"], "M3/b5/b7": ["Dominant 7th flat five", "7♭5"],
  }
  const k = `${s.third}/${s.fifth}/${s.seventh}`
  if (extra[k]) return { name: extra[k][0], sym: extra[k][1] }
  const sym = (s.third === "m3" ? "m" : "") + (s.seventh === "b7" ? "7" : s.seventh === "7" ? "maj7" : "") + (s.third.startsWith("sus") ? s.third : "") + (s.fifth === "5" ? "" : `(${FIFTH[s.fifth].label})`)
  return { name: "An unusual color", sym }
}

let seq = 0
type How = "both" | "block" | "arp"
function chordSchedule(base: number, semis: number[], how: How) {
  return (c: BaseAudioContext, bus: AudioNode, t: number) => {
    let at = t
    if (how !== "arp") {
      semis.forEach((s) => tone(c, bus, at, base + s, 1.2, KEYS))
      tone(c, bus, at, base - 12, 1.2, BASS)
      at += 1.45
    }
    if (how !== "block") semis.forEach((s, k) => tone(c, bus, at + k * 0.32, base + s, 0.5, { ...KEYS, level: 0.16 }))
  }
}
const chordDur = (n: number, how: How) => (how === "arp" ? n * 0.32 + 0.6 : how === "block" ? 1.7 : 1.45 + n * 0.32 + 0.6)

/** Build a chord one note at a time and hear what each change does. */
export function ChordQualities() {
  const { root } = useKey()
  const [shape, setShape] = useState<Shape>({ third: "M3", fifth: "5", seventh: "none" })
  const [how, setHow] = useState<How>("both")
  const base = baseOf(root)
  const parts = chordOf(shape)
  const notes = parts.map((p) => spell(root, p.deg, p.semis))
  const pcs = parts.map((p) => (root + p.semis) % 12)
  const { name, sym, q } = nameOf(shape)
  const symbol = ROOT_NAMES[root] + sym

  const play = (s: Shape, h: How = how) => {
    const semis = chordOf(s).map((p) => p.semis)
    stop()
    toggle("cq", chordDur(semis.length, h), chordSchedule(base, semis, h))
  }
  const change = (patch: Partial<Shape>) => {
    const next = { ...shape, ...patch }
    setShape(next)
    play(next)
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Caption className="max-w-3xl">A chord’s quality is set by which version of each note it uses above the root. The 3rd decides major or minor. The 5th makes it diminished or augmented. A 7th adds color on top. Change one note at a time and listen to what moves.</Caption>

        <div className="grid gap-8 border-y border-foreground py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-5">
            <div className="space-y-1" aria-live="polite">
              <p className="text-stat-lg font-medium">{symbol}</p>
              <p className="text-subheading">{name}</p>
              <p className="text-muted-foreground text-sm tabular-nums">{notes.join("  ")} <span className="mx-1">·</span> {parts.map((p) => p.label).join(" ")}</p>
            </div>
            <Piano scale={pcs} names={notes} root={root} chord={pcs} label={`${symbol}: ${notes.join(", ")}`}
              onPlay={(m) => { stop(); toggle("cq-key-" + seq++, 0.8, (c, bus, t) => { tone(c, bus, t, m, 0.6, { ...KEYS, level: 0.2 }) }) }} />
            {q ? (
              <dl className="grid max-w-2xl gap-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Sounds</dt><dd className="text-pretty">{q.sound}</dd>
                <dt className="text-muted-foreground">Listen for</dt><dd className="text-pretty">{q.listen}</dd>
                <dt className="text-muted-foreground">Heard in</dt><dd className="text-pretty">{q.heard}</dd>
              </dl>
            ) : (
              <p className="max-w-2xl text-sm text-pretty">A less common color. Try changing one note back to hear which of the main qualities it sits next to.</p>
            )}
          </div>

          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">3rd <span className="text-muted-foreground font-normal">· major or minor</span></legend>
              <Seg label="Third" value={shape.third} onChange={(v) => change({ third: v })} options={[["sus2", "2 (sus)"], ["m3", "♭3 minor"], ["M3", "3 major"], ["sus4", "4 (sus)"]]} />
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">5th <span className="text-muted-foreground font-normal">· stable or stretched</span></legend>
              <Seg label="Fifth" value={shape.fifth} onChange={(v) => change({ fifth: v })} options={[["b5", "♭5"], ["5", "5"], ["#5", "♯5"]]} />
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">7th <span className="text-muted-foreground font-normal">· extra color</span></legend>
              <Seg label="Seventh" value={shape.seventh} onChange={(v) => change({ seventh: v })} options={[["none", "None"], ["b7", "♭7"], ["7", "7"]]} />
            </fieldset>
            <div className="flex flex-wrap items-center gap-3 border-t pt-5">
              <PlayButton id="cq" label="Play" onPlay={() => toggle("cq", chordDur(parts.length, how), chordSchedule(base, parts.map((p) => p.semis), how))} />
              <Seg label="How to play it" value={how} onChange={(v) => { setHow(v); play(shape, v) }} options={[["both", "Both"], ["block", "Together"], ["arp", "One by one"]]} />
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4" aria-labelledby="cq-all">
        <h3 id="cq-all" className="text-subheading font-medium">The qualities</h3>
        <Caption>Pick one to load it above. Built on {ROOT_NAMES[root]}, the root of your key.</Caption>
        {(["Triads", "Sevenths", "Suspended"] as const).map((g) => (
          <div key={g} className="space-y-2">
            <h4 className="text-muted-foreground text-sm">{g}</h4>
            <ul className="grid border-t border-l sm:grid-cols-2 lg:grid-cols-4">
              {QUALITIES.filter((x) => x.group === g).map((x) => {
                const on = same(x, shape)
                return (
                  <li key={x.id} className="border-r border-b">
                    <button type="button" aria-pressed={on} onClick={() => { setShape(x); play(x) }}
                      className={cn("flex h-full w-full flex-col items-start gap-1 p-4 text-left transition-[background-color] duration-100 hover:bg-muted", on && "bg-foreground text-background hover:bg-foreground")}>
                      <span className="flex w-full items-baseline justify-between gap-2">
                        <span className="font-medium">{x.name}</span>
                        <span className={cn("text-sm tabular-nums", on ? "text-background/70" : "text-muted-foreground")}>{ROOT_NAMES[root]}{x.sym}</span>
                      </span>
                      <span className={cn("text-sm text-pretty", on ? "text-background/80" : "text-muted-foreground")}>{x.sound.split(". ")[0].replace(/\.$/, "")}.</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      <CompareChords root={root} base={base} />

      <TestYourself to="/labs/ear?quiz=chords" label="Chord quality quiz">Ready to check your ears? The quiz plays a chord and you name it, starting with the four triads.</TestYourself>
    </div>
  )
}

/** Pairs that differ by a single note, played back to back. */
const PAIRS: { a: string; b: string; what: string }[] = [
  { a: "maj", b: "min", what: "Only the 3rd moves, down a half step. Bright to shaded." },
  { a: "min", b: "dim", what: "Now the 5th drops too. Stable to tense." },
  { a: "maj", b: "aug", what: "The 5th goes up a half step. Settled to floating." },
  { a: "sus4", b: "maj", what: "The 4 falls to the 3. Hear the tension land." },
  { a: "maj7", b: "dom7", what: "The 7th drops a half step. Lush to bluesy." },
  { a: "min", b: "min7", what: "Add a ♭7 on top. Plain minor to smooth minor." },
]

function CompareChords({ root, base }: { root: number; base: number }) {
  const byId = (id: string) => QUALITIES.find((x) => x.id === id)!
  const play = (i: number) => {
    const A = chordOf(byId(PAIRS[i].a)).map((p) => p.semis), B = chordOf(byId(PAIRS[i].b)).map((p) => p.semis)
    toggle("cmp-" + i, 5.4, (c, bus, t) => {
      ;[A, B, A, B].forEach((ch, k) => {
        ch.forEach((s) => tone(c, bus, t + k * 1.3, base + s, 1.1, KEYS))
        tone(c, bus, t + k * 1.3, base - 12, 1.1, BASS)
      })
    })
  }
  return (
    <section className="space-y-4" aria-labelledby="cq-cmp">
      <div className="space-y-1">
        <h3 id="cq-cmp" className="text-subheading font-medium">Hear the difference</h3>
        <Caption>Each pair changes one note. They play A, B, A, B so the change stands out.</Caption>
      </div>
      <ul className="divide-y border-y">
        {PAIRS.map((p, i) => {
          const A = byId(p.a), B = byId(p.b)
          return (
            <li key={i} className="grid gap-2 py-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-medium">{A.name} <span className="text-muted-foreground font-normal">to</span> {B.name}</span>
              <span className="text-muted-foreground text-sm text-pretty">{ROOT_NAMES[root]}{A.sym} → {ROOT_NAMES[root]}{B.sym}. {p.what}</span>
              <PlayButton id={"cmp-" + i} label="Play A–B" onPlay={() => play(i)} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------- Intervals ---------- */

interface Interval { semis: number; name: string; short: string; feel: string; tension: number; think?: string; where: string }
const INTERVALS: Interval[] = [
  { semis: 1, name: "Minor 2nd", short: "m2", tension: 5, feel: "Grinding and tense. Two neighbouring keys.", think: "The two-note Jaws theme.", where: "The rub between a major 7th and the octave." },
  { semis: 2, name: "Major 2nd", short: "M2", tension: 3, feel: "A plain step. Melodic, a little restless together.", think: "“Happy Birthday”, from “-py” up to “birth”.", where: "The 2 in a sus2 chord. Most melodies move in 2nds." },
  { semis: 3, name: "Minor 3rd", short: "m3", tension: 1, feel: "Soft and sad.", think: "The first two notes of “Greensleeves”.", where: "Makes a chord minor." },
  { semis: 4, name: "Major 3rd", short: "M3", tension: 1, feel: "Bright and happy.", think: "“Oh when the Saints”, the first two notes.", where: "Makes a chord major." },
  { semis: 5, name: "Perfect 4th", short: "P4", tension: 1, feel: "Open, strong, a little hollow.", think: "The first two notes of “Here Comes the Bride”.", where: "The 4 in a sus4 chord. Techno stabs often stack 4ths." },
  { semis: 6, name: "Tritone", short: "TT", tension: 5, feel: "Unstable and harsh. Wants to resolve.", think: "The first two notes of the Simpsons theme.", where: "Between the 3rd and ♭7 of a dominant 7th, and the ♭5 of diminished." },
  { semis: 7, name: "Perfect 5th", short: "P5", tension: 0, feel: "Pure, powerful, open.", think: "“Twinkle, twinkle”, from the first to the second “twinkle”.", where: "The 5 in almost every chord. Power chords and trance leads layer 5ths." },
  { semis: 8, name: "Minor 6th", short: "m6", tension: 2, feel: "Bittersweet and yearning.", where: "The ♯5 of augmented. Upside down, it’s a major 3rd." },
  { semis: 9, name: "Major 6th", short: "M6", tension: 1, feel: "Warm, sweet, open.", think: "“My Bon-”, the start of “My Bonnie Lies Over the Ocean”.", where: "Added to major chords for a lounge, retro feel." },
  { semis: 10, name: "Minor 7th", short: "m7", tension: 3, feel: "Bluesy and unresolved.", think: "“There’s a”, the start of “Somewhere” from West Side Story.", where: "The ♭7 in dominant 7th and minor 7th chords." },
  { semis: 11, name: "Major 7th", short: "M7", tension: 4, feel: "Sharp, dreamy tension, one step short of the octave.", where: "The 7 in a major 7th chord." },
  { semis: 12, name: "Octave", short: "P8", tension: 0, feel: "The same note, higher. Completely smooth.", think: "“Some-where”, the start of “Over the Rainbow”.", where: "Octave basslines in disco and house." },
]
const SPELL_DEG = [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7, 8]

type Dir = "up" | "down" | "together"
/** Hear the distance between two notes, with a song to anchor it and where it shows up in chords. */
export function Intervals() {
  const { root } = useKey()
  const [sel, setSel] = useState(6)
  const [dir, setDir] = useState<Dir>("up")
  const iv = INTERVALS[sel]
  const base = baseOf(root)
  const top = spell(root, SPELL_DEG[iv.semis], iv.semis)
  const pcs = [root, (root + iv.semis) % 12]

  const sched = (i: Interval, d: Dir) => (c: BaseAudioContext, bus: AudioNode, t: number) => {
    const lo = base, hi = base + i.semis
    if (d === "together") { tone(c, bus, t, lo, 1.4, KEYS); tone(c, bus, t, hi, 1.4, KEYS); return }
    const [a, b] = d === "up" ? [lo, hi] : [hi, lo]
    tone(c, bus, t, a, 0.6, { ...KEYS, level: 0.18 })
    tone(c, bus, t + 0.65, b, 0.9, { ...KEYS, level: 0.18 })
  }
  const play = (i: number, d: Dir = dir) => { stop(); toggle("iv", 1.9, sched(INTERVALS[i], d)) }

  return (
    <div className="space-y-10">
      <Caption className="max-w-3xl">An interval is the distance between two notes, counted in half steps (one key to the next on a piano). Every chord is a stack of intervals, so learning these is how you start to hear why a chord sounds the way it does. Pick one to hear it from {ROOT_NAMES[root]}.</Caption>

      <div className="space-y-6">
        <ul className="grid grid-cols-3 border-t border-l sm:grid-cols-4 lg:grid-cols-6" aria-label="Intervals">
          {INTERVALS.map((x, i) => (
            <li key={x.short} className="border-r border-b">
              <button type="button" aria-pressed={i === sel} onClick={() => { setSel(i); play(i) }}
                className={cn("flex h-full w-full flex-col items-start gap-0.5 p-3 text-left transition-[background-color] duration-100 hover:bg-muted", i === sel && "bg-foreground text-background hover:bg-foreground")}>
                <span className="text-sm font-medium">{x.name}</span>
                <span className={cn("text-xs tabular-nums", i === sel ? "text-background/70" : "text-muted-foreground")}>{x.semis} half step{x.semis > 1 ? "s" : ""}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="grid gap-8 border-y border-foreground py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-5" aria-live="polite">
            <div className="space-y-1">
              <p className="text-headline font-medium">{iv.name}</p>
              <p className="text-muted-foreground text-sm tabular-nums">{ROOT_NAMES[root]} to {top} <span className="mx-1">·</span> {iv.semis} half steps <span className="mx-1">·</span> written {iv.short}</p>
            </div>
            <Piano scale={pcs} names={[ROOT_NAMES[root], top]} root={root} chord={pcs} label={`${iv.name}: ${ROOT_NAMES[root]} to ${top}`} />
            <dl className="grid max-w-2xl gap-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Sounds</dt><dd className="text-pretty">{iv.feel}</dd>
              {iv.think && <><dt className="text-muted-foreground">Think of</dt><dd className="text-pretty">{iv.think}</dd></>}
              <dt className="text-muted-foreground">In chords</dt><dd className="text-pretty">{iv.where}</dd>
              <dt className="text-muted-foreground">Tension</dt>
              <dd className="flex items-center gap-2">
                <span className="flex gap-0.5" aria-hidden="true">{Array.from({ length: 5 }, (_, k) => <span key={k} className={cn("h-2 w-5", k < iv.tension ? "bg-foreground" : "bg-muted")} />)}</span>
                <span>{["None", "Low", "Mild", "Moderate", "High", "Very high"][iv.tension]}</span>
              </dd>
            </dl>
          </div>
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Play it</legend>
              <Seg label="Direction" value={dir} onChange={(v) => { setDir(v); play(sel, v) }} options={[["up", "Going up"], ["down", "Going down"], ["together", "Together"]]} />
            </fieldset>
            <PlayButton id="iv" label="Play" onPlay={() => toggle("iv", 1.9, sched(iv, dir))} />
            <Caption>Sing along. Hum the bottom note, then try to land the top one before you hear it. That’s the skill the quiz tests.</Caption>
          </div>
        </div>
      </div>

      <TestYourself to="/labs/ear?quiz=intervals" label="Interval quiz">The quiz plays two notes and you name the distance. Start with 3rds, 5ths and octaves, then add the rest.</TestYourself>
    </div>
  )
}

function TestYourself({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      <p className="text-muted-foreground max-w-xl text-sm text-pretty">{children}</p>
      <Button variant="outline" asChild><Link to={to}>{label}<ArrowRight /></Link></Button>
    </div>
  )
}

