import { HW } from "@/data/push"
import { Steps } from "@/components/page"

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Simplified zone map of Push 3, numbered to match the list beside it. */
export function HardwareMap() {
  const num = (n: number, x: number, y: number) => (
    <g className="hw-n" key={n}>
      <circle cx={x} cy={y} r={12} />
      <text x={x} y={y + 4} textAnchor="middle">{n}</text>
    </g>
  )
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <figure className="space-y-2">
        <svg viewBox="0 0 760 620" className="block h-auto w-full" role="img" aria-label="Simplified map of Push 3: encoders and display across the top, the 8 by 8 pad grid in the middle with the touch strip to its left and the Scene and Repeat buttons to its right, recording buttons down the left edge and navigation down the right edge">
          <rect className="hw-body" x={4} y={4} width={752} height={612} rx={18} />
          <circle className="hw-k" cx={152} cy={130} r={17} />
          {range(8).map((i) => <circle key={"e" + i} className="hw-k" cx={208 + i * 50} cy={46} r={15} />)}
          {range(8).map((i) => <rect key={"u" + i} className="hw-btn" x={189 + i * 50} y={78} width={38} height={10} rx={3} />)}
          <rect className="hw-disp" x={186} y={96} width={394} height={68} rx={4} />
          {range(8).map((i) => <rect key={"l" + i} className="hw-btn" x={189 + i * 50} y={172} width={38} height={10} rx={3} />)}
          <rect className="hw-btn" x={146} y={210} width={14} height={390} rx={7} />
          {range(64).map((i) => <rect key={"p" + i} className="hw-pad" x={186 + (i % 8) * 50} y={206 + Math.floor(i / 8) * 50} width={44} height={44} rx={5} />)}
          {range(8).map((i) => <rect key={"s" + i} className="hw-btn" x={592} y={216 + i * 50} width={30} height={24} rx={4} />)}
          {range(12).map((i) => <rect key={"lb" + i} className="hw-btn" x={i % 2 ? 76 : 28} y={84 + Math.floor(i / 2) * 64} width={40} height={22} rx={4} />)}
          {range(10).map((i) => <rect key={"rb" + i} className="hw-btn" x={i % 2 ? 694 : 646} y={180 + Math.floor(i / 2) * 44} width={40} height={22} rx={4} />)}
          <circle className="hw-k" cx={690} cy={96} r={32} />
          <g className="hw-btn">
            <rect x={676} y={436} width={28} height={22} rx={4} />
            <rect x={676} y={500} width={28} height={22} rx={4} />
            <rect x={646} y={468} width={28} height={22} rx={4} />
            <rect x={706} y={468} width={28} height={22} rx={4} />
          </g>
          {num(1, 208, 18)}{num(2, 152, 96)}{num(3, 383, 130)}{num(4, 383, 404)}{num(5, 153, 186)}{num(6, 607, 190)}{num(7, 72, 54)}{num(8, 690, 148)}{num(9, 690, 420)}
        </svg>
        <figcaption className="text-muted-foreground text-sm">A simplified map of the zones, not exact button positions.</figcaption>
      </figure>
      <Steps items={HW.map(([t, d]) => <><b className="font-semibold">{t}.</b> {d}</>)} />
    </div>
  )
}
