import { useEffect } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { Download, Eraser, X } from "lucide-react"
import { drum, KIND_OF, tone, type ToneOptions } from "@/audio/engine"
import { bindTempo, setPos, toggle, usePos } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { Caption, SECTION_TITLE } from "@/components/page"
import { Piano } from "@/components/piano"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FAMILIES, LANE_NOTE, PATTERNS } from "@/data/patterns"
import { downloadFile, TICKS_PER_16TH, writeMidi, type MidiNote } from "@/lib/midi-file"
import { usePref } from "@/lib/store"
import { theory, type Theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { MidiOutPicker } from "@/components/midi-out-picker"
import { Toolbar } from "@/components/toolbar"
import { Field } from "@/components/field"
import { browserSound, sendNote } from "@/midi/midi-out"

type Sound = "keys" | "pad" | "pluck"
type Rhythm = "held" | "eighths" | "stabs"
interface ProgState { chords: number[]; sevenths: boolean; lead: boolean; sound: Sound; rhythm: Rhythm; pattern: string; tempo: number }
const INIT: ProgState = { chords: [0, 5, 2, 6], sevenths: false, lead: true, sound: "keys", rhythm: "held", pattern: "prog", tempo: 124 }
const MAX = 8

const SOUNDS: Record<Sound, ToneOptions> = {
  keys: { wave: "triangle", env: { a: 0.01, d: 0.8, s: 0.4, r: 0.3 }, cutoff: 2800, level: 0.11 },
  pad: { wave: "sawtooth", env: { a: 0.25, d: 0.6, s: 0.8, r: 0.6 }, cutoff: 1500, detune: 10, level: 0.06 },
  pluck: { wave: "sawtooth", env: { a: 0.003, d: 0.25, s: 0, r: 0.2 }, cutoff: 2300, q: 2, level: 0.09 },
}
const BASS: ToneOptions = { wave: "sine", env: { a: 0.005, d: 0.3, s: 0.8, r: 0.1 }, cutoff: 4000, level: 0.32 }

/** Pitch classes (relative to the key) of a diatonic chord, with an optional 7th. */
function tones(T: Theory, d: number, sevenths: boolean) {
  const iv = T.sc.iv
  const steps = sevenths ? [0, 2, 4, 6] : [0, 2, 4]
  return steps.map((k) => (T.pc + iv[(d + k) % 7]) % 12)
}
function chordName(T: Theory, d: number, sevenths: boolean) {
  const base = T.chords[d]
  if (!sevenths) return { roman: base.roman, name: base.name }
  const pcs = tones(T, d, true), sev = (pcs[3] - pcs[0] + 12) % 12
  const suffix = base.q === "maj" ? (sev === 11 ? "maj7" : "7") : base.q === "min" ? "m7" : base.q === "dim" ? "m7♭5" : "+7"
  return { roman: base.roman.replace("°", "ø") + "7", name: T.names[d] + suffix }
}
/** Close voicings around middle C; with voice leading, each chord picks the inversion nearest the last one. */
function voicings(T: Theory, prog: number[], sevenths: boolean, lead: boolean) {
  const out: number[][] = []
  let prev: number[] | null = null
  for (const d of prog) {
    const pcs = tones(T, d, sevenths)
    const cands: number[][] = []
    for (let rot = 0; rot < pcs.length; rot++) {
      const order = [...pcs.slice(rot), ...pcs.slice(0, rot)]
      for (const startOct of [4, 5]) {
        let n = 12 * startOct + order[0]
        const v = [n]
        for (const pc of order.slice(1)) {
          n += ((pc - (n % 12)) + 12) % 12 || 12
          v.push(n)
        }
        if (v[0] >= 52 && v[v.length - 1] <= 76) cands.push(v)
      }
    }
    let best = cands[0] ?? pcs.map((pc) => 60 + pc)
    if (!lead || !prev) best = cands.find((v) => v[0] % 12 === pcs[0]) ?? best
    else {
      const p = prev
      const cost = (v: number[]) => v.reduce((a, n, i) => a + Math.abs(n - (p[Math.min(i, p.length - 1)] ?? n)), 0)
      best = cands.reduce((a, b) => (cost(b) < cost(a) ? b : a), best)
    }
    out.push(best)
    prev = best
  }
  return out
}
const bassOf = (T: Theory, d: number) => 36 + ((T.pc + T.sc.iv[d]) % 12)

const live: { current: { st: ProgState; T: ReturnType<typeof theory>; voiced: ReturnType<typeof voicings> } | null } = { current: null }

export function ProgressionBuilder() {
  const { root, scale } = useKey()
  const T = theory(root, scale)
  const [st, setSt] = usePref<ProgState>("progression", INIT)
  const set = (patch: Partial<ProgState>) => setSt({ ...st, ...patch })
  const bar = usePos("prog-builder")
  const voiced = voicings(T, st.chords, st.sevenths, st.lead)
  live.current ??= { st, T, voiced }
  useEffect(() => {
    live.current = { st, T, voiced }
  })

  const play = () => {
    let timer = 0
    const queue: { bar: number; at: number }[] = []
    toggle("prog-builder", 3600, (c, bus, t0) => {
      let next = t0, k = 0
      const tick = () => {
        const { st: s, T: th, voiced: vs } = live.current!
        if (!s.chords.length) return
        const sixteenth = 60 / s.tempo / 4
        const pat = PATTERNS.find((p) => p.id === s.pattern)
        const swing = (pat?.swing ?? 0) * sixteenth
        const local = browserSound()
        while (next < horizon(c)) {
          const b = Math.floor(k / 16) % s.chords.length, i = k % 16, at = next + (i % 2 ? swing : 0), ps = (k % (pat?.length ?? 16)) + 1
          const v = vs[b], d = s.chords[b]
          if (pat) for (const [name, steps, ghost = []] of pat.rows) {
            const vel = steps.includes(ps) ? 0.8 : ghost.includes(ps) ? 0.32 : 0
            if (!vel) continue
            if (local) drum(c, bus, at, KIND_OF[name], vel)
            sendNote(c, at, LANE_NOTE[name], vel * 130, sixteenth * 0.5, 9)
          }
          const hitChord = s.rhythm === "held" ? i === 0 : s.rhythm === "eighths" ? i % 2 === 0 : [3, 6, 11, 14].includes(i)
          const len = s.rhythm === "held" ? sixteenth * 15.5 : s.rhythm === "eighths" ? sixteenth * 1.6 : sixteenth * 1.2
          if (hitChord && v) v.forEach((n) => {
            if (local) tone(c, bus, at, n, len, SOUNDS[s.sound])
            sendNote(c, at, n, 90, len * 0.95, 2)
          })
          if (i === 0 || i === 8) {
            if (local) tone(c, bus, at, bassOf(th, d), sixteenth * 7.5, BASS)
            sendNote(c, at, bassOf(th, d), 100, sixteenth * 7.2, 1)
          }
          if (i === 0) queue.push({ bar: b, at: at - t0 })
          next += sixteenth
          k++
        }
        while (queue.length > 16) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.bar
      setPos(cur)
    }, () => stopClock(timer))
    bindTempo("prog-builder", {
      get: () => live.current!.st.tempo, min: 70, max: 175,
      set: (v) => { const n = { ...live.current!.st, tempo: v }; live.current = { ...live.current!, st: n }; setSt(n) },
    })
  }

  const exportMidi = () => {
    const chordNotes: MidiNote[] = [], bassNotes: MidiNote[] = []
    st.chords.forEach((d, b) => {
      const base = b * 16 * TICKS_PER_16TH
      const hits = st.rhythm === "held" ? [0] : st.rhythm === "eighths" ? [0, 2, 4, 6, 8, 10, 12, 14] : [3, 6, 11, 14]
      const len = st.rhythm === "held" ? 16 * TICKS_PER_16TH - 4 : st.rhythm === "eighths" ? TICKS_PER_16TH * 1.5 : TICKS_PER_16TH
      for (const h of hits) for (const n of voiced[b]) chordNotes.push({ tick: base + h * TICKS_PER_16TH, note: n, velocity: 92, duration: Math.round(len) })
      bassNotes.push({ tick: base, note: bassOf(T, d), velocity: 100, duration: 8 * TICKS_PER_16TH - 4 }, { tick: base + 8 * TICKS_PER_16TH, note: bassOf(T, d), velocity: 92, duration: 8 * TICKS_PER_16TH - 4 })
    })
    const length = st.chords.length * 16 * TICKS_PER_16TH
    const label = st.chords.map((d) => chordName(T, d, st.sevenths).roman).join("-")
    downloadFile(writeMidi([{ name: `Chords ${label}`, notes: chordNotes, length }], st.tempo), `music-lab-chords-${T.names[0]}-${label}.mid`)
    setTimeout(() => downloadFile(writeMidi([{ name: `Bass ${label}`, notes: bassNotes, length }], st.tempo), `music-lab-bass-${T.names[0]}-${label}.mid`), 400)
  }

  const current = bar >= 0 ? bar : st.chords.length ? 0 : -1
  const curD = current >= 0 ? st.chords[current] : null
  return (
    <div className="space-y-8" style={{ ["--c" as string]: "var(--s2)" }}>
      <Toolbar
        transport={<PlayButton id="prog-builder" label="Play loop" primary onPlay={play} />}
        actions={<Button variant="outline" size="sm" disabled={!st.chords.length} onClick={exportMidi}><Download />Export .mid</Button>}
      >
        <KeyPicker idPrefix="pb" />
        <Field label="Tempo" htmlFor="pb-tempo" value={<>{st.tempo} BPM</>} className="w-40">
          <Slider id="pb-tempo" min={70} max={175} step={1} value={[st.tempo]} onValueChange={([v]) => set({ tempo: v })} aria-label="Tempo" />
        </Field>
        <Field label="Drums" htmlFor="pb-drums">
          <Select value={st.pattern} onValueChange={(v) => { const p = PATTERNS.find((x) => x.id === v); set({ pattern: v, ...(p ? { tempo: p.tempo } : {}) }) }}>
            <SelectTrigger id="pb-drums" size="sm" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No drums</SelectItem>
              {FAMILIES.filter(([f]) => f !== "all" && PATTERNS.some((p) => p.family === f)).map(([f, label]) => (
                <SelectGroup key={f}><SelectLabel>{label}</SelectLabel>{PATTERNS.filter((p) => p.family === f).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Toolbar>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className={SECTION_TITLE}>Chords in {T.names[0]} {T.sc.name.toLowerCase()}</h2>
            <Caption>Tap to add a chord as the next bar, up to eight, or start from a common progression.</Caption>
          </div>
          <Select value="" onValueChange={(v) => set({ chords: v.split(",").map(Number) })}>
            <SelectTrigger size="sm" className="w-56" aria-label="Start from a progression"><SelectValue placeholder="Start from a progression" /></SelectTrigger>
            <SelectContent>{T.progs.map((p) => <SelectItem key={p.join()} value={p.join()}>{p.map((d) => T.chords[d].roman).join("–")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {T.chords.map((_, d) => {
            const c = chordName(T, d, st.sevenths)
            return (
              <button key={d} type="button" disabled={st.chords.length >= MAX} onClick={() => set({ chords: [...st.chords, d] })}
                className="grid gap-0.5 rounded-md border border-pad-edge bg-card px-1 py-2 text-sm transition-[scale,background-color] duration-150 hover:bg-accent active:scale-[0.96] disabled:opacity-50">
                <b>{c.roman}</b><span>{c.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={SECTION_TITLE}>Your progression</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!st.chords.length} onClick={() => set({ chords: [] })}><Eraser />Clear</Button>
          </div>
        </div>
        {st.chords.length ? (
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {st.chords.map((d, b) => {
              const c = chordName(T, d, st.sevenths)
              return (
                <li key={b} className={cn("relative grid gap-0.5 rounded-lg border bg-card p-3", bar === b && "border-transparent bg-[var(--s2)] text-[var(--on-accent)]")}>
                  <span className={cn("text-xs", bar === b ? "opacity-70" : "text-muted-foreground")}>Bar {b + 1}</span>
                  <b className="text-lg">{c.roman}</b>
                  <span className="text-sm">{c.name}</span>
                  <button type="button" aria-label={`Remove ${c.name} from bar ${b + 1}`} onClick={() => set({ chords: st.chords.filter((_, j) => j !== b) })} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-md hover:bg-accent hover:text-foreground"><X className="size-3.5" /></button>
                </li>
              )
            })}
          </ol>
        ) : <p className="text-muted-foreground text-sm">No chords yet. Add some above, or start from a progression.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Seg label="Sound" value={st.sound} onChange={(v) => set({ sound: v })} options={[["keys", "Keys"], ["pad", "Pad"], ["pluck", "Pluck"]]} />
        <Seg label="Rhythm" value={st.rhythm} onChange={(v) => set({ rhythm: v })} options={[["held", "Held"], ["eighths", "Pulsing 8ths"], ["stabs", "Offbeat stabs"]]} />
        <div className="flex items-center gap-2"><Switch id="pb-7" checked={st.sevenths} onCheckedChange={(v) => set({ sevenths: v })} /><Label htmlFor="pb-7">7th chords</Label></div>
        <div className="flex items-center gap-2"><Switch id="pb-vl" checked={st.lead} onCheckedChange={(v) => set({ lead: v })} /><Label htmlFor="pb-vl">Smooth voice leading</Label></div>
      </div>
      <Caption>Changes apply on the next bar while it plays. Smooth voice leading picks inversions so each chord moves as little as possible from the last, the way a keyboard player would.</Caption>

      {curD !== null && (
        <div className="space-y-2">
          <h3 className="font-semibold">{bar >= 0 ? "Now playing" : "First chord"}: {chordName(T, curD, st.sevenths).name}</h3>
          <Piano scale={T.pcs} names={T.names} root={T.pc} chord={tones(T, curD, st.sevenths)} label={`Piano showing ${chordName(T, curD, st.sevenths).name}`} />
          <Caption>Voiced as {voiced[current].map((n) => ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][n % 12] + (Math.floor(n / 12) - 2)).join(" ")}, with the bass on {T.names[T.chords[curD].d]}.</Caption>
        </div>
      )}

      <div className="space-y-3 border-t pt-6">
        <h2 className={SECTION_TITLE}>Play it on your instruments in Live</h2>
        <MidiOutPicker idPrefix="pb" channels={<>Bass goes out on channel 2, chords on 3 and drums on 10. Make a MIDI track for each and set its input channel to match.</>} />
      </div>
    </div>
  )
}
