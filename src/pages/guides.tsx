import { useSearchParams } from "react-router"
import { Effects, Glossary, Identify, Instruments, Modulation } from "@/components/guide/reference"
import { Sounds } from "@/components/guide/sounds"
import { PageHeader } from "@/components/page"
import { BeatSteps, DrumLayouts, NoteRepeat } from "@/components/push/drum-layouts"
import { HardwareMap } from "@/components/push/hardware-map"
import { VirtualPush } from "@/components/push/virtual-push"
import { KeyPicker } from "@/components/key-picker"
import { MidiOutPicker } from "@/components/midi-out-picker"
import { PlayableGrid, SequencingLayouts } from "@/components/push/notes-lab"
import { Recording, ShortcutTable } from "@/components/push/recording"
import { MixMode, SessionGrid } from "@/components/push/session-mix"
import { Block } from "@/components/page"
import { UrlTabs } from "@/components/url-tabs"

export function InstrumentsPage() {
  const [params] = useSearchParams()
  const q = params.get("q") ?? ""
  return (
    <div className="space-y-8">
      <PageHeader title="Live instruments and effects">Which Live 12 Suite instrument to use, 21 sound recipes you can preview, the effects and chains to reach for, and the words you'll see along the way.</PageHeader>
      <UrlTabs
        label="Guide section"
        tabs={[
          ["sounds", "Sounds", <Sounds key={q} initialQuery={q} />],
          ["identify", "Identify a sound", <Identify key="identify" />],
          ["instruments", "Instruments", <Instruments key="instruments" />],
          ["effects", "Effects", <Effects key="effects" />],
          ["modulation", "Modulation", <Modulation key="modulation" />],
          ["glossary", "Glossary", <Glossary key="glossary" />],
        ]}
      />
    </div>
  )
}

export function PushPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Push 3">The hardware, pad layouts for drums and notes, Session and Mix, recording, and the shortcuts worth learning.</PageHeader>
      <section aria-labelledby="vp-h" className="space-y-6">
        <div className="space-y-2">
          <h2 id="vp-h" className="font-sans text-heading font-medium">Practice on a virtual Push</h2>
          <p className="max-w-3xl text-pretty">Push 3 as it’s laid out on the hardware, so the muscle memory carries over. Use it to try an idea away from the studio, or to learn where things sit. Hover over any control to see what it does.</p>
        </div>
        <VirtualPush />
        <div className="text-sm text-pretty">
          <dl className="grid gap-6 md:grid-cols-3">
            <div><dt className="font-medium">Drum mode</dt><dd className="text-muted-foreground">The bottom-left 16 pads play the kit. Press one to select it, then press steps in the top four rows to program two bars for that pad. The bottom-right pads set the velocity of new steps, like Push’s 16 Velocities. Press Play to hear it, tap Tap Tempo in time to set the tempo, Accent for full-velocity hits, and Delete to clear the selected pad.</dd></div>
            <div><dt className="font-medium">Note mode</dt><dd className="text-muted-foreground">The In Key layout in the key below. Blue pads are the root, up a row is a fourth. The Octave buttons move the range, and Note switches between the two tracks.</dd><div className="pt-2"><KeyPicker idPrefix="vp" /></div></div>
            <div><dt className="font-medium">With your Push connected</dt><dd className="text-muted-foreground">Pads you press on the hardware light up here. Pick an output to send the drum pattern to Live as MIDI on channel 10, on Drum Rack pad notes.</dd><div className="pt-2"><MidiOutPicker idPrefix="vp" /></div></div>
          </dl>
        </div>
      </section>
      <UrlTabs
        label="Push guide section"
        tabs={[
          ["hardware", "The hardware", <HardwareMap key="hardware" />],
          ["drums", "Drums", <div key="drums" className="space-y-12"><DrumLayouts /><BeatSteps /><NoteRepeat /></div>],
          ["notes", "Notes and scales", <div key="notes" className="space-y-12"><Block title="Playing in key"><PlayableGrid /></Block><SequencingLayouts /></div>],
          ["session", "Session and mix", <div key="session" className="space-y-12"><SessionGrid /><MixMode /></div>],
          ["recording", "Recording", <Recording key="recording" />],
          ["shortcuts", "Shortcuts", <ShortcutTable key="shortcuts" />],
        ]}
      />
    </div>
  )
}
