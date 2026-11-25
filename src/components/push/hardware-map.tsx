import { useRef, useState } from "react"
import { useSearchParams } from "react-router"
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
  // ?controls=swing,quantize (from a walkthrough step) highlights those controls to start with.
  const [params] = useSearchParams()
  const [sel, setSel] = useState<ControlId[]>(() => (params.get("controls") ?? "").split(",").filter((c): c is ControlId => c in PUSH3_INFO))
  const fig = useRef<HTMLElement>(null)
  // Picking a name highlights it on the Push and brings the Push into view if it's scrolled away.
  const pick = (id: ControlId) => {
    const next = sel.length === 1 && sel[0] === id ? null : id
    setSel(next ? [next] : [])
    const r = fig.current?.getBoundingClientRect()
    if (next && r && (r.top < 0 || r.bottom > innerHeight)) fig.current!.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
  }
  return (
    <div className="space-y-10">
      <figure ref={fig} className="scroll-mt-6 space-y-2">
        <Push3 selected={sel} />
        <figcaption className="text-muted-foreground text-sm">Hover over a control, or tab to it, to see what it does. Pick a name below to highlight it and see what it does.</figcaption>
      </figure>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map(([title, ids]) => (
          <section key={title} className="space-y-2">
            <h3 className="border-t border-foreground pt-2 text-sm font-medium">{title}</h3>
            <dl className="divide-y">
              {ids.map((id) => (
                <div key={id}>
                  <dt>
                    <button type="button" aria-pressed={sel.includes(id)} onClick={() => pick(id)}
                      className={cn("w-full py-1.5 text-left text-sm hover:underline", sel.includes(id) && "font-medium")}>{PUSH3_INFO[id][0]}</button>
                  </dt>
                  {sel.includes(id) && <dd className="text-muted-foreground pb-2 text-sm text-pretty">{PUSH3_INFO[id][1]}</dd>}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
