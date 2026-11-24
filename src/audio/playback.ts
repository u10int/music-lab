import { useSyncExternalStore } from "react"
import { allNotesOff } from "@/midi/midi-out"
import { audio, masterBus } from "./engine"

/**
 * One thing plays at a time. A schedule function lays out the sound and returns
 * its length in seconds (or uses the duration passed in).
 */
export type Schedule = (ctx: AudioContext, out: AudioNode, t0: number) => number | void
export interface TempoControl { get: () => number; set: (bpm: number) => void; min: number; max: number }
interface Playing {
  id: string; bus: GainNode; t0: number; total: number; timer: number; raf: number; onEnd?: () => void
  /** Where it started and what it is, for the now-playing bar. */
  title: string; detail: string; href: string
  tempo?: TempoControl
}

let playing: Playing | null = null
let pos = -1
const listeners = new Set<() => void>()
const posListeners = new Set<() => void>()
let snapshot: NowPlaying | null = null
const emit = () => {
  snapshot = playing ? { id: playing.id, title: playing.title, detail: playing.detail, href: playing.href, t0: playing.t0, total: playing.total, tempo: playing.tempo } : null
  listeners.forEach((l) => l())
}

export function stop() {
  if (!playing) return
  const p = playing
  playing = null
  pos = -1
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
  posListeners.forEach((l) => l())
}

/** Describe what's starting from the button that was pressed and the page it's on. */
function describe() {
  const h1 = document.querySelector("main h1")?.textContent?.trim() ?? document.title
  const el = document.activeElement as HTMLElement | null
  let detail = (el?.getAttribute("aria-label") || el?.textContent || "").trim()
  detail = detail.replace(/^(play|stop)\s+(a |the )?/i, "")
  if (!detail || /^(play|stop)$/i.test(detail) || detail.toLowerCase() === h1.toLowerCase()) detail = ""
  else detail = detail[0].toUpperCase() + detail.slice(1)
  return { title: h1, detail, href: location.pathname + location.search }
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
  const p: Playing = { id, bus, t0, total, timer: 0, raf: 0, onEnd, ...describe() }
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

/**
 * Let the now-playing bar change this loop's tempo, and keep it playing when
 * you move to another page. Call right after `toggle`.
 */
export function bindTempo(id: string, tempo: TempoControl) {
  if (playing?.id !== id) return
  playing.tempo = tempo
  emit()
}
/** Loops with a bound tempo keep playing across pages; everything else stops. */
export const keepsPlaying = () => !!playing?.tempo

/** The step a loop is on, set from its frame callback. */
export function setPos(step: number) {
  if (step === pos) return
  pos = step
  posListeners.forEach((l) => l())
}
const subPos = (l: () => void) => {
  posListeners.add(l)
  return () => posListeners.delete(l)
}
/** The current step of `id` while it plays, or -1. */
export function usePos(id: string) {
  return useSyncExternalStore(subPos, () => (playing?.id === id ? pos : -1))
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** The id of whatever is playing, or null. */
export function usePlayingId() {
  return useSyncExternalStore(subscribe, () => playing?.id ?? null)
}
export interface NowPlaying { id: string; title: string; detail: string; href: string; t0: number; total: number; tempo?: TempoControl }
/** What's playing, for the now-playing bar. The object changes only when playback starts, stops or binds a tempo. */
export function useNowPlaying(): NowPlaying | null {
  return useSyncExternalStore(subscribe, () => snapshot)
}
