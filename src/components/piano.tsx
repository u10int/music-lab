import { cn } from "@/lib/utils"

const WHITES = [0, 2, 4, 5, 7, 9, 11]
const BLACKS: [number, number][] = [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]]

/** Two octaves from C. Highlights scale notes, the root and a chord. Keys play when `onPlay` is set. */
export function Piano({ scale, names, root, chord = [], label, onPlay }: { scale: number[]; names: string[]; root: number; chord?: number[]; label: string; onPlay?: (midi: number) => void }) {
  const lab = (pc: number) => {
    const i = scale.indexOf(pc)
    return i === -1 ? "" : names[i]
  }
  const key = (pc: number, o: number, black: boolean, left?: number) => {
    const hit = chord.includes(pc), isRoot = pc === root
    const cls = cn(
      "flex items-end justify-center pb-1.5 text-[11px] select-none",
      black
        ? "absolute top-0 z-10 h-[60%] w-[7%] -translate-x-1/2 rounded-b-[3px] bg-[var(--key-black)] text-[var(--key-black-fg)]"
        : "min-w-0 flex-1 rounded-b-[4px] border border-l-0 border-pad-edge bg-card first:border-l",
      isRoot && !hit && (black ? "bg-[color-mix(in_oklab,var(--s4)_70%,var(--key-black))]" : "bg-[color-mix(in_oklab,var(--s4)_28%,var(--card))]"),
      hit && "bg-[var(--c,var(--s5))] text-[var(--on-accent)] font-semibold",
      onPlay && "cursor-pointer",
    )
    const props = { key: `${o}-${pc}`, className: cls, style: left !== undefined ? { left: `${left}%` } : undefined }
    const midi = 60 + o * 12 + pc
    return onPlay ? (
      <button type="button" {...props} aria-label={`Play ${lab(pc) || pc}`} onPointerDown={() => onPlay(midi)}>
        {lab(pc)}
      </button>
    ) : (
      <span {...props}>{lab(pc)}</span>
    )
  }
  return (
    <div className="relative flex h-24 w-full max-w-md" role={onPlay ? "group" : "img"} aria-label={label}>
      {[0, 1].flatMap((o) => WHITES.map((pc) => key(pc, o, false)))}
      {[0, 1].flatMap((o) => BLACKS.map(([pc, wi]) => key(pc, o, true, ((o * 7 + wi + 1) / 14) * 100)))}
    </div>
  )
}
