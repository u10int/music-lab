import { useState } from "react"
import { Push3 } from "@/components/push/push3"
import { PUSH3_INFO, type ControlId } from "@/data/push3"
import { cn } from "@/lib/utils"

const SECTIONS: [string, ControlId[]][] = [
  ["Top: encoders and display", ["encoders", "upperButtons", "display", "lowerButtons"]],
  ["Left: setup, transport and recording", ["sets", "setup", "learn", "user", "volume", "undo", "save", "lock", "stopClip", "mute", "solo", "swing", "tapTempo", "metronome", "quantize", "fixedLength", "automate", "new", "capture", "record", "play"]],
  ["Middle: playing", ["touchStrip", "pads", "scenes"]],
  ["Right: modes, navigation and editing", ["device", "mix", "clip", "sessionView", "add", "jog", "swap", "master", "dpad", "note", "session", "scale", "layout", "repeat", "accent", "doubleLoop", "duplicate", "convert", "delete", "octaveUp", "octaveDown", "pageLeft", "pageRight", "shift", "select"]],
]

/** Push 3 with every control labeled. Click a control, or a name in the list, to read what it does. */
export function HardwareMap() {
  const [sel, setSel] = useState<ControlId>("pads")
  const [help, setHelp] = useState(true)
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <figure className="space-y-2">
        <Push3 onControl={setSel} selected={sel} help={help} onHelp={setHelp} />
        <figcaption className="text-muted-foreground text-sm">Click any control to see what it does. The layout follows Ableton’s Push 3 diagram.</figcaption>
      </figure>
      <div className="space-y-6">
        <div className="space-y-1 border-t border-foreground pt-3" aria-live="polite">
          <h3 className="text-xl font-medium">{PUSH3_INFO[sel][0]}</h3>
          <p className="text-pretty">{PUSH3_INFO[sel][1]}</p>
        </div>
        {SECTIONS.map(([title, ids]) => (
          <div key={title} className="space-y-2">
            <h4 className="text-muted-foreground text-sm">{title}</h4>
            <ul className="flex flex-wrap gap-1.5">
              {ids.map((id) => (
                <li key={id}>
                  <button type="button" aria-pressed={sel === id} onClick={() => setSel(id)}
                    className={cn("h-7 border px-2.5 text-xs transition-[background-color,color,border-color] duration-150", sel === id ? "border-foreground bg-foreground text-background" : "border-foreground/25 hover:border-foreground")}>
                    {PUSH3_INFO[id][0]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
