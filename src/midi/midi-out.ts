import { useSyncExternalStore } from "react"
import { midiSupported } from "./midi"

/**
 * Web MIDI output: send the app's loops to Live (or any synth) through a virtual
 * port such as the IAC Driver on a Mac or loopMIDI on Windows.
 */
export interface MidiOutState {
  status: "idle" | "unsupported" | "denied" | "ready"
  outputs: { id: string; name: string }[]
  /** Output port id, or "" to keep MIDI out off. */
  selected: string
  /** Keep playing the browser's own sounds while sending MIDI. */
  echo: boolean
}

const PREF = "music-lab-midi-out"
let state: MidiOutState = { status: "idle", outputs: [], selected: "", echo: false }
try {
  const saved = JSON.parse(localStorage.getItem(PREF) ?? "{}")
  state = { ...state, selected: saved.selected ?? "", echo: !!saved.echo }
} catch {
  /* ignore */
}
const listeners = new Set<() => void>()
const set = (patch: Partial<MidiOutState>) => {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(PREF, JSON.stringify({ selected: state.selected, echo: state.echo }))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

let access: MIDIAccess | null = null
function wire() {
  if (!access) return
  const outputs: MidiOutState["outputs"] = []
  access.outputs.forEach((o) => outputs.push({ id: o.id, name: o.name ?? "MIDI output" }))
  set({ status: "ready", outputs })
}

/** Ask for MIDI access and list the output ports. Call from a click. */
export async function connectMidiOut() {
  if (!midiSupported()) return set({ status: "unsupported" })
  try {
    access = await navigator.requestMIDIAccess()
    access.addEventListener("statechange", wire)
    wire()
  } catch {
    set({ status: "denied" })
  }
}

export const selectOutput = (id: string) => {
  allNotesOff()
  set({ selected: id })
}
export const setEcho = (echo: boolean) => set({ echo })

function port() {
  if (!access || !state.selected) return null
  const o = access.outputs.get(state.selected)
  return o && o.state === "connected" ? o : null
}

/** Is MIDI being sent right now? */
export const midiOutActive = () => port() !== null
/** Should the browser make its own sound? True unless MIDI out is on without echo. */
export const browserSound = () => !port() || state.echo

/**
 * Convert an AudioContext time to a performance.now() timestamp, so MIDI and
 * audio scheduled for the same moment line up.
 */
export function perfTime(ctx: BaseAudioContext, t: number) {
  const ac = ctx as AudioContext
  const ts = typeof ac.getOutputTimestamp === "function" ? ac.getOutputTimestamp() : null
  if (ts?.contextTime !== undefined && ts.performanceTime) return ts.performanceTime + (t - ts.contextTime) * 1000
  return performance.now() + (t - ctx.currentTime) * 1000
}

const sounding = new Set<string>()
/** Send a note with its note-off, timed to an AudioContext time. Channel is 0–15. */
export function sendNote(ctx: BaseAudioContext, t: number, note: number, velocity: number, durSec: number, channel = 0) {
  const o = port()
  if (!o) return
  const at = Math.max(performance.now(), perfTime(ctx, t)), ch = channel & 15, n = note & 127
  o.send([0x90 | ch, n, Math.max(1, Math.min(127, Math.round(velocity)))], at)
  o.send([0x80 | ch, n, 0], at + Math.max(10, durSec * 1000))
  sounding.add(ch + ":" + n)
}

/** Stop everything on every channel (used when playback stops or the port changes). */
export function allNotesOff() {
  const o = port()
  if (!o) return
  ;(o as MIDIOutput & { clear?: () => void }).clear?.()
  for (const k of sounding) {
    const [ch, n] = k.split(":").map(Number)
    o.send([0x80 | ch, n, 0])
  }
  sounding.clear()
  for (let ch = 0; ch < 16; ch++) o.send([0xb0 | ch, 123, 0])
}

export function useMidiOut() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
