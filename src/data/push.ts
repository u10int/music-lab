export const PGVIEWS: [string, string][] = [["hardware", "The hardware"], ["drums", "Drums"], ["notes", "Notes and scales"], ["session", "Session and mix"], ["recording", "Recording"], ["shortcuts", "Shortcuts"]];

export const SHARP: string[] = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const REPEAT_RATES: string[] = ["1/4", "1/4t", "1/8", "1/8t", "1/16", "1/16t", "1/32", "1/32t"];

export const HW: [string, string][] = [
  ["Eight encoders", "Control whatever the display shows under them: device parameters, mix levels, note settings while you hold steps. Touch one to see its value."],
  ["Volume encoder", "Main and headphone volume, left of the display. Push 3 also has a Swing and Tempo encoder."],
  ["Display and display buttons", "The upper row of buttons picks what to edit, like a device or the Volume, Pan or Sends page in Mix. The lower row selects tracks, and with Mute, Solo or Stop Clip held it mutes, solos or stops that track."],
  ["64 pads", "Velocity- and pressure-sensitive, with MPE: each pad responds to pressure, sliding up and down, and side-to-side pitch bend."],
  ["Touch strip", "Pitch bend or modulation when playing notes. With a Drum Rack it scrolls the 16 drum pads up and down the rack."],
  ["Scenes and Repeat Intervals", "Launch scenes in Session mode. With Repeat on, they set the Note Repeat rate, from 1/4 to 1/32t."],
  ["Recording and editing buttons", "Play, Record, Automate, Fixed Length, Capture, Quantize, Duplicate, Delete, Undo, New, Metronome and Tap Tempo, among others."],
  ["Jog wheel", "Turn to scroll the browser and menus, press to select, nudge left or right to go back or open options."],
  ["Modes and navigation", "Session, Note, Clip, Device and Mix change what the pads and display do. Layout, Scale, Repeat, Accent, Octave, Page and Shift sit here too, with the arrow pad for moving around the Session grid."]
];

export const REC: [string, string][] = [
  ["Fixed Length", "Press to turn on, hold to set the length. New clips stop recording and loop at that many bars, so 4 or 8 bars keeps you in phrase."],
  ["Record", "Records into the selected clip slot, or overdubs into a playing clip. Press again to stop recording and keep playing."],
  ["Capture", "Already played something good without recording? Press Capture and Push turns what you just played into a clip, and sets the tempo if nothing is playing."],
  ["Quantize", "Snaps the clip's notes to the grid. Hold it to set Swing, the grid size and amount, or turn on Record Quantize."],
  ["Repeat", "Note Repeat. Hold a pad to retrigger it at the rate set by the Scene buttons."],
  ["Accent", "Every note you play or step in is full velocity. Tap to latch, hold for momentary."],
  ["Duplicate", "Copy a clip, scene, track or loop page. Hold Duplicate and press the thing to copy, then where it goes."],
  ["Double Loop", "Doubles the clip's length and copies its contents, the quickest way to make a variation in the second half."],
  ["New", "Gives you an empty clip on the selected track so you can record a new idea without losing the old one."],
  ["Automate", "Turns automation recording on. Turn encoders while the clip plays to record moves. Hold Delete and press Automate to clear it."],
  ["Convert", "Turns audio into a Simpler, a drum pad, or MIDI: harmony, melody or drums."],
  ["Undo", "Undo the last action. Shift and Undo redoes."]
];

export const SHORT: [string, string][] = [
  ["Shift + Undo", "Redo"], ["Hold Delete + pad", "Clear that pad's notes, or a clip in Session"], ["Hold Delete + Automate", "Clear the clip's automation"],
  ["Hold Delete + encoder", "Clear that parameter's automation"], ["Hold Quantize", "Swing, grid and Record Quantize settings"], ["Quantize + drum pad", "Quantize only that drum"],
  ["Hold Fixed Length", "Set the recording length"], ["Hold Layout", "Loop length pads, or Session Overview in Session mode"], ["Shift + Layout", "Keep Session Overview open"],
  ["Shift + Stop Clip", "Stop all clips"], ["Hold Mute or Solo + lower display button", "Mute or solo that track"], ["Hold steps + encoders", "Edit only those notes"],
  ["Hold Repeat", "Momentary Note Repeat"], ["Hold Accent", "Momentary Accent"], ["Shift + Automate", "Re-enable automation you overrode"], ["Shift + touch strip", "Move a row, or an octave in the sequencer"]
];
