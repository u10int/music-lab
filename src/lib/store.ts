import { useSyncExternalStore } from "react"
import { SPRINTS } from "@/data/sprints"

/** Same shape as the original Push Sprint Tracker, so its JSON imports directly. */
export interface RefTrack { id: string; track: string; borrow: string; url: string }
export interface ExportEntry { id: string; date: string; note: string }
export interface PlanSection { id: string; name: string; bars: number; energy: number }
export interface PlanLane { id: string; name: string; fx?: boolean; cells: Record<string, string> }
export interface TrackPlan { title: string; tempo: number; sections: PlanSection[]; lanes: PlanLane[] }
export interface Session { id: string; date: string; minutes: number; focus: string; note: string }
export type LoopPart = "drums" | "bass" | "chords" | "lead"
export interface LoopState {
  family: string
  drums: string
  sounds: { bass: string; chords: string; lead: string }
  prog: number[]
  tempo: number
  swing: number
  follow: boolean
  mix: Record<LoopPart, { vol: number; mute: boolean }>
  solo: LoopPart | null
  /** A melody from the melody lab that replaces the lead sound's own phrase. */
  melody?: { step: number; len: number; deg: number }[] | null
}
export interface SavedLoop { id: string; name: string; date: string; root: number; scale: string; loop: LoopState }
export interface RefMarker { id: string; t: number; label: string; energy: number; note: string }
/** A note pinned to a moment in a reference track, like a comment on a waveform. */
export interface RefComment { id: string; t: number; text: string }
/** The reference's audio file (stored separately) and what the analysis found. */
export interface RefAudio { path: string; name: string; size: number; analysis: import("./audio-analysis-core").Analysis }
export interface RefNote { id: string; title: string; artist: string; url: string; tempo: number; date: string; notes: string; markers: RefMarker[]; audio?: RefAudio; comments?: RefComment[]; key?: { root: number; minor: boolean } }
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
  /** Loops saved from the loop builder. */
  loops: SavedLoop[]
  /** Reference track notebook. */
  notebook: RefNote[]
  /** Walkthrough steps ticked off, per skill ("s1-0" → step indexes). */
  skillSteps: Record<string, number[]>
  /** Ear training results per quiz and answer ("intervals" → "Major 3rd" → score), for adaptive questions. */
  earDetail: Record<string, Record<string, Score>>
  /** Ear training results per day and quiz, for the weekly review. */
  earDays: Record<string, Record<string, Score>>
  /** When each skill or deliverable was ticked off. */
  doneAt: Record<string, string>
  /** Weekly review notes, keyed by the week's Monday. */
  reviews: Record<string, { well: string; hard: string; goal: string }>
  /** Plan days marked done by hand, keyed by date. A day also counts as done once its planned minutes are logged. */
  daysDone?: Record<string, boolean>
  /** End-of-day reflections, keyed by date. */
  reflections?: Record<string, Reflection>
  /** Latest 1–5 confidence per skill, from reflections. */
  skillConf?: Record<string, number>
  /** Proof of work: notes, images and audio attached to plan steps. Files live in storage; this keeps the record. */
  proofs?: Proof[]
  /** Skill checks passed: skill key → date and seconds taken. */
  skillTests?: Record<string, { at: string; secs: number }>
  /** End-of-sprint retrospectives. */
  retros?: Record<string, { well: string; change: string; carry: string; at: string }>
  /** Weekly challenges done, by plan week. */
  challenges?: Record<string, string>
  /** Days of the week you practice (0 = Sunday). Other days are rest days and never count as missed. */
  practiceDays?: number[]
}
export interface Reflection { clicked: string; hard: string; conf: Record<string, number> }
export interface Proof { id: string; date: string; sprint: string; title: string; kind: "note" | "image" | "audio"; note: string; path?: string; name?: string }
export interface Score { right: number; total: number }

const isoDate = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
export const todayISO = () => isoDate(new Date())
function nextMonday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7))
  return isoDate(d)
}
const blank = (): Progress => ({ start: nextMonday(), done: {}, shipped: {}, log: {}, genre: "all", refs: {}, exports: [], ear: {}, push: "p3", sessions: [], cards: {}, plan: null, loops: [], notebook: [], skillSteps: {}, earDetail: {}, earDays: {}, doneAt: {}, reviews: {} })

const BASE_KEY = "music-lab-progress-v1"
let KEY = BASE_KEY
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
const commitListeners = new Set<(p: Progress) => void>()
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked; keep in memory */
  }
}
function commit(next: Progress, notify = true) {
  state = next
  save()
  listeners.forEach((l) => l())
  if (notify) commitListeners.forEach((l) => l(state))
}

export function update(fn: (draft: Progress) => void) {
  const next = structuredClone(state)
  fn(next)
  // Remember when skills and deliverables were ticked off, for the weekly review.
  next.doneAt ??= {}
  for (const [k, v] of Object.entries(next.done)) if (v && !state.done[k]) next.doneAt[k] = todayISO()
  for (const [k, v] of Object.entries(next.shipped)) if (v && !state.shipped[k]) next.doneAt["ship-" + k] = todayISO()
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

/** Record one ear training answer: overall score, per-answer detail and per-day totals. */
export function recordEar(d: Progress, quiz: string, answer: string, right: boolean) {
  const bump = (s: Score) => { s.total++; if (right) s.right++ }
  bump((d.ear[quiz] ??= { right: 0, total: 0 }))
  d.earDetail ??= {}
  bump(((d.earDetail[quiz] ??= {})[answer] ??= { right: 0, total: 0 }))
  d.earDays ??= {}
  bump(((d.earDays[todayISO()] ??= {})[quiz] ??= { right: 0, total: 0 }))
}

/* ---------- Accounts and sync ---------- */
/** The current progress, for sync code outside React. */
export const getProgress = () => state
/** Called after every local change. */
export function onCommit(fn: (p: Progress) => void) {
  commitListeners.add(fn)
  return () => { commitListeners.delete(fn) }
}
/**
 * Switch storage to a signed-in user's own slot (or back to this browser's guest
 * slot with null). Returns that slot's saved progress, or null if it's empty.
 */
export function switchStorage(userId: string | null) {
  KEY = userId ? `${BASE_KEY}:${userId}` : BASE_KEY
  let has = false
  try { has = localStorage.getItem(KEY) !== null } catch { /* ignore */ }
  commit(load(), false)
  return has
}
/** Replace progress with data from the cloud without sending it back. */
export function replaceProgress(p: Partial<Progress>) {
  commit({ ...blank(), ...p }, false)
}
/** The guest progress saved in this browser before signing in, if any. */
export function guestProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(BASE_KEY)
    if (!raw) return null
    const p = { ...blank(), ...JSON.parse(raw) } as Progress
    const used = Object.keys(p.done).length || p.sessions.length || p.exports.length || Object.keys(p.ear).length || p.loops.length || p.notebook.length
    return used ? p : null
  } catch {
    return null
  }
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
  const set = (v: T) => setPref(key, v)
  return [value, set]
}
/** Write a preference from outside a component (deep links, for example). */
export function setPref<T>(key: string, v: T) {
  const k = "music-lab-pref-" + key
  prefCache.set(k, v)
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore */
  }
  prefListeners.forEach((l) => l())
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
