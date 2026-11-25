import type { ControlId } from "./push3"

/**
 * Which Push 3 controls a walkthrough step mentions, found from the button names
 * in its text. Verbs that are also button names (Play, Record, Delete…) only
 * count when they aren’t the first word, so “Record a loose take” doesn’t light
 * the Record button but “press Record” does.
 */
const NAMES: [RegExp, ControlId, boolean?][] = [
  [/Swing (?:and|&) Tempo encoder|\bSwing encoder\b|\bTempo encoder\b/, "swing"],
  [/\bTap Tempo\b/, "tapTempo"],
  [/\bMetronome\b/, "metronome"],
  [/\bQuantize\b/, "quantize"],
  [/\bFixed Length\b/, "fixedLength"],
  [/\bAutomate\b/, "automate"],
  [/\bCapture\b/, "capture", true],
  [/(?<!Arrangement )\bRecord\b(?! button in the transport)/, "record", true],
  [/\bPlay\b/, "play", true],
  [/\bNew\b/, "new", true],
  [/\bUndo\b/, "undo", true],
  [/\bSave\b/, "save", true],
  [/\bStop Clip\b/, "stopClip"],
  [/\bMute\b/, "mute", true],
  [/\bSolo\b/, "solo", true],
  [/\bRepeat\b/, "repeat"],
  [/\bAccent\b/, "accent"],
  [/\bDouble Loop\b/, "doubleLoop"],
  [/\bDuplicate\b/, "duplicate", true],
  [/\bConvert\b/, "convert", true],
  [/\bDelete\b/, "delete", true],
  [/(?<![+/])\bShift\b(?!\+)/, "shift", true],
  [/\bSelect\b/, "select", true],
  [/\bOctave\b/, "octaveUp"],
  [/\bPage (?:Left|Right)\b|\bPage buttons?\b/, "pageLeft"],
  [/\bNote (?:button|mode)\b|\bpress Note\b/i, "note"],
  [/\bSession (?:button|mode)\b|\bpress Session\b/i, "session"],
  [/\bScale (?:button|menu|mode)\b|\bpress Scale\b/i, "scale"],
  [/\bLayout\b/, "layout"],
  [/\bDevice (?:button|mode|view)\b|\bpress Device\b/i, "device"],
  [/\bMix (?:button|mode)\b|\bpress Mix\b/i, "mix"],
  [/\bClip (?:button|mode)\b/, "clip"],
  [/\bAdd (?:button|Device|Track)\b|\bpress Add\b|\bin Add\b/i, "add"],
  [/\bSwap\b/, "swap"],
  [/\barrow (?:pad|buttons?|keys?)\b|\bSession D-pad\b/i, "dpad"],
  [/\bjog wheel\b/i, "jog"],
  [/\bVolume encoder\b/, "volume"],
  [/\btouch ?strip\b/i, "touchStrip"],
  [/\bscene buttons?\b|\bScene Launch buttons?\b|\bRepeat Intervals buttons?\b|\bbuttons that light up on the right\b/i, "scenes"],
  [/\b(?:the |a |its )?(?:upper|top) (?:row of )?buttons\b|\bupper display buttons?\b/i, "upperButtons"],
  [/\blower (?:row of )?(?:display )?buttons?\b/i, "lowerButtons"],
  [/(?<!lower |upper )\bdisplay buttons\b/i, "upperButtons"],
  [/\b(?:the )?encoders?\b(?! (?:to switch|is set))/i, "encoders"],
  // Only drum and grid pads, not synth pad sounds.
  [/\b(?:the|drum|rack|kick|snare|clap|hat|lit|first|second|root|\d+(?: visible)?|4×4) pads?\b|\bpads? (?:are|is|up|down)\b|\btap (?:a|each|the) pad\b|\ba step\b|\bloop length pads?\b|\bslice’s pad\b/i, "pads"],
]

export function controlsIn(text: string): ControlId[] {
  const out: ControlId[] = []
  for (const [re, id, notFirst] of NAMES) {
    const m = text.match(re)
    if (!m || m.index === undefined) continue
    // Skip a verb-like button name that starts the step or a sentence.
    if (notFirst && /(^|[.!?]\s+)$/.test(text.slice(0, m.index))) {
      const rest = text.slice(m.index + m[0].length)
      if (!re.test(rest)) continue
    }
    // “Swing and Tempo encoder” shouldn’t also light the top-row encoders.
    if (id === "encoders" && out.includes("swing") && !/\btop encoders?\b|\bencoders? (?:above|over|under)\b|\bfirst encoder\b/i.test(text)) continue
    if (!out.includes(id)) out.push(id)
  }
  return out
}
