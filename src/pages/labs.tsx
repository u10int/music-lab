import { Link } from "react-router"
import { ArrangementMap } from "@/components/labs/arrangement-map"
import { DrumPatterns } from "@/components/labs/drum-lab"
import { EarTraining } from "@/components/labs/ear-training"
import { FrequencyMap, SidechainLab } from "@/components/labs/mix-lab"
import { ScalesLab } from "@/components/labs/scales-lab"
import { SliceLab } from "@/components/labs/slice-lab"
import { SynthLab } from "@/components/labs/synth-lab"
import { GenreSounds } from "@/components/labs/genre-sounds"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { PATTERNS } from "@/data/patterns"
import { Sequencer } from "@/components/labs/sequencer"
import { TimingTrainer } from "@/components/labs/timing-trainer"
import { ProgressionBuilder } from "@/components/labs/progression-builder"
import { Block, PageHeader } from "@/components/page"
import { DrumLayouts, NoteRepeat } from "@/components/push/drum-layouts"
import { PlayableGrid } from "@/components/push/notes-lab"

const More = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm">More in <Link className="text-foreground underline" to={to}>{children}</Link>.</p>
)

export function TheoryLab() {
  return (
    <div className="space-y-12">
      <PageHeader title="Scales and chords">Pick a key once and every lab uses it. Hear the chords in the key, see their shapes on the Push grid and play the pads yourself.</PageHeader>
      <Block title="Chords in a key"><ScalesLab /></Block>
      <Block title="Play the grid"><PlayableGrid /></Block>
      <Block title="Ear training"><EarTraining /></Block>
    </div>
  )
}

export function EarLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Ear training">Name chord qualities and intervals by ear. Your score is saved with your progress.</PageHeader>
      <EarTraining />
    </div>
  )
}

export function SoundDesignLab() {
  return (
    <div className="space-y-12">
      <PageHeader title="Sound design">Signature sounds from each genre you can play and tweak, then a small synth with the same oscillator, filter and envelope as Drift to learn how the controls work.</PageHeader>
      <Block title="Genre sounds" description={`${GENRE_SOUNDS.length} sounds across wave, phonk, house, techno, bass music, future garage and more.`}><GenreSounds /></Block>
      <Block title="Synth playground" description="Change a control, play it, and watch the shape change."><SynthLab /></Block>
      <More to="/instruments?tab=modulation">the modulation guide</More>
    </div>
  )
}

export function DrumsLab() {
  return (
    <div className="space-y-12">
      <PageHeader title="Drums and sampling">Drum patterns from house to drum and bass, the Push drum layouts, and how Simpler slices a loop onto pads.</PageHeader>
      <Block title="Drum pattern library" description={`${PATTERNS.length} patterns across electronic styles, one or two bars of 16ths each. Play one, then program it on Push or load it into the step sequencer.`}><DrumPatterns /></Block>
      <DrumLayouts />
      <NoteRepeat />
      <Block title="Slicing a loop"><SliceLab /></Block>
    </div>
  )
}

export function ArrangementLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Arrangement">What enters and leaves where in a progressive house track. Use it as a map when you perform scenes into the Arrangement.</PageHeader>
      <ArrangementMap />
    </div>
  )
}

export function MixingLab() {
  return (
    <div className="space-y-12">
      <PageHeader title="Mixing">Where each part sits in the frequency range, and what sidechain ducking does to the bass.</PageHeader>
      <Block title="Where each part sits"><FrequencyMap /></Block>
      <Block title="Sidechain: the kick ducks the bass"><SidechainLab /></Block>
      <More to="/instruments?tab=effects">the effects guide</More>
    </div>
  )
}

export function SequencerLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Step sequencer">Program a one- or two-bar drum loop and a melody in your key, hear them loop, then export each as a MIDI file to drag into a Live clip.</PageHeader>
      <Sequencer />
    </div>
  )
}

export function TimingLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Timing trainer">Play along to a click on Push, a keyboard or your computer keys. Each hit shows how early or late it landed, so you can tighten up your finger drumming.</PageHeader>
      <TimingTrainer />
    </div>
  )
}

export function ProgressionLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Chord progressions">Build a progression from the chords in your key, hear it loop over any drum pattern, and export the chords and bassline as MIDI clips for Live.</PageHeader>
      <ProgressionBuilder />
    </div>
  )
}
