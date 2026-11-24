import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { Check, Download, RotateCcw, Save, Shuffle, Trash2 } from "lucide-react"
import { Toolbar } from "@/components/toolbar"
import { Field } from "@/components/field"
import { Link, useSearchParams } from "react-router"
import { drum } from "@/audio/engine"
import { fxChain, voice } from "@/audio/patch"
import { bindTempo, setPos, toggle, usePlayingId, usePos } from "@/audio/playback"
import { KeyPicker, useKey } from "@/components/key-picker"
import { MidiOutPicker } from "@/components/midi-out-picker"
import { Block, Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { genreInfo, GENRE_INFO } from "@/data/genres"
import { SCALES } from "@/data/labs"
import { FAMILIES } from "@/data/patterns"
import {
  audible, buildLoop, defaultLoop, drumOptions, LOOP_STEPS, PART_CHANNEL, PART_NAME, patternById, resolveSound, shuffleLoop,
  soundById, soundOptions, SYNTH_PARTS, type SynthPart,
} from "@/lib/loop"
import { downloadFile, TICKS_PER_16TH, writeMidi, type MidiNote } from "@/lib/midi-file"
import { fmtDay, todayISO, uid, update, usePref, useProgress, type LoopPart, type LoopState } from "@/lib/store"
import { theory } from "@/lib/theory"
import { cn } from "@/lib/utils"
import { browserSound, sendNote } from "@/midi/midi-out"

const famName = (f: string) => FAMILIES.find(([x]) => x === f)?.[1] ?? f
const PARTS: LoopPart[] = ["drums", ...SYNTH_PARTS]

function normalizeLoop(l: LoopState | null, fallback: string): LoopState {
  if (!l || !genreInfo(l.family)) return defaultLoop(fallback)
  const d = defaultLoop(l.family)
  return { ...d, ...l, sounds: { ...d.sounds, ...l.sounds }, mix: { ...d.mix, ...l.mix }, prog: l.prog?.length === 4 ? l.prog : d.prog }
}

/** What the playing loop reads on each tick. It lives outside the component so the loop keeps up after you leave the page and come back. */
const live: { current: { loop: LoopState; events: ReturnType<typeof buildLoop> } | null } = { current: null }

export function LoopBuilder() {
  const { root, scale, setRoot, setScale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const T = theory(root, scale)
  const [stored, setStored] = usePref<LoopState | null>("loop-builder", null)
  const loop = normalizeLoop(stored, "wave")
  const setLoop = (patch: Partial<LoopState>) => setStored({ ...loop, ...patch })
  const [params, setParams] = useSearchParams()
  const progress = useProgress()
  const step = usePos("loop")
  const playing = usePlayingId() === "loop"
  const info = genreInfo(loop.family)!

  // ?genre=wave from the genre pages starts that genre's loop.
  const asked = params.get("genre")
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!asked || handled.current === asked) return
    handled.current = asked
    const g = genreInfo(asked)
    if (g) {
      setStored(defaultLoop(asked))
      setScale(g.scale)
    }
    setParams((p) => { p.delete("genre"); return p }, { replace: true })
  }, [asked, setStored, setParams, setScale])

  const events = buildLoop(loop, root, iv)
  live.current ??= { loop, events }
  useEffect(() => {
    live.current = { loop, events }
  })

  const play = () => {
    const queue: { step: number; at: number }[] = []
    let timer = 0
    toggle("loop", 3600, (c, bus, t0) => {
      const gains = Object.fromEntries(PARTS.map((p) => {
        const g = c.createGain()
        g.connect(bus)
        return [p, g]
      })) as Record<LoopPart, GainNode>
      const chains = Object.fromEntries(SYNTH_PARTS.map((p) => [p, fxChain(c, gains[p])])) as Record<SynthPart, ReturnType<typeof fxChain>>
      const prev: Partial<Record<SynthPart, number>> = {}
      let next = t0, k = 0
      const tick = () => {
        const { loop: l, events: ev } = live.current!
        const sixteenth = 60 / l.tempo / 4
        const local = browserSound()
        const sounds = Object.fromEntries(SYNTH_PARTS.map((p) => {
          const s = soundById(l.sounds[p])
          return [p, s ? { s, ...resolveSound(s) } : null]
        })) as Record<SynthPart, (ReturnType<typeof resolveSound> & { s: NonNullable<ReturnType<typeof soundById>> }) | null>
        for (const p of PARTS) gains[p].gain.setTargetAtTime(audible(l, p) ? l.mix[p].vol : 0, c.currentTime, 0.02)
        for (const p of SYNTH_PARTS) if (sounds[p]) chains[p].set(sounds[p]!.fx, l.tempo)
        while (next < horizon(c)) {
          const i = k % LOOP_STEPS, at = next + (i % 2 ? l.swing * sixteenth : 0)
          for (const h of ev.hits) {
            if (h.step !== i || !audible(l, "drums")) continue
            if (local) drum(c, gains.drums, at, h.lane, h.vel * 0.6)
            sendNote(c, at, h.note, h.vel * 110, sixteenth * 0.5, PART_CHANNEL.drums)
          }
          for (const p of SYNTH_PARTS) {
            const snd = sounds[p]
            if (snd?.fx.duck && i % 4 === 0) {
              chains[p].duck.gain.setValueAtTime(1 - snd.fx.duck, at + 0.005)
              chains[p].duck.gain.setTargetAtTime(1, at + 0.01, 0.07)
            }
          }
          for (const n of ev.notes) {
            if (Math.floor(n.step) !== i) continue
            const snd = sounds[n.part]
            if (!snd || !audible(l, n.part)) continue
            const when = at + (n.step - i) * sixteenth, dur = n.len * sixteenth
            if (local) voice(c, chains[n.part].input, when, n.midi, dur, snd.patch, l.tempo, n.mono ? prev[n.part] : undefined)
            if (n.mono) prev[n.part] = n.midi
            sendNote(c, when, n.midi, 100, dur * 0.95, PART_CHANNEL[n.part])
          }
          queue.push({ step: i, at: at - t0 })
          next += sixteenth
          k++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.step
      setPos(cur)
    }, () => stopClock(timer))
    bindTempo("loop", {
      get: () => live.current!.loop.tempo, min: 60, max: 180,
      set: (v) => { const l = { ...live.current!.loop, tempo: v }; live.current = { ...live.current!, loop: l }; setStored(l) },
    })
  }

  const exportMidi = () => {
    const tickOf = (s: number) => Math.round(s * TICKS_PER_16TH + (Math.floor(s) % 2 ? loop.swing * TICKS_PER_16TH : 0))
    const tracks = PARTS.flatMap((p) => {
      let notes: MidiNote[]
      if (p === "drums") notes = events.hits.map((h) => ({ tick: tickOf(h.step), note: h.note, velocity: Math.round(h.vel * 110), duration: TICKS_PER_16TH / 2, channel: 9 }))
      else notes = events.notes.filter((n) => n.part === p).map((n) => ({ tick: tickOf(n.step), note: n.midi, velocity: 100, duration: Math.max(1, Math.round(n.len * TICKS_PER_16TH) - 2) }))
      if (!notes.length) return []
      const name = p === "drums" ? patternById(loop.drums)?.name ?? "Drums" : soundById(loop.sounds[p])?.name ?? PART_NAME[p]
      return [{ name, notes, length: LOOP_STEPS * TICKS_PER_16TH }]
    })
    downloadFile(writeMidi(tracks, loop.tempo), `music-lab-${loop.family}-loop-${loop.tempo}bpm.mid`)
  }

  const [saved, setSaved] = useState(false)
  const save = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
    saveLoop()
  }
  const saveLoop = () => update((d) => {
    d.loops ??= []
    d.loops.unshift({ id: uid(), name: `${famName(loop.family)} in ${T.names[0]} ${T.sc.name.toLowerCase()}`, date: todayISO(), root, scale, loop })
  })
  const load = (id: string) => {
    const s = progress.loops?.find((x) => x.id === id)
    if (!s) return
    setRoot(s.root)
    setScale(s.scale)
    setStored(normalizeLoop(s.loop, s.loop.family))
  }

  // ?loop=<id> from a day plan opens one of your saved loops.
  const askedLoop = params.get("loop")
  const loadedLoop = useRef<string | null>(null)
  useEffect(() => {
    if (!askedLoop || loadedLoop.current === askedLoop || !progress.loops?.length) return
    loadedLoop.current = askedLoop
    load(askedLoop)
    setParams((sp) => { sp.delete("loop"); return sp }, { replace: true })
  })

  const mixRow = (p: LoopPart) => {
    const m = loop.mix[p]
    const setMix = (patch: Partial<typeof m>) => setLoop({ mix: { ...loop.mix, [p]: { ...m, ...patch } } })
    return (
      <div className="flex items-center gap-2">
        <Slider aria-label={`${PART_NAME[p]} volume`} className="w-24" min={0} max={1} step={0.01} value={[m.vol]} onValueChange={([v]) => setMix({ vol: v })} />
        <Toggle variant="outline" size="sm" pressed={m.mute} onPressedChange={(v) => setMix({ mute: v })} aria-label={`Mute ${PART_NAME[p]}`}>Mute</Toggle>
        <Toggle variant="outline" size="sm" pressed={loop.solo === p} onPressedChange={(v) => setLoop({ solo: v ? p : null })} aria-label={`Solo ${PART_NAME[p]}`}>Solo</Toggle>
      </div>
    )
  }

  const strip = (p: LoopPart) => {
    const on = new Set<number>()
    if (p === "drums") events.hits.forEach((h) => on.add(h.step))
    else events.notes.filter((n) => n.part === p).forEach((n) => { for (let j = 0; j < Math.max(1, Math.round(n.len)); j++) on.add(Math.floor(n.step) + j) })
    return (
      <div aria-hidden="true" className={cn("grid grid-cols-4 gap-1.5", !audible(loop, p) && "opacity-40")}>
        {[0, 1, 2, 3].map((bar) => (
          <div key={bar} className="grid grid-cols-16 gap-px">
            {Array.from({ length: 16 }, (_, j) => {
              const i = bar * 16 + j
              return <span key={j} data-ph={step === i || undefined} data-on={on.has(i) || undefined} className={cn("h-3 rounded-none", on.has(i) ? "bg-foreground/60" : j % 4 === 0 ? "bg-border" : "bg-pad-empty")} />
            })}
          </div>
        ))}
      </div>
    )
  }

  const soundSelect = (p: SynthPart) => (
    <Select value={loop.sounds[p] || "none"} onValueChange={(v) => setLoop({ sounds: { ...loop.sounds, [p]: v === "none" ? "" : v }, ...(p === "lead" ? { follow: soundById(v)?.role === "Pluck" } : {}) })}>
      <SelectTrigger id={`lb-${p}`} size="sm" className="w-full min-w-0"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No {PART_NAME[p].toLowerCase()}</SelectItem>
        {soundOptions(loop.family, p).map((g) => (
          <SelectGroup key={g.fam}>
            <SelectLabel>{famName(g.fam)}</SelectLabel>
            {g.sounds.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="space-y-8">
      <Toolbar
        transport={<PlayButton id="loop" label="Play loop" primary onPlay={play} />}
        actions={<>
          <Button variant="outline" size="sm" onClick={save}>{saved ? <Check /> : <Save />}{saved ? "Saved" : "Save loop"}</Button>
          <Button variant="outline" size="sm" onClick={exportMidi}><Download />Export .mid</Button>
        </>}
      >
        <Field label="Genre" htmlFor="lb-genre">
          <Select value={loop.family} onValueChange={(f) => { setStored(defaultLoop(f)); setScale(genreInfo(f)!.scale) }}>
            <SelectTrigger id="lb-genre" size="sm" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{GENRE_INFO.map((g) => <SelectItem key={g.id} value={g.id}>{famName(g.id)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <KeyPicker idPrefix="lb" />
        <Field label="Tempo" htmlFor="lb-tempo" value={<>{loop.tempo} BPM</>} className="w-36">
          <Slider id="lb-tempo" aria-label="Tempo" min={60} max={180} step={1} value={[loop.tempo]} onValueChange={([v]) => setLoop({ tempo: v })} />
        </Field>
        <Field label="Swing" htmlFor="lb-swing" value={<>{Math.round(loop.swing * 100)}%</>} className="w-28">
          <Slider id="lb-swing" aria-label="Swing" min={0} max={0.6} step={0.01} value={[loop.swing]} onValueChange={([v]) => setLoop({ swing: v })} />
        </Field>
      </Toolbar>
      <Caption>
        {info.blurb} Typical tempo {info.tempo[0]}–{info.tempo[1]} BPM. <Link className="underline" to={`/genres/${loop.family}`}>More about {famName(loop.family).toLowerCase()}</Link>
      </Caption>

      <Block title="Chords" description="One chord per bar. Bass and chords move with it, and so does the lead when it follows the chords.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {loop.prog.map((d, bar) => (
            <div key={bar} className="grid gap-1.5">
              <Label htmlFor={`lb-bar-${bar}`} className="text-muted-foreground font-normal">Bar {bar + 1}</Label>
              <Select value={String(d)} onValueChange={(v) => setLoop({ prog: loop.prog.map((x, j) => (j === bar ? +v : x)) })}>
                <SelectTrigger id={`lb-bar-${bar}`} size="sm" className={cn("w-full", playing && Math.floor(step / 16) === bar && "ring-2 ring-foreground")}><SelectValue /></SelectTrigger>
                <SelectContent>{T.chords.map((ch) => <SelectItem key={ch.d} value={String(ch.d)}>{ch.roman} · {ch.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Try</span>
          {[info.prog, ...T.progs].filter((p, i, a) => a.findIndex((q) => q.join() === p.join()) === i).map((p) => (
            <Button key={p.join()} variant="outline" size="sm" className="aria-pressed:border-foreground aria-pressed:bg-accent" aria-pressed={p.join() === loop.prog.join()} onClick={() => setLoop({ prog: p })}>{p.map((x) => T.chords[x].roman).join("–")}</Button>
          ))}
        </div>
      </Block>

      <Block title="Parts" actions={<div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => setStored(shuffleLoop(loop))}><Shuffle />Shuffle sounds</Button><Button variant="ghost" size="sm" onClick={() => setStored(defaultLoop(loop.family))}><RotateCcw />Reset</Button></div>}>
        <div className="divide-y rounded-xl border bg-card">
          {PARTS.map((p) => (
            <div key={p} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] lg:items-center">
              <div className="grid gap-1.5">
                <Label htmlFor={`lb-${p}`}>{PART_NAME[p]}</Label>
                {p === "drums" ? (
                  <Select value={loop.drums || "none"} onValueChange={(v) => { const pat = patternById(v); setLoop({ drums: v === "none" ? "" : v, ...(pat ? { swing: pat.swing ?? 0 } : {}) }) }}>
                    <SelectTrigger id="lb-drums" size="sm" className="w-full min-w-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No drums</SelectItem>
                      {drumOptions(loop.family).map((g) => (
                        <SelectGroup key={g.fam}>
                          <SelectLabel>{famName(g.fam)}</SelectLabel>
                          {g.patterns.map((pt) => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                ) : soundSelect(p)}
                {p === "lead" && loop.sounds.lead && loop.melody?.length ? (
                  <p className="text-muted-foreground pt-1 text-sm">
                    Playing <Link className="underline" to="/labs/melody">your melody</Link>.{" "}
                    <button type="button" className="underline" onClick={() => setLoop({ melody: null })}>Use the sound’s phrase</button>
                  </p>
                ) : p === "lead" && loop.sounds.lead && (
                  <div className="flex items-center gap-2 pt-1">
                    <Switch id="lb-follow" checked={loop.follow} onCheckedChange={(v) => setLoop({ follow: v })} />
                    <Label htmlFor="lb-follow" className="font-normal">Follow the chords</Label>
                  </div>
                )}
              </div>
              {strip(p)}
              {mixRow(p)}
            </div>
          ))}
        </div>
        <Caption>
          Sounds come from <Link className="underline" to="/labs/sound-design">the genre sound recipes</Link>, where you can tweak them and see how to build each one in Live. When this genre has no sound for a part, the list offers ones from similar genres.
        </Caption>
      </Block>

      <Block title="Play it on your instruments in Live" description="Send the loop as MIDI and swap the browser sounds for your own.">
        <MidiOutPicker idPrefix="lb" channels={<>Each part has its own channel: bass on 2, chords on 3, lead on 4 and drums on 10. Make one MIDI track per part and set its input channel to match.</>} />
      </Block>

      {!!progress.loops?.length && (
        <Block title="Saved loops">
          <ul className="divide-y rounded-xl border bg-card">
            {progress.loops.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-sm">{s.loop.tempo} BPM · {s.loop.prog.map((x) => theory(s.root, s.scale).chords[x].roman).join("–")} · {fmtDay.format(new Date(s.date + "T00:00:00"))}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => load(s.id)}>Load</Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${s.name}`} onClick={() => update((d) => { d.loops = d.loops.filter((x) => x.id !== s.id) })}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  )
}
