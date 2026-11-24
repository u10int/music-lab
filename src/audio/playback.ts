import { useSyncExternalStore } from "react"
import { allNotesOff } from "@/midi/midi-out"
import { audio, masterBus } from "./engine"

/**
 * One thing plays at a time. A schedule function lays out the sound and returns
 * its length in seconds (or uses the duration passed in).
 */
export type Schedule = (ctx: AudioContext, out: AudioNode, t0: number) => number | void
interface Playing { id: string; bus: GainNode; t0: number; timer: number; raf: number; onEnd?: () => void }

let playing: Playing | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function stop() {
  if (!playing) return
  const p = playing
  playing = null
  clearTimeout(p.timer)
  cancelAnimationFrame(p.raf)
  allNotesOff()
  try {
    const c = audio()!
    p.bus.gain.setTargetAtTime(0, c.currentTime, 0.02)
    setTimeout(() => p.bus.disconnect(), 250)
  } catch {
    /* already gone */
  }
  p.onEnd?.()
  emit()
}

export function toggle(id: string, dur: number, schedule: Schedule, onFrame?: (elapsed: number) => void, onEnd?: () => void) {
  const was = playing?.id
  stop()
  if (was === id) return
  const c = audio()
  if (!c) return
  const bus = c.createGain()
  bus.connect(masterBus())
  const t0 = c.currentTime + 0.06
  const len = schedule(c, bus, t0)
  const total = typeof len === "number" ? len : dur
  const p: Playing = { id, bus, t0, timer: 0, raf: 0, onEnd }
  p.timer = window.setTimeout(() => {
    if (playing === p) stop()
  }, (total + 0.3) * 1000)
  if (onFrame) {
    const loop = () => {
      if (playing !== p) return
      onFrame(c.currentTime - t0)
      p.raf = requestAnimationFrame(loop)
    }
    p.raf = requestAnimationFrame(loop)
  }
  playing = p
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** The id of whatever is playing, or null. */
export function usePlayingId() {
  return useSyncExternalStore(subscribe, () => playing?.id ?? null)
}
