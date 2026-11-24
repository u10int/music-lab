import { Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlayingId } from "@/audio/playback"

/** Toggles a sound. `onPlay` should call `toggle(id, …)` from the playback module. */
export function PlayButton({ id, label, onPlay, size = "sm" }: { id: string; label: string; onPlay: () => void; size?: "sm" | "default" }) {
  const on = usePlayingId() === id
  return (
    <Button type="button" variant="outline" size={size} aria-pressed={on} onClick={onPlay}>
      {on ? <Square className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
      {on ? "Stop" : label}
    </Button>
  )
}
