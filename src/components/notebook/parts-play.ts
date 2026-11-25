import { usePlayingId, usePos } from "@/audio/playback"
import { noteName, type NoteEv } from "./parts-model"

/** The app’s colour for what’s playing now. */
export const LIVE = "#23782b"

/**
 * Where playback is in this panel’s window: which play button is on (its id after the
 * panel prefix) and the step, in 16ths from the window’s start (fractional), or -1.
 */
export function usePlayhead(pid: string) {
  const id = usePlayingId()
  const mine = id?.startsWith(pid + "-") ? id : null
  const pos = usePos(mine ?? "")
  return { what: mine ? mine.slice(pid.length + 1) : null, step: mine && pos >= 0 ? pos : -1 }
}

const sounding = (n: { step: number; len: number }, step: number) => step >= n.step && step < n.step + n.len

/** The note sounding at a step, for the readout. */
export function nowNote(notes: NoteEv[], step: number) {
  if (step < 0) return undefined
  const n = notes.find((x) => sounding(x, step))
  return n ? noteName(n.midi) : undefined
}

