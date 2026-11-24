import { horizon, startClock, stopClock } from "@/audio/clock"
import { drum } from "@/audio/engine"
import { fxChain, voice } from "@/audio/patch"
import { LOOP_STEPS, resolveSound, soundById, SYNTH_PARTS, type LoopNote, type LoopHit, type SynthPart } from "@/lib/loop"
import type { LoopState } from "@/lib/store"

/**
 * Play a loop-builder loop with its sounds. `get` is read on every tick, so the
 * loop can change while it plays. Returns a function that stops the clock.
 */
export function playLoop(
  c: AudioContext, bus: AudioNode, t0: number,
  get: () => { loop: LoopState; events: { notes: LoopNote[]; hits: LoopHit[] } },
  onStep?: (step: number, at: number) => void,
) {
  const chains = Object.fromEntries(SYNTH_PARTS.map((p) => [p, fxChain(c, bus)])) as Record<SynthPart, ReturnType<typeof fxChain>>
  const prev: Partial<Record<SynthPart, number>> = {}
  let next = t0, k = 0
  const tick = () => {
    const { loop: l, events: ev } = get()
    const sixteenth = 60 / l.tempo / 4
    const sounds = Object.fromEntries(SYNTH_PARTS.map((p) => {
      const s = soundById(l.sounds[p])
      return [p, s ? { s, ...resolveSound(s) } : null]
    })) as Record<SynthPart, (ReturnType<typeof resolveSound> & { s: NonNullable<ReturnType<typeof soundById>> }) | null>
    for (const p of SYNTH_PARTS) if (sounds[p]) chains[p].set(sounds[p]!.fx, l.tempo)
    while (next < horizon(c)) {
      const i = k % LOOP_STEPS, at = next + (i % 2 ? l.swing * sixteenth : 0)
      for (const h of ev.hits) if (h.step === i) drum(c, bus, at, h.lane, h.vel * 0.6)
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
        if (!snd) continue
        voice(c, chains[n.part].input, at + (n.step - i) * sixteenth, n.midi, n.len * sixteenth, snd.patch, l.tempo, n.mono ? prev[n.part] : undefined)
        if (n.mono) prev[n.part] = n.midi
      }
      onStep?.(i, at - t0)
      next += sixteenth
      k++
    }
  }
  tick()
  const id = startClock(tick)
  return () => stopClock(id)
}
