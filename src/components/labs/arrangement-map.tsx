import { useEffect, useRef, useState } from "react"
import { horizon, startClock, stopClock } from "@/audio/clock"
import { ArrowLeft, ArrowRight, Copy, PencilRuler, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { drum, noiseBuffer } from "@/audio/engine"
import { fxChain, voice } from "@/audio/patch"
import { toggle, usePlayingId } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { Caption } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Toolbar } from "@/components/toolbar"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ARR_LANE_HELP, ARR_LANES, ARR_TEMPLATES, energyOf, SECTION_TIPS, type ArrSection } from "@/data/arrangements"
import { SCALES, ST_TXT, type LaneState } from "@/data/labs"
import { buildLoop, defaultLoop, resolveSound, soundById, type SynthPart } from "@/lib/loop"
import { uid, update, usePref, useProgress } from "@/lib/store"
import { cn } from "@/lib/utils"

const mmss = (s: number) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0")
const STYLE: Record<LaneState, string> = {
  on: "bg-[var(--s5)] text-white dark:text-[var(--on-accent)]",
  off: "bg-transparent shadow-[inset_0_0_0_1px_var(--border)]",
  half: "bg-[linear-gradient(90deg,transparent_50%,var(--s5)_50%)] shadow-[inset_0_0_0_1px_var(--border)]",
  filt: "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--s5)_15%,var(--card)),color-mix(in_oklab,var(--s5)_60%,var(--card)))]",
  riser: "bg-foreground/10 text-foreground",
  impact: "bg-foreground/10 text-foreground",
  sweep: "bg-foreground/10 text-foreground",
}
const SHORT: Partial<Record<LaneState, string>> = { riser: "Riser", impact: "Impact", sweep: "Sweep", filt: "Filter" }
const CYCLE: LaneState[] = ["on", "filt", "half", "off"]
const FX_CYCLE: LaneState[] = ["off", "riser", "impact", "sweep"]
const NAMES = Object.keys(SECTION_TIPS)
const PARTS: (SynthPart | "kick" | "drums")[] = ["kick", "drums", "bass", "chords", "lead"]

interface Sec extends ArrSection { id: string }
interface ArrState { template: string; tempo: number; sections: Sec[] }

const fromTemplate = (id: string): ArrState => {
  const t = ARR_TEMPLATES.find((x) => x.id === id) ?? ARR_TEMPLATES[0]
  return { template: t.id, tempo: t.tempo, sections: t.sections.map((s) => ({ ...s, lanes: [...s.lanes], id: uid() })) }
}

/** Short noise effects for the FX lane. */
function fxNoise(c: BaseAudioContext, out: AudioNode, t: number, kind: LaneState, len: number) {
  if (kind === "off" || !["riser", "impact", "sweep"].includes(kind)) return
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  src.buffer = noiseBuffer()
  src.loop = true
  src.connect(f)
  f.connect(g)
  g.connect(out)
  if (kind === "riser") {
    f.type = "bandpass"
    f.Q.value = 2
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(7000, t + len)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + len)
    g.gain.setValueAtTime(0, t + len + 0.01)
    src.start(t)
    src.stop(t + len + 0.05)
  } else if (kind === "impact") {
    drum(c, out, t, "kick", 1)
    f.type = "lowpass"
    f.frequency.setValueAtTime(6000, t)
    f.frequency.exponentialRampToValueAtTime(400, t + 2)
    g.gain.setValueAtTime(0.25, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
    src.start(t)
    src.stop(t + 2.3)
  } else {
    const l = Math.min(len, 6)
    f.type = "lowpass"
    f.Q.value = 4
    f.frequency.setValueAtTime(9000, t)
    f.frequency.exponentialRampToValueAtTime(200, t + l)
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + l)
    src.start(t)
    src.stop(t + l + 0.05)
  }
}

export function ArrangementMap() {
  const [st, setSt] = usePref<ArrState | null>("arrangement", null)
  const arr = st?.sections?.length ? st : fromTemplate("prog")
  const tpl = ARR_TEMPLATES.find((x) => x.id === arr.template) ?? ARR_TEMPLATES[0]
  const set = (patch: Partial<ArrState>) => setSt({ ...arr, ...patch })
  const setSections = (fn: (xs: Sec[]) => Sec[]) => set({ sections: fn(arr.sections.map((s) => ({ ...s, lanes: [...s.lanes] }))) })
  const { root, scale } = useKey()
  const iv = (SCALES.find((x) => x.id === scale) ?? SCALES[0]).iv
  const [sel, setSel] = useState(0)
  const [loopSec, setLoopSec] = useState(false)
  const [pos, setPos] = useState(-1)
  const [confirming, setConfirming] = useState(false)
  const playing = usePlayingId() === "arrangement"
  const progress = useProgress()
  const navigate = useNavigate()

  const secs = arr.sections, barS = (4 * 60) / arr.tempo
  const total = secs.reduce((a, s) => a + s.bars, 0)
  const starts = secs.map((_, i) => secs.slice(0, i).reduce((a, s) => a + s.bars, 0))
  const cur = Math.min(sel, secs.length - 1), cs = secs[cur]
  const loop = { ...defaultLoop(tpl.family), tempo: arr.tempo }
  const events = buildLoop(loop, root, iv)
  const live = useRef({ arr, events, loop, loopSec, cur })
  useEffect(() => {
    live.current = { arr, events, loop, loopSec, cur }
  })

  const play = (fromIdx = cur) => {
    setSel(fromIdx)
    const queue: { bar: number; at: number }[] = []
    let timer = 0
    const remaining = loopSec ? 3600 : (total - starts[fromIdx]) * barS + 2.5
    toggle("arrangement", remaining, (c, bus, t0) => {
      const filt = {} as Record<(typeof PARTS)[number], BiquadFilterNode>
      const chains = {} as Record<SynthPart, ReturnType<typeof fxChain>>
      for (const p of PARTS) {
        const f = c.createBiquadFilter()
        f.type = "lowpass"
        f.frequency.value = 18000
        f.connect(bus)
        filt[p] = f
        if (p !== "kick" && p !== "drums") {
          chains[p] = fxChain(c, f)
        }
      }
      const fxOut = c.createGain()
      fxOut.connect(bus)
      let g = 0, next = t0, lastSec = ""
      // Global step from the start of the track.
      const firstBar = live.current.arr.sections.slice(0, fromIdx).reduce((a, s) => a + s.bars, 0)
      g = firstBar * 16
      const prev: Partial<Record<SynthPart, number>> = {}
      const tick = () => {
        const { arr: a, events: ev, loop: lp, loopSec: ls } = live.current
        const sixteenth = 60 / a.tempo / 4
        const sounds = Object.fromEntries((["bass", "chords", "lead"] as SynthPart[]).map((p) => {
          const s = soundById(lp.sounds[p])
          return [p, s ? resolveSound(s) : null]
        })) as Record<SynthPart, ReturnType<typeof resolveSound> | null>
        for (const p of ["bass", "chords", "lead"] as SynthPart[]) if (sounds[p]) chains[p].set(sounds[p]!.fx, a.tempo)
        const st0 = a.sections.map((_, i) => a.sections.slice(0, i).reduce((x, s) => x + s.bars, 0))
        const tot = a.sections.reduce((x, s) => x + s.bars, 0)
        while (next < horizon(c)) {
          let bar = Math.floor(g / 16)
          let si = st0.findIndex((s0, i) => bar >= s0 && bar < s0 + a.sections[i].bars)
          // Looping a section: jump back to its start when it ends.
          if (ls && si !== live.current.cur && g % 16 === 0) {
            const target = live.current.cur
            g = st0[target] * 16
            bar = st0[target]
            si = target
            lastSec = ""
          }
          if (si < 0 || bar >= tot) return
          const sec = a.sections[si], lb = bar - st0[si], at = next + ((g % 16) % 2 ? lp.swing * sixteenth : 0)
          const secKey = sec.id + ":" + st0[si]
          if (g % 16 === 0 && lb === 0 && secKey !== lastSec) {
            lastSec = secKey
            const len = sec.bars * 16 * sixteenth
            PARTS.forEach((p, li) => {
              const f = filt[p].frequency, s = sec.lanes[li]
              f.cancelScheduledValues(at)
              if (s === "filt") {
                const opens = a.sections[si + 1]?.lanes[li] === "on"
                f.setValueAtTime(opens ? 300 : 700, at)
                if (opens) f.exponentialRampToValueAtTime(5000, at + len)
              } else f.setValueAtTime(18000, at)
            })
            fxNoise(c, fxOut, at, sec.lanes[5], len)
          }
          const plays = (li: number) => {
            const s = sec.lanes[li]
            return s === "on" || s === "filt" || (s === "half" && lb >= sec.bars / 2)
          }
          const ls64 = g % 64
          for (const h of ev.hits) {
            if (h.step !== ls64) continue
            const li = h.lane === "kick" ? 0 : 1
            if (plays(li)) drum(c, filt[li === 0 ? "kick" : "drums"], at, h.lane, h.vel * 0.6)
          }
          for (const n of ev.notes) {
            if (Math.floor(n.step) !== ls64) continue
            const li = n.part === "bass" ? 2 : n.part === "chords" ? 3 : 4
            const snd = sounds[n.part]
            if (!snd || !plays(li)) continue
            const when = at + (n.step - ls64) * sixteenth
            voice(c, chains[n.part].input, when, n.midi, n.len * sixteenth, snd.patch, a.tempo, n.mono ? prev[n.part] : undefined)
            if (n.mono) prev[n.part] = n.midi
          }
          queue.push({ bar: g / 16, at: next - t0 })
          next += sixteenth
          g++
        }
        while (queue.length > 64) queue.shift()
      }
      tick()
      timer = startClock(tick)
    }, (el) => {
      let b = -1
      for (const q of queue) if (q.at <= el) b = q.bar
      setPos(b)
    }, () => {
      stopClock(timer)
      setPos(-1)
    })
  }

  const cycle = (si: number, li: number) => setSections((xs) => {
    const c = li === 5 ? FX_CYCLE : CYCLE, s = xs[si].lanes[li]
    xs[si].lanes[li] = c[(c.indexOf(s) + 1) % c.length] ?? c[0]
    return xs
  })
  const editSel = (fn: (s: Sec) => void) => setSections((xs) => { fn(xs[cur]); return xs })
  const move = (d: number) => {
    const j = cur + d
    if (j < 0 || j >= secs.length) return
    setSections((xs) => { [xs[cur], xs[j]] = [xs[j], xs[cur]]; return xs })
    setSel(j)
  }
  const toPlanner = () => {
    const sections = secs.map((s) => ({ id: uid(), name: s.name, bars: s.bars, energy: Math.max(1, Math.round(energyOf(s.lanes))) }))
    update((d) => {
      d.plan = { title: `My ${tpl.name.toLowerCase()} track`, tempo: arr.tempo, sections, lanes: ARR_LANES.map((name, li) => ({ id: uid(), name, fx: li === 5, cells: Object.fromEntries(sections.map((x, i) => [x.id, secs[i].lanes[li]])) })) }
    })
    navigate("/planner")
  }
  const playBar = playing && pos >= 0 ? pos : -1
  const playIdx = playBar < 0 ? -1 : starts.findIndex((s0, i) => playBar >= s0 && playBar < s0 + secs[i].bars)
  const cols = secs.map((s) => `${s.bars}fr`).join(" ")

  return (
    <div className="space-y-6">
      <Toolbar
        transport={<PlayButton id="arrangement" label={cur === 0 ? "Play" : `Play from ${cs.name.toLowerCase()}`} primary onPlay={() => play(cur)} />}
        actions={!confirming ? (
          <Button variant="outline" size="sm" onClick={() => (progress.plan ? setConfirming(true) : toPlanner())}><PencilRuler />Use as track plan</Button>
        ) : (
          <>
            <span className="text-sm">Replace your current track plan?</span>
            <Button variant="destructive" size="sm" onClick={toPlanner}>Replace</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          </>
        )}
      >
        <Field label="Template" htmlFor="arr-tpl">
          <Select value={arr.template} onValueChange={(v) => { setSt(fromTemplate(v)); setSel(0) }}>
            <SelectTrigger id="arr-tpl" size="sm" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{ARR_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Tempo" htmlFor="arr-tempo" value={<>{arr.tempo} BPM</>} className="w-40">
          <Slider id="arr-tempo" aria-label="Tempo" min={70} max={180} step={1} value={[arr.tempo]} onValueChange={([v]) => set({ tempo: v })} />
        </Field>
        <Field label="Loop section" htmlFor="arr-loop">
          <Switch id="arr-loop" checked={loopSec} onCheckedChange={setLoopSec} />
          <span className="text-muted-foreground text-sm whitespace-nowrap">{loopSec ? `Repeating ${cs.name.toLowerCase()}` : "Off"}</span>
        </Field>
      </Toolbar>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium tabular-nums">{total} bars · {mmss(total * barS)}</span>
        <Button variant="ghost" size="sm" onClick={() => { setSt(fromTemplate(arr.template)); setSel(0) }}><RotateCcw />Reset template</Button>
      </div>
      <Caption>{tpl.note} Sounds come from the {tpl.name.toLowerCase()} loop in <Link className="underline" to={`/labs/loop-builder?genre=${tpl.family}`}>the loop builder</Link>, in your current key. Click a cell to change what that part does in that section.</Caption>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[680px] gap-3">
          <div className="sticky left-0 z-10 grid w-24 shrink-0 grid-rows-[3.25rem_3rem_repeat(6,2rem)] gap-1.5 bg-background text-sm sm:w-28">
            <span />
            <span className="text-muted-foreground flex items-end pb-1">Energy</span>
            {ARR_LANES.map((n, i) => <span key={n} title={ARR_LANE_HELP[i]} className="flex items-center truncate">{n}</span>)}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="grid gap-x-[3px] gap-y-1.5" style={{ gridTemplateColumns: cols, gridTemplateRows: "3.25rem 3rem repeat(6, 2rem)" }}>
              {secs.map((s, i) => (
                <button key={s.id} type="button" onClick={() => setSel(i)} onDoubleClick={() => play(i)} aria-pressed={i === cur}
                  aria-label={`${s.name}, ${s.bars} bars, starts at bar ${starts[i] + 1}${i === cur ? ", selected" : ""}`}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                  className={cn("flex min-w-0 flex-col items-start justify-end rounded-md px-1.5 pb-1 text-left transition-[background-color] duration-150 hover:bg-accent", i === cur && "bg-accent ring-1 ring-foreground/40", playIdx === i && "bg-[color-mix(in_oklab,var(--s3)_20%,transparent)]")}>
                  <span className="w-full truncate text-sm font-semibold">{s.name}</span>
                  <span className="text-muted-foreground w-full truncate text-xs tabular-nums">{s.bars} bars · {mmss(starts[i] * barS)}</span>
                </button>
              ))}
              {secs.map((s, i) => {
                const e = energyOf(s.lanes)
                return (
                  <div key={s.id + "e"} style={{ gridColumn: i + 1, gridRow: 2 }} className="flex items-end">
                    <span className="sr-only">Energy {e} of 10</span>
                    <span aria-hidden="true" className="block w-full rounded-t-[3px] bg-foreground/60 transition-[height] duration-300" style={{ height: `${Math.max(4, e * 10)}%` }} />
                  </div>
                )
              })}
              {ARR_LANES.flatMap((lane, li) => secs.map((s, i) => {
                const v = s.lanes[li]
                return (
                  <button key={s.id + li} type="button" onClick={() => cycle(i, li)} style={{ gridColumn: i + 1, gridRow: li + 3 }}
                    aria-label={`${lane} in ${s.name}: ${ST_TXT[v]}. Click to change`}
                    className={cn("min-w-0 truncate rounded px-1.5 text-left text-[11px] transition-[background-color,scale] duration-150 enabled:active:scale-[0.96] hover:brightness-110", STYLE[v])}>
                    {SHORT[v] ?? ""}
                  </button>
                )
              }))}
            </div>
            {playBar >= 0 && (
              <span aria-hidden="true" className="pointer-events-none absolute top-[3.25rem] bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${(playBar / total) * 100}%` }} />
            )}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-hidden="true">
        {(["on", "filt", "half", "off"] as LaneState[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-2"><i className={cn("inline-block h-3 w-5 rounded-sm", STYLE[s])} />{s === "filt" ? "Filtered (opens into the next section)" : ST_TXT[s]}</span>
        ))}
      </div>

      <div className="grid gap-6 rounded-xl border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="arr-name">Section</Label>
              <Select value={NAMES.includes(cs.name) ? cs.name : NAMES[0]} onValueChange={(v) => editSel((s) => { s.name = v })}>
                <SelectTrigger id="arr-name" size="sm" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="arr-bars">Length</Label>
              <Select value={String(cs.bars)} onValueChange={(v) => editSel((s) => { s.bars = +v })}>
                <SelectTrigger id="arr-bars" size="sm" className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{[4, 8, 16, 24, 32].map((b) => <SelectItem key={b} value={String(b)}>{b} bars</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => move(-1)}><ArrowLeft />Move left</Button>
            <Button variant="outline" size="sm" disabled={cur === secs.length - 1} onClick={() => move(1)}>Move right<ArrowRight /></Button>
            <Button variant="outline" size="sm" onClick={() => { setSections((xs) => { xs.splice(cur + 1, 0, { ...xs[cur], lanes: [...xs[cur].lanes], id: uid() }); return xs }); setSel(cur + 1) }}><Copy />Duplicate</Button>
            <Button variant="outline" size="sm" onClick={() => { setSections((xs) => { xs.splice(cur + 1, 0, { id: uid(), name: "Break", bars: 8, lanes: ["off", "off", "off", "on", "off", "off"] }); return xs }); setSel(cur + 1) }}><Plus />Add after</Button>
            <Button variant="ghost" size="sm" disabled={secs.length < 2} onClick={() => { setSections((xs) => { xs.splice(cur, 1); return xs }); setSel(Math.max(0, cur - 1)) }}><Trash2 />Delete</Button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{cs.name}: bars {starts[cur] + 1}–{starts[cur] + cs.bars}</p>
          <p className="text-pretty">{SECTION_TIPS[cs.name] ?? "A custom section."}</p>
          <p className="text-muted-foreground text-pretty">
            Playing: {ARR_LANES.slice(0, 5).map((n, li) => [n, cs.lanes[li]] as const).filter(([, v]) => v !== "off").map(([n, v]) => n.toLowerCase() + (v === "filt" ? " (filtered)" : v === "half" ? " (second half)" : "")).join(", ") || "nothing"}
            {cs.lanes[5] !== "off" ? `. FX: ${ST_TXT[cs.lanes[5]].toLowerCase()}.` : "."}
          </p>
        </div>
      </div>

    </div>
  )
}
