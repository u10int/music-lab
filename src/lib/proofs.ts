import { supabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/auth"

/**
 * Files attached as proof of work. Signed in, they go to a private storage
 * bucket under your own user folder. Without an account they stay in this
 * browser (IndexedDB). Either way the progress record only keeps the path.
 */
const DB = "music-lab-proofs", STORE = "files"
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbDo<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb()
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export const MAX_PROOF_BYTES = 25 * 1024 * 1024
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024

const TYPE_BY_EXT: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", aif: "audio/aiff", aiff: "audio/aiff", webm: "audio/webm" }

/** Store a file and return its path. */
export async function saveProofFile(id: string, file: File, max = MAX_PROOF_BYTES): Promise<string> {
  if (file.size > max) throw new Error(`Files can be up to ${Math.round(max / 1024 / 1024)} MB.`)
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80)
  const user = getAuthUser()
  if (supabase && user) {
    const path = `${user.id}/${id}-${safe}`
    const { error } = await supabase.storage.from("proofs").upload(path, file, { contentType: file.type || TYPE_BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream", upsert: false })
    if (error) throw new Error(error.message)
    return path
  }
  await idbDo("readwrite", (s) => s.put(file, id))
  return "local:" + id
}

const urls = new Map<string, string>()
/** A URL to show or play a stored file. Cloud links last an hour. */
export async function proofUrl(path: string): Promise<string | null> {
  if (urls.has(path)) return urls.get(path)!
  let url: string | null = null
  if (path.startsWith("local:")) {
    const blob = await idbDo<Blob | undefined>("readonly", (s) => s.get(path.slice(6)) as IDBRequest<Blob | undefined>)
    url = blob ? URL.createObjectURL(blob) : null
  } else if (supabase) {
    const { data } = await supabase.storage.from("proofs").createSignedUrl(path, 3600)
    url = data?.signedUrl ?? null
  }
  if (url) urls.set(path, url)
  return url
}

export async function deleteProofFile(path: string) {
  if (path.startsWith("local:")) await idbDo("readwrite", (s) => s.delete(path.slice(6)))
  else if (supabase) await supabase.storage.from("proofs").remove([path])
  urls.delete(path)
}
