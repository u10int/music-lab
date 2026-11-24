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

/** Push 3 at full width: hover any control for its name and what it does, with every control listed below. */
export function HardwareMap() {
  const [sel, setSel] = useState<ControlId | null>(null)
  return (
    <div className="space-y-10">
      <figure className="space-y-2">
        <Push3 selected={sel} />
        <figcaption className="text-muted-foreground text-sm">Hover over a control, or tab to it, to see what it does. Pick a name below to find it on the hardware.</figcaption>
      </figure>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map(([title, ids]) => (
          <section key={title} className="space-y-2">
            <h3 className="border-t border-foreground pt-2 text-sm font-medium">{title}</h3>
            <dl className="divide-y">
              {ids.map((id) => (
                <div key={id}>
                  <dt>
                    <button type="button" aria-pressed={sel === id} onClick={() => setSel(sel === id ? null : id)}
                      className={cn("w-full py-1.5 text-left text-sm hover:underline", sel === id && "font-medium")}>{PUSH3_INFO[id][0]}</button>
                  </dt>
                  {sel === id && <dd className="text-muted-foreground pb-2 text-sm text-pretty">{PUSH3_INFO[id][1]}</dd>}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
