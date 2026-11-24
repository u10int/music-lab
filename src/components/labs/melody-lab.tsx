import { useEffect, useRef } from "react"
import { Download, Eraser, Repeat, Sparkles } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { audio, drum, masterBus, tone, type ToneOptions } from "@/audio/engine"
import { fxChain, voice } from "@/audio/patch"
import { QwertyPiano } from "@/components/qwerty-piano"
import { bindTempo, setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { MidiOutPicker } from "@/components/midi-out-picker"
import { Toolbar } from "@/components/toolbar"
import { Field } from "@/components/field"
import { Block, Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { SCALES } from "@/data/labs"
import { FAMILIES } from "@/data/patterns"
import { defaultLoop, degreeMidi, resolveSound, soundById } from "@/lib/loop"
import { downloadFile, TICKS_PER_16TH, writeMidi } from "@/lib/midi-file"
import { usePref, type LoopState } from "@/lib/store"
import { theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { browserSound, sendNote } from "@/midi/midi-out"

interface MelNote { step: number; len: number; deg: number }
interface MelState { notes: MelNote[]; prog: number[]; tempo: number; sound: string; style: Style; drums: boolean; chords: boolean; len: number }
type Style = "hook" | "anthem" | "plucky" | "call" | "long"

const STEPS = 64
const TOP = 11, BOTTOM = -3
const ROWS = Array.from({ length: TOP - BOTTOM + 1 }, (_, i) => TOP - i)
const LEADS = GENRE_SOUNDS.filter((s) => s.role === "Lead" || s.role === "Pluck")
const famName = (f: string) => FAMILIES.find(([x]) => x === f)?.[1] ?? f
const STYLES: [Style, string, string][] = [
  ["hook", "Sparse hook", "A few long notes with space between: wave, future bass, ODESZA."],
  ["anthem", "Anthem", "Busy rhythm that climbs to a peak: trance and progressive house."],
  ["plucky", "Plucky 8ths", "Steady 8th notes with rests: house plucks, arps and phonk riffs."],
  ["call", "Call and response", "A question in bars 1 and 3, an answer in bars 2 and 4."],
  ["long", "Long tones", "Whole and half notes that move slowly: pads, ambient, breakdowns."],
]
/** Rhythm per bar as [start, length] in 16ths; bar index chooses a variation. */
const RHYTHMS: Record<Style, (bar: number) => [number, number][]> = {
  hook: (b) => (b % 2 ? [[0, 6], [8, 2], [10, 6]] : [[0, 3], [4, 2], [6, 2], [10, 6]]),
  anthem: (b) => (b === 3 ? [[0, 2], [2, 2], [4, 2], [6, 2], [8, 8]] : [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]]),
  plucky: (b) => (b % 2 ? [[0, 2], [2, 2], [6, 2], [8, 2], [12, 2], [14, 2]] : [[0, 2], [4, 2], [6, 2], [8, 2], [10, 2], [14, 2]]),
  call: (b) => (b % 2 ? [[2, 2], [4, 2], [6, 2], [8, 6]] : [[0, 2], [2, 1], [3, 3], [6, 4]]),
  long: (b) => (b % 2 ? [[0, 16]] : [[0, 8], [8, 8]]),
}

const chordTones = (d: number) => [d, d + 2, d + 4].map((x) => ((x % 7) + 7) % 7)
const isChordTone = (deg: number, chord: number) => chordTones(chord).includes(((deg % 7) + 7) % 7)

/** Write a melody: chord tones on strong beats, steps between, ending at home. */
function suggest(prog: number[], style: Style): MelNote[] {
  const out: MelNote[] = []
  let prev = 4 + Math.floor(Math.random() * 3)
  const near = (target: number[], from: number) => {
    const cands = target.flatMap((t) => [t - 7, t, t + 7]).filter((x) => x >= -2 && x <= 9)
    cands.sort((a, b) => Math.abs(a - from) - Math.abs(b - from) || Math.random() - 0.5)
    return cands[Math.random() < 0.75 ? 0 : Math.min(1, cands.length - 1)]
  }
  const rhythm = prog.map((_, b) => RHYTHMS[style](b))
  rhythm.forEach((bar, b) => {
    const chord = prog[b]
    bar.forEach(([start, len], k) => {
      const strong = start % 4 === 0
      const last = b === 3 && k === bar.length - 1
      let deg: number
      if (last) deg = near([chord, ((chord + 2) % 7)], prev)
      else if (strong || style === "long") deg = near(chordTones(chord), prev)
      else {
        // A passing step toward the next strong note.
        const dir = Math.random() < 0.5 ? -1 : 1
        deg = Math.max(-2, Math.min(9, prev + dir))
      }
      // Call and response: bar 3 echoes bar 1 a step higher.
      if (style === "call" && b === 2) {
        const echo = out.filter((n) => n.step >= 0 && n.step < 16)[k]
        if (echo) deg = Math.min(9, echo.deg + 1)
      }
      out.push({ step: b * 16 + start, len, deg })
      prev = deg
    })
  })
  return out
}

function analyse(notes: MelNote[], prog: number[]) {
  if (!notes.length) return []
  const sorted = [...notes].sort((a, b) => a.step - b.step)
  const strong = sorted.filter((n) => n.step % 4 === 0)
  const onChord = strong.filter((n) => isChordTone(n.deg, prog[Math.floor(n.step / 16)])).length
  const leaps = sorted.slice(1).filter((n, i) => Math.abs(n.deg - sorted[i].deg) > 3).length
  const lo = Math.min(...sorted.map((n) => n.deg)), hi = Math.max(...sorted.map((n) => n.deg))
  const last = sorted[sorted.length - 1]
  const endsHome = isChordTone(last.deg, prog[Math.floor(last.step / 16)])
  const out: { ok: boolean; text: string }[] = []
  out.push(strong.length
    ? { ok: onChord / strong.length >= 0.6, text: `${onChord} of ${strong.length} notes on strong beats are chord tones. ${onChord / strong.length >= 0.6 ? "That anchors the melody to the chords." : "Put more chord tones on beats so it sounds like it belongs."}` }
    : { ok: false, text: "No notes land on a beat. Syncopation is good, but one or two notes on beats anchor the melody." })
  out.push({ ok: leaps <= 3, text: leaps ? `${leaps} big ${leaps === 1 ? "leap" : "leaps"} (more than a 4th). ${leaps > 3 ? "Mostly steps with the odd leap is easier to sing." : "A few leaps give it shape."}` : "All steps and small skips. Try one leap at the peak for drama." })
  out.push({ ok: hi - lo <= 9, text: `Range of ${hi - lo + 1} scale notes. ${hi - lo > 9 ? "That's wide for a hook; keep it within about an octave." : hi - lo < 3 ? "Very narrow; let it climb toward a high point." : "A comfortable range."}` })
  out.push({ ok: endsHome, text: endsHome ? "It ends on a chord tone, so the loop resolves." : "The last note isn't in the last chord, so it sounds unfinished. That's fine if you want it to pull into the next loop." })
  return out
}

const PAD: ToneOptions = { wave: "sawtooth", env: { a: 0.08, d: 0.4, s: 0.7, r: 0.4 }, cutoff: 1800, detune: 10, level: 0.06 }
const BASS: ToneOptions = { wave: "sine", env: { a: 0.01, d: 0.3, s: 0.8, r: 0.15 }, cutoff: 3000, level: 0.24 }
const DEFAULT: MelState = { notes: [], prog: [0, 5, 2, 6], tempo: 124, sound: LEADS.find((s) => s.role === "Pluck")?.id ?? LEADS[0].id, style: "hook", drums: true, chords: true, len: 2 }

type Note = MelState["notes"][number]
/** Make room for a note at `at` of length `len`: trim or drop anything it overlaps. */
const place = (notes: Note[], at: number, len: number, deg: number) => [...notes.flatMap((n) => {
  if (n.step + n.len <= at || n.step >= at + len) return [n]
  if (n.step < at) return [{ ...n, len: at - n.step }]
  return []
}), { step: at, len, deg }].sort((a, b) => a.step - b.step)
const live: { current: { st: MelState; snd: (typeof LEADS)[number]; root: number; iv: number[] } | null } = { current: null }

export function MelodyLab() {
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const T = theory(root, scale)
  const [stored, setStored] = usePref<MelState>("melody", DEFAULT)
  const st = { ...DEFAULT, ...stored }
  const set = (patch: Partial<MelState>) => setStored({ ...st, ...patch })
  const [loopPref, setLoopPref] = usePref<LoopState | null>("loop-builder", null)
  const navigate = useNavigate()
  const step = usePos("melody")
  const playing = usePlayingId() === "melody"
  const snd = soundById(st.sound) ?? LEADS[0]
  const midiOf = (deg: number) => degreeMidi(root, iv, snd.oct, deg)
  live.current ??= { st, snd, root, iv }
  useEffect(() => {
    live.current = { st, snd, root, iv }
  })

  const toggleAt = (stepAt: number, deg: number) => {
    const hit = st.notes.find((n) => n.deg === deg && stepAt >= n.step && stepAt < n.step + n.len)
    if (hit) return set({ notes: st.notes.filter((n) => n !== hit) })
    set({ notes: place(st.notes, stepAt, Math.min(st.len, STEPS - stepAt), deg) })
    audition(deg)
  }
  const audition = (deg: number) => {
    if (playing) return
    toggle("melody-note", 0.6, (ac, bus, t) => {
      const { patch, fx } = resolveSound(snd)
      const ch = fxChain(ac, bus)
      ch.set({ ...fx, delay: undefined }, st.tempo)
      voice(ac, ch.input, t, midiOf(deg), 0.25, patch, st.tempo)
    })
  }

  const play = () => {
    const queue: { s: number; at: number }[] = []
    let timer = 0
    toggle("melody", 3600, (c, bus, t0) => {
      const chain = fxChain(c, bus)
      let next = t0, k = 0, prev: number | undefined
      const tick = () => {
        const { st: s, snd: sd, root: r, iv: v } = live.current!
        const sixteenth = 60 / s.tempo / 4, local = browserSound()
        const { patch, fx } = resolveSound(sd)
        chain.set(fx, s.tempo)
        while (next < horizon(c)) {
          const i = k % STEPS, bar = Math.floor(i / 16), chord = s.prog[bar]
          if (s.drums && local) {
            if (i % 4 === 0) drum(c, bus, next, "kick", 0.7)
            if (i % 4 === 2) drum(c, bus, next, "hat", 0.25)
            if (i % 8 === 4) drum(c, bus, next, "clap", 0.45)
          }
          if (s.drums) {
            if (i % 4 === 0) sendNote(c, next, 36, 100, sixteenth, 9)
            if (i % 4 === 2) sendNote(c, next, 42, 60, sixteenth, 9)
          }
          if (i % 16 === 0 && s.chords) {
            const tones = chordTones(chord).map((d) => degreeMidi(r, v, 1, chord + ((d - (chord % 7) + 7) % 7)))
            tones.forEach((m) => { if (local) tone(c, bus, next, m, sixteenth * 15, PAD); sendNote(c, next, m, 80, sixteenth * 15, 2) })
            const b = degreeMidi(r, v, -1, chord)
            if (local) tone(c, bus, next, b, sixteenth * 15, BASS)
            sendNote(c, next, b, 100, sixteenth * 15, 1)
          }
          for (const n of s.notes) {
            if (n.step !== i) continue
            const m = degreeMidi(r, v, sd.oct, n.deg)
            if (local) voice(c, chain.input, next, m, n.len * sixteenth, patch, s.tempo, sd.mono ? prev : undefined)
            sendNote(c, next, m, 100, n.len * sixteenth * 0.95, 3)
            prev = m
          }
          queue.push({ s: i, at: next - t0 })
          next += sixteenth
          k++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.s
      setPos(cur)
    }, () => stopClock(timer))
    bindTempo("melody", {
      get: () => live.current!.st.tempo, min: 60, max: 180,
      set: (v) => { const n = { ...live.current!.st, tempo: v }; live.current = { ...live.current!, st: n }; setStored(n) },
    })
  }

  // Drawing on the grid: press on an empty cell and drag right to set the note's length;
  // press on a note and drag to erase everything you pass over.
  const drag = useRef<{ mode: "draw" | "erase"; base: Note[]; at: number; deg: number; notes: Note[] } | null>(null)
  const cellAt = (x: number, y: number) => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-bar]")
    if (!el) return null
    const r = el.getBoundingClientRect(), bar = +el.dataset.bar!
    const s = Math.max(0, Math.min(15, Math.floor(((x - r.left) / r.width) * 16)))
    const row = Math.max(0, Math.min(ROWS.length - 1, Math.floor(((y - r.top) / r.height) * ROWS.length)))
    return { at: bar * 16 + s, deg: ROWS[row] }
  }
  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const c = cellAt(e.clientX, e.clientY)
    if (!c) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const hit = st.notes.find((n) => n.deg === c.deg && c.at >= n.step && c.at < n.step + n.len)
    if (hit) {
      const notes = st.notes.filter((n) => n !== hit)
      drag.current = { mode: "erase", base: st.notes, at: c.at, deg: c.deg, notes }
      set({ notes })
    } else {
      const notes = place(st.notes, c.at, Math.min(st.len, STEPS - c.at), c.deg)
      drag.current = { mode: "draw", base: st.notes, at: c.at, deg: c.deg, notes }
      set({ notes })
      audition(c.deg)
    }
  }
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const c = cellAt(e.clientX, e.clientY)
    if (!c) return
    let notes = d.notes
    if (d.mode === "erase") notes = d.notes.filter((n) => !(n.deg === c.deg && c.at >= n.step && c.at < n.step + n.len))
    else if (c.at > d.at) notes = place(d.base, d.at, Math.min(c.at - d.at + 1, STEPS - d.at), d.deg)
    if (notes === d.notes || JSON.stringify(notes) === JSON.stringify(d.notes)) return
    d.notes = notes
    set({ notes })
  }
  const onUp = () => { drag.current = null }

  const exportMidi = () => {
    const mel = st.notes.map((n) => ({ tick: n.step * TICKS_PER_16TH, note: midiOf(n.deg), velocity: 100, duration: n.len * TICKS_PER_16TH - 2 }))
    const ch = st.prog.flatMap((d, b) => chordTones(d).map((x) => ({ tick: b * 16 * TICKS_PER_16TH, note: degreeMidi(root, iv, 1, d + ((x - (d % 7) + 7) % 7)), velocity: 80, duration: 16 * TICKS_PER_16TH - 4 })))
    downloadFile(writeMidi([{ name: "Melody", notes: mel, length: STEPS * TICKS_PER_16TH }, { name: "Chords", notes: ch, length: STEPS * TICKS_PER_16TH }], st.tempo), `music-lab-melody-${st.tempo}bpm.mid`)
  }
  const toLoop = () => {
    const base = loopPref && loopPref.family ? loopPref : defaultLoop(snd.family)
    setLoopPref({ ...base, sounds: { ...base.sounds, lead: snd.id }, prog: st.prog, melody: st.notes, tempo: st.tempo })
    navigate("/labs/loop-builder")
  }

  const tips = analyse(st.notes, st.prog)
  const sorted = [...st.notes].sort((a, b) => a.step - b.step)

  return (
    <div className="space-y-8">
      <Toolbar
        transport={<PlayButton id="melody" label="Play" primary onPlay={play} />}
        actions={<>
          <Button variant="outline" size="sm" disabled={!st.notes.length} onClick={toLoop}><Repeat />Use in loop builder</Button>
          <Button variant="outline" size="sm" disabled={!st.notes.length} onClick={exportMidi}><Download />Export .mid</Button>
        </>}
      >
        <KeyPicker idPrefix="ml" />
        <Field label="Sound" htmlFor="ml-sound">
          <Select value={snd.id} onValueChange={(v) => set({ sound: v })}>
            <SelectTrigger id="ml-sound" size="sm" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set(LEADS.map((s) => s.family))].map((f) => (
                <SelectGroup key={f}>
                  <SelectLabel>{famName(f)}</SelectLabel>
                  {LEADS.filter((s) => s.family === f).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tempo" htmlFor="ml-tempo" value={<>{st.tempo} BPM</>} className="w-40">
          <Slider id="ml-tempo" aria-label="Tempo" min={60} max={180} step={1} value={[st.tempo]} onValueChange={([v]) => set({ tempo: v })} />
        </Field>
      </Toolbar>

      <Block title="Chords" description="The melody is written over these. Rows that are notes of the bar’s chord are shaded on the grid.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {st.prog.map((d, bar) => (
            <div key={bar} className="grid gap-1.5">
              <Label htmlFor={`ml-bar-${bar}`} className="text-muted-foreground font-normal">Bar {bar + 1}</Label>
              <Select value={String(d)} onValueChange={(v) => set({ prog: st.prog.map((x, j) => (j === bar ? +v : x)) })}>
                <SelectTrigger id={`ml-bar-${bar}`} size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{T.chords.map((ch) => <SelectItem key={ch.d} value={String(ch.d)}>{ch.roman} · {ch.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Write">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => set({ notes: suggest(st.prog, st.style) })}><Sparkles />Suggest a melody</Button>
          <Select value={st.style} onValueChange={(v) => set({ style: v as Style })}>
            <SelectTrigger size="sm" className="w-44" aria-label="Melody style"><SelectValue /></SelectTrigger>
            <SelectContent>{STYLES.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="sm" disabled={!st.notes.length} onClick={() => set({ notes: [] })}><Eraser />Clear</Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">New notes</span>
            <Seg label="New note length" value={String(st.len)} onChange={(v) => set({ len: +v })} options={[["1", "1/16"], ["2", "1/8"], ["4", "1/4"], ["8", "1/2"]]} />
          </div>
          <div className="flex items-center gap-2"><Switch id="ml-chords" checked={st.chords} onCheckedChange={(v) => set({ chords: v })} /><Label htmlFor="ml-chords" className="font-normal">Chords and bass</Label></div>
          <div className="flex items-center gap-2"><Switch id="ml-drums" checked={st.drums} onCheckedChange={(v) => set({ drums: v })} /><Label htmlFor="ml-drums" className="font-normal">Drums</Label></div>
        </div>
        <Caption>{STYLES.find((x) => x[0] === st.style)![2]} Click to add a note and drag right to make it longer. Click a note to remove it, or drag across notes to erase several. Suggestions are a starting point: change a few notes until it’s yours.</Caption>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-[760px] gap-2">
            <div className="grid shrink-0 text-right text-[11px] leading-none" style={{ gridTemplateRows: `repeat(${ROWS.length}, 1.25rem)` }}>
              {ROWS.map((d) => {
                const pc = (((d % 7) + 7) % 7)
                return <span key={d} className={cn("flex items-center justify-end pr-1", pc === 0 ? "font-semibold" : "text-muted-foreground")}>{T.names[pc]}{d < 0 ? "↓" : d >= 7 ? "↑" : ""}</span>
              })}
            </div>
            <div className="relative grid flex-1 grid-cols-4 gap-1">
              {st.prog.map((chord, bar) => (
                <div key={bar} className="relative rounded-md border bg-card" style={{ height: `${ROWS.length * 1.25}rem` }}>
                  {ROWS.map((d, r) => (
                    <span key={d} aria-hidden="true" className={cn("absolute inset-x-0 h-5", isChordTone(d, chord) && "bg-[color-mix(in_oklab,var(--s5)_12%,transparent)]", (((d % 7) + 7) % 7) === 0 && "border-b border-border")} style={{ top: `${r * 1.25}rem` }} />
                  ))}
                  {[4, 8, 12].map((x) => <span key={x} aria-hidden="true" className="absolute inset-y-0 w-px bg-border" style={{ left: `${(x / 16) * 100}%` }} />)}
                  <button type="button" data-bar={bar} aria-label={`Bar ${bar + 1}: click to add or remove a note`} className="absolute inset-0 cursor-crosshair touch-none"
                    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                    onClick={(e) => {
                      if (e.detail !== 0) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const s = Math.min(15, Math.floor(((e.clientX - rect.left) / rect.width) * 16))
                      const r = Math.min(ROWS.length - 1, Math.floor(((e.clientY - rect.top) / rect.height) * ROWS.length))
                      toggleAt(bar * 16 + s, ROWS[r])
                    }} />
                  {sorted.filter((n) => Math.floor(n.step / 16) === bar).map((n) => (
                    <span key={n.step} aria-hidden="true"
                      className={cn("pointer-events-none absolute h-5 rounded-none border border-black/10", isChordTone(n.deg, chord) ? "bg-[var(--s5)]" : "bg-[var(--s2)]", playing && step >= n.step && step < n.step + n.len && "bg-[var(--s3)]")}
                      style={{ top: `${ROWS.indexOf(n.deg) * 1.25}rem`, left: `${((n.step % 16) / 16) * 100}%`, width: `calc(${(Math.min(n.len, 16 - (n.step % 16)) / 16) * 100}% - 2px)` }} />
                  ))}
                  {playing && Math.floor(step / 16) === bar && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${((step % 16) / 16) * 100}%` }} />}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex min-w-[760px] gap-2 pl-8">
            {st.prog.map((d, b) => <span key={b} className="text-muted-foreground flex-1 text-xs">{T.chords[d].roman} · {T.chords[d].name}</span>)}
          </div>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-hidden="true">
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-5 rounded-sm bg-[var(--s5)]" />Chord tone</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-5 rounded-sm bg-[var(--s2)]" />Passing note</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-3 w-5 rounded-sm bg-[color-mix(in_oklab,var(--s5)_25%,transparent)]" />Chord tone rows</span>
        </div>
        <div className="space-y-2 pt-2">
          <h3 className="font-semibold">Try notes before you place them</h3>
          <QwertyPiano scale={T.pcs} names={T.names} root={T.pc} base={12 * (snd.oct + 2)}
            chord={chordTones(st.prog[Math.max(0, Math.floor(step / 16))]).map((d) => (root + iv[((d % 7) + 7) % 7]) % 12)}
            label={`Piano in ${T.names[0]} ${T.sc.name.toLowerCase()}, playing the ${snd.name.toLowerCase()} sound`}
            play={(m) => {
              const c = audio()
              if (!c) return
              const { patch, fx } = resolveSound(snd), ch = fxChain(c, masterBus())
              ch.set({ ...fx, delay: undefined }, st.tempo)
              voice(c, ch.input, c.currentTime + 0.01, m, 0.35, patch, st.tempo)
            }} />
        </div>
        <p className="sr-only" aria-live="polite">{st.notes.length} notes: {sorted.map((n) => `bar ${Math.floor(n.step / 16) + 1} step ${(n.step % 16) + 1} ${T.names[((n.deg % 7) + 7) % 7]}`).join(", ")}</p>
      </Block>

      {tips.length > 0 && (
        <Block title="How it’s shaping up">
          <ul className="grid gap-2 sm:grid-cols-2">
            {tips.map((t) => (
              <li key={t.text} className="rounded-lg border bg-card p-3 text-sm text-pretty">
                <span className={cn("mr-1.5 font-semibold", t.ok ? "" : "text-muted-foreground")}>{t.ok ? "Good:" : "Try:"}</span>{t.text}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Take it further">
        <Caption>The loop builder plays your melody with its genre drums, bass and chords. On Push, play it in Note mode with the scale set to {T.names[0]} {T.sc.name.toLowerCase()}, or enter it in the melodic step sequencer. See <Link className="underline" to="/labs/theory?tab=chords">chords in a key</Link> for the shapes.</Caption>
        <MidiOutPicker idPrefix="ml" channels={<>The melody goes out on channel 4, chords on 3, bass on 2 and drums on 10, matching the loop builder.</>} />
      </Block>
    </div>
  )
}
