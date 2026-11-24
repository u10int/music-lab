import { useSyncExternalStore } from "react"
import { SPRINTS } from "@/data/sprints"

/** Same shape as the original Push Sprint Tracker, so its JSON imports directly. */
export interface RefTrack { id: string; track: string; borrow: string; url: string }
export interface ExportEntry { id: string; date: string; note: string }
export interface PlanSection { id: string; name: string; bars: number; energy: number }
export interface PlanLane { id: string; name: string; fx?: boolean; cells: Record<string, string> }
export interface TrackPlan { title: string; tempo: number; sections: PlanSection[]; lanes: PlanLane[] }
export interface Session { id: string; date: string; minutes: number; focus: string; note: string }
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
  sessions: Session[]
  /** Flashcard scheduling: Leitner box and next due date per card. */
  cards: Record<string, { box: number; due: string; intro?: string }>
  /** The person's own track plan (see the Track planner). */
  plan: TrackPlan | null
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
const blank = (): Progress => ({ start: nextMonday(), done: {}, shipped: {}, log: {}, genre: "all", refs: {}, exports: [], ear: {}, push: "p3", sessions: [], cards: {}, plan: null })

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

/* ---------- Practice stats ---------- */
export const isoOf = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
export function minutesByDay(p: Progress) {
  const m = new Map<string, number>()
  for (const s of p.sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.minutes)
  return m
}
/** Consecutive days with practice, ending today (or yesterday, so the streak isn't lost before you practice today). */
export function streaks(p: Progress) {
  const days = minutesByDay(p)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (!days.has(isoOf(d))) d.setDate(d.getDate() - 1)
  let current = 0
  while (days.has(isoOf(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }
  const sorted = [...days.keys()].sort()
  let longest = 0, run = 0, prev: Date | null = null
  for (const iso of sorted) {
    const x = new Date(iso + "T00:00:00")
    run = prev && Math.round((x.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = x
  }
  return { current, longest }
}
/** Monday of the week containing `d`. */
export function mondayOf(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
export function minutesThisWeek(p: Progress) {
  const start = isoOf(mondayOf(new Date()))
  return p.sessions.filter((s) => s.date >= start && s.date <= todayISO()).reduce((a, s) => a + s.minutes, 0)
}
export const WEEKLY_GOAL_MIN = 9 * 60
export const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`)
