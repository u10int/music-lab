import { useState } from "react"
import { Link } from "react-router"
import { EnvelopeExplainer, LfoExplainer } from "@/components/diagrams"
import { Block, Caption, Steps, SECTION_TITLE } from "@/components/page"
import { Flow } from "@/components/push/recording"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CHAINS, FEAT, FX, FXGROUPS, FXPICK, GLOSS, IGROUPS, INSTR, ITAGS, QS, RECIPES, type Instrument } from "@/data/guide"
import { VIZ } from "@/data/viz"
import { GlossText, INAME } from "./links"
import { slug } from "@/lib/utils"
import { PickTable } from "./sounds"

const recipeCount = (id: string) => RECIPES.filter((r) => r.use.includes(id) || r.alt.includes(id)).length

function Tags({ tags, label }: { tags: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {tags.map((t) => <li key={t} className="bg-muted px-2 py-0.5 text-xs">{t}</li>)}
    </ul>
  )
}

function InstrumentCard({ i }: { i: Instrument }) {
  const t = ITAGS[i.id], n = recipeCount(i.id)
  return (
    <article id={"inst-" + i.id} tabIndex={-1} className="flex scroll-mt-24 flex-col overflow-hidden rounded-xl border bg-card outline-none transition-[box-shadow] duration-300 data-[flash=true]:ring-2 data-[flash=true]:ring-ring">
      <div className="border-b bg-muted/50 px-4 py-3" aria-hidden="true">
        <svg viewBox="0 0 120 40" className="h-10 w-full max-w-[180px]" dangerouslySetInnerHTML={{ __html: VIZ[i.id]() }} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold">{i.name}</h3>
          <p className="text-muted-foreground text-sm">{i.type}</p>
        </div>
        {t.note && <p className="text-sm">{t.note}</p>}
        <Tags tags={t.tags} label="Good for" />
        <p className="text-sm"><span className="text-muted-foreground">Start with</span> {i.keys}</p>
      </div>
      {n > 0 && (
        <Link to={`/instruments?tab=sounds&q=${encodeURIComponent(i.name)}`} className="border-t px-4 py-2.5 text-sm font-medium hover:bg-accent">
          See {n} sound{n > 1 ? "s" : ""} built with {i.name}
        </Link>
      )}
    </article>
  )
}

export function Instruments() {
  return (
    <div className="space-y-10">
      {IGROUPS.map(([g, label]) => (
        <Block key={g} title={label}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{INSTR.filter((i) => ITAGS[i.id].grp === g).map((i) => <InstrumentCard key={i.id} i={i} />)}</div>
        </Block>
      ))}
      <Caption>
        Suite also includes Max for Live drum synths, under Max for Live in the browser, for synthesizing kicks, snares, claps and hats from scratch. Live 13 adds three new instruments, Bass, Drum Synth and Poli, if you upgrade later. Sources:{" "}
        <a className="text-foreground underline" href="https://www.ableton.com/en/live-manual/12/live-instrument-reference/" target="_blank" rel="noopener">Live 12 Instrument Reference</a>,{" "}
        <a className="text-foreground underline" href="https://www.ableton.com/en/packs/granulator-iii/" target="_blank" rel="noopener">Granulator III</a>,{" "}
        <a className="text-foreground underline" href="https://www.ableton.com/live/compare-editions/" target="_blank" rel="noopener">Live editions</a>.
      </Caption>
    </div>
  )
}

export function Effects() {
  return (
    <div className="space-y-10">
      <Block title="Which effect?"><PickTable rows={FXPICK} /></Block>
      <Block title="Common chains" description="Left to right, in the order they go on the track.">
        <div>
          {CHAINS.map(([n, steps]) => (
            <div key={n} className="grid gap-2 border-t py-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
              <span className="font-semibold">{n}</span>
              <Flow steps={steps} />
            </div>
          ))}
        </div>
      </Block>
      {FXGROUPS.map((g) => (
        <Block key={g} title={g}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FX.filter((f) => f.g === g).map((f) => {
              const used = new Set<string>()
              return (
                <article key={f.n} id={"fx-" + slug(f.n)} tabIndex={-1} className="flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-card p-4 outline-none transition-[box-shadow] duration-300 data-[flash=true]:ring-2 data-[flash=true]:ring-ring">
                  <div>
                    <h3 className="font-semibold">{f.n}</h3>
                    <p className="text-muted-foreground text-sm">{f.what}</p>
                  </div>
                  <Tags tags={f.tags} label="Use it for" />
                  <p className="text-sm"><GlossText text={f.start} used={used} /></p>
                </article>
              )
            })}
          </div>
        </Block>
      ))}
      <Caption>Device names and controls from the <a className="text-foreground underline" href="https://www.ableton.com/en/live-manual/12/live-audio-effect-reference/" target="_blank" rel="noopener">Live 12 Audio Effect Reference</a>. Settings are starting points to adjust by ear.</Caption>
    </div>
  )
}

export function Modulation() {
  const rows = [["Envelope 2", "Filter cutoff", "Plucks: the tone closes after each hit"], ["LFO", "Wavetable position", "Evolving pads"], ["LFO (slow, small)", "Pitch", "Vibrato"], ["Velocity", "Volume or cutoff", "Harder playing is louder and brighter"], ["Envelope", "Pitch", "Kicks and 808s"]]
  return (
    <div className="space-y-10">
      <Caption>Modulation is what makes a sound move instead of sitting still. Every Live synth has envelopes and LFOs, and Drift, Wavetable and Meld have a modulation matrix to route them anywhere.</Caption>
      <div className="grid gap-8 md:grid-cols-2" style={{ ["--c" as string]: "var(--foreground)" }}>
        <figure className="space-y-2"><h2 className={SECTION_TITLE}>Envelopes shape each note</h2><EnvelopeExplainer /><figcaption className="text-muted-foreground text-sm">Plays once per note. On volume it decides pluck versus pad. On the filter it makes a sound open and close as it plays.</figcaption></figure>
        <figure className="space-y-2"><h2 className={SECTION_TITLE}>LFOs keep things moving</h2><LfoExplainer /><figcaption className="text-muted-foreground text-sm">A slow repeating wave. Sync it to the tempo (1 bar, 1/4) for movement that locks to the groove.</figcaption></figure>
      </div>
      <Block title="The modulation matrix: source, destination, amount" description="Start with small amounts. Positive and negative amounts move the destination in opposite directions.">
        <Table>
          <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Destination</TableHead><TableHead>What you get</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map(([a, b, c]) => <TableRow key={a + b}><TableCell>{a}</TableCell><TableCell>{b}</TableCell><TableCell className="whitespace-normal">{c}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Block>
      <Block title="Macros put your favorite controls on Push" description="To move any parameter on any device, Suite's Max for Live LFO and Envelope Follower devices can modulate it directly.">
        <Steps items={[
          "Group the instrument into an Instrument Rack (select it and press Cmd+G or Ctrl+G).",
          "Click Map in the Rack's title bar, click a parameter such as filter cutoff, then click Map under a macro.",
          "One macro can control several parameters at once, each with its own range: cutoff up and resonance down, for example.",
          "Select the Rack on Push and its macros appear on the encoders, so you can shape the sound by hand and record the moves as automation.",
        ]} />
      </Block>
    </div>
  )
}

export function Glossary() {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
      {GLOSS.slice().sort((a, b) => a[1].localeCompare(b[1])).map(([id, term, , def]) => (
        <div key={id} id={"gl-" + id} tabIndex={-1} className="-mx-2 grid scroll-mt-24 content-start gap-0.5 rounded-lg border-t px-2 py-3 outline-none transition-[background-color] duration-300 data-[flash=true]:bg-muted">
          <dt className="font-semibold">{term}</dt>
          <dd className="text-muted-foreground max-w-[60ch] text-sm">{def}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Identify() {
  const [ans, setAns] = useState<Record<string, string>>({})
  const picked = Object.keys(ans).length
  const scored = RECIPES.map((r) => {
    const f = FEAT[r.n].split(" ")
    return { r, hits: Object.values(ans).filter((v) => f.includes(v)).length }
  }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 4)
  return (
    <div className="space-y-8">
      <Caption>Listen to one sound in your reference, ideally soloed or from a separated stem, and answer what you can. Matching recipes update as you go.</Caption>
      <div className="grid gap-5">
        {QS.map(([k, q, opts]) => (
          <fieldset key={k} className="grid gap-2">
            <legend className="mb-2 font-semibold">{q}</legend>
            <Seg label={q} value={ans[k] ?? ""} onChange={(v) => setAns((a) => ({ ...a, [k]: v }))} options={opts} />
          </fieldset>
        ))}
      </div>
      <Block title="Closest matches" actions={picked ? <Button variant="link" className="h-auto p-0" onClick={() => setAns({})}>Start over</Button> : undefined}>
        {!picked ? (
          <p className="text-muted-foreground text-sm">Answer a question to see matching sounds.</p>
        ) : (
          <ol>
            {scored.map(({ r, hits }) => (
              <li key={r.n} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
                <div className="grid min-w-0 flex-[1_1_240px] gap-0.5">
                  <span className="font-semibold">{r.n}</span>
                  <span className="text-muted-foreground text-sm">{hits} of {picked} answers match · {r.use.map((id) => INAME[id]).join(" or ")}</span>
                </div>
                <Button asChild variant="outline" size="sm"><Link to={`/instruments?tab=sounds&q=${encodeURIComponent(r.n)}`}>Open recipe</Link></Button>
              </li>
            ))}
          </ol>
        )}
      </Block>
    </div>
  )
}
