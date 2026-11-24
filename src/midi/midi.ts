import { useSyncExternalStore } from "react"
import { playNote } from "@/audio/engine"

/**
 * Web MIDI input shared across the app. Any connected input (Push in User mode,
 * a keyboard, a pad controller) feeds one set of held notes.
 */
export type MidiStatus = "idle" | "unsupported" | "denied" | "ready"
export interface MidiState {
  status: MidiStatus
  inputs: string[]
  /** MIDI note numbers currently held, in the order they were pressed. */
  held: number[]
  /** Increments on every note-on, so listeners can react to repeated notes. */
  hits: number
  lastNote: number | null
  lastVelocity: number
  /** Play incoming notes through the app's synth. */
  monitor: boolean
}

let state: MidiState = { status: "idle", inputs: [], held: [], hits: 0, lastNote: null, lastVelocity: 0, monitor: true }
try {
  state.monitor = localStorage.getItem("music-lab-midi-monitor") !== "false"
} catch {
  /* ignore */
}
const listeners = new Set<() => void>()
const noteListeners = new Set<(note: number, velocity: number) => void>()
const set = (patch: Partial<MidiState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const midiSupported = () => typeof navigator !== "undefined" && "requestMIDIAccess" in navigator

let access: MIDIAccess | null = null

function onMessage(e: MIDIMessageEvent) {
  const d = e.data
  if (!d || d.length < 3) return
  const cmd = d[0] & 0xf0, note = d[1], vel = d[2]
  if (cmd === 0x90 && vel > 0) {
    set({ held: [...state.held.filter((n) => n !== note), note], hits: state.hits + 1, lastNote: note, lastVelocity: vel })
    if (state.monitor) playNote(note, { level: 0.12 + (vel / 127) * 0.22 })
    noteListeners.forEach((l) => l(note, vel))
  } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
    set({ held: state.held.filter((n) => n !== note) })
  } else if (cmd === 0xb0 && (note === 123 || note === 120)) {
    set({ held: [] })
  }
}

function wire() {
  if (!access) return
  const names: string[] = []
  access.inputs.forEach((input) => {
    input.onmidimessage = onMessage
    names.push(input.name ?? "MIDI input")
  })
  set({ status: "ready", inputs: names, held: [] })
}

/** Ask the browser for MIDI access. Call from a click. */
export async function connectMidi() {
  if (!midiSupported()) {
    set({ status: "unsupported" })
    return
  }
  try {
    access = await navigator.requestMIDIAccess()
    access.onstatechange = wire
    wire()
  } catch {
    set({ status: "denied" })
  }
}

export function setMonitor(on: boolean) {
  set({ monitor: on })
  try {
    localStorage.setItem("music-lab-midi-monitor", String(on))
  } catch {
    /* ignore */
  }
}

/** Subscribe to note-on events. Returns an unsubscribe function. */
export function onNote(fn: (note: number, velocity: number) => void) {
  noteListeners.add(fn)
  return () => {
    noteListeners.delete(fn)
  }
}

export function useMidi() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Feed a note from an on-screen pad or key, as if it came from a controller. */
export function tapNote(note: number, velocity = 100, holdMs = 220) {
  set({ held: [...state.held.filter((n) => n !== note), note], hits: state.hits + 1, lastNote: note, lastVelocity: velocity })
  noteListeners.forEach((l) => l(note, velocity))
  setTimeout(() => set({ held: state.held.filter((n) => n !== note) }), holdMs)
}
