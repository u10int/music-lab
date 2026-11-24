import { ArrowRight } from "lucide-react"
import { Fragment } from "react"
import { Block, Caption } from "@/components/page"
import { MAN2, MAN3, SAME, SHORTCUTS } from "@/data/labs"
import { REC, SHORT } from "@/data/push"
import { Seg } from "@/components/seg"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { update, useProgress } from "@/lib/store"

export function TermGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([t, d]) => (
        <div key={t} className="grid content-start gap-0.5 border-t py-3">
          <dt className="font-semibold">{t}</dt>
          <dd className="text-muted-foreground text-sm text-pretty">{d}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      {steps.map((s, i) => (
        <Fragment key={s}>
          <li>{s}</li>
          {i < steps.length - 1 && <ArrowRight aria-hidden="true" className="text-muted-foreground size-4" />}
        </Fragment>
      ))}
    </ol>
  )
}

export function Recording() {
  return (
    <div className="space-y-10">
      <Block title="A loop in five moves">
        <Flow steps={["Select or arm a track", "Hold Fixed Length, pick 4 or 8 bars", "Press Record and play", "Quantize", "Double Loop or New for a variation"]} />
        <Caption>Or just play with Record off and press Capture when something sounds good.</Caption>
      </Block>
      <Block title="The buttons you'll use most"><TermGrid items={REC} /></Block>
    </div>
  )
}

export function ShortcutTable() {
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader><TableRow><TableHead>Do this</TableHead><TableHead>To</TableHead></TableRow></TableHeader>
        <TableBody>
          {SHORT.map(([a, b]) => (
            <TableRow key={a}><TableCell className="font-semibold whitespace-normal">{a}</TableCell><TableCell className="whitespace-normal">{b}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
      <Caption>Buttons and behavior from the <a className="text-foreground underline" href={MAN3} target="_blank" rel="noopener">Push 3 manual</a>. Push 3 works the same plugged into Live or standalone, except where the manual notes otherwise.</Caption>
    </div>
  )
}

/** Per-sprint shortcuts, with a Push 2 / Push 3 switch. */
export function SprintShortcuts({ sprintId }: { sprintId: string }) {
  const { push } = useProgress()
  const rows = SHORTCUTS[sprintId] ?? []
  return (
    <Block
      title="Push shortcuts for this sprint"
      description={<>From the <a className="text-foreground underline" href={push === "p3" ? MAN3 : MAN2} target="_blank" rel="noopener">{push === "p3" ? "Push 3 manual" : "Push 2 chapter of the Live manual"}</a>.</>}
      actions={<Seg label="Your Push" value={push} onChange={(v) => update((d) => { d.push = v })} options={[["p3", "Push 3"], ["p2", "Push 2"]]} />}
    >
      <TermGrid items={rows.map(([a, p3, p2]) => [a, push === "p3" ? p3 : p2 === SAME ? p3 : p2])} />
    </Block>
  )
}
