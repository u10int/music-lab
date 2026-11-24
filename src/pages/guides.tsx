import { useSearchParams } from "react-router"
import { Effects, Glossary, Identify, Instruments, Modulation } from "@/components/guide/reference"
import { Sounds } from "@/components/guide/sounds"
import { PageHeader } from "@/components/page"
import { BeatSteps, DrumLayouts, NoteRepeat } from "@/components/push/drum-layouts"
import { HardwareMap } from "@/components/push/hardware-map"
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
