import { useSyncExternalStore } from "react"
import { SPRINTS } from "@/data/sprints"

/** Same shape as the original Push Sprint Tracker, so its JSON imports directly. */
export interface RefTrack { id: string; track: string; borrow: string; url: string }
export interface ExportEntry { id: string; date: string; note: string }
export interface Progress {
  start: string
  done: Record<string, boolean>
  shipped: Record<string, boolean>
  log: Record<string, string>
  genre: "all" | "wave" | "phonk" | "prog"
  refs: Record<string, RefTrack[]>
  exports: ExportEntry[]
  ear: Record<string, { right: number; total: number }>
  push: "p3" | "p2"
}

const KEY = "music-lab-progress-v1"
const isoDate = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
export const todayISO = () => isoDate(new Date())
function nextMonday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7))
  return isoDate(d)
}
const blank = (): Progress => ({ start: nextMonday(), done: {}, shipped: {}, log: {}, genre: "all", refs: {}, exports: [], ear: {}, push: "p3" })

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...blank(), ...JSON.parse(raw) }
  } catch {
    /* private mode or bad JSON: start fresh */
  }
  return blank()
}

let state = load()
const listeners = new Set<() => void>()
function commit(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked; keep in memory */
  }
  listeners.forEach((l) => l())
}

export function update(fn: (draft: Progress) => void) {
  const next = structuredClone(state)
  fn(next)
  commit(next)
}
export function useProgress() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Accepts this app's export or the old tracker's JSON. Returns an error message or null. */
export function importProgress(json: string): string | null {
  try {
    const data = JSON.parse(json)
    if (!data || typeof data !== "object" || !("done" in data || "start" in data)) return "That file doesn't look like tracker progress."
    commit({ ...blank(), ...data })
    return null
  } catch {
    return "Couldn't read that file. Pick a .json file exported from the tracker or this app."
  }
}
export const exportProgress = () => JSON.stringify(state, null, 2)
export const resetProgress = () => commit(blank())

/* ---------- Schedule helpers ---------- */
export const TOTAL = SPRINTS.reduce((a, s) => a + s.skills.length + 1, 0)
export const startDate = (p: Progress) => new Date(p.start + "T00:00:00")
export function currentWeek(p: Progress) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.floor((today.getTime() - startDate(p).getTime()) / 86400000)
  if (days < 0) return { week: 0, day: -1 }
  return { week: Math.floor(days / 7) + 1, day: today.getDay() }
}
export const sprintForWeek = (w: number) => (w < 1 ? 0 : Math.min(5, Math.ceil(w / 2) - 1))
export function weekStart(p: Progress, w: number) {
  const d = startDate(p)
  d.setDate(d.getDate() + (w - 1) * 7)
  return d
}
export function weekOf(p: Progress, iso: string) {
  const days = Math.floor((new Date(iso + "T00:00:00").getTime() - startDate(p).getTime()) / 86400000)
  return days < 0 ? 0 : Math.floor(days / 7) + 1
}
export function countDone(p: Progress) {
  let n = 0
  for (const s of SPRINTS) {
    s.skills.forEach((_, i) => {
      if (p.done[s.id + "-" + i]) n++
    })
    if (p.shipped[s.id]) n++
  }
  return n
}
export const fmtDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export function safeUrl(u: string) {
  u = (u || "").trim()
  if (!u) return ""
  if (!/^https?:\/\//i.test(u)) u = "https://" + u
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(u) ? u : ""
}

/** Small persisted UI preference (key, scale, tab…), per browser. */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const k = "music-lab-pref-" + key
  const value = useSyncExternalStore(
    (l) => {
      prefListeners.add(l)
      return () => prefListeners.delete(l)
    },
    () => readPref(k, initial),
  )
  const set = (v: T) => {
    prefCache.set(k, v)
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* ignore */
    }
    prefListeners.forEach((l) => l())
  }
  return [value, set]
}
const prefListeners = new Set<() => void>()
const prefCache = new Map<string, unknown>()
function readPref<T>(k: string, initial: T): T {
  if (prefCache.has(k)) return prefCache.get(k) as T
  let v = initial
  try {
    const raw = localStorage.getItem(k)
    if (raw !== null) v = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  prefCache.set(k, v)
  return v
}
