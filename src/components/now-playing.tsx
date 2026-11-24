import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { Minus, Pause, Plus, Square, Timer } from "lucide-react"
import { fmtClock, stopTimer, useTimer } from "@/components/practice-timer"
import { audio } from "@/audio/engine"
import { stop, useNowPlaying } from "@/audio/playback"
import { Scope } from "@/components/scope"
import { Button } from "@/components/ui/button"

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/**
 * A bar along the bottom of every page while something longer than a preview
 * plays: what it is, how long it's run, its tempo and a stop button. Loops
 * with a tempo keep playing when you change pages, so this is how to reach them.
 */
export function NowPlayingBar() {
  const audioRow = <AudioRow />, timer = useTimer()
  const np = useNowPlaying()
  const showAudio = !!np && np.total >= 4
  if (!timer.running && !showAudio) return null
  return (
    <div role="region" aria-label="Now playing and practice timer" className="sticky bottom-0 z-30 mt-auto divide-y border-t border-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      {timer.running && <TimerRow secs={timer.secs} href={timer.session?.href ?? "/today"} label={timer.session?.label ?? "Practice session"} />}
      {showAudio && audioRow}
    </div>
  )
}

/** The practice timer, with a link back to the session it belongs to. */
function TimerRow({ secs, href, label }: { secs: number; href: string; label: string }) {
  const { pathname, search } = useLocation()
  const nav = useNavigate()
  const here = pathname + search === href || (href.startsWith(pathname) && !href.includes("?") && !search)
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6 lg:px-10">
      <Timer className="text-muted-foreground hidden size-4 shrink-0 sm:block" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">Practice timer<span className="text-muted-foreground font-normal"> · {label}</span></p>
        {!here && <p className="text-xs"><Link to={href} className="underline">Back to the session</Link></p>}
      </div>
      <span className="text-xl font-medium tabular-nums" aria-label={`${Math.floor(secs / 60)} minutes elapsed`}>{fmtClock(secs)}</span>
      <Button size="sm" variant="outline" onClick={() => { stopTimer(secs); if (!here) nav(href) }}><Pause className="fill-current" />Stop and log</Button>
    </div>
  )
}

function AudioRow() {
  const np = useNowPlaying()
  const { pathname } = useLocation()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!np) return
    const t = window.setInterval(() => tick((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [np])
  if (!np || np.total < 4) return null
  const el = Math.max(0, (audio()?.currentTime ?? np.t0) - np.t0)
  const bpm = np.tempo?.get()
  const setBpm = (v: number) => {
    if (!np.tempo) return
    np.tempo.set(Math.max(np.tempo.min, Math.min(np.tempo.max, v)))
    tick((x) => x + 1)
  }
  const away = np.href.split("?")[0] !== pathname
  return (
    <div role="group" aria-label="Now playing">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6 lg:px-10">
        <div className="hidden h-9 w-28 shrink-0 border sm:block" aria-hidden="true"><Scope bars={false} /></div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{np.title}{np.detail && <span className="text-muted-foreground font-normal"> · {np.detail}</span>}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {np.total > 600 ? fmt(el) : `${fmt(Math.min(el, np.total))} / ${fmt(np.total)}`}
            {away && <> · <Link to={np.href} className="text-foreground underline">Open</Link></>}
          </p>
        </div>
        {np.tempo && bpm !== undefined && (
          <div className="flex items-center" role="group" aria-label="Tempo">
            <Button variant="outline" size="icon-sm" aria-label="Slower" onClick={() => setBpm(bpm - 1)}><Minus /></Button>
            <span className="w-[4.5rem] text-center text-sm tabular-nums" aria-live="polite">{bpm} BPM</span>
            <Button variant="outline" size="icon-sm" aria-label="Faster" onClick={() => setBpm(bpm + 1)}><Plus /></Button>
          </div>
        )}
        <Button size="sm" onClick={stop} className="bg-[#23782b] text-white hover:bg-[#1c6623] dark:bg-[#23782b] dark:hover:bg-[#1c6623]">
          <Square className="size-3 fill-current" />Stop
        </Button>
      </div>
    </div>
  )
}
