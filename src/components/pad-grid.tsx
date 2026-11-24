import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Visual states for a Push pad. */
export type PadTone = "empty" | "step" | "beat" | "drum" | "loop" | "vel" | "in" | "root" | "off" | "clip" | "play" | "hit"
export interface Pad {
  tone?: PadTone
  label?: ReactNode
  style?: CSSProperties
  /** Makes the pad a button. */
  onPress?: () => void
  aria?: string
  active?: boolean
}

const TONE: Record<PadTone, string> = {
  empty: "bg-pad-empty",
  step: "bg-[color-mix(in_oklab,var(--s5)_26%,var(--card))]",
  beat: "bg-[color-mix(in_oklab,var(--s5)_42%,var(--card))] font-semibold",
  drum: "bg-[color-mix(in_oklab,var(--s1)_38%,var(--card))] font-semibold",
  loop: "bg-card text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--pad-edge)]",
  vel: "bg-[color-mix(in_oklab,var(--s2)_calc(var(--v)*1%),var(--card))]",
  in: "bg-card shadow-[inset_0_0_0_1.5px_var(--pad-edge)]",
  root: "bg-[color-mix(in_oklab,var(--s4)_50%,var(--card))] font-semibold",
  off: "bg-pad-empty text-muted-foreground",
  clip: "bg-[color-mix(in_oklab,var(--tc,var(--s5))_40%,var(--card))]",
  play: "bg-[var(--tc,var(--s5))] shadow-[inset_0_0_0_2px_var(--foreground)]",
  hit: "bg-[var(--c,var(--s5))] text-[var(--on-accent)] font-semibold",
}

export function PadCell({ pad, className }: { pad: Pad; className?: string }) {
  const cls = cn(
    "grid aspect-square min-w-0 place-items-center overflow-hidden rounded-none text-xs leading-none text-foreground",
    TONE[pad.tone ?? "empty"],
    pad.active && "bg-foreground text-background",
    className,
  )
  if (pad.onPress)
    return (
      <button
        type="button"
        aria-label={pad.aria}
        style={pad.style}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button === 0) pad.onPress!()
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            pad.onPress!()
          }
        }}
        className={cn(cls, "cursor-pointer touch-manipulation transition-[scale,background-color] duration-150 ease-out [-webkit-tap-highlight-color:transparent] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring")}
      >
        {pad.label}
      </button>
    )
  return (
    <span className={cls} style={pad.style}>
      {pad.label}
    </span>
  )
}

/**
 * An 8×8 (or any width) grid of pads, top row first. `side` renders a column of
 * labels to the right, like Push's Scene buttons.
 */
export function PadGrid({ rows, label, side, cols = 8, className }: { rows: Pad[][]; label: string; side?: { label: string; on?: boolean }[]; cols?: number; className?: string }) {
  const playable = rows.some((r) => r.some((p) => p.onPress))
  const grid = (
    <div
      className={cn("grid w-full gap-1", !side && "max-w-[360px]", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      {...(side ? {} : playable ? { role: "group", "aria-label": label } : { role: "img", "aria-label": label })}
    >
      {rows.flat().map((p, i) => (
        <PadCell key={i} pad={p} />
      ))}
    </div>
  )
  if (!side) return grid
  return (
    <div className="grid max-w-[410px] grid-cols-[minmax(0,1fr)_44px] gap-2" role="img" aria-label={label}>
      {grid}
      <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {side.map((s, i) => (
          <span
            key={i}
            className={cn(
              "grid place-items-center rounded-none px-0.5 text-[11px] tabular-nums",
              s.on ? "bg-foreground text-background font-semibold" : "bg-card text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PadLegend({ items }: { items: [PadTone, string, CSSProperties?][] }) {
  return (
    <ul className="grid content-start gap-2 text-sm">
      {items.map(([tone, text, style]) => (
        <li key={text} className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5">
          <PadCell pad={{ tone, style }} className="w-[18px]" />
          {text}
        </li>
      ))}
    </ul>
  )
}
