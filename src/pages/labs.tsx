import { useEffect } from "react"
import { Link, useSearchParams } from "react-router"
import { EarTrack, RhythmDictation } from "@/components/labs/rhythm-dictation"
import { EAR_TRACK } from "@/data/learning"
import { SPRINTS } from "@/data/sprints"
import { currentWeek, sprintForWeek, useProgress } from "@/lib/store"
import { ArrangementMap } from "@/components/labs/arrangement-map"
import { DrumPatterns } from "@/components/labs/drum-lab"
import { EarTraining } from "@/components/labs/ear-training"
import { FrequencyMap, SidechainLab } from "@/components/labs/mix-lab"
import { ScalesLab } from "@/components/labs/scales-lab"
import { SliceLab } from "@/components/labs/slice-lab"
import { SynthLab } from "@/components/labs/synth-lab"
import { GenreSounds } from "@/components/labs/genre-sounds"
import { PatchLibrary } from "@/components/labs/synth-patches"
import { SYNTH_PATCHES } from "@/data/synth-patches"
import { ConceptDemos, SignalFlow, SynthGuides, SynthSounds } from "@/components/labs/synth-school"
import { SYNTH_STEPS } from "@/data/synths"
import { FxLibrary } from "@/components/labs/fx-recipes"
import { FX_RECIPES } from "@/data/fx-recipes"
import { GENRE_SOUNDS } from "@/data/genre-sounds"
import { PATTERNS } from "@/data/patterns"
import { Sequencer } from "@/components/labs/sequencer"
import { TimingTrainer } from "@/components/labs/timing-trainer"
import { ProgressionBuilder } from "@/components/labs/progression-builder"
import { LoopBuilder } from "@/components/labs/loop-builder"
import { Sampler } from "@/components/labs/sampler"
import { MelodyLab as MelodyWriter } from "@/components/labs/melody-lab"
import { MixEar } from "@/components/labs/mix-ear"
import { MatchSound } from "@/components/labs/match-sound"
import { ChordQualities, Intervals } from "@/components/labs/hear-theory"
import { BorrowedChords, CircleOfFifths, FindKey, ModesExplorer } from "@/components/labs/theory-tools"
import { KeyPicker } from "@/components/key-picker"
import { UrlTabs } from "@/components/url-tabs"
import { Block, PageHeader } from "@/components/page"
import { DrumLayouts, NoteRepeat } from "@/components/push/drum-layouts"
import { PlayableGrid } from "@/components/push/notes-lab"

const More = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm">More in <Link className="text-foreground underline" to={to}>{children}</Link>.</p>
)

export function TheoryLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Scales and chords" actions={<div className="flex flex-wrap items-end gap-3"><KeyPicker idPrefix="th" /></div>}>Pick a key once and every lab uses it. Learn how chord qualities and intervals sound, hear the chords in a key, find keys on the circle of fifths, explore modes and borrowed chords, and work out the key of something you hear.</PageHeader>
      <UrlTabs label="Theory topics" tabs={[
        ["chords", "Chords in a key", <div key="chords" className="space-y-12"><Block title="Chords in a key"><ScalesLab hideKey /></Block><Block title="Play the grid"><PlayableGrid /></Block></div>],
        ["qualities", "Chord qualities", <Block key="qualities" title="Chord qualities" description="Major, minor, diminished, sevenths and more: what each one is made of and how it sounds."><ChordQualities /></Block>],
        ["intervals", "Intervals", <Block key="intervals" title="Intervals" description="The distance between two notes, and the building block of every chord."><Intervals /></Block>],
        ["circle", "Circle of fifths", <Block key="circle" title="Circle of fifths"><CircleOfFifths /></Block>],
        ["modes", "Modes", <Block key="modes" title="Modes"><ModesExplorer /></Block>],
        ["borrowed", "Borrowed chords", <Block key="borrowed" title="Borrowed chords"><BorrowedChords /></Block>],
        ["find", "Find the key", <Block key="find" title="Find the key"><FindKey /></Block>],
      ]} />
      <More to="/labs/ear">ear training</More>
    </div>
  )
}

export function EarLab() {
  const p = useProgress()
  const [params] = useSearchParams()
  // ?quiz=rhythm from a day plan jumps to rhythm dictation.
  useEffect(() => {
    if (params.get("quiz") === "rhythm") requestAnimationFrame(() => document.getElementById("rhythm")?.scrollIntoView({ block: "start" }))
  }, [params])
  return (
    <div className="space-y-10">
      <PageHeader title="Ear training">Train your ears for theory and for mixing. Scores are saved with your progress.</PageHeader>
      <Block title="Your ear track" description="Accuracy per drill over the last two weeks. Each sprint leans on one drill, listed first."><EarTrack focus={EAR_TRACK[SPRINTS[sprintForWeek(currentWeek(p).week)].id]?.quiz} /></Block>
      <Block title="Rhythm dictation" description="Hear a one-bar beat, rebuild it on the grid, and check it hit by hit."><div id="rhythm" className="scroll-mt-6"><RhythmDictation /></div></Block>
      <Block title="Notes and chords" description="Chord qualities, intervals, progressions, scale degrees and keys."><EarTraining /></Block>
      <Block title="Mixing ears" description="Hear EQ, compression and sidechain the way you will in your own mixes."><MixEar /></Block>
    </div>
  )
}

export function SoundDesignLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Sound design">Signature sounds from each genre you can play and tweak, recipes for atmospheres, transitions and vocal effects, a game to train your ear for synth controls, and a small synth with the same oscillator, filter and envelope as Drift to learn how the controls work.</PageHeader>
      <Block title="Genre sounds" description={`${GENRE_SOUNDS.length} sounds across ${new Set(GENRE_SOUNDS.map((x) => x.family)).size} genres, from wave, phonk and hardwave to ODESZA-style, trance, dub techno and ambient.`}><GenreSounds /></Block>
      <Block title="Atmospheres, transitions and vocal effects" description={`${FX_RECIPES.length} recipes for the sounds between the notes: crackle, rain and tape, risers, impacts and tape stops, and vocal chops, throws and formant shifts.`}><FxLibrary /></Block>
      <Block title="Match the sound" description="Hear a sound, then find the knob settings that made it. The fastest way to learn what each control does."><MatchSound /></Block>
      <Block title="Synth playground" description="Change a control, play it, and watch the shape change."><SynthLab /></Block>
      <More to="/instruments?tab=modulation">the modulation guide</More>
    </div>
  )
}

export function SynthsLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Synths">How synths work, the controls that shape trance, wave, driftwave and phonk sounds, and step-by-step builds in Live’s Wavetable and Drift and in Massive and Spire.</PageHeader>
      <Block title="How a synth works" description="Every synth here follows the same path. Learn it once and any synth’s panel makes sense."><SignalFlow /></Block>
      <Block title="The controls that matter" description="Eight ideas behind most electronic synth sounds, each with a live demo."><ConceptDemos /></Block>
      <Block title="Your synths" description="What each one is best at, how its panel is laid out, and for the plugins, how to use them well in Live and from Push."><SynthGuides /></Block>
      <Block title="Synth sounds to build" description={`${Object.keys(SYNTH_STEPS).length} sounds from trance, wave, driftwave, phonk, hardwave and more, each with a build for Live, Massive and Spire.`}><SynthSounds /></Block>
      <Block title="Patch library" description={`${SYNTH_PATCHES.length} general-purpose patches, from reese and acid basses to gated pads, bells, risers and textures, with starting settings for Wavetable, Drift, Massive and Spire.`}><PatchLibrary /></Block>
      <More to="/labs/sound-design">sound design, with the synth playground and every genre sound</More>
    </div>
  )
}

export function DrumsLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Drums and sampling">Drum patterns from house to drum and bass, the Push drum layouts, and how Simpler slices a loop onto pads.</PageHeader>
      <Block title="Drum pattern library" description={`${PATTERNS.length} patterns across ${new Set(PATTERNS.map((x) => x.family)).size} genres, one or two bars of 16ths each. Play one, then program it on Push or load it into the step sequencer.`}><DrumPatterns /></Block>
      <DrumLayouts />
      <NoteRepeat />
      <Block title="Slicing a loop"><SliceLab /></Block>
      <More to="/labs/sampler">the sampler, where you can slice your own audio</More>
    </div>
  )
}

export function ArrangementLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Arrangement">How tracks in each genre are laid out, and what enters and leaves in each section. Play it, change it, and turn it into your own track plan.</PageHeader>
      <ArrangementMap />
    </div>
  )
}

export function MixingLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Mixing">Where each part sits in the frequency range, and what sidechain ducking does to the bass.</PageHeader>
      <Block title="Where each part sits"><FrequencyMap /></Block>
      <Block title="Sidechain: the kick ducks the bass"><SidechainLab /></Block>
      <Block title="Train your mixing ears" description="Guess the boosted EQ band, and spot compression and sidechain by ear."><MixEar /></Block>
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

export function LoopLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Loop builder">Pick a genre and get a four-bar loop with drums, bass, chords and a lead in your key. Swap any part, change the chords, mute and solo, then save it, export it as MIDI or play it on your own instruments in Live.</PageHeader>
      <LoopBuilder />
    </div>
  )
}

export function SamplerLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Sampler">Load a drum loop, a vocal or any sound and slice it onto 16 pads, the way Simpler does on Push. Play the pads from your keyboard or controller, pitch and reverse slices, and shuffle them into new grooves.</PageHeader>
      <Sampler />
    </div>
  )
}

export function MelodyLab() {
  return (
    <div className="space-y-10">
      <PageHeader title="Melody">Write a hook over a chord progression. Chord tones are shaded so you can see which notes sit on the harmony, suggestions give you a starting point in a genre’s style, and feedback shows how it’s shaping up.</PageHeader>
      <MelodyWriter />
    </div>
  )
}
