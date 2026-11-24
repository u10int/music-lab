import type { Envelope } from "@/data/labs"
import { fmtHz, fmtS } from "@/lib/theory"

/** ADSR envelope, drawn to scale. */
export function EnvelopeSVG({ env }: { env: Envelope }) {
  const { a, d, s, r } = env, hold = 0.5, total = Math.max(a + d + hold + r, 1)
  const W = 320, H = 110, top = 10, bot = 92
  const x = (t: number) => (t / total) * W, y = (v: number) => bot - v * (bot - top)
  const pts = [[0, y(0)], [x(a), y(1)], [x(a + d), y(s)], [x(a + d + hold), y(s)], [x(a + d + hold + r), y(0)]]
  const path = "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join(" L")
  const lbl = (t0: number, t1: number, txt: string) => (
    <text className="vtext" x={((x(t0) + x(t1)) / 2).toFixed(1)} y={106} textAnchor="middle">{txt}</text>
  )
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="vsvg" role="img" aria-label={`Envelope: attack ${fmtS(a)}, decay ${fmtS(d)}, sustain ${Math.round(s * 100)}%, release ${fmtS(r)}`}>
      <line className="vgrid" x1={0} y1={bot} x2={W} y2={bot} />
      <path className="varea" d={`${path} L${x(a + d + hold + r).toFixed(1)} ${bot} Z`} />
      <path className="vline" d={path} />
      {lbl(0, a, "A")}{lbl(a, a + d, "D")}{lbl(a + d, a + d + hold, "S")}{lbl(a + d + hold, a + d + hold + r, "R")}
    </svg>
  )
}

export const qOf = (res: number) => 0.6 + res * 11

/** Low-pass filter response on a log frequency axis. */
export function FilterSVG({ cutoff, res }: { cutoff: number; res: number }) {
  const W = 320, H = 110, fmin = 20, fmax = 20000, dbTop = 18, dbBot = -30, Q = qOf(res)
  const x = (f: number) => (Math.log(f / fmin) / Math.log(fmax / fmin)) * W
  const y = (db: number) => ((dbTop - Math.max(dbBot, Math.min(dbTop, db))) / (dbTop - dbBot)) * (H - 14)
  let p = ""
  for (let i = 0; i <= 140; i++) {
    const f = fmin * Math.pow(fmax / fmin, i / 140), k = f / cutoff
    const mag = 1 / Math.sqrt(Math.pow(1 - k * k, 2) + Math.pow(k / Q, 2))
    p += (i ? " L" : "M") + x(f).toFixed(1) + " " + y(20 * Math.log10(mag)).toFixed(1)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="vsvg" role="img" aria-label={`Low-pass filter at ${fmtHz(cutoff)}, resonance ${Math.round(res * 100)}%`}>
      {[100, 1000, 10000].map((f) => (
        <g key={f}>
          <line className="vgrid" x1={x(f)} y1={0} x2={x(f)} y2={H - 14} />
          <text className="vtext" x={x(f)} y={H} textAnchor="middle">{fmtHz(f)}</text>
        </g>
      ))}
      <line className="vgrid" x1={0} y1={y(0)} x2={W} y2={y(0)} />
      <path className="varea" d={`${p} L${W} ${H - 14} L0 ${H - 14} Z`} />
      <path className="vline" d={p} />
      <line className="vmark" x1={x(cutoff)} y1={0} x2={x(cutoff)} y2={H - 14} />
    </svg>
  )
}

/** A generic envelope explainer with labelled stages (no live values). */
export function EnvelopeExplainer() {
  return (
    <svg viewBox="0 0 320 120" className="vsvg" role="img" aria-label="Envelope: attack rises, decay falls to the sustain level, release fades after the key is let go">
      <line className="vgrid" x1={0} y1={96} x2={320} y2={96} />
      <path className="varea" d="M0 96 L40 16 L100 48 L220 48 L300 96 Z" />
      <path className="vline" d="M0 96 L40 16 L100 48 L220 48 L300 96" />
      <line className="vmark" x1={220} y1={8} x2={220} y2={96} />
      {[["Attack", 20], ["Decay", 70], ["Sustain", 160], ["Release", 260]].map(([t, x]) => (
        <text key={t} className="vtext" x={x} y={112} textAnchor="middle">{t}</text>
      ))}
      <text className="vtext" x={224} y={18}>key released</text>
    </svg>
  )
}

export function LfoExplainer() {
  let lp = ""
  for (let x = 0; x <= 320; x += 2) lp += (x ? " L" : "M") + x + " " + (56 - 30 * Math.sin((x / 320) * 4 * Math.PI)).toFixed(1)
  return (
    <svg viewBox="0 0 320 120" className="vsvg" role="img" aria-label="LFO: a repeating wave moves the filter cutoff up and down. Rate sets the speed, amount sets the depth">
      <line className="vgrid" x1={0} y1={56} x2={320} y2={56} />
      <path className="vline" d={lp} />
      <line className="vmark" x1={0} y1={26} x2={0} y2={86} />
      <line className="vmark" x1={160} y1={26} x2={160} y2={86} />
      <text className="vtext" x={80} y={112} textAnchor="middle">Rate: one cycle</text>
      <text className="vtext" x={316} y={20} textAnchor="end">Amount: how far it moves</text>
    </svg>
  )
}
