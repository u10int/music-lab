import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, RotateCcw } from "lucide-react"
import { Link, useLocation } from "react-router"
import { drum, KIND_OF } from "@/audio/engine"
import { fxChain, voice, type FxSettings, type Patch } from "@/audio/patch"
import { toggle } from "@/audio/playback"
import { InstLink } from "@/components/guide/links"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FX } from "@/data/guide"
import { GENRE_SOUNDS, type GenreSound } from "@/data/genre-sounds"
import { SCALES } from "@/data/labs"
import { familyOptions, normalizeFamily, PATTERNS, type Family } from "@/data/patterns"
import { usePref } from "@/lib/store"
import { cn, slug } from "@/lib/utils"

const FX_NAMES = new Set(FX.map((f) => f.n))

/** MIDI note for a scale degree in the current key, at the sound's octave. */
function degreeMidi(root: number, iv: number[], oct: number, deg: number, shift = 0) {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7
  return 12 * (oct + 2 + shift + o) + root + iv[d]
}

function resolve(s: GenreSound, vals: Record<string, number>) {
  const patch: Patch = structuredClone(s.patch), fx: FxSettings = structuredClone(s.fx)
  for (const m of s.macros) m.apply(patch, fx, vals[m.id] ?? m.value)
  return { patch, fx }
}

export function SoundCard({ s }: { s: GenreSound }) {
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const initial = useMemo(() => Object.fromEntries(s.macros.map((m) => [m.id, m.value])), [s])
  const [vals, setVals] = useState<Record<string, number>>(initial)
  const [withDrums, setWithDrums] = usePref<boolean>("genre-sound-drums", true)
  const [step, setStep] = useState(-1)
  const id = "gs-" + s.id
  const live = useRef({ vals, withDrums, root, iv })
  useEffect(() => {
    live.current = { vals, withDrums, root, iv }
  })
  const pattern = PATTERNS.find((p) => p.id === s.drums)

  const play = () => {
    let timer = 0
    const queue: { step: number; at: number }[] = []
    toggle(id, 3600, (c, bus, t0) => {
      const chain = fxChain(c, bus)
      const sixteenth = 60 / s.tempo / 4
      const swing = (pattern?.swing ?? 0) * sixteenth
      let next = t0, k = 0, prev: number | undefined
      const tick = () => {
        const { vals: v, withDrums: dr, root: r, iv: scaleIv } = live.current
        const { patch, fx } = resolve(s, v)
        chain.set(fx, s.tempo)
        while (next < c.currentTime + 0.15) {
          const i = k % 32, at = next + (i % 2 ? swing : 0)
          if (dr && pattern) for (const [name, steps, ghost = []] of pattern.rows) {
            const st = (i % (pattern.length ?? 16)) + 1
            if (steps.includes(st)) drum(c, bus, at, KIND_OF[name], 0.55)
            else if (ghost.includes(st)) drum(c, bus, at, KIND_OF[name], 0.22)
          }
          if (fx.duck && i % 4 === 0) {
            chain.duck.gain.setValueAtTime(1 - fx.duck, at + 0.005)
            chain.duck.gain.setTargetAtTime(1, at + 0.01, 0.07)
          }
          for (const [start, len, deg, shift] of s.phrase) {
            if (Math.floor(start) !== i) continue
            const degs = Array.isArray(deg) ? deg : [deg]
            for (const d of degs) {
              const m = degreeMidi(r, scaleIv, s.oct, d, shift ?? 0)
              voice(c, chain.input, at, m, len * sixteenth, patch, s.tempo, s.mono ? prev : undefined)
              if (s.mono) prev = m
            }
          }
          queue.push({ step: i, at: at - t0 })
          next += sixteenth
          k++
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

  const changed = s.macros.some((m) => vals[m.id] !== m.value)
  const playing = step >= 0
  const notes = new Set(s.phrase.flatMap(([start, len]) => Array.from({ length: Math.max(1, Math.round(len)) }, (_, j) => Math.floor(start) + j)))
  return (
    <article id={"sound-" + s.id} tabIndex={-1} className="flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 outline-none transition-[box-shadow] duration-300 data-[flash=true]:ring-2 data-[flash=true]:ring-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.name}</h3>
            <Badge variant="secondary">{s.role}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{s.genre} · {s.tempo} BPM</p>
        </div>
        <PlayButton id={id} label="Play" onPlay={play} />
      </div>
      <p className="text-sm text-pretty">{s.what}</p>

      <div aria-hidden="true" className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-px">
        {Array.from({ length: 32 }, (_, i) => (
          <span key={i} className={cn("h-1.5 rounded-[1px]", notes.has(i) ? "bg-foreground/60" : "bg-pad-empty", i % 4 === 0 && !notes.has(i) && "bg-border", playing && step === i && "bg-[var(--s3)]")} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {s.macros.map((m) => (
          <div key={m.id} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Label htmlFor={`${s.id}-${m.id}`} className="truncate">{m.label}</Label>
              <output className="text-muted-foreground shrink-0 text-xs tabular-nums">{m.fmt(vals[m.id])}</output>
            </div>
            <Slider id={`${s.id}-${m.id}`} aria-label={m.label} min={m.min} max={m.max} step={m.step} value={[vals[m.id]]} onValueChange={([v]) => setVals((x) => ({ ...x, [m.id]: v }))} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id={`${s.id}-drums`} checked={withDrums} onCheckedChange={setWithDrums} disabled={!pattern} />
          <Label htmlFor={`${s.id}-drums`} className="text-sm font-normal">With {pattern?.name.toLowerCase() ?? "drums"} drums</Label>
        </div>
        {changed && <Button variant="ghost" size="sm" onClick={() => setVals(initial)}><RotateCcw />Reset knobs</Button>}
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground mr-1 text-sm">Build it in</span>
          {s.use.map((i) => <InstLink key={i} id={i} chip primary />)}
          {s.alt?.length ? <span className="text-muted-foreground text-xs">or</span> : null}
          {s.alt?.map((i) => <InstLink key={i} id={i} chip />)}
        </div>
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium hover:underline">
            How to make it in Live <ChevronDown className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <ol className="space-y-1.5 text-sm">
              {s.steps.map((t, i) => (
                <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1.5"><span className="text-muted-foreground font-semibold tabular-nums">{i + 1}</span><span className="text-pretty">{t}</span></li>
              ))}
            </ol>
            <p className="text-sm">
              <span className="font-semibold">Effects, in order: </span>
              {s.chain.map((fx, i) => (
                <span key={fx}>
                  {i > 0 && " → "}
                  {FX_NAMES.has(fx) ? <Link className="underline" to={`/instruments?tab=effects#fx-${slug(fx)}`}>{fx}</Link> : fx}
                </span>
              ))}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </article>
  )
}

export function GenreSounds() {
  const [storedFam, setFam] = usePref<Family | "all">("genre-sound-family", "wave")
  const fam = normalizeFamily(storedFam)
  const { hash } = useLocation()
  useEffect(() => {
    const target = hash.startsWith("#sound-") && GENRE_SOUNDS.find((x) => "#sound-" + x.id === hash)
    if (target && fam !== "all" && target.family !== fam) setFam("all")
  }, [hash, fam, setFam])
  const list = GENRE_SOUNDS.filter((s) => fam === "all" || s.family === fam)
  const families = familyOptions((g) => GENRE_SOUNDS.some((s) => s.family === g))
  return (
    <div className="space-y-4">
      <Seg label="Genre" value={fam} onChange={setFam} options={families} />
      <Caption>Each card plays a two-bar phrase in your key, over the matching drum pattern. Turn the knobs while it loops to hear what each control does, then open “How to make it in Live” for the instrument and effects.</Caption>
      <div className="grid gap-4 lg:grid-cols-2">{list.map((s) => <SoundCard key={s.id} s={s} />)}</div>
    </div>
  )
}
