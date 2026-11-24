import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import { ArrowRight, Minus, Plus, Square } from "lucide-react"
import { fmtClock, useTimer } from "@/components/practice-timer"
import { cn } from "@/lib/utils"
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
  const timer = useTimer()
  const np = useNowPlaying()
  const showAudio = !!np && np.total >= 4
  if (!timer.running && !showAudio) return null
  const both = timer.running && showAudio
  return (
    <div role="region" aria-label={both ? "Practice timer and now playing" : timer.running ? "Practice timer" : "Now playing"}
      className="sticky bottom-0 z-30 mt-auto border-t border-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className={cn("mx-auto grid w-full max-w-6xl px-4 sm:px-6 lg:px-10", both && "divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0")}>
        {timer.running && <TimerRow secs={timer.secs} href={timer.session?.href ?? "/today"} label={timer.session?.label ?? "Practice session"} padRight={both} />}
        {showAudio && <AudioRow padLeft={both} />}
      </div>
    </div>
  )
}

/** The practice timer: how long, which session, and a way back to it. */
function TimerRow({ secs, href, label, padRight }: { secs: number; href: string; label: string; padRight: boolean }) {
  const { pathname, search } = useLocation()
  const here = pathname + search === href
  return (
    <div className={cn("flex min-w-0 items-center gap-3 py-2 sm:gap-4", padRight && "lg:pr-6")}>
      <span className="text-xl font-medium tabular-nums" role="timer" aria-label={`Practice timer: ${Math.floor(secs / 60)} minutes`}>{fmtClock(secs)}</span>
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">{label}</p>
      {!here && <Button size="sm" asChild><Link to={href}>Back to session<ArrowRight /></Link></Button>}
    </div>
  )
}

function AudioRow({ padLeft }: { padLeft: boolean }) {
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
    <div role="group" aria-label="Now playing" className={cn("min-w-0", padLeft && "lg:pl-6")}>
      <div className="flex items-center gap-3 py-2">
        <div className="hidden h-9 w-24 shrink-0 border sm:block" aria-hidden="true"><Scope bars={false} /></div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{np.title}{np.detail && <span className="text-muted-foreground font-normal"> · {np.detail}</span>}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {np.total > 600 ? fmt(el) : `${fmt(Math.min(el, np.total))} / ${fmt(np.total)}`}
            {away && <> · <Link to={np.href} className="text-foreground underline">Open</Link></>}
          </p>
        </div>
        {np.tempo && bpm !== undefined && (
          <div className="flex items-center" role="group" aria-label="Tempo">
            <Button variant="outline" size="icon-xs" aria-label="Slower" onClick={() => setBpm(bpm - 1)}><Minus /></Button>
            <span className="w-14 text-center text-xs tabular-nums" aria-live="polite">{bpm} BPM</span>
            <Button variant="outline" size="icon-xs" aria-label="Faster" onClick={() => setBpm(bpm + 1)}><Plus /></Button>
          </div>
        )}
        <Button size="sm" onClick={stop} className="bg-[#23782b] text-white hover:bg-[#1c6623] dark:bg-[#23782b] dark:hover:bg-[#1c6623]">
          <Square className="size-3 fill-current" />Stop
        </Button>
      </div>
    </div>
  )
}
