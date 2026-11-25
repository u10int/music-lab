import type { DrumKind, OscType } from "@/audio/engine"
export interface Scale { id: string; name: string; iv: number[]; minor?: boolean; note: string }
export interface Envelope { a: number; d: number; s: number; r: number }
export interface SynthPreset { name: string; wave: OscType; env: Envelope; cutoff: number; res: number; detune: number; oct: number }
export type LaneState = "on" | "off" | "half" | "filt" | "riser" | "impact" | "sweep"

export const SCALES: Scale[] = [
  { id: "minor", name: "Natural minor", iv: [0, 2, 3, 5, 7, 8, 10], minor: true, note: "The default for phonk, wave and most progressive house." },
  { id: "major", name: "Major", iv: [0, 2, 4, 5, 7, 9, 11], note: "Bright and resolved. Useful for euphoric progressive breakdowns." },
  { id: "harm", name: "Harmonic minor", iv: [0, 2, 3, 5, 7, 8, 11], minor: true, note: "Minor with a raised 7th. The major V chord pulls hard back to i." },
  { id: "dorian", name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10], minor: true, note: "Minor with a raised 6th. Darker than major, softer than natural minor." },
  { id: "phryg", name: "Phrygian", iv: [0, 1, 3, 5, 7, 8, 10], minor: true, note: "Minor with a flat 2nd. Tense and dark, common in phonk melodies." }
];

export const ROOTS: string[] = ["C", "C♯ / D♭", "D", "E♭ / D♯", "E", "F", "F♯ / G♭", "G", "A♭ / G♯", "A", "B♭ / A♯", "B"];

export const SPELL: Record<number, string[]> = { 0: ["C"], 1: ["C♯", "D♭"], 2: ["D"], 3: ["E♭", "D♯"], 4: ["E"], 5: ["F"], 6: ["F♯", "G♭"], 7: ["G"], 8: ["A♭", "G♯"], 9: ["A"], 10: ["B♭", "A♯"], 11: ["B"] };

export const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], ACC: Record<string, string> = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const PRESETS: Record<string, SynthPreset> = {
  pluck: { name: "Pluck", wave: "sawtooth", env: { a: 0.005, d: 0.25, s: 0, r: 0.2 }, cutoff: 2500, res: 0.2, detune: 0, oct: 4 },
  pad: { name: "Pad", wave: "sawtooth", env: { a: 1.2, d: 0.8, s: 0.7, r: 1.8 }, cutoff: 1400, res: 0.1, detune: 12, oct: 4 },
  reese: { name: "Reese bass", wave: "sawtooth", env: { a: 0.01, d: 0.2, s: 1, r: 0.15 }, cutoff: 650, res: 0.14, detune: 30, oct: 2 },
  sub: { name: "Sub bass", wave: "sine", env: { a: 0.005, d: 0.9, s: 0.3, r: 0.25 }, cutoff: 8000, res: 0, detune: 0, oct: 2 },
  lead: { name: "Lead", wave: "square", env: { a: 0.03, d: 0.25, s: 0.6, r: 0.3 }, cutoff: 3000, res: 0.3, detune: 6, oct: 4 }
};

export const WAVES: [OscType, string, string, string][] = [
  ["sine", "Sine", "Pure and round. Sub bass and 808s.", "M0 16 C 8 0, 8 0, 16 16 S 24 32, 32 16 S 40 0, 48 16 S 56 32, 64 16"],
  ["triangle", "Triangle", "Soft and hollow. Gentle leads.", "M0 16 L8 2 L24 30 L40 2 L56 30 L64 16"],
  ["sawtooth", "Saw", "Bright and buzzy. Reese, pads, plucks.", "M0 30 L30 2 L30 30 L62 2 L62 30"],
  ["square", "Square", "Hollow and retro. Leads and plucks.", "M0 30 V2 H16 V30 H32 V2 H48 V30 H64"]
];

export const SLICE_HITS: [DrumKind, number][] = [["kick", 0], ["hat", 0.125], ["snare", 0.25], ["hat", 0.375], ["kick", 0.5], ["kick", 0.625], ["snare", 0.75], ["hat", 0.875]];

export const REORDER: number[] = [0, 1, 6, 3, 0, 4, 2, 7];

export const ARR_TEMPO = 122;

export const SECTIONS: [string, number, number][] = [["Intro", 8, 2], ["Build", 8, 4], ["Drop", 16, 8], ["Breakdown", 16, 3], ["Build", 8, 6], ["Drop", 16, 9], ["Outro", 8, 2]];

export const LANES: [string, LaneState[]][] = [
  ["Kick", ["on", "on", "on", "off", "half", "on", "on"]],
  ["Hats and percussion", ["half", "on", "on", "off", "on", "on", "half"]],
  ["Bass", ["off", "filt", "on", "off", "filt", "on", "off"]],
  ["Chords and pad", ["filt", "on", "on", "on", "on", "on", "filt"]],
  ["Lead or pluck", ["off", "off", "on", "half", "on", "on", "off"]],
  ["FX", ["off", "riser", "impact", "off", "riser", "impact", "sweep"]]
];

export const ST_TXT: Record<LaneState, string> = { on: "Playing", off: "Out", half: "Enters partway", filt: "Filtered", riser: "Riser", impact: "Impact on the first beat", sweep: "Downlifter sweep" };

export const ST_SHORT: Partial<Record<LaneState, string>> = { riser: "Riser", impact: "Impact", sweep: "Sweep" };

export const FREQ: [string, [number, number][]][] = [
  ["Sub and 808", [[30, 80]]], ["Kick", [[45, 120], [2000, 5000]]], ["Bass and reese", [[60, 400]]],
  ["Snare and clap", [[150, 300], [2000, 8000]]], ["Chords and pads", [[200, 6000]]], ["Leads and plucks", [[400, 8000]]],
  ["Vocals and chops", [[150, 8000]]], ["Hats and shaker", [[6000, 16000]]]
];

export const MAN3 = "https://www.ableton.com/en/push/manual/", MAN2 = "https://www.ableton.com/en/live-manual/12/using-push-2/";

export const SAME = "=";

export const SHORTCUTS: Record<string, [string, string, string][]> = {
  s1: [
    ["Note Repeat", "Press Repeat, pick a rate from the interval buttons that light up, then hold a pad. Tap Repeat quickly to keep it on.", "Press Repeat, pick a rate with the Scene/Grid buttons, then hold a pad. Hold Repeat for momentary use."],
    ["Fixed length recording", "Press Fixed Length to toggle it. Hold Fixed Length to set the length.", SAME],
    ["Swing", "Press the Swing and Tempo encoder to switch it to Swing, then turn it. The amount is applied when you quantize or use Note Repeat.", "Turn the Swing knob."],
    ["Quantize", "Press Quantize. Hold Quantize and tap a drum pad to quantize only that drum. Hold Quantize alone for settings.", "Press Quantize. Hold Quantize for settings, including Swing Amount."],
    ["Clear one drum", "Hold Delete and tap the drum pad.", SAME],
    ["Remove one step", "Tap a lit step.", SAME],
    ["Set loop length", "Hold a loop length pad and tap another. Double-tap a pad for exactly one page.", SAME],
    ["Double the loop", "Press Double Loop.", SAME],
    ["Capture what you just played", "Press Capture. The track must be armed.", "No Capture button is documented for Push 2. Use Capture MIDI in Live's transport bar."],
    ["Undo and redo", "Press Undo. Hold Shift and press Undo to redo.", SAME],
    ["Tap tempo", "Press Tap Tempo once per beat.", SAME]
  ],
  s2: [
    ["Choose key and scale", "Press Scale. Pick the key with the display buttons and the scale with the encoders.", "Press Scale. Pick the key with the display buttons and the scale with Encoders 2–7."],
    ["In Key or Chromatic", "Press Scale, then the leftmost lower display button.", SAME],
    ["Switch Session and Note", "Press Session or Note.", "Press Session or Note. Hold Session to peek at clips, then let go."],
    ["Start a new clip", "Press New to stop the current clip and get an empty slot ready.", SAME],
    ["Copy a clip", "Press Duplicate to copy the selected clip to the next slot.", "In Session mode, hold Duplicate, press the clip, then tap the empty slot."],
    ["Capture a chord idea", "Press Capture after playing on an armed track.", "Use Capture MIDI in Live's transport bar."],
    ["Metronome", "Press Metronome. Hold it for settings.", "Press Metronome."]
  ],
  s3: [
    ["Load an instrument or effect", "Press Add to browse instruments and effects.", "Press Add Device, or press Browse and then Load."],
    ["Remove a device", "Hold Delete and press the device's display button.", "See the Push 2 chapter of the Live manual."],
    ["Undo a tweak", "Press Undo. Hold Shift and press Undo to redo.", SAME]
  ],
  s4: [
    ["Load a sample or Simpler", "Press Add and browse to Simpler or your Splice folder.", "Press Browse, find the sample, then press Load."],
    ["Resample at a set length", "Press Fixed Length to toggle it. Hold it to set the length before recording.", SAME],
    ["Clear one slice's notes", "Hold Delete and tap the pad.", SAME],
    ["Copy a pad to a new pad", "Hold Duplicate and press the Drum Rack pad, then choose where it goes.", "See the Push 2 chapter of the Live manual."]
  ],
  s5: [
    ["Record automation", "Press Automate. It turns red when armed.", "Press Automate to arm automation recording."],
    ["Bring back overridden automation", "Hold Shift and press Automate.", SAME],
    ["Clear a clip's automation", "Hold Delete and press Automate.", SAME],
    ["New scene from playing clips", "Hold Shift and press Duplicate.", SAME],
    ["Delete a clip", "In Session mode, hold Delete and press the clip.", SAME]
  ],
  s6: [
    ["Mixer", "Press Mix for Global Mix: volume, pan and sends for every track. Press again for Track Mix.", "Press Mix to switch between Track Mix and Global Mix. Hold it to use Mix temporarily."],
    ["Master and cue volume", "Press the Volume encoder to choose what it controls, then turn it.", "Turn the Master volume encoder."],
    ["Undo a mix move", "Press Undo. Hold Shift and press Undo to redo.", SAME]
  ]
};

export const QUALS: [string, number[]][] = [["Major", [0, 4, 7]], ["Minor", [0, 3, 7]], ["Diminished", [0, 3, 6]], ["Augmented", [0, 4, 8]]];

export const INTERVALS: string[] = ["Minor 2nd", "Major 2nd", "Minor 3rd", "Major 3rd", "Perfect 4th", "Tritone", "Perfect 5th", "Minor 6th", "Major 6th", "Minor 7th", "Major 7th", "Octave"];

export function spellScale(pc: number, iv: number[]): string[] {
  let best: { cost: number; notes: { l: string; a: number }[] } | null = null;
  for (const nm of SPELL[pc]) {
    const L = LET.indexOf(nm[0]);
    const notes = iv.map((x, i) => { const li = (L + i) % 7; let a = ((pc + x) - NAT[li]) % 12; if (a > 6) a -= 12; if (a < -6) a += 12; return { l: LET[li], a }; });
    const cost = notes.reduce((s, n) => s + Math.abs(n.a) * (Math.abs(n.a) > 1 ? 4 : 1), 0);
    if (!best || cost < best.cost) best = { cost, notes };
  }
  return best!.notes.map(n => n.l + ACC[n.a]);
}
