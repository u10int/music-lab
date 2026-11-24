import { useId, useState } from "react"
import { cn } from "@/lib/utils"
import { PUSH3_INFO, type ControlId } from "@/data/push3"

/**
 * Push 3, drawn from Ableton's hardware layout. One component for the
 * hardware guide and the virtual Push: pads and buttons can be lit and pressed,
 * the display shows whatever you pass in, and a help overlay labels every
 * control and section the way Ableton's diagram does.
 *
 * Coordinates are in the diagram's own space: the device body runs from
 * (185, 158) to (1213, 1017), and the help labels sit around it.
 */

export type { ControlId }


type Box = { x: number; y: number; w: number; h: number }
const B = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h })
/** Clickable areas for single controls. Groups of icons get one area per icon. */
const HIT: Partial<Record<ControlId, Box>> = {
  sets: B(205, 258, 38, 32), setup: B(243, 258, 38, 32), learn: B(281, 258, 38, 32), user: B(319, 258, 38, 32),
  undo: B(323, 320, 34, 34), save: B(323, 399, 34, 34),
  lock: B(205, 462, 38, 32), stopClip: B(243, 462, 38, 32), mute: B(281, 462, 38, 32), solo: B(319, 462, 38, 32),
  tapTempo: B(205, 577, 73, 46), metronome: B(205, 623, 73, 32), quantize: B(205, 655, 73, 32),
  fixedLength: B(205, 720, 73, 30), automate: B(205, 750, 73, 30),
  new: B(205, 813, 73, 30), capture: B(205, 843, 73, 30), record: B(205, 873, 73, 50), play: B(205, 931, 73, 51),
  touchStrip: B(302, 516, 54, 467),
  device: B(1036, 258, 38, 32), mix: B(1074, 258, 38, 32), clip: B(1112, 258, 38, 32), sessionView: B(1150, 258, 38, 32),
  add: B(1036, 320, 32, 34), swap: B(1036, 399, 32, 34), master: B(1036, 462, 32, 32),
  dpad: B(1088, 462, 105, 106),
  note: B(1088, 577, 52, 42), session: B(1141, 577, 52, 42), scale: B(1088, 619, 52, 42), layout: B(1141, 619, 52, 42),
  repeat: B(1088, 695, 52, 50), accent: B(1141, 695, 52, 50),
  doubleLoop: B(1088, 754, 52, 40), duplicate: B(1141, 754, 52, 40), convert: B(1088, 794, 52, 40), delete: B(1141, 794, 52, 40),
  octaveUp: B(1112, 843, 57, 40), pageLeft: B(1088, 868, 40, 52), pageRight: B(1153, 868, 40, 52), octaveDown: B(1112, 905, 57, 43),
  shift: B(1088, 958, 52, 24), select: B(1141, 958, 52, 24),
  display: B(382, 320, 628, 112),
}

const EX = Array.from({ length: 8 }, (_, i) => 421 + i * 78.5)
const PAD_X = (c: number) => 385 + c * 78.5, PAD_Y = (r: number) => 516 + r * 59
const SCENES = ["1/32t", "1/32", "1/16t", "1/16", "1/8t", "1/8", "1/4t", "1/4"]

/** Help labels and their dotted leader lines, as in Ableton's diagram. */
type Label = { id: ControlId; text: string; sub?: string; x: number; y: number; end: "start" | "end" | "middle"; path: string }
const LEFT = 132, RIGHT = 1266
const LABELS: Label[] = [
  { id: "user", text: "User", x: LEFT, y: 207, end: "end", path: `M${LEFT + 6} 207 H339 V256` },
  { id: "learn", text: "Learn", x: LEFT, y: 238, end: "end", path: `M${LEFT + 6} 238 H299 V256` },
  { id: "sets", text: "Sets", x: LEFT, y: 271, end: "end", path: `M${LEFT + 6} 272 H203` },
  { id: "setup", text: "Setup", x: LEFT, y: 308, end: "end", path: `M${LEFT + 6} 309 H262 V292` },
  { id: "volume", text: "Volume", sub: "Press", x: LEFT, y: 377, end: "end", path: `M${LEFT + 6} 378 H207` },
  { id: "mute", text: "Mute", x: LEFT, y: 428, end: "end", path: `M${LEFT + 6} 429 H299 V460` },
  { id: "stopClip", text: "Stop Clip", x: LEFT, y: 450, end: "end", path: `M${LEFT + 6} 451 H262 V460` },
  { id: "lock", text: "Lock", x: LEFT, y: 479, end: "end", path: `M${LEFT + 6} 480 H203` },
  { id: "solo", text: "Solo", x: LEFT, y: 504, end: "end", path: `M${LEFT + 6} 505 H339 V496` },
  { id: "swing", text: "Swing & Tempo", sub: "Press", x: LEFT, y: 540, end: "end", path: `M${LEFT + 6} 541 H218` },
  { id: "metronome", text: "Metronome", x: LEFT, y: 640, end: "end", path: `M${LEFT + 6} 641 H203` },
  { id: "capture", text: "Capture", x: LEFT, y: 857, end: "end", path: `M${LEFT + 6} 858 H203` },
  { id: "record", text: "Record", x: LEFT, y: 897, end: "end", path: `M${LEFT + 6} 898 H203` },
  { id: "play", text: "Play", x: LEFT, y: 957, end: "end", path: `M${LEFT + 6} 958 H203` },
  { id: "touchStrip", text: "Touch Strip", x: 331, y: 1080, end: "middle", path: "M329 985 V1060" },
  { id: "device", text: "Device", x: RIGHT, y: 208, end: "start", path: `M${RIGHT - 6} 209 H1055 V256` },
  { id: "mix", text: "Mix", x: RIGHT, y: 237, end: "start", path: `M${RIGHT - 6} 238 H1094 V256` },
  { id: "sessionView", text: "Session", x: RIGHT, y: 275, end: "start", path: `M${RIGHT - 6} 276 H1190` },
  { id: "clip", text: "Clip", x: RIGHT, y: 309, end: "start", path: `M${RIGHT - 6} 310 H1131 V292` },
  { id: "add", text: "Add", x: RIGHT, y: 338, end: "start", path: `M${RIGHT - 6} 339 H1070` },
  { id: "jog", text: "Jog Wheel", sub: "Nudge & press", x: RIGHT, y: 377, end: "start", path: `M${RIGHT - 6} 378 H1194` },
  { id: "swap", text: "Swap", x: RIGHT, y: 416, end: "start", path: `M${RIGHT - 6} 417 H1070` },
  { id: "master", text: "Master Track", x: RIGHT, y: 451, end: "start", path: `M${RIGHT - 6} 452 H1052 V460` },
  { id: "dpad", text: "Session D-Pad", x: RIGHT, y: 516, end: "start", path: `M${RIGHT - 6} 517 H1195` },
  { id: "session", text: "Session", x: RIGHT, y: 590, end: "start", path: `M${RIGHT - 6} 591 H1170` },
  { id: "note", text: "Note", x: RIGHT, y: 616, end: "start", path: `M${RIGHT - 6} 617 H1103 V600` },
  { id: "scenes", text: "Scenes & Repeat Intervals", x: 1055, y: 1080, end: "middle", path: "M1052 985 V1060" },
]

export interface PadLook { fill: string; label?: string; ink?: string; aria: string; pressed?: boolean }

export function Push3({
  pad, onPad, onControl, lit = {}, selected, display, help: helpProp, onHelp, className, interactive = true,
}: {
  /** How each pad looks, by row (0 is the top) and column. Omit for plain white pads. */
  pad?: (r: number, c: number) => PadLook
  onPad?: (r: number, c: number) => void
  onControl?: (id: ControlId) => void
  /** Buttons to light: true for white, or a color. */
  lit?: Partial<Record<ControlId, boolean | string>>
  selected?: ControlId | null
  /** Lines of text for the display. */
  display?: React.ReactNode
  help?: boolean
  onHelp?: (v: boolean) => void
  className?: string
  interactive?: boolean
}) {
  const [helpLocal, setHelpLocal] = useState(false)
  const help = helpProp ?? helpLocal
  const setHelp = (v: boolean) => (onHelp ? onHelp(v) : setHelpLocal(v))
  const [hover, setHover] = useState<ControlId | null>(null)
  const clip = "push3-body-" + useId().replace(/:/g, "")
  const mark = selected ?? hover
  const vb = help ? "0 150 1410 950" : "180 153 1038 869"

  const hit = (id: ControlId, box: Box) => (
    <rect key={"h" + id} x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent"
      className={cn(interactive && onControl && "cursor-pointer outline-none")}
      role={onControl ? "button" : undefined} tabIndex={onControl ? 0 : undefined} aria-label={onControl ? PUSH3_INFO[id][0] : undefined}
      aria-pressed={onControl && lit[id] !== undefined ? !!lit[id] : undefined}
      onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover((h) => (h === id ? null : h))}
      onClick={() => onControl?.(id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onControl?.(id) } }} />
  )
  const litFill = (id: ControlId) => (typeof lit[id] === "string" ? (lit[id] as string) : lit[id] ? "#ffffff" : undefined)
  // A white button face, lit when asked.
  const face = (x: number, y: number, w: number, h: number, id?: ControlId) => (
    <rect x={x} y={y} width={w} height={h} fill={id && litFill(id) ? litFill(id) : "#f4f4f4"} className={cn("transition-[fill] duration-100", id && lit[id] === undefined && "opacity-95")} />
  )
  const ink = "#1a1a1a"
  const stroke = { stroke: ink, strokeWidth: 1.6, fill: "none" }
  const T = (x: number, y: number, s: string, size = 8.5, anchor: "start" | "middle" = "start") => <text x={x} y={y} fontSize={size} fill={ink} textAnchor={anchor} fontFamily="var(--font-sans)">{s}</text>
  const box = mark ? HIT[mark] ?? groupBox(mark) : null

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <button type="button" aria-pressed={help} onClick={() => setHelp(!help)}
          className={cn("h-7 border px-3 text-xs transition-[background-color,color] duration-150", help ? "border-foreground bg-foreground text-background" : "border-foreground/30 hover:border-foreground")}>
          {help ? "Hide labels" : "Show labels"}
        </button>
      </div>
      <svg viewBox={vb} className="block h-auto w-full select-none" role="group" aria-label="Push 3">
        {/* Body */}
        <clipPath id={clip}><rect x={185} y={158} width={1028} height={859} /></clipPath>
        <rect x={185} y={158} width={1028} height={859} fill="#262626" />

        {/* Encoders and display buttons */}
        {EX.map((x, i) => <circle key={"e" + i} cx={x} cy={217} r={17} fill="#f4f4f4" />)}
        {EX.map((x, i) => <g key={"u" + i}>{face(x - 35, 258, 70, 32)}<line x1={x - 27} x2={x + 27} y1={281} y2={281} stroke={ink} strokeWidth={2.5} /></g>)}
        <rect x={382} y={320} width={628} height={112} fill="#f4f4f4" />
        <foreignObject x={390} y={326} width={612} height={100}>
          <div className="flex h-full w-full flex-col justify-center overflow-hidden px-3 font-sans text-[15px] leading-snug text-[#1a1a1a]">{display}</div>
        </foreignObject>
        {EX.map((x, i) => <g key={"l" + i}>{face(x - 35, 462, 70, 32)}<line x1={x - 27} x2={x + 27} y1={471} y2={471} stroke={ink} strokeWidth={2.5} /></g>)}

        {/* Left column */}
        {face(205, 258, 152, 32)}
        <g {...stroke}>
          <path d="M218 266 h7 l4 4 v12 h-11 Z" />
          <circle cx={262} cy={274} r={5} strokeDasharray="2.2 1.6" strokeWidth={3} />
          <circle cx={299} cy={272} r={4.5} /><path d="M297 278 v4 h4 v-4" />
          <rect x={334} y={272} width={10} height={9} /><path d="M336 272 v-4 a3 3 0 0 1 6 0" />
        </g>
        {[243, 281, 319].map((x) => <line key={x} x1={x} x2={x} y1={264} y2={284} stroke={ink} strokeWidth={1.6} />)}
        <circle cx={242} cy={377} r={33} fill="#f4f4f4" />
        {face(323, 320, 34, 34, "undo")}{T(340, 340, "Undo", 8, "middle")}
        {face(323, 399, 34, 34, "save")}{T(340, 419, "Save", 8, "middle")}
        {face(205, 462, 152, 32)}
        <g>
          <rect x={219} y={477} width={8} height={7} fill={ink} /><path d="M220.5 477 v-3 a2.5 2.5 0 0 1 5 0 v3" {...stroke} strokeWidth={1.3} />
          <rect x={258} y={475} width={8} height={8} {...stroke} strokeWidth={1.3} />
          {T(299, 482, "M", 9, "middle")}{T(338, 482, "S", 9, "middle")}
          {[243, 281, 319].map((x) => <line key={x} x1={x} x2={x} y1={468} y2={488} stroke={ink} strokeWidth={1.6} />)}
          {(["mute", "solo", "stopClip", "lock"] as ControlId[]).map((id) => litFill(id) && <rect key={id} x={HIT[id]!.x + 4} y={489} width={30} height={3} fill={litFill(id)} />)}
        </g>
        <circle cx={242} cy={540} r={22} fill="#f4f4f4" />
        {face(205, 577, 73, 110)}
        {T(213, 591, "Tap")}{T(213, 601, "Tempo")}
        <line x1={213} x2={270} y1={626} y2={626} stroke={ink} strokeWidth={1.4} />
        <circle cx={216} cy={641} r={3.2} {...stroke} strokeWidth={1.2} /><circle cx={225} cy={641} r={3.2} fill={lit.metronome ? "#23782b" : ink} />
        <line x1={213} x2={270} y1={656} y2={656} stroke={ink} strokeWidth={1.4} />
        {T(213, 675, "Quantize")}
        {face(205, 720, 73, 60, "fixedLength")}
        {T(213, 737, "Fixed Length")}<line x1={213} x2={270} y1={749} y2={749} stroke={ink} strokeWidth={1.4} />{T(213, 768, "Automate")}
        {face(205, 813, 73, 110)}
        {T(213, 830, "New")}<line x1={213} x2={270} y1={842} y2={842} stroke={ink} strokeWidth={1.4} />
        <path d="M213 853 v-3 h4 M223 850 h4 v3 M213 860 v3 h4 M223 863 h4 v-3" {...stroke} strokeWidth={1.4} />
        <line x1={213} x2={270} y1={874} y2={874} stroke={ink} strokeWidth={1.4} />
        <circle cx={219} cy={898} r={6} fill={lit.record ? "#d33" : "none"} stroke={ink} strokeWidth={1.4} />
        {face(205, 931, 73, 51, "play")}
        <path d="M214 948 L228 957 L214 966 Z" fill={lit.play ? "#fff" : "none"} stroke={lit.play ? "#fff" : ink} strokeWidth={1.4} />
        <rect x={302} y={516} width={54} height={467} fill="#f4f4f4" />
        <line x1={344} x2={344} y1={528} y2={970} stroke={ink} strokeWidth={1.6} />

        {/* Pads */}
        {Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8), c = i % 8, p = pad?.(r, c)
          return (
            <g key={"p" + i}>
              <rect x={PAD_X(c)} y={PAD_Y(r)} width={72} height={56} className="transition-[fill] duration-75"
                role={onPad ? "button" : undefined} tabIndex={onPad ? 0 : undefined} aria-label={p?.aria} aria-pressed={p?.pressed}
                style={{ fill: p?.fill ?? "#f4f4f4", ...(onPad ? { cursor: "pointer", touchAction: "none" } : {}) }}
                onPointerDown={onPad ? (e) => { if (e.pointerType !== "mouse" || e.button === 0) onPad(r, c) } : undefined}
                onKeyDown={onPad ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPad(r, c) } } : undefined} />
              {p?.label && <text x={PAD_X(c) + 36} y={PAD_Y(r) + 33} fontSize={14} textAnchor="middle" fill={p.ink ?? "#fff"} fontFamily="var(--font-sans)" pointerEvents="none">{p.label}</text>}
            </g>
          )
        })}

        {/* Scene buttons */}
        {SCENES.map((s, i) => (
          <g key={s}>{face(1035, 517 + i * 59, 33, 52)}{T(1040, 531 + i * 59, s, 7.5)}<path d={`M1041 ${538 + i * 59} l6 4 l-6 4 Z`} {...stroke} strokeWidth={1.1} /></g>
        ))}

        {/* Right column */}
        {face(1036, 258, 152, 32)}
        <g {...stroke}>
          <path d="M1048 279 a6 6 0 1 1 10 0" />
          <path d="M1088 280 v-6 M1092 280 v-12 M1096 280 v-8" />
          <rect x={1125} y={269} width={12} height={10} /><path d="M1129 271 l4 3 l-4 3 Z" fill={ink} />
          <path d="M1164 267 v14 M1169 267 v14 M1174 267 v14" />
        </g>
        {[1074, 1112, 1150].map((x) => <line key={x} x1={x} x2={x} y1={264} y2={284} stroke={ink} strokeWidth={1.6} />)}
        {face(1036, 320, 32, 34, "add")}<path d="M1052 330 v14 M1045 337 h14" {...stroke} />
        {face(1036, 399, 32, 34, "swap")}<path d="M1046 413 a7 7 0 0 1 12 -2 M1058 419 a7 7 0 0 1 -12 2 M1056 409 l2 2 l-3 1 M1048 423 l-2 -2 l3 -1" {...stroke} strokeWidth={1.3} />
        <circle cx={1140} cy={377} r={52} fill="#f4f4f4" />
        {face(1036, 462, 32, 32, "master")}<line x1={1043} x2={1061} y1={471} y2={471} stroke={ink} strokeWidth={2.5} />
        {face(1088, 462, 105, 106)}
        <g {...stroke}><path d="M1135 482 l5 -5 l5 5 M1135 550 l5 5 l5 -5 M1105 510 l-5 5 l5 5 M1175 510 l5 5 l-5 5" /><rect x={1122} y={497} width={36} height={36} strokeWidth={1.2} /></g>
        {face(1088, 577, 105, 84)}
        <g {...stroke} strokeWidth={1.3}>
          <path d="M1141 585 v68 M1096 631 h40 M1146 631 h40" />
          <path d="M1149 585 v12 M1154 585 v12 M1159 585 v12" />
        </g>
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={1096 + (i % 4) * 4} y={585 + Math.floor(i / 4) * 4} width={3} height={3} fill={ink} />)}
        {T(1096, 650, "Scale", 7.5)}{T(1152, 650, "Layout", 7.5)}
        {(["note", "session"] as ControlId[]).map((id) => litFill(id) && <rect key={id} x={HIT[id]!.x + 8} y={613} width={36} height={3} fill={litFill(id)} />)}
        {face(1088, 695, 105, 50)}
        {T(1096, 709, "Repeat", 7.5)}{T(1150, 709, "Accent", 7.5)}<path d="M1141 703 v36" {...stroke} strokeWidth={1.3} />
        {(["repeat", "accent"] as ControlId[]).map((id) => litFill(id) && <rect key={id} x={HIT[id]!.x + 8} y={738} width={36} height={3} fill={litFill(id)} />)}
        {face(1088, 754, 105, 80)}
        {T(1096, 767, "Double", 7.5)}{T(1096, 777, "Loop", 7.5)}{T(1150, 767, "Duplicate", 7.5)}{T(1096, 808, "Convert", 7.5)}{T(1152, 808, "Delete", 7.5)}
        <path d="M1141 760 v68 M1096 794 h40 M1146 794 h40" {...stroke} strokeWidth={1.3} />
        {face(1088, 843, 105, 105)}
        {T(1140, 863, "Octave", 7.5, "middle")}{T(1140, 934, "Octave", 7.5, "middle")}{T(1095, 899, "Page", 7.5)}{T(1168, 899, "Page", 7.5)}
        <path d="M1135 878 l5 -5 l5 5 M1135 913 l5 5 l5 -5 M1121 891 l-4 5 l4 5 M1159 891 l4 5 l-4 5" {...stroke} strokeWidth={1.3} />
        {face(1088, 958, 105, 24)}{T(1104, 973, "Shift", 7.5)}{T(1155, 973, "Select", 7.5)}<path d="M1141 963 v14" {...stroke} strokeWidth={1.3} />

        {/* Highlight for the hovered or selected control */}
        {box && <rect x={box.x - 3} y={box.y - 3} width={box.w + 6} height={box.h + 6} fill="none" stroke="var(--primary)" strokeWidth={4} pointerEvents="none" />}

        {/* Hit areas */}
        {onControl && (Object.keys(HIT) as ControlId[]).map((id) => hit(id, HIT[id]!))}
        {onControl && (["encoders", "upperButtons", "lowerButtons", "volume", "swing", "jog", "scenes"] as ControlId[]).map((id) => hit(id, groupBox(id)))}
        {onControl && !onPad && hit("pads", groupBox("pads"))}

        {/* Help labels */}
        {help && (
          <g fontFamily="var(--font-sans)">
            <path d="M421 196 V184 H640 M756 184 H971 V196" {...dots} stroke="#fff" />
            <text x={698} y={190} fontSize={19} textAnchor="middle" fill="#fff">Encoders</text>
            <path d="M421 293 V303 H600 M796 303 H971 V293" {...dots} stroke="#fff" />
            <text x={698} y={310} fontSize={17} textAnchor="middle" fill="#fff">Upper display buttons</text>
            <path d="M421 457 V447 H600 M796 447 H971 V457" {...dots} stroke="#fff" />
            <text x={698} y={453} fontSize={17} textAnchor="middle" fill="#fff">Lower display buttons</text>
            {LABELS.map((l) => (
              <g key={l.id + l.y} className="cursor-pointer" onClick={() => onControl?.(l.id)} onPointerEnter={() => setHover(l.id)} onPointerLeave={() => setHover(null)}>
                <path d={l.path} {...dots} />
                <path d={l.path} {...dots} stroke="#fff" clipPath={`url(#${clip})`} />
                <text x={l.x} y={l.y + 7} fontSize={21} textAnchor={l.end} fill="currentColor" fontWeight={mark === l.id ? 600 : 400}>{l.text}</text>
                {l.sub && <text x={l.x} y={l.y + 22} fontSize={12} textAnchor={l.end} fill="currentColor" opacity={0.7}>{l.sub}</text>}
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

const dots = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeDasharray: "1.5 4", strokeLinecap: "round" as const }

/** Areas for controls that span a group or are round. */
function groupBox(id: ControlId): Box {
  switch (id) {
    case "encoders": return B(400, 196, 592, 42)
    case "upperButtons": return B(386, 258, 620, 32)
    case "lowerButtons": return B(386, 462, 620, 32)
    case "volume": return B(209, 344, 66, 66)
    case "swing": return B(220, 518, 44, 44)
    case "jog": return B(1088, 325, 104, 104)
    case "scenes": return B(1035, 517, 33, 465)
    case "pads": return B(385, 516, 622, 469)
    default: return HIT[id] ?? B(0, 0, 0, 0)
  }
}
