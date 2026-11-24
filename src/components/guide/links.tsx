import { Fragment, type ReactNode } from "react"
import { Link } from "react-router"
import { GLOSS, INSTR } from "@/data/guide"
import { cn } from "@/lib/utils"

export const INAME: Record<string, string> = Object.fromEntries(INSTR.map((i) => [i.id, i.name]))

export function InstLink({ id, chip, primary }: { id: string; chip?: boolean; primary?: boolean }) {
  return (
    <Link
      to={`/instruments?tab=instruments#inst-${id}`}
      className={cn(
        chip ? "inline-flex items-center border px-2.5 py-0.5 text-xs font-medium no-underline hover:bg-accent" : "underline",
        chip && primary && "border-foreground",
      )}
    >
      {INAME[id]}
    </Link>
  )
}

const GRE = new RegExp(GLOSS.map((g) => "(" + g[2].source + ")").join("|"), "gi")

/**
 * Renders text with glossary terms linked. `used` keeps one link per term per card.
 */
export function GlossText({ text, used }: { text: string; used: Set<string> }) {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(GRE)) {
    const word = m[0], at = m.index!
    const e = GLOSS.find((x) => new RegExp("^(?:" + x[2].source + ")$", x[2].flags.replace("g", "")).test(word))
    if (!e || used.has(e[0])) continue
    used.add(e[0])
    out.push(text.slice(last, at))
    out.push(
      <Link key={at} to={`/instruments?tab=glossary#gl-${e[0]}`} className="underline decoration-muted-foreground decoration-dotted underline-offset-[3px] hover:decoration-foreground">
        {word}
      </Link>,
    )
    last = at + word.length
  }
  out.push(text.slice(last))
  return <>{out.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</>
}
