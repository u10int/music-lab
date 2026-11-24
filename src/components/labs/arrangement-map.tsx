import { Caption } from "@/components/page"
import { ARR_TEMPO, LANES, SECTIONS, ST_SHORT, ST_TXT, type LaneState } from "@/data/labs"
import { cn } from "@/lib/utils"

const mmss = (s: number) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0")
const LANE: Record<LaneState, string> = {
  on: "bg-[var(--s5)]",
  off: "bg-transparent shadow-[inset_0_0_0_1px_var(--border)]",
  half: "bg-[linear-gradient(90deg,transparent_50%,var(--s5)_50%)] shadow-[inset_0_0_0_1px_var(--border)]",
  filt: "bg-[color-mix(in_oklab,var(--s5)_35%,var(--card))]",
  riser: "bg-foreground/10 text-foreground",
  impact: "bg-foreground/10 text-foreground",
  sweep: "bg-foreground/10 text-foreground",
}

export function ArrangementMap() {
  const barS = (4 * 60) / ARR_TEMPO, total = SECTIONS.reduce((a, s) => a + s[1], 0)
  const heads = SECTIONS.map(([n, b], i) => ({ n, b, at: mmss(SECTIONS.slice(0, i).reduce((a, s) => a + s[1], 0) * barS) }))
  return (
    <div className="space-y-4">
      <Caption>A progressive house track at {ARR_TEMPO} BPM: {total} bars, about {mmss(total * barS)}. Each column is one Session scene you perform into the Arrangement.</Caption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-x-[3px] border-spacing-y-1.5 text-sm">
          <colgroup>
            <col className="w-36" />
            {SECTIONS.map(([, b], i) => <col key={i} style={{ width: `${(b / total) * 82}%` }} />)}
          </colgroup>
          <thead>
            <tr>
              <td />
              {heads.map((h, i) => (
                <th key={i} scope="col" className="text-left align-bottom font-normal">
                  <span className="block font-semibold">{h.n}</span>
                  <span className="text-muted-foreground block text-xs">{h.b} bars · {h.at}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="text-left font-normal">Energy</th>
              {SECTIONS.map(([, , e], i) => (
                <td key={i} className="h-8 align-bottom">
                  <span className="sr-only">Energy {e} of 10</span>
                  <span aria-hidden="true" className="block rounded-sm bg-foreground/70" style={{ height: `${e * 3}px` }} />
                </td>
              ))}
            </tr>
            {LANES.map(([n, st]) => (
              <tr key={n}>
                <th scope="row" className="text-left font-normal">{n}</th>
                {st.map((s, i) => (
                  <td key={i}>
                    <span aria-hidden="true" className={cn("block h-6 truncate rounded px-1.5 text-[11px] leading-6", LANE[s])}>{ST_SHORT[s] ?? ""}</span>
                    <span className="sr-only">{ST_TXT[s]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-hidden="true">
        {(["on", "filt", "half", "off"] as LaneState[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-2"><i className={cn("inline-block h-3 w-5 rounded-sm", LANE[s])} />{ST_TXT[s]}</span>
        ))}
      </div>
    </div>
  )
}
