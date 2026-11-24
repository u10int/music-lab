import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * The control bar at the top of a builder: the main play button first, the
 * settings that shape the sound next, and output actions (save, export) at the
 * end. It stays in view while you scroll on wider screens, and Space presses
 * the play button.
 */
export function Toolbar({ transport, children, actions, className }: { transport: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      // Leave Space alone where it already means something: typing, buttons, sliders, menus.
      if (t && (t.closest("input, textarea, select, button, [role=slider], [role=combobox], [role=option], [role=menuitem], [role=dialog], [contenteditable=true]"))) return
      const btn = ref.current?.querySelector<HTMLButtonElement>("[data-transport]")
      if (!btn) return
      e.preventDefault()
      btn.click()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div ref={ref} role="group" aria-label="Playback and settings"
      className={cn("z-20 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 md:sticky md:top-3 sm:p-4", className)}>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">{transport}</div>
        {children}
        {actions && <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div>}
      </div>
    </div>
  )
}

/** A small hint for the Space shortcut, shown next to the transport on pointer devices. */
export function SpaceHint() {
  return <span className="text-muted-foreground hidden text-xs [@media(hover:hover)]:inline" aria-hidden="true">or press Space</span>
}
