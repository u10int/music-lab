import { useEffect, useRef, useState } from "react"
import { FileAudio, Shuffle, Sparkles } from "lucide-react"
import { audio, drum, masterBus, type DrumKind } from "@/audio/engine"
import { toggle, usePlayingId } from "@/audio/playback"
import { Block, Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { browserSound, sendNote } from "@/midi/midi-out"
import { onNote } from "@/midi/midi"

/** Bottom row first, like Push and Drum Rack: pad 1 is bottom left. */
const KEYS = ["z", "x", "c", "v", "a", "s", "d", "f", "q", "w", "e", "r", "1", "2", "3", "4"]
const FIRST_NOTE = 36
type Mode = "transients" | "equal" | "beats"
interface Slot { pitch: number; reverse: boolean; gain: number }
interface Loaded { name: string; buf: AudioBuffer; rev: AudioBuffer; peaks: Float32Array }

// Keep the loaded file while moving around the app.
let kept: Loaded | null = null

function reversed(c: BaseAudioContext, b: AudioBuffer) {
  const r = c.createBuffer(b.numberOfChannels, b.length, b.sampleRate)
  for (let ch = 0; ch < b.numberOfChannels; ch++) {
    const src = b.getChannelData(ch), dst = r.getChannelData(ch)
    for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i]
  }
  return r
}
function peaksOf(b: AudioBuffer, cols = 600) {
  const d = b.getChannelData(0), per = Math.max(1, Math.floor(d.length / cols)), out = new Float32Array(cols)
  for (let i = 0; i < cols; i++) {
    let m = 0
    for (let j = i * per, e = Math.min(d.length, j + per); j < e; j++) m = Math.max(m, Math.abs(d[j]))
    out[i] = m
  }
  const top = Math.max(...out, 0.001)
  return out.map((v) => v / top)
}
function prepare(c: BaseAudioContext, name: string, buf: AudioBuffer): Loaded {
  return { name, buf, rev: reversed(c, buf), peaks: peaksOf(buf) }
}

/** Onset detection: frames whose energy jumps well above the recent average. Returns start times in seconds. */
function transients(b: AudioBuffer, sensitivity: number) {
  const d = b.getChannelData(0), sr = b.sampleRate, hop = Math.floor(sr * 0.005), win = hop * 2
  const env: number[] = []
  for (let i = 0; i + win < d.length; i += hop) {
    let e = 0
    for (let j = i; j < i + win; j++) e += d[j] * d[j]
    env.push(Math.sqrt(e / win))
  }
  const ratio = 2.6 - sensitivity * 1.9, gap = Math.round(0.07 / 0.005), floor = Math.max(...env) * 0.04
  const hits: { t: number; s: number }[] = []
  let last = -gap
  for (let k = 4; k < env.length; k++) {
    const avg = (env[k - 1] + env[k - 2] + env[k - 3] + env[k - 4]) / 4 + 1e-6
    const s = env[k] / avg
    if (env[k] > floor && s > ratio && k - last >= gap) {
      hits.push({ t: Math.max(0, (k - 1) * hop) / sr, s: s * env[k] })
      last = k
    }
  }
  if (!hits.length || hits[0].t > 0.03) hits.unshift({ t: 0, s: Infinity })
  return hits.sort((a, b) => b.s - a.s).slice(0, 16).map((h) => h.t).sort((a, b) => a - b)
}

function slicesFor(l: Loaded, mode: Mode, sensitivity: number, beats: number) {
  const dur = l.buf.duration
  const starts = mode === "transients" ? transients(l.buf, sensitivity)
    : mode === "beats" ? Array.from({ length: Math.min(16, Math.max(1, Math.round(beats))) }, (_, i) => (i * dur) / Math.min(16, Math.max(1, Math.round(beats))))
    : Array.from({ length: 16 }, (_, i) => (i * dur) / 16)
  return starts.map((s, i) => ({ start: s, end: starts[i + 1] ?? dur }))
}

/** A two-bar breakbeat rendered offline, so there's something to slice before loading a file. */
async function demoLoop(): Promise<AudioBuffer> {
  const bpm = 96, sixteenth = 60 / bpm / 4, len = 32 * sixteenth
  const c = new OfflineAudioContext(1, Math.ceil((len + 0.05) * 44100), 44100)
  const hits: [number, DrumKind, number][] = [
    [0, "kick", 1], [4, "snare", 0.9], [7, "snare", 0.35], [9, "snare", 0.4], [10, "kick", 0.9], [12, "snare", 0.9], [15, "snare", 0.3],
    [16, "kick", 1], [20, "snare", 0.9], [22, "kick", 0.7], [25, "snare", 0.4], [26, "kick", 0.9], [28, "snare", 0.9], [30, "rim", 0.6],
  ]
  for (let i = 0; i < 32; i += 2) drum(c, c.destination, i * sixteenth, i % 8 === 4 ? "ohat" : "hat", i % 4 ? 0.3 : 0.5)
  hits.forEach(([s, k, v]) => drum(c, c.destination, s * sixteenth, k, v))
  return c.startRendering()
}

export function Sampler() {
  const [loaded, setLoaded] = useState<Loaded | null>(kept)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<Mode>("transients")
  const [sens, setSens] = useState(0.6)
  const [tempo, setTempo] = useState(96)
  const [bars, setBars] = useState(2)
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: 16 }, () => ({ pitch: 0, reverse: false, gain: 1 })))
  const [sel, setSel] = useState(0)
  const [lit, setLit] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: 16 }, (_, i) => i))
  const [step, setStep] = useState(-1)
  const playing = usePlayingId() === "sampler"
  const fileRef = useRef<HTMLInputElement>(null)

  const beats = bars * 4
  const slices = loaded ? slicesFor(loaded, mode, sens, beats) : []
  const live = useRef({ loaded, slices, slots, order, tempo })
  useEffect(() => {
    live.current = { loaded, slices, slots, order, tempo }
  })

  const take = (l: Loaded) => {
    kept = l
    setLoaded(l)
    setError("")
    setSel(0)
  }
  const openFile = async (f: File) => {
    const c = audio()
    if (!c) return
    try {
      const buf = await c.decodeAudioData(await f.arrayBuffer())
      take(prepare(c, f.name, buf))
      // Guess the tempo: the length that fits 1, 2 or 4 bars between 80 and 175 BPM.
      for (const b of [2, 1, 4]) {
        const bpm = (b * 4 * 60) / buf.duration
        if (bpm >= 80 && bpm <= 175) { setBars(b); setTempo(Math.round(bpm)); break }
      }
    } catch {
      setError("Couldn't read that file. Try a WAV, AIFF, MP3 or M4A.")
    }
  }
  const loadDemo = async () => {
    const c = audio()
    if (!c) return
    take(prepare(c, "Demo breakbeat, 96 BPM", await demoLoop()))
    setTempo(96)
    setBars(2)
  }

  /** Play slice `i` at time `t` on context `c`; returns the length it plays for. */
  const fire = (c: AudioContext, out: AudioNode, t: number, i: number, maxLen?: number) => {
    const { loaded: l, slices: sl, slots: st } = live.current
    const s = sl[i], slot = st[i]
    if (!l || !s) return 0
    const src = c.createBufferSource(), g = c.createGain()
    const rate = Math.pow(2, slot.pitch / 12)
    src.buffer = slot.reverse ? l.rev : l.buf
    src.playbackRate.value = rate
    const len = Math.min((s.end - s.start) / rate, maxLen ?? Infinity)
    const offset = slot.reverse ? l.buf.duration - s.end : s.start
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(slot.gain, t + 0.003)
    g.gain.setValueAtTime(slot.gain, t + Math.max(0.004, len - 0.012))
    g.gain.linearRampToValueAtTime(0, t + len)
    src.connect(g)
    g.connect(out)
    src.start(t, offset)
    src.stop(t + len + 0.02)
    return len
  }
  const press = (i: number) => {
    const c = audio()
    setSel(i)
    if (!c || !live.current.loaded) return
    fire(c, masterBus(), c.currentTime + 0.005, i)
    setLit(i)
    window.setTimeout(() => setLit((x) => (x === i ? null : x)), 160)
  }
  const pressRef = useRef(press)
  useEffect(() => {
    pressRef.current = press
  })

  // Computer keys and MIDI notes from C1 (36) play the pads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0) { e.preventDefault(); pressRef.current(i) }
    }
    window.addEventListener("keydown", onKey)
    const off = onNote((n) => { if (n >= FIRST_NOTE && n < FIRST_NOTE + 16) pressRef.current(n - FIRST_NOTE) })
    return () => { window.removeEventListener("keydown", onKey); off() }
  }, [])

  const playSeq = () => {
    const queue: { step: number; at: number }[] = []
    let timer = 0
    toggle("sampler", 3600, (c, bus, t0) => {
      let loopStart = t0, j = 0
      const tick = () => {
        const { order: o, tempo: bpm, slices: sl, loaded: l } = live.current
        if (!l || !sl.length) return
        // Each slot keeps its place in the loop; shuffling changes which slice plays there.
        const L = (bars * 4 * 60) / bpm, scale = L / l.buf.duration
        const order = o.filter((x) => x < sl.length)
        const local = browserSound()
        for (;;) {
          if (j >= sl.length) { j = 0; loopStart += L }
          const at = loopStart + sl[j].start * scale
          if (at >= c.currentTime + 0.15) break
          const slotLen = ((sl[j + 1]?.start ?? l.buf.duration) - sl[j].start) * scale
          const slice = order[j] ?? j
          if (at >= c.currentTime - 0.01) {
            if (local) fire(c, bus, at, slice, slotLen)
            sendNote(c, at, FIRST_NOTE + slice, 100, slotLen * 0.9, 9)
            queue.push({ step: slice, at: at - t0 })
          }
          j++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = window.setInterval(tick, 25)
    }, (el) => {
      let cur = -1
      for (const q of queue) if (q.at <= el) cur = q.step
      setStep(cur)
    }, () => {
      clearInterval(timer)
      setStep(-1)
    })
  }

  const slot = slots[sel]
  const setSlot = (patch: Partial<Slot>) => setSlots((xs) => xs.map((s, i) => (i === sel ? { ...s, ...patch } : s)))
  const W = 600, H = 120
  const dur = loaded?.buf.duration ?? 1
  const path = loaded ? Array.from(loaded.peaks, (v, i) => `M${i + 0.5} ${H / 2 - v * H * 0.46}V${H / 2 + v * H * 0.46}`).join("") : ""

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="audio/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = "" }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><FileAudio />Load an audio file</Button>
        <Button variant="ghost" onClick={() => void loadDemo()}><Sparkles />Use a demo loop</Button>
        {loaded && <span className="text-muted-foreground min-w-0 truncate text-sm">{loaded.name} · {loaded.buf.duration.toFixed(2)} s</span>}
      </div>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <Caption>Your file stays in this browser: nothing is uploaded. Drum loops and vocal phrases slice best. Long songs work too, but only the first 16 slices map to pads.</Caption>

      {loaded && (
        <>
          <Block title="Slices">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Slice by</span>
                <Seg label="Slice by" value={mode} onChange={setMode} options={[["transients", "Transients"], ["beats", "Beats"], ["equal", "16 equal"]]} />
              </div>
              {mode === "transients" && (
                <div className="grid w-44 gap-2">
                  <div className="flex justify-between text-sm"><Label htmlFor="sm-sens">Sensitivity</Label><output className="text-muted-foreground tabular-nums">{Math.round(sens * 100)}%</output></div>
                  <Slider id="sm-sens" aria-label="Sensitivity" min={0} max={1} step={0.01} value={[sens]} onValueChange={([v]) => setSens(v)} />
                </div>
              )}
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Loop length</span>
                <Seg label="Loop length" value={String(bars)} onChange={(v) => { const b = +v; setBars(b); setTempo(Math.max(60, Math.min(200, Math.round((b * 4 * 60) / dur)))) }} options={[["1", "1 bar"], ["2", "2 bars"], ["4", "4 bars"]]} />
              </div>
              <p className="text-muted-foreground pb-1.5 text-sm tabular-nums">{slices.length} slices · {tempo} BPM</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="vsvg h-32 rounded-lg border bg-card" role="img" aria-label={`Waveform with ${slices.length} slice markers`}>
              {slices.map((s, i) => (
                <rect key={i} x={(s.start / dur) * W} y={0} width={Math.max(1, ((s.end - s.start) / dur) * W)} height={H}
                  className={cn(i === sel ? "fill-[color-mix(in_oklab,var(--s5)_22%,transparent)]" : i === step ? "fill-[color-mix(in_oklab,var(--s3)_22%,transparent)]" : "fill-transparent")} />
              ))}
              <path d={path} className="stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {slices.map((s, i) => <line key={i} x1={(s.start / dur) * W} x2={(s.start / dur) * W} y1={0} y2={H} className="stroke-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
            </svg>
            <Caption>Transients puts a slice at each hit, like Simpler’s Slice mode set to Transient. Beats cuts on each beat of the loop, and 16 equal splits it evenly. Raise the sensitivity to find quieter hits.</Caption>
          </Block>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <Block title="Pads">
              <div role="group" aria-label="Sample pads" className="grid max-w-[360px] grid-cols-4 gap-1.5">
                {[3, 2, 1, 0].flatMap((row) => [0, 1, 2, 3].map((col) => {
                  const i = row * 4 + col, has = i < slices.length
                  return (
                    <button key={i} type="button" disabled={!has} onClick={() => press(i)} aria-label={`Pad ${i + 1}, key ${KEYS[i].toUpperCase()}${i === sel ? ", selected" : ""}`}
                      className={cn("grid aspect-square place-items-center rounded-[6px] border-[1.5px] border-pad-edge bg-pad-empty text-xs transition-[scale,background-color] duration-100 enabled:active:scale-[0.96] disabled:opacity-40",
                        has && "bg-[color-mix(in_oklab,var(--s5)_30%,var(--card))]", i === sel && "border-foreground", (lit === i || step === i) && "border-transparent bg-[var(--s3)] text-[var(--on-accent)]")}>
                      <span className="grid gap-0.5 leading-none"><b>{i + 1}</b><span className="opacity-70">{KEYS[i].toUpperCase()}</span></span>
                    </button>
                  )
                }))}
              </div>
              <Caption>Click a pad, press its key, or play notes from C1 on Push or a keyboard. Pad 1 is bottom left, like Drum Rack.</Caption>
            </Block>
            <div className="space-y-8">
              <Block title={`Pad ${sel + 1}`}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="flex justify-between text-sm"><Label htmlFor="sm-pitch">Pitch</Label><output className="text-muted-foreground tabular-nums">{slot.pitch > 0 ? "+" : ""}{slot.pitch} semitones</output></div>
                    <Slider id="sm-pitch" aria-label="Pitch" min={-12} max={12} step={1} value={[slot.pitch]} onValueChange={([v]) => setSlot({ pitch: v })} />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex justify-between text-sm"><Label htmlFor="sm-gain">Volume</Label><output className="text-muted-foreground tabular-nums">{Math.round(slot.gain * 100)}%</output></div>
                    <Slider id="sm-gain" aria-label="Volume" min={0} max={1.5} step={0.01} value={[slot.gain]} onValueChange={([v]) => setSlot({ gain: v })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="sm-rev" checked={slot.reverse} onCheckedChange={(v) => setSlot({ reverse: v })} />
                    <Label htmlFor="sm-rev" className="font-normal">Reverse</Label>
                  </div>
                </div>
                <Caption>Pitching a slice down also slows it, the way Simpler does in Classic mode. Reversed hits swell into the next slice, a classic trick for fills.</Caption>
              </Block>
              <Block title="Rearrange">
                <div className="flex flex-wrap items-center gap-2">
                  <PlayButton id="sampler" label="Play slices" onPlay={playSeq} />
                  <Button variant="outline" size="sm" onClick={() => setOrder((o) => [...o].sort(() => Math.random() - 0.5))}><Shuffle />Shuffle order</Button>
                  <Button variant="ghost" size="sm" onClick={() => setOrder(Array.from({ length: 16 }, (_, i) => i))}>In order</Button>
                </div>
                <p className="text-sm tabular-nums" aria-live="off">
                  {order.filter((x) => x < slices.length).map((x) => x + 1).join(" · ")}
                </p>
                <Caption>{playing ? "Change the order or a pad while it plays." : "Plays every slice in a loop at the loop’s tempo. Shuffle to hear new grooves from the same hits, then recreate the best one with Simpler on Push."} With MIDI out on (in the loop builder or sequencer), slices go out on channel 10 from C1.</Caption>
              </Block>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
