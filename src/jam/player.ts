import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum, type DrumKind } from "@/audio/engine"
import { fxChain, voice, type FxSettings, type Patch } from "@/audio/patch"
import { setPos, toggle } from "@/audio/playback"
import { GENRE_SOUNDS, type GenreSound } from "@/data/genre-sounds"
import { genreInfo } from "@/data/genres"
import { SYNTH_PATCHES } from "@/data/synth-patches"
import type { Jam, LayerId } from "./generate"

const GM: Record<number, DrumKind> = { 36: "kick", 37: "rim", 38: "snare", 39: "clap", 42: "hat", 45: "tom", 46: "ohat", 51: "ride", 56: "cowbell", 70: "shaker" }
const ROLES: Record<Exclude<LayerId, "drums">, GenreSound["role"][]> = { bass: ["Bass"], chords: ["Chords", "Pluck"], pad: ["Pad", "Chords"], lead: ["Lead", "Pluck"] }
const FALLBACK: Record<Exclude<LayerId, "drums">, string> = { bass: "p-subsine", chords: "p-pluck", pad: "p-warmpad", lead: "p-square" }
/** Per-layer level, since generated parts are denser than the sound cards’ own phrases. */
const TRIM: Record<Exclude<LayerId, "drums">, number> = { bass: 0.8, chords: 0.45, pad: 0.45, lead: 0.65 }
/** Hand-picked sounds where the first match from a neighbouring genre would be wrong. */
const PREFER: Partial<Record<string, Partial<Record<Exclude<LayerId, "drums">, string>>>> = {
  chillstep: { bass: "dubstep-sub", pad: "fb-pad" },
  chill: { bass: "deep-bass", chords: "liquid-keys", pad: "deep-pad" },
  minimaldeep: { pad: "deep-pad" },
  ambienttechno: { bass: "dub-sub", pad: "amb-shimmer" },
  liquid: { bass: "fg-sub", pad: "jungle-pad" },
  dnb: { pad: "jungle-pad" },
}

function resolve(p: Patch, fx: FxSettings, macros: { apply: (p: Patch, f: FxSettings, v: number) => void; value: number }[]) {
  const patch = structuredClone(p), f = structuredClone(fx)
  for (const m of macros) m.apply(patch, f, m.value)
  return { patch, fx: f }
}

/** A browser sound for each layer, from the style’s own genre sounds, its neighbours, then the patch library. */
export function soundsFor(style: string) {
  const fams = [style, ...(genreInfo(style)?.near ?? [])]
  const out = {} as Record<Exclude<LayerId, "drums">, { name: string; patch: Patch; fx: FxSettings; mono: boolean }>
  for (const id of ["bass", "chords", "pad", "lead"] as const) {
    const want = PREFER[style]?.[id]
    const s = (want && GENRE_SOUNDS.find((x) => x.id === want)) || fams.flatMap((f) => GENRE_SOUNDS.filter((x) => x.family === f && ROLES[id].includes(x.role)))[0]
    const src = s ?? SYNTH_PATCHES.find((p) => p.id === FALLBACK[id])!
    const { patch, fx } = resolve(src.patch, src.fx, src.macros)
    patch.level = (patch.level ?? 0.2) * TRIM[id]
    // The arrangement plays sections, not each sound’s own sidechain; keep it gentle.
    if (fx.duck) fx.duck = Math.min(fx.duck, 0.4)
    out[id] = { name: src.name, patch, fx, mono: id === "bass" && !!s?.mono }
  }
  return out
}

/** Play a jam in the browser, looping. `from` starts at a bar. */
export function playJam(id: string, jam: Jam, from = 0, onBar?: (bar: number) => void) {
  const sixteenth = 60 / jam.bpm / 4, total = jam.bars * 16
  const sounds = soundsFor(jam.config.style)
  const notes = jam.layers.flatMap((l) => l.notes.map((n) => ({ ...n, layer: l.id }))).sort((a, b) => a.step - b.step)
  let stop = () => {}
  if (!notes.length || !total) return
  toggle(id, 3600, (c, bus, t0) => {
    const chains = Object.fromEntries((["bass", "chords", "pad", "lead"] as const).map((l) => {
      const ch = fxChain(c, bus)
      ch.set(sounds[l].fx, jam.bpm)
      return [l, ch]
    })) as Record<Exclude<LayerId, "drums">, ReturnType<typeof fxChain>>
    const prev: Partial<Record<LayerId, number>> = {}
    let pass = 0, dPass = 0, i = notes.findIndex((n) => n.step >= from * 16), duckStep = from * 16
    if (i < 0) i = 0
    const start = t0 - from * 16 * sixteenth
    const tick = () => {
      const until = horizon(c)
      for (;;) {
        // Sidechain on each beat, for sounds that duck.
        const duckAt = start + (dPass * total + duckStep) * sixteenth
        if (duckAt >= until) break
        for (const l of ["bass", "chords", "pad", "lead"] as const) {
          const d = sounds[l].fx.duck
          if (d) { chains[l].duck.gain.setValueAtTime(1 - d, duckAt + 0.005); chains[l].duck.gain.setTargetAtTime(1, duckAt + 0.01, 0.07) }
        }
        duckStep += 4
        if (duckStep >= total) { duckStep = 0; dPass++ }
      }
      for (;;) {
        if (i >= notes.length) { i = 0; pass++ }
        const n = notes[i]
        const at = start + (pass * total + n.step) * sixteenth
        if (at >= until) break
        if (at >= c.currentTime - 0.05) {
          if (n.layer === "drums") { const k = GM[n.midi]; if (k) drum(c, bus, at, k, n.vel * 0.5) }
          else {
            const s = sounds[n.layer]
            voice(c, chains[n.layer].input, at, n.midi, n.len * sixteenth, s.patch, jam.bpm, s.mono ? prev[n.layer] : undefined)
            if (s.mono) prev[n.layer] = n.midi
          }
        }
        i++
      }
    }
    tick()
    const timer = startClock(tick)
    stop = () => stopClock(timer)
  }, (el) => {
    const step = Math.floor(el / sixteenth) + from * 16
    const bar = Math.floor((step % total) / 16)
    setPos(bar)
    onBar?.(bar)
  }, () => stop())
}
