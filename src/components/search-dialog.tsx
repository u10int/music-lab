import { useMemo } from "react"
import { useNavigate } from "react-router"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { FX, GLOSS, INSTR, RECIPES } from "@/data/guide"
import { FAMILIES, PATTERNS } from "@/data/patterns"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { FX_RECIPES } from "@/data/fx-recipes"
import { SHORT } from "@/data/push"
import { GENRE_INFO } from "@/data/genres"
import { SPRINTS } from "@/data/sprints"
import { slug } from "@/lib/utils"

const PAGES: [string, string][] = [
  ["Today", "/today"], ["Dashboard", "/"], ["Practice log", "/practice"], ["Flashcards", "/flashcards"], ["Weekly exports", "/exports"],
  ["How the plan works", "/plan"], ["Track planner", "/planner"], ["Scales and chords", "/labs/theory"], ["Chord progressions", "/labs/progressions"],
  ["Play along", "/labs/play-along"], ["Sound design", "/labs/sound-design"], ["Synths", "/labs/synths"], ["Drums and sampling", "/labs/drums"], ["Step sequencer", "/labs/sequencer"],
  ["Arrangement", "/labs/arrangement"], ["Mixing", "/labs/mixing"], ["Ear training", "/labs/ear"], ["Timing trainer", "/labs/timing"],
  ["Loop builder", "/labs/loop-builder"], ["Melody", "/labs/melody"], ["Weekly review", "/review"], ["Sampler", "/labs/sampler"], ["Reference notebook", "/notebook"], ["Genres", "/genres"],
  ["Circle of fifths", "/labs/theory?tab=circle"], ["Modes", "/labs/theory?tab=modes"], ["Borrowed chords", "/labs/theory?tab=borrowed"], ["Find the key", "/labs/theory?tab=find"],
  ["Live instruments and effects", "/instruments"], ["Push 3 guide", "/push"], ["Settings and data", "/settings"],
]
/** Plain substring matching, ranked: label start, then label, then description. */
function score(value: string, search: string, keywords?: string[]) {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const label = (keywords?.[0] ?? value).toLowerCase(), all = value.toLowerCase()
  const words = q.split(/\s+/)
  if (!words.every((w) => all.includes(w))) return 0
  if (label.startsWith(q)) return 1
  if (words.every((w) => label.includes(w))) return 0.8
  return 0.4
}

/** Cmd/Ctrl+K search across pages, recipes, instruments, effects, glossary, Push shortcuts and drum patterns. */
export default function SearchDialog({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const nav = useNavigate()
  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }
  const groups = useMemo(() => [
    { heading: "Pages", items: PAGES.map(([l, to]) => ({ label: l, hint: "", to })) },
    { heading: "Sprints", items: SPRINTS.map((s) => ({ label: `Sprint ${s.n}: ${s.title}`, hint: s.short, to: `/sprints/${s.n}` })) },
    { heading: "Skill walkthroughs", items: SPRINTS.flatMap((s) => s.skills.map((k, i) => ({ label: k, hint: `Sprint ${s.n}`, to: `/sprints/${s.n}?skill=${s.id}-${i}` }))) },
    { heading: "Sound recipes", items: RECIPES.map((r) => ({ label: r.n, hint: r.g, to: `/instruments?tab=sounds&q=${encodeURIComponent(r.n)}` })) },
    { heading: "Instruments", items: INSTR.map((i) => ({ label: i.name, hint: i.type.split(" · ")[0], to: `/instruments?tab=instruments#inst-${i.id}` })) },
    { heading: "Effects", items: FX.map((f) => ({ label: f.n, hint: f.tags.join(", "), to: `/instruments?tab=effects#fx-${slug(f.n)}` })) },
    { heading: "Glossary", items: GLOSS.map(([id, term, , def]) => ({ label: term, hint: def, to: `/instruments?tab=glossary#gl-${id}` })) },
    { heading: "Push 3 shortcuts", items: SHORT.map(([combo, effect]) => ({ label: combo, hint: effect, to: "/push?tab=shortcuts" })) },
    { heading: "Genres", items: GENRE_INFO.map((g) => ({ label: FAMILIES.find(([f]) => f === g.id)?.[1] ?? g.id, hint: `${g.tempo[0]}–${g.tempo[1]} BPM`, to: `/genres/${g.id}` })) },
    { heading: "Genre sounds", items: GENRE_SOUNDS.map((g) => ({ label: g.name, hint: g.genre, to: `/labs/sound-design#sound-${g.id}` })) },
    { heading: "Effect recipes", items: FX_RECIPES.map((r) => ({ label: r.name, hint: r.kind, to: `/labs/sound-design#fx-${r.id}` })) },
    { heading: "Drum patterns", items: PATTERNS.map((p) => ({ label: p.name, hint: p.bpm, to: `/labs/drums#pat-${p.id}` })) },
  ], [])
  return (
      <CommandDialog filter={score} open={open} onOpenChange={setOpen} title="Search Music Lab" description="Find pages, sounds, instruments, effects, terms, shortcuts and drum patterns">
        <CommandInput placeholder="Search sounds, effects, terms, shortcuts…" />
        <CommandList>
          <CommandEmpty>Nothing matches that. Try an instrument, an effect or a genre.</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g.heading} heading={g.heading}>
              {g.items.map((it) => (
                <CommandItem key={g.heading + it.label} value={`${it.label} ${it.hint} ${g.heading}`} keywords={[it.label]} onSelect={() => go(it.to)}>
                  <span className="shrink-0">{it.label}</span>
                  {it.hint && <span className="text-muted-foreground ml-2 truncate text-xs">{it.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
  )
}
