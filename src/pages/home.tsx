import { ArrowRight } from "lucide-react"
import { Link } from "react-router"
import { SignInPanel } from "@/components/account"
import { Button } from "@/components/ui/button"

const SECTIONS: { title: string; blurb: string; items: [string, string, string][] }[] = [
  {
    title: "Create", blurb: "Make loops, melodies and whole arrangements, then send them to Live.",
    items: [
      ["Loop builder", "/labs/loop-builder", "A four-bar loop in any of 31 genres, in your key"],
      ["Melody", "/labs/melody", "Write a hook over chords, with suggestions and feedback"],
      ["Chord progressions", "/labs/progressions", "Build and hear progressions with genre drums"],
      ["Step sequencer", "/labs/sequencer", "Program drums and a melody, export MIDI"],
      ["Arrangement", "/labs/arrangement", "Lay out a track section by section and play it"],
      ["Sampler", "/labs/sampler", "Slice your own audio onto 16 pads"],
    ],
  },
  {
    title: "Theory and ears", blurb: "Scales, chords and the listening skills behind them.",
    items: [
      ["Scales and chords", "/labs/theory", "Keys, the circle of fifths, modes and borrowed chords"],
      ["Play along", "/labs/play-along", "Play scales and chords on Push or a keyboard"],
      ["Ear training", "/labs/ear", "Chords, intervals, EQ and compression by ear"],
      ["Timing trainer", "/labs/timing", "Tighten your timing against a click"],
    ],
  },
  {
    title: "Sound", blurb: "How the sounds of each genre are made, and how to mix them.",
    items: [
      ["Sound design", "/labs/sound-design", "Playable genre sound recipes and a synth to learn on"],
      ["Drums and sampling", "/labs/drums", "Drum patterns from 31 genres"],
      ["Mixing", "/labs/mixing", "Frequency ranges and sidechain, hands on"],
    ],
  },
  {
    title: "Guides", blurb: "Reference for the genres, Live’s devices and Push.",
    items: [
      ["Genres", "/genres", "Tempo, chords, structure and artists for each style"],
      ["Live instruments and effects", "/instruments", "What each device does and when to use it"],
      ["Push 3", "/push", "Layouts, modes and shortcuts with diagrams"],
      ["How the plan works", "/plan", "The 12-week plan and its weekly rhythm"],
    ],
  },
]

/** The front page for visitors who aren't signed in. */
export function HomePage() {
  return (
    <div className="space-y-14">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <h1 className="font-display max-w-2xl text-4xl leading-[1.05] font-extrabold text-balance sm:text-5xl">Learn Ableton Live, Push and music theory by making music</h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">Interactive labs for beats, melodies, sound design and mixing, with guides to 31 electronic genres. Everything plays in the browser, and can send MIDI to Live.</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/labs/loop-builder">Start with the loop builder<ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/genres">Browse genres</Link></Button>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-1.5">
            <h2 className="font-sans text-base font-semibold tracking-normal">Track your progress</h2>
            <p className="text-muted-foreground text-sm text-pretty">Sign in for a 12-week plan with six sprints and step-by-step skill walkthroughs, a daily session, practice log and streaks, flashcards, weekly reviews and your own track plans. It syncs across your devices.</p>
          </div>
          <SignInPanel idPrefix="home" />
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="space-y-4" aria-labelledby={"h-" + s.title}>
          <div className="space-y-1">
            <h2 id={"h-" + s.title} className="text-xl font-bold">{s.title}</h2>
            <p className="text-muted-foreground text-sm">{s.blurb}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {s.items.map(([name, to, desc]) => (
              <li key={to}>
                <Link to={to} className="group flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-[background-color] duration-150 hover:bg-accent/60">
                  <span className="flex items-center justify-between gap-2 font-medium">{name}<ArrowRight className="text-muted-foreground size-4 transition-transform duration-150 group-hover:translate-x-0.5" /></span>
                  <span className="text-muted-foreground text-sm text-pretty">{desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
