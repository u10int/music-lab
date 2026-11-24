import { Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlayingId } from "@/audio/playback"
import { cn } from "@/lib/utils"

/**
 * Toggles a sound. `onPlay` should call `toggle(id, …)` from the playback module.
 * `primary` is the main transport of a tool: large and filled, green while playing.
 */
export function PlayButton({ id, label, onPlay, size = "sm", primary = false, className }: { id: string; label: string; onPlay: () => void; size?: "sm" | "default"; primary?: boolean; className?: string }) {
  const on = usePlayingId() === id
  if (primary) {
    return (
      <Button type="button" size="lg" aria-pressed={on} aria-keyshortcuts="Space" onClick={onPlay} data-transport=""
        className={cn("h-11 min-w-32 gap-2.5 px-5 text-base", on && "bg-[#23782b] text-white hover:bg-[#1c6623]", className)}>
        {on ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        {on ? "Stop" : label}
      </Button>
    )
  }
  return (
    <Button type="button" variant="outline" size={size} aria-pressed={on} onClick={onPlay}
      className={cn(on && "border-transparent bg-[#23782b] text-white hover:bg-[#1c6623] hover:text-white dark:bg-[#23782b]", className)}>
      {on ? <Square className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
      {on ? "Stop" : label}
    </Button>
  )
}
