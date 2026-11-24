import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router"
import { ChevronDown, RotateCcw } from "lucide-react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum, KIND_OF } from "@/audio/engine"
import { gain } from "@/audio/fx-render"
import { toggle } from "@/audio/playback"
import { InstLink } from "@/components/guide/links"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg, TabSwitch } from "@/components/seg"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FX } from "@/data/guide"
import { barsOf, FX_KINDS, FX_RECIPES, type FxKind, type FxRecipe } from "@/data/fx-recipes"
import { SCALES } from "@/data/labs"
import { FAMILIES, familyOptions, normalizeFamily, PATTERNS, type Family } from "@/data/patterns"
import { usePref } from "@/lib/store"
import { cn, slug } from "@/lib/utils"

const FX_NAMES = new Set(FX.map((f) => f.n))
const famName = (f: Family) => FAMILIES.find((x) => x[0] === f)?.[1] ?? f

/**
 * One effect recipe: hear it in context over drums, change its knobs, and read
 * how to build it in Live. With `family`, it plays over that genre's drums and tempo.
 */
export function FxCard({ r, family }: { r: FxRecipe; family?: Family }) {
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const initial = useMemo(() => Object.fromEntries(r.params.map((m) => [m.id, m.value])), [r])
  const [vals, setVals] = useState<Record<string, number>>(initial)
  const [withDrums, setWithDrums] = usePref<boolean>("fx-drums", true)
  const [pos, setPos] = useState(-1)
  const id = "fx-" + r.id
  const pattern = (family && PATTERNS.find((p) => p.family === family)) || PATTERNS.find((p) => p.id === r.drums)
  const tempo = family && pattern ? pattern.tempo : r.tempo
  const live = useRef({ vals, withDrums, root, iv })
  useEffect(() => {
    live.current = { vals, withDrums, root, iv }
  })
  const bars = barsOf(r, vals)

  const play = () => {
    let timer = 0
    const marks: { at: number; cycle: number }[] = []
    toggle(id, 3600, (c, bus, t0) => {
      const out = gain(c, 1)
      out.connect(bus)
      let next = t0 + 0.05
      const tick = () => {
        while (next < horizon(c) + 0.1) {
          const { vals: p, withDrums: dr, root: rt, iv: sc } = live.current
          const n = barsOf(r, p), sixteenth = 60 / tempo / 4, drumIn = gain(c, 0.55)
          drumIn.connect(out)
          if (dr && pattern) {
            const swing = (pattern.swing ?? 0) * sixteenth, len = pattern.length ?? 16
            for (let s = 0; s < n * 16; s++) {
              if (r.drumsOn && !r.drumsOn(s, p)) continue
              const st = (s % len) + 1, at = next + s * sixteenth + (s % 2 ? swing : 0)
              for (const [name, steps, ghost = []] of pattern.rows) {
                if (steps.includes(st)) drum(c, drumIn, at, KIND_OF[name], 1)
                else if (ghost.includes(st)) drum(c, drumIn, at, KIND_OF[name], 0.4)
              }
            }
          }
          r.render({ c, out, drumIn, t: next, tempo, root: rt, iv: sc, p })
          marks.push({ at: next - t0, cycle: n * 16 * sixteenth })
          while (marks.length > 4) marks.shift()
          next += n * 16 * sixteenth
        }
      }
      tick()
      timer = startClock(tick, 100)
    }, (el) => {
      let cur = -1
      for (const m of marks) if (m.at <= el) cur = (el - m.at) / m.cycle
      setPos(cur > 1 ? -1 : cur)
    }, () => {
      stopClock(timer)
      setPos(-1)
    })
  }

  const changed = r.params.some((m) => vals[m.id] !== m.value)
  const drumBar = (b: number) => Array.from({ length: 16 }, (_, k) => !r.drumsOn || r.drumsOn(b * 16 + k, vals)).some(Boolean)
  return (
    <article id={"fx-" + r.id} tabIndex={-1} className="flex min-w-0 scroll-mt-24 flex-col gap-4 border bg-card p-4 outline-none transition-[box-shadow] duration-300 data-[flash=true]:ring-2 data-[flash=true]:ring-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{r.name}</h3>
            <Badge variant="secondary">{r.kind}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{tempo} BPM · {bars} bar loop{pattern && withDrums ? ` over ${pattern.name.toLowerCase()}` : ""}</p>
        </div>
        <PlayButton id={id} label="Play" onPlay={play} />
      </div>
      <p className="text-sm text-pretty">{r.what}</p>

      <div aria-hidden="true" className="space-y-1">
        <div className="relative flex h-2 gap-px">
          {Array.from({ length: bars }, (_, b) => <span key={b} className={cn("flex-1", withDrums && drumBar(b) ? "bg-foreground/35" : "bg-pad-empty")} />)}
          {pos >= 0 && <span className="absolute inset-y-[-3px] w-0.5 bg-foreground" style={{ left: `${pos * 100}%` }} />}
        </div>
        {withDrums && pattern && bars > 1 && <p className="text-muted-foreground text-xs">Shaded bars have drums.</p>}
      </div>

      <p className="text-sm text-pretty"><span className="font-semibold">Listen for: </span>{r.listen}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {r.params.map((m) => (
          <div key={m.id} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Label htmlFor={`${r.id}-${m.id}`} className="truncate">{m.label}</Label>
              <output className="text-muted-foreground shrink-0 text-xs tabular-nums">{m.fmt(vals[m.id])}</output>
            </div>
            <Slider id={`${r.id}-${m.id}`} aria-label={m.label} min={m.min} max={m.max} step={m.step} value={[vals[m.id]]} onValueChange={([v]) => setVals((x) => ({ ...x, [m.id]: v }))} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id={`${r.id}-drums`} checked={withDrums} onCheckedChange={setWithDrums} disabled={!pattern} />
          <Label htmlFor={`${r.id}-drums`} className="text-sm font-normal">With drums</Label>
        </div>
        <span className="text-muted-foreground text-xs">Knob changes play from the next loop.</span>
        {changed && <Button variant="ghost" size="sm" onClick={() => setVals(initial)}><RotateCcw />Reset knobs</Button>}
      </div>

      <div className="space-y-2 border-t pt-3">
        <p className="text-muted-foreground text-sm">Used in {r.families.map(famName).join(", ")}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground mr-1 text-sm">Build it with</span>
          {r.use.map((i) => <InstLink key={i} id={i} chip primary />)}
          {r.alt?.length ? <span className="text-muted-foreground text-xs">or</span> : null}
          {r.alt?.map((i) => <InstLink key={i} id={i} chip />)}
        </div>
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium hover:underline">
            How to make it in Live <ChevronDown className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <ol className="space-y-1.5 text-sm">
              {r.steps.map((t, i) => (
                <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1.5"><span className="text-muted-foreground font-semibold tabular-nums">{i + 1}</span><span className="text-pretty">{t}</span></li>
              ))}
            </ol>
            <p className="text-sm">
              <span className="font-semibold">Devices, in order: </span>
              {r.chain.map((fx, i) => (
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

const KIND_HELP: Record<FxKind, string> = {
  Atmosphere: "Background layers that give a track a place and a mood: crackle, rain, tape, radio, rooms and weather. Keep them quiet and let them run under whole sections.",
  Transition: "Sounds that move you from one section to the next: risers and builds into a drop, impacts on it, and downlifters and echo-outs leaving it. Each one loops with its landing so you hear it in context.",
  Vocal: "Ways to treat a voice. The demos use a synthesized voice singing vowels in your key; the steps show how to do the same to a real vocal in Live.",
}

/** All effect recipes, by kind and genre. */
export function FxLibrary({ only }: { only?: Family }) {
  const [storedKind, setKind] = usePref<FxKind>("fx-kind", "Atmosphere")
  const [storedFam, setFam] = usePref<Family | "all">("fx-family", "all")
  const fam = only ?? normalizeFamily(storedFam)
  const inFam = (r: FxRecipe) => fam === "all" || r.families.includes(fam)
  // Only offer kinds this genre has; fall back to the first one that has recipes.
  const kinds = FX_KINDS.filter((k) => FX_RECIPES.some((r) => r.kind === k && inFam(r)))
  const kind = kinds.includes(storedKind) ? storedKind : kinds[0] ?? storedKind
  // A search result links to #fx-<id>: show its kind and every genre, then scroll to it.
  const { hash } = useLocation()
  useEffect(() => {
    const target = hash.startsWith("#fx-") && FX_RECIPES.find((x) => "#fx-" + x.id === hash)
    if (!target) return
    if (target.kind !== kind) setKind(target.kind)
    if (!only && fam !== "all" && !target.families.includes(fam)) setFam("all")
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById("fx-" + target.id)
      if (!el) return
      el.scrollIntoView({ block: "center" })
      el.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(raf)
  }, [hash, kind, fam, only, setKind, setFam])
  const list = FX_RECIPES.filter((r) => r.kind === kind && inFam(r))
  const families = familyOptions((g) => FX_RECIPES.some((r) => r.families.includes(g)))
  return (
    <div className="space-y-4">
      <TabSwitch label="Kind of effect" value={kind} onChange={setKind} options={kinds.map((k) => [k, `${k === "Atmosphere" ? "Atmospheres" : k === "Transition" ? "Transitions" : "Vocal effects"} ${FX_RECIPES.filter((r) => r.kind === k && inFam(r)).length}`] as [FxKind, string])} />
      {!only && <Seg label="Genre" value={fam} onChange={setFam} options={families} />}
      <Caption className="max-w-3xl">{KIND_HELP[kind]}</Caption>
      <div className="grid gap-4 lg:grid-cols-2">{list.map((r) => <FxCard key={r.id} r={r} family={only ?? (fam === "all" ? undefined : fam)} />)}</div>
    </div>
  )
}
