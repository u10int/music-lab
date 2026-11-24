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

/** A compact filter response for sound cards: any biquad type, with an optional envelope sweep drawn faintly. */
export function FilterCurve({ type = "lowpass", cutoff, q = 0.7, sweep }: { type?: BiquadFilterType; cutoff: number; q?: number; sweep?: number }) {
  const W = 200, H = 64, fmin = 20, fmax = 20000, top = 14, bot = -30, plotH = H - 12
  const x = (f: number) => (Math.log(f / fmin) / Math.log(fmax / fmin)) * W
  const y = (db: number) => ((top - Math.max(bot, Math.min(top, db))) / (top - bot)) * plotH
  const curve = (fc: number) => {
    let p = ""
    for (let i = 0; i <= 90; i++) {
      const f = fmin * Math.pow(fmax / fmin, i / 90), k = f / fc, den = Math.sqrt(Math.pow(1 - k * k, 2) + Math.pow(k / q, 2))
      const mag = type === "highpass" ? (k * k) / den : type === "bandpass" ? k / q / den : 1 / den
      p += (i ? " L" : "M") + x(f).toFixed(1) + " " + y(20 * Math.log10(Math.max(mag, 1e-4))).toFixed(1)
    }
    return p
  }
  const main = curve(cutoff), name = type === "highpass" ? "High-pass" : type === "bandpass" ? "Band-pass" : "Low-pass"
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="vsvg" role="img" aria-label={`${name} filter at ${fmtHz(cutoff)}${sweep ? `, opening to ${fmtHz(Math.min(18000, cutoff + sweep))} at each note` : ""}`}>
      {[100, 1000, 10000].map((f) => <line key={f} className="vgrid" x1={x(f)} y1={0} x2={x(f)} y2={plotH} />)}
      {[100, 1000, 10000].map((f) => <text key={"t" + f} className="vtext" style={{ fontSize: 10 }} x={x(f)} y={H - 1} textAnchor="middle">{fmtHz(f)}</text>)}
      {sweep ? <path className="vline" style={{ opacity: 0.3 }} strokeDasharray="3 3" d={curve(Math.min(18000, cutoff + sweep))} /> : null}
      <path className="varea" d={`${main} L${W} ${plotH} L0 ${plotH} Z`} />
      <path className="vline" d={main} />
    </svg>
  )
}

/** A compact amp envelope for sound cards. */
export function AmpShape({ env }: { env: Envelope }) {
  const { a, d, s, r } = env, hold = 0.35, total = Math.max(a + d + hold + r, 0.8)
  const W = 200, H = 64, top = 4, bot = H - 12
  const x = (t: number) => (t / total) * W, y = (v: number) => bot - v * (bot - top)
  const pts = [[0, y(0)], [x(a), y(1)], [x(a + d), y(s)], [x(a + d + hold), y(s)], [x(a + d + hold + r), y(0)]]
  const path = "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join(" L")
  const lbl = (t0: number, t1: number, txt: string) => <text className="vtext" style={{ fontSize: 10 }} x={((x(t0) + x(t1)) / 2).toFixed(1)} y={H - 1} textAnchor="middle">{txt}</text>
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="vsvg" role="img" aria-label={`Amp envelope: attack ${fmtS(a)}, decay ${fmtS(d)}, sustain ${Math.round(s * 100)}%, release ${fmtS(r)}`}>
      <line className="vgrid" x1={0} y1={bot} x2={W} y2={bot} />
      <path className="varea" d={`${path} L${x(a + d + hold + r).toFixed(1)} ${bot} Z`} />
      <path className="vline" d={path} />
      {x(a) > 14 && lbl(0, a, "A")}{lbl(a, a + d, "D")}{lbl(a + d, a + d + hold, "S")}{lbl(a + d + hold, a + d + hold + r, "R")}
    </svg>
  )
}
