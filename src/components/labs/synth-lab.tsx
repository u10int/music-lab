import { useState } from "react"
import { useSearchParams } from "react-router"
import { tone } from "@/audio/engine"
import { toggle } from "@/audio/playback"
import { useKey } from "@/components/key-picker"
import { EnvelopeSVG, FilterSVG, qOf } from "@/components/diagrams"
import { Caption } from "@/components/page"
import { QwertyPiano } from "@/components/qwerty-piano"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { PRESETS, WAVES, type SynthPreset } from "@/data/labs"
import { fmtHz, fmtS } from "@/lib/theory"
import { cn } from "@/lib/utils"

function Knob({ id, label, value, display, min, max, step, onChange }: { id: string; label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <Label htmlFor={id}>{label}</Label>
        <output htmlFor={id} className="text-muted-foreground tabular-nums">{display}</output>
      </div>
      <Slider id={id} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  )
}

export function SynthLab() {
  const { root } = useKey()
  const [params] = useSearchParams()
  const first = params.get("preset") && PRESETS[params.get("preset")!] ? params.get("preset")! : "pluck"
  const [presetId, setPresetId] = useState(first)
  const [p, setP] = useState<SynthPreset>(() => structuredClone(PRESETS[first]))
  const set = (patch: Partial<SynthPreset>) => setP((x) => ({ ...x, ...patch }))
  const setEnv = (k: keyof SynthPreset["env"], v: number) => setP((x) => ({ ...x, env: { ...x.env, [k]: v } }))
  const cutPos = Math.log(p.cutoff / 40) / Math.log(16000 / 40)

  const play = () => {
    const e = p.env, gate = Math.max(0.7, e.a + e.d + 0.3), midi = 12 * (p.oct + 1) + root
    toggle("synth", gate + e.r * 3, (c, bus, t) => {
      tone(c, bus, t, midi, gate, { wave: p.wave, env: e, cutoff: p.cutoff, q: qOf(p.res), detune: p.detune, level: p.oct < 3 ? 0.32 : 0.2 })
    })
  }

  return (
    <div className="space-y-6" style={{ ["--c" as string]: "var(--s3)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <Seg
          label="Preset"
          value={presetId}
          onChange={(v) => {
            setPresetId(v)
            setP(structuredClone(PRESETS[v]))
          }}
          options={Object.entries(PRESETS).map(([k, x]) => [k, x.name] as [string, string])}
        />
        <PlayButton id="synth" label="Play note" onPlay={play} />
      </div>
      <Caption>Pick a preset to see how it's built, then change any control and play it again, or hold keys on the piano below to hear how the envelope responds. These match Drift's oscillator, filter and envelope.</Caption>
      <QwertyPiano base={12 * (p.oct + 1)} label={`Piano playing the ${PRESETS[presetId]?.name ?? "synth"} sound`}
        tone={{ wave: p.wave, env: p.env, cutoff: p.cutoff, q: qOf(p.res), detune: p.detune, level: p.oct < 3 ? 0.3 : 0.18 }} />

      <div className="space-y-3">
        <h3 className="font-semibold">Oscillator</h3>
        <div role="radiogroup" aria-label="Waveform" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WAVES.map(([id, n, d, path]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={p.wave === id}
              onClick={() => set({ wave: id })}
              className={cn("grid gap-1 rounded-lg border bg-card p-3 text-left transition-[border-color,background-color] duration-150", p.wave === id ? "border-foreground" : "border-border hover:border-pad-edge")}
            >
              <svg viewBox="-2 0 68 32" className="h-8 w-16" aria-hidden="true"><path d={path} className="z1" /></svg>
              <b className="text-sm">{n}</b>
              <span className="text-muted-foreground text-xs">{d}</span>
            </button>
          ))}
        </div>
        <div className="max-w-sm">
          <Knob id="detune" label="Unison detune" value={p.detune} display={p.detune + " cents"} min={0} max={50} step={1} onChange={(v) => set({ detune: v })} />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold">Amp envelope</h3>
          <EnvelopeSVG env={p.env} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Knob id="a" label="Attack" value={p.env.a} display={fmtS(p.env.a)} min={0} max={2} step={0.005} onChange={(v) => setEnv("a", v)} />
            <Knob id="d" label="Decay" value={p.env.d} display={fmtS(p.env.d)} min={0.01} max={2} step={0.01} onChange={(v) => setEnv("d", v)} />
            <Knob id="s" label="Sustain" value={p.env.s} display={Math.round(p.env.s * 100) + "%"} min={0} max={1} step={0.01} onChange={(v) => setEnv("s", v)} />
            <Knob id="r" label="Release" value={p.env.r} display={fmtS(p.env.r)} min={0.02} max={3} step={0.01} onChange={(v) => setEnv("r", v)} />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Low-pass filter</h3>
          <FilterSVG cutoff={p.cutoff} res={p.res} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Knob id="cut" label="Cutoff" value={cutPos} display={fmtHz(p.cutoff)} min={0} max={1} step={0.001} onChange={(v) => set({ cutoff: 40 * Math.pow(16000 / 40, v) })} />
            <Knob id="res" label="Resonance" value={p.res} display={Math.round(p.res * 100) + "%"} min={0} max={1} step={0.01} onChange={(v) => set({ res: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
