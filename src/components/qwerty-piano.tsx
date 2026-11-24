import { useEffect, useRef, useState } from "react"
import { holdNote, type ToneOptions } from "@/audio/engine"
import { onNote } from "@/midi/midi"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePref } from "@/lib/store"
import { noteName } from "@/lib/theory"
import { cn } from "@/lib/utils"

/** Ableton's computer MIDI keyboard layout: the home row is white keys, the row above is black keys. */
const KEYS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"]
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
const LEN = KEYS.length

type Play = (midi: number) => (() => void) | void

/**
 * A playable piano for the computer keyboard, like Live's: A–' play notes from
 * the octave you pick, W, E, T, Y, U, O and P are the black keys, and Z and X
 * move down or up an octave. Scale notes are marked and the root is shaded;
 * notes from a MIDI keyboard or Push light up too.
 */
export function QwertyPiano({ scale = [], root = 0, names, chord = [], play, tone, base = 48, label = "Piano", onPlayed }: {
  scale?: number[]; root?: number; names?: string[]; chord?: number[]
  /** Play a note; return a release function to hold it while the key is down. */
  play?: Play
  tone?: ToneOptions
  base?: number
  label?: string
  onPlayed?: (midi: number) => void
}) {
  const [armed, setArmed] = usePref<boolean>("qwerty-piano", true)
  const [oct, setOct] = useState(0)
  const [down, setDown] = useState<number[]>([])
  const held = useRef(new Map<string | number, () => void>())
  const start = base + oct * 12
  const live = useRef({ start, play, tone, onPlayed })
  useEffect(() => {
    live.current = { start, play, tone, onPlayed }
  })

  const noteOn = (key: string | number, midi: number) => {
    if (held.current.has(key)) return
    const { play: p, tone: t, onPlayed: cb } = live.current
    const rel = p ? p(midi) : holdNote(midi, t)
    held.current.set(key, rel || (() => {}))
    setDown((d) => [...d, midi])
    cb?.(midi)
  }
  const noteOff = (key: string | number, midi: number) => {
    held.current.get(key)?.()
    held.current.delete(key)
    setDown((d) => { const i = d.indexOf(midi); return i < 0 ? d : [...d.slice(0, i), ...d.slice(i + 1)] })
  }

  useEffect(() => {
    if (!armed) return
    const map = new Map<string, number>()
    const skip = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return true
      const t = e.target as HTMLElement | null
      return !!t?.closest("input, textarea, select, [contenteditable=true], [role=combobox], [role=dialog], [role=listbox], [role=menu]")
    }
    const kd = (e: KeyboardEvent) => {
      if (e.repeat || skip(e)) return
      const k = e.key.toLowerCase()
      if (k === "z" || k === "x") {
        setOct((o) => Math.max(-2, Math.min(2, o + (k === "z" ? -1 : 1))))
        e.preventDefault()
        return
      }
      const i = KEYS.indexOf(k)
      if (i < 0) return
      e.preventDefault()
      const m = live.current.start + i
      map.set(k, m)
      noteOn(k, m)
    }
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(), m = map.get(k)
      if (m === undefined) return
      map.delete(k)
      noteOff(k, m)
    }
    const blur = () => { for (const [k, m] of map) noteOff(k, m); map.clear() }
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    window.addEventListener("blur", blur)
    return () => {
      blur()
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      window.removeEventListener("blur", blur)
    }
  }, [armed])

  // Light keys for notes played on Push or a MIDI keyboard.
  useEffect(() => onNote((n, v) => {
    if (v > 0) {
      setDown((d) => [...d, n])
      setTimeout(() => setDown((d) => { const i = d.indexOf(n); return i < 0 ? d : [...d.slice(0, i), ...d.slice(i + 1)] }), 250)
    }
  }), [])

  const whites: number[] = [], blacks: { i: number; left: number }[] = []
  for (let i = 0; i < LEN; i++) {
    const pc = (start + i) % 12
    if (WHITE_PCS.includes(pc)) whites.push(i)
    else blacks.push({ i, left: whites.length })
  }
  const nameOf = (pc: number) => {
    const k = scale.indexOf(pc)
    return k >= 0 && names ? names[k] : ""
  }
  const isDown = (m: number) => down.some((d) => d % 12 === m % 12 && (d === m || d < start || d >= start + LEN))
  const keyCls = (i: number, black: boolean) => {
    const m = start + i, pc = m % 12, inScale = scale.includes(pc), on = isDown(m)
    return cn(
      "relative flex touch-none flex-col items-center justify-end gap-0.5 pb-1.5 text-[11px] leading-none select-none transition-[background-color] duration-75",
      black ? "absolute top-0 z-10 h-[58%] w-[6.4%] -translate-x-1/2 bg-[var(--key-black)] text-[var(--key-black-fg)]" : "min-w-0 flex-1 border border-l-0 border-pad-edge bg-card first:border-l",
      !on && pc === root && scale.length > 0 && (black ? "bg-[color-mix(in_oklab,var(--s4)_70%,var(--key-black))]" : "bg-[color-mix(in_oklab,var(--s4)_26%,var(--card))]"),
      !on && chord.includes(pc) && (black ? "bg-[color-mix(in_oklab,var(--s5)_75%,var(--key-black))]" : "bg-[color-mix(in_oklab,var(--s5)_30%,var(--card))]"),
      on && "bg-primary text-primary-foreground",
      scale.length > 0 && !inScale && !on && !black && "text-muted-foreground",
    )
  }
  const keyEl = (i: number, black: boolean, left?: number) => {
    const m = start + i, pc = m % 12
    return (
      <button key={i} type="button" tabIndex={-1} aria-label={`Play ${noteName(m)}`} className={keyCls(i, black)}
        style={left !== undefined ? { left: `${(left / whites.length) * 100}%` } : undefined}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); noteOn("p" + e.pointerId, m) }}
        onPointerUp={(e) => noteOff("p" + e.pointerId, m)} onPointerCancel={(e) => noteOff("p" + e.pointerId, m)}>
        {scale.includes(pc) && <span className={cn("block size-1.5", pc === root ? "bg-current" : "bg-current opacity-40")} aria-hidden="true" />}
        <span className="font-medium">{nameOf(pc)}</span>
        {armed && <span className="opacity-50">{KEYS[i].toUpperCase()}</span>}
      </button>
    )
  }
  return (
    <div className="space-y-2">
      <div className="relative flex h-28 w-full" role="group" aria-label={label}>
        {whites.map((i) => keyEl(i, false))}
        {blacks.map(({ i, left }) => keyEl(i, true, left))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Switch id="qwerty" checked={armed} onCheckedChange={setArmed} />
          <Label htmlFor="qwerty" className="font-normal">Play with your computer keyboard</Label>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Octave">
          <Button variant="outline" size="sm" className="h-7 px-2" aria-keyshortcuts="Z" onClick={() => setOct((o) => Math.max(-2, o - 1))}>Z  Down</Button>
          <span className="text-muted-foreground w-16 text-center text-xs tabular-nums">{noteName(start)}–{noteName(start + LEN - 1)}</span>
          <Button variant="outline" size="sm" className="h-7 px-2" aria-keyshortcuts="X" onClick={() => setOct((o) => Math.min(2, o + 1))}>Up  X</Button>
        </div>
      </div>
    </div>
  )
}
