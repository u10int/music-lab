import { Cable, ChevronDown } from "lucide-react"
import { Steps } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { connectMidiOut, selectOutput, setEcho, useMidiOut } from "@/midi/midi-out"

const OFF = "off"

/** Pick a MIDI output so loops play your own instruments in Live. */
export function MidiOutPicker({ idPrefix = "mo", channels }: { idPrefix?: string; channels?: React.ReactNode }) {
  const m = useMidiOut()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {m.status !== "ready" ? (
          <Button variant="outline" size="sm" onClick={() => void connectMidiOut()}><Cable />Send MIDI to Live</Button>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-port`}>MIDI out</Label>
              <Select value={m.selected || OFF} onValueChange={(v) => selectOutput(v === OFF ? "" : v)}>
                <SelectTrigger id={`${idPrefix}-port`} size="sm" className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFF}>Off, browser sound only</SelectItem>
                  {m.outputs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {m.selected && (
              <div className="flex h-8 items-center gap-2">
                <Switch id={`${idPrefix}-echo`} checked={m.echo} onCheckedChange={setEcho} />
                <Label htmlFor={`${idPrefix}-echo`} className="font-normal">Play in the browser too</Label>
              </div>
            )}
          </>
        )}
        {m.status === "unsupported" && <span className="text-muted-foreground text-sm">MIDI out needs Chrome or Edge.</span>}
        {m.status === "denied" && <span className="text-muted-foreground text-sm">MIDI access was blocked. Allow it in the site settings, then try again.</span>}
        {m.status === "ready" && !m.outputs.length && <span className="text-muted-foreground text-sm">No MIDI outputs found. Set up a virtual port first.</span>}
      </div>
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium hover:underline">
          How to set it up <ChevronDown className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Steps items={[
            <>Create a virtual MIDI port. On a Mac, open Audio MIDI Setup, choose Window › Show MIDI Studio, double-click IAC Driver and tick “Device is online”. On Windows, install and run loopMIDI and add a port.</>,
            <>In Live, open Settings › Link, Tempo & MIDI and turn on Track for that port’s input.</>,
            <>Pick the port here. Arm a MIDI track in Live with its input set to the port and its monitor set to In.</>,
            channels ?? <>Notes go out on channel 1. Leave the track’s input on All Channels.</>,
            <>Match Live’s tempo to this page. The browser plays the timing, so record into Live’s Arrangement or a clip to keep a take.</>,
          ]} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
