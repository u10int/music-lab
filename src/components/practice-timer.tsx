import { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { Caption } from "@/components/page"
import { Button } from "@/components/ui/button"
import { usePref } from "@/lib/store"

/** A stopwatch that survives page changes. Stopping hands back whole minutes. */
export function PracticeTimer({ onStop }: { onStop: (minutes: number) => void }) {
  const [start, setStart] = usePref<number | null>("timer-start", null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!start) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [start])
  const secs = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="font-display text-4xl font-extrabold tabular-nums" aria-live="off">{mmss}</span>
      {start ? (
        <Button onClick={() => { onStop(Math.max(1, Math.round(secs / 60))); setStart(null) }}><Pause className="fill-current" />Stop and log</Button>
      ) : (
        <Button onClick={() => { setNow(Date.now()); setStart(Date.now()) }}><Play className="fill-current" />Start practice timer</Button>
      )}
      {start && <Caption>The timer keeps running if you switch pages.</Caption>}
    </div>
  )
}

