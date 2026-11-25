import { useMemo, useState } from "react"
import { ChevronDown, Copy, Download, FolderDown, RotateCcw, Square, Play } from "lucide-react"
import { usePlayingId, usePos } from "@/audio/playback"
import { Field } from "@/components/field"
import { useKey } from "@/components/key-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROOTS } from "@/data/labs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { genreInfo } from "@/data/genres"
import type { Family } from "@/data/patterns"
import { cookbook } from "@/jam/cookbook"
import { jamMidi, packFiles, zip } from "@/jam/export"
import { generate, LAYER_NAME, type Jam } from "@/jam/generate"
import { playJam } from "@/jam/player"
import { parseRecipe, ROLE_LABEL, serializeRecipe, type JamConfig } from "@/jam/recipe"
import { NOTE_NAMES } from "@/jam/theory"
import { downloadFile } from "@/lib/midi-file"
import { cn } from "@/lib/utils"

const SCALE_WORD: Record<string, string> = { minor: "minor", major: "major", dorian: "dorian", phryg: "phrygian", harm: "harmonic minor" }

function RecipeCard({ base }: { base: JamConfig }) {
  const original = useMemo(() => serializeRecipe(base), [base])
  const [text, setText] = useState(original)
  const [cooked, setCooked] = useState(original)
  const [copied, setCopied] = useState(false)
  const { jam, warnings } = useMemo((): { jam: Jam | null; warnings: string[] } => {
    const { config, warnings } = parseRecipe(cooked)
    try {
      const j = generate({ ...base, ...config })
      return { jam: j, warnings: [...warnings, ...j.warnings] }
    } catch (e) {
      return { jam: null, warnings: [...warnings, (e as Error).message] }
    }
  }, [cooked, base])
  const id = "jam-" + base.recipe_slug
  const playing = usePlayingId() === id
  const bar = usePos(id)
  const c = jam?.config ?? base
  const edited = text !== original
  const file = (ext: string) => `${c.recipe_slug || c.style}-${NOTE_NAMES[jam?.key.root ?? 0].replace("#", "s")}-${jam?.bpm ?? ""}bpm.${ext}`
  const sectioned = (jam?.sections.length ?? 0) > 1

  const play = (from = 0) => { if (jam) playJam(id, jam, from) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  return (
    <li className="flex min-w-0 flex-col border">
      <div className="space-y-1 border-b bg-muted/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-balance">{c.display_title}</h3>
          <Button type="button" variant="outline" size="sm" aria-pressed={playing} onClick={() => play()} disabled={!jam}
            className={cn("shrink-0", playing && "border-transparent bg-[#23782b] text-white hover:bg-[#1c6623] hover:text-white")}>
            {playing ? <Square className="fill-current" /> : <Play className="fill-current" />}{playing ? "Stop" : "Play"}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm tabular-nums">{ROLE_LABEL[c.recipe_role]} · {c.tempo_band.replace("-", "–")} BPM{jam ? ` · plays at ${jam.bpm} · ${jam.bars} bars` : ""}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-pretty">{c.summary}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Mood">{c.mood_tags.map((m) => <li key={m}><Badge variant="outline">{m}</Badge></li>)}</ul>
        {c.study && <p className="text-sm text-pretty"><span className="font-semibold">Study: </span>{c.study}. Listen for the feel, not to copy it.</p>}

        {jam && (
          <div className="space-y-1.5">
            {sectioned ? (
              <div className="flex flex-wrap gap-px" role="group" aria-label="Sections: press one to play from there">
                {jam.sections.map((s, i) => {
                  const on = playing && bar >= s.start && bar < s.start + s.bars
                  return (
                    <button key={i} type="button" onClick={() => play(s.start)} style={{ flexGrow: s.bars }} title={s.layers.map((l) => LAYER_NAME[l]).join(", ")}
                      className={cn("min-w-24 basis-0 border px-2 py-1.5 text-left transition-[background-color,color,border-color] duration-100", on ? "border-transparent bg-[#23782b] text-white" : "border-foreground/25 hover:border-foreground")}>
                      <span className="block text-sm font-medium">{s.name}</span>
                      <span className={cn("block text-xs tabular-nums", on ? "opacity-85" : "text-muted-foreground")}>{s.bars} bars</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <ol className="grid grid-cols-4 gap-1" aria-label="Chords">
                {jam.chords.map((ch, i) => {
                  const on = playing && Math.floor((bar % jam.loopBars) / (jam.loopBars / jam.chords.length)) === i
                  return (
                    <li key={i} className={cn("border px-2 py-1.5 transition-[background-color,color,border-color] duration-100", on ? "border-transparent bg-foreground text-background" : "border-foreground/25")}>
                      <span className="block text-sm font-medium">{ch.label}</span>
                      <span className={cn("block text-xs", on ? "opacity-80" : "text-muted-foreground")}>{ch.name}</span>
                    </li>
                  )
                })}
              </ol>
            )}
            {sectioned && <p className="text-muted-foreground text-xs">Press a section to play from there. Hover to see which layers it uses.</p>}
          </div>
        )}

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium hover:underline">
            Recipe{edited ? " (edited)" : ""} <ChevronDown className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {jam && <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">{jam.explain.map((e) => <li key={e} className="text-pretty">{e}</li>)}</ul>}
            <Textarea aria-label={`Recipe for ${c.display_title}`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              className="min-h-72 font-mono text-xs leading-relaxed" />
            {warnings.length > 0 && <ul className="space-y-1 text-sm text-destructive">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCooked(text)} disabled={text === cooked}>Cook</Button>
              <Button size="sm" variant="outline" onClick={() => { setText(original); setCooked(original) }} disabled={!edited && cooked === original}><RotateCcw />Reset</Button>
              <Button size="sm" variant="ghost" onClick={copy}><Copy />{copied ? "Copied" : "Copy"}</Button>
            </div>
            <p className="text-muted-foreground text-xs text-pretty">Change any <code>key: value</code> line and press Cook. The same file works with the command-line tool: <code>npm run jam -- --config recipe.md</code>.</p>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={!jam} onClick={() => jam && downloadFile(jamMidi(jam), file("mid"))}><Download />Download MIDI</Button>
          {jam && (sectioned || c.output_mode === "pack") && (
            <Button size="sm" variant="outline" onClick={() => downloadFile(zip(packFiles(jam), (c.recipe_slug || "jam") + "/"), file("zip"), "application/zip")}><FolderDown />Download pack</Button>
          )}
        </div>
      </div>
    </li>
  )
}

/** The style’s six recipes, cooked in the person’s key. */
export function JamRecipes({ id }: { id: Family }) {
  const { root, setRoot } = useKey()
  const scale = genreInfo(id)?.scale ?? "minor"
  const book = useMemo(() => cookbook(id, NOTE_NAMES[root]), [id, root])
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Key" htmlFor="jam-root">
          <Select value={String(root)} onValueChange={(v) => setRoot(+v)}>
            <SelectTrigger id="jam-root" size="sm" className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{ROOTS.map((n, i) => <SelectItem key={i} value={String(i)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <p className="text-muted-foreground pb-1.5 text-sm">{SCALE_WORD[scale][0].toUpperCase() + SCALE_WORD[scale].slice(1)}, the scale this style usually uses. Edit a recipe’s <code>key</code> line to change it.</p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">{book.map((r) => <RecipeCard key={r.recipe_slug + root} base={r} />)}</ul>
    </div>
  )
}
