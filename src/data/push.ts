export const PGVIEWS: [string, string][] = [["hardware", "The hardware"], ["drums", "Drums"], ["notes", "Notes and scales"], ["session", "Session and mix"], ["recording", "Recording"], ["shortcuts", "Shortcuts"]];

export const SHARP: string[] = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const REPEAT_RATES: string[] = ["1/4", "1/4t", "1/8", "1/8t", "1/16", "1/16t", "1/32", "1/32t"];

export const HW: [string, string][] = [
  ["Eight encoders", "Control whatever the display shows under them: device parameters, mix levels, note settings while you hold steps. Touch one to see its value."],
  ["Volume encoder", "Main and headphone volume, left of the display. Push 3 also has a Swing and Tempo encoder."],
  ["Display and display buttons", "The upper row of buttons picks what to edit, like a device or the Volume, Pan or Sends page in Mix. The lower row selects tracks, and with Mute, Solo or Stop Clip held it mutes, solos or stops that track."],
  ["64 pads", "Velocity-sensitive and MPE-capable: each pad has three expressive dimensions, pressure, slide and per-note pitch bend."],
  ["Touch strip", "Pitch bend or modulation when playing notes (hold Select and tap it to switch). With a Drum Rack it selects the bank of 16 pads."],
  ["Scenes and Repeat Intervals", "Launch scenes in Session mode. With Repeat on, they’re the Repeat Intervals buttons that set the Note Repeat rate. They also set the step sequencer’s step size."],
  ["Recording and editing buttons", "Play, Record, Automate, Fixed Length, Capture, Quantize, Duplicate, Delete, Undo, New, Metronome and Tap Tempo, among others."],
  ["Jog wheel", "Turn to scroll the browser and menus, press to select, nudge left or right to go back or open options."],
  ["Modes and navigation", "Session, Note, Clip, Device and Mix change what the pads and display do. Layout, Scale, Repeat, Accent, Octave, Page and Shift sit here too, with the arrow pad for moving around the Session grid."]
];

export const REC: [string, string][] = [
  ["Fixed Length", "Press to turn on or off, hold to set the length. When it’s on, new clips are created at that many bars, so 4 or 8 keeps you in phrase."],
  ["Record", "Records a new clip. Press again to stop recording and keep playing; press a third time to overdub, and again to switch between playback and overdub."],
  ["Capture", "Already played something good without recording? Press Capture to keep the notes you just played as a clip. In an empty Set with the transport stopped, it also detects the tempo."],
  ["Quantize", "Snaps the clip's notes to the grid. Hold it to set Swing, the grid size and amount, or turn on Record Quantize."],
  ["Repeat", "Note Repeat. Hold a pad to retrigger it at the rate set by the Repeat Intervals buttons. Tap to latch, hold for momentary."],
  ["Accent", "Notes you play or step in are full velocity (127). Tap to latch, hold for momentary."],
  ["Duplicate", "In Session mode, hold it, press a clip, then tap another slot to paste. In the default Scene Workflow, pressing it makes a new scene from the playing clips. Hold it and press a loop length pad to copy a page of steps."],
  ["Double Loop", "Doubles the loop’s length and copies what’s in it, the quickest way to make a variation in the second half."],
  ["New", "Stops the selected clip and prepares an empty clip slot on the track. In the default Scene Workflow it also makes a new scene with the other playing clips."],
  ["Automate", "Turns automation recording on (red) or off (white). Turn encoders while the clip plays to record moves. Hold Delete and press Automate to delete all the clip’s automation."],
  ["Convert", "Turns an audio clip into a Simpler, a Drum Rack pad, or MIDI (harmony, melody or drums), and Simpler slices into a Drum Rack."],
  ["Undo", "Undo the last action. Shift and Undo redoes."]
];

export const SHORT: [string, string][] = [
  ["Shift + Undo", "Redo"], ["Hold Delete + pad", "Clear that pad's notes, or a clip in Session"], ["Hold Delete + Automate", "Clear the clip's automation"],
  ["Hold Delete + encoder", "Clear that parameter's automation"], ["Hold Quantize", "Swing, grid and Record Quantize settings"], ["Quantize + drum pad", "Quantize only that drum"],
  ["Hold Fixed Length", "Set the recording length"], ["Hold Layout", "Session Overview in Session mode; loop length controls in the 64 Pads drum layout"], ["Shift + Layout", "Keep Session Overview open"],
  ["Shift + Stop Clip", "Stop all clips"], ["Hold Mute or Solo + lower display button", "Mute or solo that track"], ["Hold steps + encoders", "Edit only those notes"],
  ["Hold Repeat", "Momentary Note Repeat"], ["Hold Accent", "Momentary Accent"], ["Shift + Automate", "Re-enable automation you overrode"], ["Shift + touch strip", "Switch octaves in the melodic sequencer"]
];
