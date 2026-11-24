import { useEffect, useState } from "react"
import { useLocation } from "react-router"
import { Pause, Play } from "lucide-react"
import { Caption } from "@/components/page"
import { Button } from "@/components/ui/button"
import { setPref, usePref } from "@/lib/store"

/** Where the running timer was started, so the bottom bar can link back to it. */
export interface TimerSession { href: string; label: string }

export const fmtClock = (secs: number) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`
}

/** Seconds since the practice timer started, ticking once a second, or null when it isn't running. */
export function useTimer() {
  const [start] = usePref<number | null>("timer-start", null)
  const [session] = usePref<TimerSession | null>("timer-session", null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!start) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [start])
  return { running: !!start, secs: start ? Math.max(0, Math.floor((now - start) / 1000)) : 0, session }
}

/** Stop the timer from anywhere. The page it was started on picks up the minutes to log. */
export function stopTimer(secs: number) {
  setPref("timer-start", null)
  setPref("timer-stopped", Math.max(1, Math.round(secs / 60)))
}

/** A stopwatch that survives page changes. Stopping hands back whole minutes. */
export function PracticeTimer({ onStop, label }: { onStop: (minutes: number) => void; label?: string }) {
  const [, setStart] = usePref<number | null>("timer-start", null)
  const [stopped, setStopped] = usePref<number | null>("timer-stopped", null)
  const { running, secs } = useTimer()
  const loc = useLocation()
  // Stopped from the bottom bar: fill in the minutes here.
  useEffect(() => {
    if (stopped === null) return
    onStop(stopped)
    setStopped(null)
  })
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="font-display text-4xl font-medium tabular-nums" aria-live="off">{fmtClock(secs)}</span>
      {running ? (
        <Button onClick={() => { onStop(Math.max(1, Math.round(secs / 60))); setStart(null) }}><Pause className="fill-current" />Stop and log</Button>
      ) : (
        <Button onClick={() => {
          setPref<TimerSession>("timer-session", { href: loc.pathname + loc.search, label: label ?? "Practice session" })
          setStart(Date.now())
        }}><Play className="fill-current" />Start practice timer</Button>
      )}
      {running && <Caption>The timer keeps running if you switch pages.</Caption>}
    </div>
  )
}
