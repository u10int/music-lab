/**
 * A steady tick for the lookahead schedulers. Timers on the page are slowed to
 * once a second (or less) when the tab is hidden, which starves the schedulers
 * and makes loops stop. That happens when Live or another app covers the
 * browser. Timers inside a worker keep running, so ticks come from one.
 */
type Fn = () => void
const fns = new Map<number, Fn>()
let nextId = 1
let worker: Worker | null = null
let triedWorker = false

function getWorker() {
  if (triedWorker) return worker
  triedWorker = true
  try {
    const src = "const t={};onmessage=(e)=>{const[d,id,ms]=e.data;if(d==='start')t[id]=setInterval(()=>postMessage(id),ms);else{clearInterval(t[id]);delete t[id]}}"
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })))
    worker.onmessage = (e) => fns.get(e.data)?.()
  } catch {
    worker = null
  }
  return worker
}

/** Call `fn` every `ms` milliseconds, even in a background tab. Returns an id for stopClock. */
export function startClock(fn: Fn, ms = 25): number {
  const id = nextId++
  const w = getWorker()
  if (w) {
    fns.set(id, () => { try { fn() } catch (err) { console.error(err) } })
    w.postMessage(["start", id, ms])
    return id
  }
  return -window.setInterval(fn, ms)
}
export function stopClock(id: number) {
  if (id < 0) return clearInterval(-id)
  fns.delete(id)
  worker?.postMessage(["stop", id])
}

/** How far ahead to schedule: further when the tab is hidden, so ticks can arrive late without gaps. */
export function horizon(c: BaseAudioContext) {
  return c.currentTime + (typeof document !== "undefined" && document.hidden ? 1.2 : 0.15)
}
