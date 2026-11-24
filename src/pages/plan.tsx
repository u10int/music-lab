import { Block, PageHeader } from "@/components/page"
import { TermGrid } from "@/components/push/recording"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const ext = { target: "_blank", rel: "noopener", className: "underline" }

export function PlanPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="How the plan works">How the 12 weeks work, and what to leave alone until they're done.</PageHeader>
      <Block title="Rules">
        <TermGrid items={[
          ["One goal per sprint", "A tutorial that doesn't serve this sprint's goal gets bookmarked for later."],
          ["Push first", "Use the mouse only for what the sprint allows."],
          ["Small palette", "Stock Live devices plus your Splice library. No new plugins for 12 weeks."],
          ["Ship weekly", "Every Sunday, export something, even 30 seconds, to a dated folder."],
          ["Start from your template", "From Sprint 1 on, every session opens your default set."],
        ]} />
      </Block>
      <Block title="Weekly rhythm" description="Daily warm-up: play the week's scale and chords in the In Key layout, then program a 1-bar drum pattern from memory and delete it.">
        <Table className="max-w-3xl">
          <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Time</TableHead><TableHead>What you do</TableHead></TableRow></TableHeader>
          <TableBody>
            {[["Mon", "1 hr", "Learn this week's one new skill, then try it once"], ["Tue–Thu", "1 hr", "15 min Push warm-up, 45 min on the sprint deliverable"], ["Fri", "1 hr", "Recreate one idea from a reference track"], ["Sat", "2–3 hr", "Build session: make the deliverable, no new learning"], ["Sun", "1–2 hr", "Export, then log what worked, what was slow, next question"]].map(([a, b, c]) => (
              <TableRow key={a}><TableCell className="font-medium">{a}</TableCell><TableCell className="tabular-nums">{b}</TableCell><TableCell className="whitespace-normal">{c}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Block>
      <div className="grid gap-10 md:grid-cols-2">
        <Block title="Park these until week 12">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            <li>Live 13 beta and new Push 3 features (full release expected early 2027)</li>
            <li>Push 3 Standalone workflows, MPE and expressive pad playing</li>
            <li>Max for Live, modular/CV, generative MIDI tools</li>
            <li>Buying plugins, sample packs or hardware</li>
            <li>Mastering as its own discipline</li>
          </ul>
        </Block>
        <Block title="One resource per need">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            <li>Push reference: the Push manual in Live's Help menu</li>
            <li>Theory on the grid: <a href="https://learningmusic.ableton.com" {...ext}>Learning Music</a></li>
            <li>Synth basics: <a href="https://learningsynths.ableton.com" {...ext}>Learning Synths</a></li>
            <li>Built-in lessons: Help › Help View in Live</li>
            <li>Creative ruts: <a href="https://www.ableton.com/en/blog/one-thing-leads-to-another-100-music-making-inspirations/" {...ext}>Ableton's One Thing videos</a>, 100 short tips from working artists</li>
            <li>References: one track each for wave, phonk and progressive house, used all 12 weeks</li>
          </ul>
        </Block>
      </div>
    </div>
  )
}
