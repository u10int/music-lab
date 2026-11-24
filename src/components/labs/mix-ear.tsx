import { useRef, useState } from "react"
import { Play } from "lucide-react"
import { audio, drum, tone, type ToneOptions } from "@/audio/engine"
import { stop, toggle } from "@/audio/playback"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg, TabSwitch } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { recordEar, update, useProgress, usePref } from "@/lib/store"
import { weightedPick } from "@/lib/adaptive"
import { WeakSpots } from "@/components/labs/ear-training"
import { fmtHz } from "@/lib/theory"
import { cn } from "@/lib/utils"

type Mode = "eq" | "comp" | "side"
type Source = "noise" | "music"
const MODES: [Mode, string][] = [["eq", "Which band is boosted"], ["comp", "Compressed or not"], ["side", "Sidechained or not"]]
const HELP: Record<Mode, string> = {
  eq: "You hear the sound flat, then with one band boosted. Name the band. Both are matched in loudness, so listen for the tone, not the level.",
  comp: "One version goes through a heavy compressor. Pick it. Listen for flatter hits, louder tails and less punch.",
  side: "One version ducks the chords every time the kick hits. Pick it. Listen for the pad breathing in time.",
}
const BANDS: Record<string, number[]> = {
  "4": [100, 400, 1600, 6400],
  "7": [63, 160, 400, 1000, 2500, 6300, 12500],
  "10": [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
}
const BAND_HINT = (f: number) => (f < 80 ? "sub" : f < 250 ? "bass" : f < 600 ? "low mids, mud" : f < 2000 ? "mids, honk" : f < 5000 ? "presence" : f < 10000 ? "brightness" : "air")
const SR = 44100

interface Q { answer: number; options: string[]; a: AudioBuffer; b: AudioBuffer; band?: number }

function pinkNoise(c: BaseAudioContext, sec: number) {
  const n = Math.floor(sec * c.sampleRate), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08
    b6 = w * 0.115926
  }
  const fade = Math.floor(0.02 * c.sampleRate)
  for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[n - 1 - i] *= i / fade }
  return buf
}

const PAD: ToneOptions = { wave: "sawtooth", env: { a: 0.05, d: 0.3, s: 0.8, r: 0.3 }, cutoff: 3500, detune: 12, level: 0.07 }
const BASS: ToneOptions = { wave: "sawtooth", env: { a: 0.005, d: 0.2, s: 0.6, r: 0.08 }, cutoff: 900, q: 1.2, level: 0.18 }

/** Two bars of drums, chords and bass at 120 BPM. `pad` receives the chords so they can be ducked. */
function music(c: BaseAudioContext, drums: AudioNode, pad: AudioNode, t0: number) {
  const s = 60 / 120 / 4
  const vel = [1, 0.3, 0.5, 0.25]
  for (let i = 0; i < 32; i++) {
    const t = t0 + i * s
    if (i % 4 === 0) drum(c, drums, t, "kick", 1)
    if (i % 8 === 4) drum(c, drums, t, "snare", 0.9)
    if (i === 14 || i === 30) drum(c, drums, t, "snare", 0.35)
    drum(c, drums, t, i % 4 === 2 ? "ohat" : "hat", vel[i % 4] * 0.6)
  }
  const chords = [[57, 60, 64], [53, 57, 60]]
  chords.forEach((ch, b) => ch.forEach((n) => tone(c, pad, t0 + b * 16 * s, n, 16 * s * 0.95, PAD)))
  ;[45, 45, 45, 45, 41, 41, 41, 43].forEach((n, k) => tone(c, drums, t0 + k * 4 * s + 2 * s, n, s * 1.6, BASS))
  return 32 * s
}

/** Render a source through an optional processor, offline. */
async function render(source: Source, sec: number, process: (c: OfflineAudioContext, input: AudioNode, out: AudioNode) => void, duck = false, noise?: AudioBuffer) {
  const c = new OfflineAudioContext(2, Math.ceil(sec * SR), SR)
  const input = c.createGain()
  process(c, input, c.destination)
  if (source === "noise") {
    const src = c.createBufferSource()
    src.buffer = noise!
    src.connect(input)
    src.start(0)
  } else {
    const pad = c.createGain()
    pad.connect(input)
    if (duck) for (let i = 0; i < 8; i++) {
      const t = 0.02 + i * 0.5
      pad.gain.setValueAtTime(0.12, t)
      pad.gain.setTargetAtTime(1, t + 0.03, 0.09)
    }
    music(c, input, pad, 0.02)
  }
  return c.startRendering()
}
function rms(b: AudioBuffer) {
  let s = 0, n = 0
  for (let ch = 0; ch < b.numberOfChannels; ch++) {
    const d = b.getChannelData(ch)
    for (let i = 0; i < d.length; i += 4) { s += d[i] * d[i]; n++ }
  }
  return Math.sqrt(s / Math.max(1, n))
}
/** Scale `b` so it has the same loudness as `ref`. */
function match(b: AudioBuffer, ref: AudioBuffer) {
  const g = rms(ref) / Math.max(1e-6, rms(b))
  for (let ch = 0; ch < b.numberOfChannels; ch++) {
    const d = b.getChannelData(ch)
    for (let i = 0; i < d.length; i++) d[i] = Math.max(-1, Math.min(1, d[i] * g))
  }
  return b
}
const pass = (_c: BaseAudioContext, i: AudioNode, o: AudioNode) => { i.connect(o) }

async function makeQuestion(mode: Mode, source: Source, bands: number[], pickBand: () => number): Promise<Q> {
  const sec = source === "noise" ? 2 : 4.1
  const noise = source === "noise" ? pinkNoise(new OfflineAudioContext(1, 1, SR), 2) : undefined
  if (mode === "eq") {
    const band = pickBand()
    const flat = await render(source, sec, pass, false, noise)
    const boosted = await render(source, sec, (c, i, o) => {
      const f = c.createBiquadFilter()
      f.type = "peaking"
      f.frequency.value = bands[band]
      f.Q.value = 1.4
      f.gain.value = bands.length > 7 ? 9 : 12
      i.connect(f)
      f.connect(o)
    }, false, noise)
    return { answer: band, band, options: bands.map((f) => fmtHz(f)), a: flat, b: match(boosted, flat) }
  }
  const processedIsA = Math.random() < 0.5
  const plain = await render(source, sec, pass, false, noise)
  const processed = mode === "comp"
    ? await render(source, sec, (c, i, o) => {
      const comp = c.createDynamicsCompressor()
      comp.threshold.value = -34
      comp.ratio.value = 12
      comp.attack.value = 0.002
      comp.release.value = 0.09
      comp.knee.value = 2
      i.connect(comp)
      comp.connect(o)
    }, false, noise)
    : await render(source, sec, pass, true, noise)
  match(processed, plain)
  return { answer: processedIsA ? 0 : 1, options: ["A", "B"], a: processedIsA ? processed : plain, b: processedIsA ? plain : processed }
}

function playBuffers(id: string, bufs: AudioBuffer[]) {
  toggle(id, bufs.reduce((a, b) => a + b.duration + 0.4, 0), (c, bus, t0) => {
    let t = t0
    for (const b of bufs) {
      const s = c.createBufferSource()
      s.buffer = b
      s.connect(bus)
      s.start(t)
      t += b.duration + 0.4
    }
  })
}

export function MixEar() {
  const progress = useProgress()
  const [mode, setMode] = useState<Mode>("eq")
  const [source, setSource] = useState<Source>("music")
  const [level, setLevel] = useState("4")
  const [focus, setFocus] = usePref("ear-focus", true)
  const [q, setQ] = useState<Q | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)
  const key = "mix-" + mode
  const sc = progress.ear[key] ?? { right: 0, total: 0 }
  const bands = BANDS[level]
  const opts = q?.options ?? (mode === "eq" ? bands.map((f) => fmtHz(f)) : ["A", "B"])

  const next = async () => {
    stop()
    if (!audio()) return
    setBusy(true)
    const nq = await makeQuestion(mode, source, bands, () => weightedPick(progress.earDetail?.[key], bands.map((f) => fmtHz(f)), focus))
    setBusy(false)
    setQ(nq)
    setPicked(null)
    playBuffers("mix-ear", [nq.a, nq.b])
  }
  const answer = (i: number) => {
    if (!q || picked !== null) return
    setPicked(i)
    update((d) => recordEar(d, key, mode === "eq" ? q.options[q.answer] : mode === "comp" ? "Compressed" : "Sidechained", i === q.answer))
    requestAnimationFrame(() => nextRef.current?.focus())
  }
  const reset = (fn: () => void) => { stop(); fn(); setQ(null); setPicked(null) }
  const right = q && picked !== null && picked === q.answer

  return (
    <div className="space-y-4">
      <TabSwitch label="Drill" value={mode} onChange={(m) => reset(() => setMode(m))} options={MODES} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Seg label="Sound" value={source} onChange={(s) => reset(() => setSource(s))} options={[["music", "A loop"], ["noise", "Pink noise"]]} />
        {mode === "eq" && <Seg label="Bands" value={level} onChange={(l) => reset(() => setLevel(l))} options={[["4", "4 bands"], ["7", "7 bands"], ["10", "10 bands"]]} />}
      </div>
      <Caption>{HELP[mode]}</Caption>
      {mode === "eq" && <WeakSpots detail={progress.earDetail?.[key]} focus={focus} setFocus={setFocus} id="mix-focus" />}
      <div className="flex flex-wrap items-center gap-2">
        {!q ? (
          <Button disabled={busy} onClick={() => void next()}><Play className="size-3.5 fill-current" />{busy ? "Preparing…" : "Start"}</Button>
        ) : (
          <>
            <PlayButton id="mix-a" label={mode === "eq" ? "Play flat" : "Play A"} onPlay={() => playBuffers("mix-a", [q.a])} />
            <PlayButton id="mix-b" label={mode === "eq" ? "Play boosted" : "Play B"} onPlay={() => playBuffers("mix-b", [q.b])} />
            {picked !== null && <Button ref={nextRef} disabled={busy} onClick={() => void next()}>{busy ? "Preparing…" : "Next question"}</Button>}
          </>
        )}
        <span className="text-muted-foreground text-sm tabular-nums">{sc.total ? `${sc.right} of ${sc.total} right` : "No answers yet"}</span>
      </div>
      <div className={cn("grid gap-2", opts.length > 4 ? "grid-cols-2 sm:grid-cols-5" : opts.length === 2 ? "max-w-sm grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {opts.map((o, i) => {
          const st = q && picked !== null ? (i === q.answer ? "correct" : i === picked ? "wrong" : "") : ""
          return (
            <Button key={o} variant="outline" disabled={!q || picked !== null} onClick={() => answer(i)}
              className={cn("h-auto min-h-9 flex-col gap-0 py-2 disabled:opacity-100", st === "correct" && "border-transparent bg-[var(--s3)] text-[var(--on-accent)]", st === "wrong" && "border-destructive text-destructive line-through", !st && picked !== null && "opacity-50")}>
              <span>{mode === "eq" ? o : `Version ${o}`}</span>
              {mode === "eq" && <span className="text-xs font-normal opacity-70">{BAND_HINT(bands[i])}</span>}
              {st === "correct" && <span className="sr-only"> (answer)</span>}
              {st === "wrong" && <span className="sr-only"> (your pick)</span>}
            </Button>
          )
        })}
      </div>
      <p className="text-sm" role="status">
        {q && picked !== null && (right
          ? mode === "eq" ? `Right, the boost was at ${opts[q.answer]}.` : `Right, version ${opts[q.answer]} was ${mode === "comp" ? "compressed" : "sidechained"}.`
          : mode === "eq" ? `Not quite. The boost was at ${opts[q.answer]}. Play both again to hear it.` : `Not quite. It was version ${opts[q.answer]}. Play both again to compare.`)}
      </p>
    </div>
  )
}
