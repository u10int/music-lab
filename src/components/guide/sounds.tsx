import { useState } from "react"
import { Search } from "lucide-react"
import { toggle } from "@/audio/playback"
import { PREVIEW } from "@/audio/previews"
import { Caption, SECTION_TITLE } from "@/components/page"
import { PlayButton } from "@/components/play-button"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ICAT, RECIPES, type Recipe } from "@/data/guide"
import { usePref } from "@/lib/store"
import { GlossText, INAME, InstLink } from "./links"

const PICK: [string, string][] = [["Something quick, from scratch", "drift"], ["Big, wide or moving", "wavetable"], ["Strange or expressive", "meld"],
  ["Bells, metallic tones, FM bass", "operator"], ["Warm vintage analog", "analog"], ["Plucked or bowed strings", "tension"],
  ["Mallets and bells, acoustic-sounding", "collision"], ["Electric piano", "electric"], ["One sample played as an instrument", "simpler"],
  ["Drum kit", "drumrack"], ["Texture from any audio", "granulator"]]

export function PickTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {rows.map(([w, v], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t py-2.5 text-sm">
          <dt>{w}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RecipeCard({ r }: { r: Recipe }) {
  const used = new Set<string>()
  const id = "rec-" + RECIPES.indexOf(r)
  const preview = PREVIEW[r.n]
  return (
    <article id={"recipe-" + RECIPES.indexOf(r)} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{r.n}</h3>
          {preview ? <PlayButton id={id} label="Preview" onPlay={() => toggle(id, 6, (c, o, t) => preview(c, o, t))} /> : <span className="text-muted-foreground text-xs">No preview, needs a sample</span>}
        </div>
        <p className="text-muted-foreground text-sm">{r.g}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {r.use.map((i) => <InstLink key={i} id={i} chip primary />)}
        {r.alt.length > 0 && <span className="text-muted-foreground text-xs">or</span>}
        {r.alt.map((i) => <InstLink key={i} id={i} chip />)}
      </div>
      <ol className="space-y-1.5 text-sm">
        {r.steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1.5">
            <span className="text-muted-foreground font-semibold tabular-nums">{i + 1}</span>
            <span className="text-pretty"><GlossText text={s} used={used} /></span>
          </li>
        ))}
      </ol>
      <p className="mt-auto border-t pt-3 text-sm"><b className="font-semibold">Effects</b> <GlossText text={r.fx} used={used} /></p>
    </article>
  )
}

export function Sounds({ initialQuery = "" }: { initialQuery?: string }) {
  const [cat, setCat] = usePref<string>("recipe-cat", "all")
  const [q, setQ] = useState(initialQuery)
  const needle = q.trim().toLowerCase()
  const list = RECIPES.filter((r) => (cat === "all" || r.c === cat) && (!needle || [r.n, r.g, r.fx, ...r.steps, ...r.use.map((i) => INAME[i]), ...r.alt.map((i) => INAME[i])].join(" ").toLowerCase().includes(needle)))
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Which instrument?</h2>
        <PickTable rows={PICK.map(([w, id]) => [w, <InstLink key={id} id={id} />])} />
      </section>
      <section className="space-y-4" id="find">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={SECTION_TITLE}>Find a sound</h2>
          <span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">{list.length} of {RECIPES.length} sounds</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full max-w-xs gap-1.5">
            <Label htmlFor="recipe-q">Search</Label>
            <div className="relative">
              <Search aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input id="recipe-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="reese, 808, pad, Wavetable" autoComplete="off" className="pl-8 text-base sm:text-sm" />
            </div>
          </div>
          <Seg label="Category" value={cat} onChange={setCat} options={ICAT} />
        </div>
        <Caption>Previews are rough sketches made in your browser to show the idea, not Live's instruments. Underlined terms open the glossary.</Caption>
        {list.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((r) => <RecipeCard key={r.n} r={r} />)}</div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No sounds match “{q}”{cat !== "all" ? " in this category" : ""}.{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => { setQ(""); setCat("all") }}>Show all sounds</Button>
          </p>
        )}
      </section>
    </div>
  )
}
