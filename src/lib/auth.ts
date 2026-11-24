import { useSyncExternalStore } from "react"
import type { User } from "@supabase/supabase-js"
import { getProgress, guestProgress, onCommit, replaceProgress, switchStorage, type Progress } from "@/lib/store"
import { supabase } from "@/lib/supabase"

export type SyncState = "idle" | "loading" | "saving" | "saved" | "error"
interface AuthState {
  /** "disabled" when no Supabase project is configured. */
  status: "disabled" | "loading" | "signed-out" | "signed-in"
  user: User | null
  sync: SyncState
  error: string
}

let state: AuthState = { status: supabase ? "loading" : "disabled", user: null, sync: "idle", error: "" }
const listeners = new Set<() => void>()
const set = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export function useAuth() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

const syncKey = (uid: string) => `music-lab-sync:${uid}`
const lastSynced = (uid: string) => { try { return localStorage.getItem(syncKey(uid)) ?? "" } catch { return "" } }
const markSynced = (uid: string, at: string) => { try { localStorage.setItem(syncKey(uid), at) } catch { /* ignore */ } }

let pending = 0
let dirty = false
async function push(uid: string, data: Progress) {
  if (!supabase) return
  set({ sync: "saving" })
  const updated_at = new Date().toISOString()
  const { error } = await supabase.from("progress").upsert({ user_id: uid, data, updated_at })
  if (error) return set({ sync: "error", error: error.message })
  markSynced(uid, updated_at)
  dirty = false
  set({ sync: "saved", error: "" })
}

/** Fetch the cloud copy; take it if it's newer than what this browser last synced. */
async function pull(uid: string, first: boolean) {
  if (!supabase) return
  if (first) set({ sync: "loading" })
  const { data, error } = await supabase.from("progress").select("data, updated_at").eq("user_id", uid).maybeSingle()
  if (error) return set({ sync: "error", error: error.message })
  if (!data) {
    // First sign-in: bring along what this browser already had.
    if (first) {
      const start = getProgress()
      const guest = guestProgress()
      const used = (p: Progress) => Object.keys(p.done).length + p.sessions.length + p.exports.length
      const seed = guest && used(guest) >= used(start) ? guest : start
      replaceProgress(seed)
      await push(uid, seed)
    }
    return
  }
  if (data.updated_at > lastSynced(uid) && !dirty) {
    replaceProgress(data.data as Progress)
    markSynced(uid, data.updated_at)
  } else if (dirty || data.updated_at < lastSynced(uid)) {
    await push(uid, getProgress())
    return
  }
  set({ sync: "saved", error: "" })
}

function signedIn(user: User) {
  const changed = state.user?.id !== user.id
  set({ status: "signed-in", user })
  if (!changed) return
  switchStorage(user.id)
  void pull(user.id, true)
}
function signedOut() {
  set({ status: "signed-out", user: null, sync: "idle", error: "" })
  switchStorage(null)
}

/** Start listening for sign-in changes and keep progress synced. Call once at startup. */
export function initAuth() {
  if (!supabase) return
  void supabase.auth.getSession().then(({ data }) => (data.session?.user ? signedIn(data.session.user) : signedOut()))
  supabase.auth.onAuthStateChange((_e, session) => {
    if (session?.user) signedIn(session.user)
    else if (state.status !== "loading") signedOut()
  })
  onCommit((p) => {
    const uid = state.user?.id
    if (!uid) return
    dirty = true
    set({ sync: "saving" })
    clearTimeout(pending)
    pending = window.setTimeout(() => void push(uid, p), 1200)
  })
  // Pick up changes made on another device when you come back to this one.
  const refresh = () => { if (state.user && !document.hidden) void pull(state.user.id, false) }
  window.addEventListener("focus", refresh)
  document.addEventListener("visibilitychange", refresh)
  // Don't lose a change made just before closing the tab.
  window.addEventListener("pagehide", () => { if (dirty && state.user) void push(state.user.id, getProgress()) })
}

const back = () => window.location.origin + window.location.pathname + window.location.search
export async function signInWithGitHub() {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: back() } })
  if (error) set({ error: error.message })
}
export async function signInWithEmail(email: string) {
  if (!supabase) return "Accounts aren't set up yet."
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: back() } })
  return error ? error.message : null
}
export async function signOut() {
  if (!supabase) return
  if (dirty && state.user) await push(state.user.id, getProgress())
  await supabase.auth.signOut()
}
/** Delete your cloud progress (this browser keeps its copy until you sign out). */
export async function deleteCloudData() {
  if (!supabase || !state.user) return "Not signed in."
  const { error } = await supabase.from("progress").delete().eq("user_id", state.user.id)
  return error ? error.message : null
}
