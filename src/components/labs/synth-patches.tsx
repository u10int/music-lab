import { useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum } from "@/audio/engine"
import { fxChain, voice, type FxSettings, type Patch } from "@/audio/patch"
import { toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg, TabSwitch } from "@/components/seg"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SCALES } from "@/data/labs"
import { FAMILIES } from "@/data/patterns"
import { fxSettings, PATCH_CATEGORIES, patchSettings, SYNTH_PATCHES, type PatchCategory, type PatchSynth, type SynthPatch } from "@/data/synth-patches"
import { usePref } from "@/lib/store"

const FAMILY_NAME = new Map<string, string>(FAMILIES.map(([id, name]) => [id, name]))
const SYNTH_TABS: [PatchSynth, string][] = [["wavetable", "Wavetable"], ["drift", "Drift"], ["massive", "Massive"], ["spire", "Spire"]]

function degreeMidi(root: number, iv: number[], oct: number, deg: number, shift = 0) {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7
  return 12 * (oct + 2 + shift + o) + root + iv[d]
}

function resolve(s: SynthPatch, vals: Record<string, number>) {
  const patch: Patch = structuredClone(s.patch), fx: FxSettings = structuredClone(s.fx)
  for (const m of s.macros) m.apply(patch, fx, vals[m.id] ?? m.value)
  return { patch, fx }
}

function PatchCard({ s, synth, setSynth }: { s: SynthPatch; synth: PatchSynth; setSynth: (v: PatchSynth) => void }) {
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const initial = useMemo(() => Object.fromEntries(s.macros.map((m) => [m.id, m.value])), [s])
  const [vals, setVals] = useState<Record<string, number>>(initial)
  const [kick, setKick] = usePref<boolean>("patch-kick", true)
  const id = "patch-" + s.id
  const live = useRef({ vals, kick, root, iv })
  useEffect(() => {
    live.current = { vals, kick, root, iv }
  })

  const play = () => {
    let timer = 0
    toggle(id, 3600, (c, bus, t0) => {
      const chain = fxChain(c, bus)
      const sixteenth = 60 / s.tempo / 4
      let next = t0, k = 0, prev: number | undefined
      const tick = () => {
        const { vals: v, kick: withKick, root: r, iv: scaleIv } = live.current
        const { patch, fx } = resolve(s, v)
        chain.set(fx, s.tempo)
        while (next < horizon(c)) {
          const i = k % 32, at = next
          if (withKick && i % 4 === 0) drum(c, bus, at, "kick", 0.5)
          if (fx.duck && i % 4 === 0) {
            chain.duck.gain.setValueAtTime(1 - fx.duck, at + 0.005)
            chain.duck.gain.setTargetAtTime(1, at + 0.01, 0.07)
          }
          for (const [start, len, deg, shift] of s.phrase) {
            if (Math.floor(start) !== i) continue
            for (const d of Array.isArray(deg) ? deg : [deg]) {
              const m = degreeMidi(r, scaleIv, s.oct, d, shift ?? 0)
              voice(c, chain.input, at, m, len * sixteenth, patch, s.tempo, s.mono ? prev : undefined)
              if (s.mono) prev = m
            }
          }
          next += sixteenth
          k++
        }
      }
      tick()
      timer = startClock(tick)
    }, undefined, () => stopClock(timer))
  }

  const { patch, fx } = resolve(s, vals)
  const rows = patchSettings(patch, synth, s.mono)
  const after = fxSettings(fx)
  const changed = s.macros.some((m) => vals[m.id] !== m.value)
  return (
    <article id={"patch-" + s.id} className="flex min-w-0 scroll-mt-24 flex-col gap-4 border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.name}</h3>
            <Badge variant="secondary">{s.cat}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{s.genres.map((g) => FAMILY_NAME.get(g) ?? g).join(", ")} · {s.tempo} BPM</p>
        </div>
        <PlayButton id={id} label="Play" onPlay={play} />
      </div>
      <p className="text-sm text-pretty">{s.what}</p>
      <p className="text-sm text-pretty"><span className="font-semibold">The key move: </span>{s.key}</p>

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
          <Switch id={`${s.id}-kick`} checked={kick} onCheckedChange={setKick} />
          <Label htmlFor={`${s.id}-kick`} className="text-sm font-normal">With a kick on every beat</Label>
        </div>
        {changed && <Button variant="ghost" size="sm" onClick={() => setVals(initial)}><RotateCcw />Reset knobs</Button>}
      </div>

      <div className="space-y-3 border-t pt-3">
        <TabSwitch label="Synth" value={synth} onChange={setSynth} options={SYNTH_TABS} />
        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          {rows.map(([k, v], i) => (
            <div key={k + i} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-pretty">{v}</dd>
            </div>
          ))}
        </dl>
        {after.length > 0 && <p className="text-sm text-pretty"><span className="font-semibold">After the synth: </span>{after.join(" → ")}</p>}
      </div>
    </article>
  )
}

export function PatchLibrary() {
  const [cat, setCat] = usePref<PatchCategory | "all">("patch-cat", "all")
  const [synth, setSynth] = usePref<PatchSynth>("patch-synth", "wavetable")
  const list = SYNTH_PATCHES.filter((p) => cat === "all" || p.cat === cat)
  return (
    <div className="space-y-4">
      <Seg label="Type" value={cat} onChange={setCat} options={[["all", "All"] as [PatchCategory | "all", string], ...PATCH_CATEGORIES.map((c) => [c, c] as [PatchCategory, string])]} />
      <Caption className="max-w-3xl">Each patch plays in your key. Move the knobs while it loops, then pick a synth to see starting settings for that panel; they follow the knobs. Values are approximate, so finish by ear. Your synth choice is shared by every card.</Caption>
      <div className="grid gap-4 lg:grid-cols-2">{list.map((p) => <PatchCard key={p.id} s={p} synth={synth} setSynth={setSynth} />)}</div>
    </div>
  )
}
