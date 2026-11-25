/**
 * A short walkthrough for every sprint skill, keyed like the checklist ("s1-0").
 * Steps are written for Push 3 standalone or tethered to Live 12; where Push 2
 * differs, the step says so. Links point at the labs and guides in this app.
 */
export interface SkillGuide {
  /** Why it matters, in one or two sentences. */
  why: string
  /** Rough minutes to work through it once. */
  min: number
  steps: string[]
  /** How you know you've got it. */
  check: string
  /** A repeatable exercise for the practice days. */
  drill: string
  tip?: string
  /** Push 3 controls to highlight for a step, by step index, when the text alone doesn’t name them. */
  controls?: Record<number, import("./push3").ControlId[]>
  /** In-app pages to open alongside: [label, path]. */
  links: [string, string][]
}

export const SKILL_GUIDES: Record<string, SkillGuide> = {
  // ---------- Sprint 1: Drive Live from Push ----------
  "s1-0": {
    why: "Every beat starts here. If loading and swapping sounds is fast, you stay in the music instead of the browser.",
    min: 15,
    steps: [
      "Press Add to open Browse mode, add a MIDI track, then go to Drums and load a Drum Rack kit with the jog wheel: turn to scroll, press to load.",
      "Press Note if you aren't there already. The lower-left 4×4 pads are the 16 drum pads; tap each to hear the kit.",
      "Tap a pad to select it, then press Swap. With a pad selected, Push loads or replaces the sound of only that pad: browse to another kick or snare and press the jog wheel.",
      "Swap a hat and a clap the same way until the kit fits the genre you’re making.",
      "Slide the touch strip (or use the Octave buttons) to scroll the 16 visible pads up or down the 128-pad rack.",
      "Press Undo if a swap made things worse. Shift + Undo brings it back.",
    ],
    check: "From an empty set, you can load a kit and replace three of its sounds in under three minutes without touching the mouse.",
    drill: "Build one kit a day for a different genre: wave, phonk, house. Save the best one to your User Library.",
    tip: "Sort your favorite one-shots into a Collections color in Live’s browser. They show up on Push too, so swapping gets faster.",
    links: [["Push drum layouts", "/push?tab=drums"], ["Drum Rack in the instruments guide", "/instruments?tab=instruments"]],
  },
  "s1-1": {
    why: "The step sequencer is the fastest way to program precise beats, and it teaches you where every hit lives in the bar.",
    min: 20,
    steps: [
      "In Note mode with a Drum Rack in the Loop Selector layout (press Layout to cycle layouts), the 16 drum pads are the bottom-left 4×4, the step sequencer is the top half (two bars of 16th-note steps), and the bottom-right 4×4 are the loop length controls, one pad per page of steps.",
      "Select the kick pad, then tap steps 1, 5, 9 and 13 (the first pad of each group of four). That’s four on the floor.",
      "Select the snare or clap and tap the steps that land on beats 2 and 4.",
      "Hold a step to bring up its editing controls on the display, such as Nudge, Length and Velocity, and turn the encoder under each.",
      "Turn a few hat steps down to low velocity for a softer, more human groove.",
      "Hold one loop length pad and tap another to set where the loop ends: hold the first and tap the second for two bars, then add a variation in bar 2.",
    ],
    check: "You can program a four-on-the-floor beat with quieter offbeat hats and a two-bar variation without looking at the screen.",
    drill: "Pick a pattern from the drum library, read its grid, and program it on Push from memory.",
    tip: "Hold a group of steps at once and turn an encoder to change all of them together. Hold Duplicate and press a loop length pad to copy that page of steps.",
    links: [["Drum pattern library", "/labs/drums"], ["Step sequencer lab", "/labs/sequencer"], ["Push: drums", "/push?tab=drums"]],
  },
  "s1-2": {
    why: "Playing beats in real time captures feel the step sequencer can’t, and Note Repeat makes hi-hat rolls easy.",
    min: 20,
    steps: [
      "Press Fixed Length so it’s on, then hold it to set the recording length to 2 bars. New clips are created at that length.",
      "Press Metronome to turn the click on, and set a tempo with the Swing and Tempo encoder (in Tempo mode) or by tapping Tap Tempo.",
      "Press Record and play a kick and snare on the pads. Pressing Record again stops recording but keeps the clip playing; pressing it a third time turns on overdub so the next passes add notes.",
      "Press Repeat, choose 1/16 with the Repeat Intervals buttons, then hold the hat pad. Press harder for louder hits.",
      "Switch to 1/16t or 1/32 briefly for a roll, then back.",
      "Press Record to switch overdub off again; the clip keeps playing.",
    ],
    check: "You can record a two-bar beat in one or two takes, with a Note Repeat hat roll, and it loops cleanly.",
    drill: "Use the timing trainer for five minutes before each session, then record one beat live.",
    tip: "Press and release Repeat quickly to latch it on, or hold it for momentary rolls while you play.",
    links: [["Timing trainer", "/labs/timing"], ["Push: recording", "/push?tab=recording"], ["Note Repeat in the glossary", "/instruments?tab=glossary#gl-noterepeat"]],
  },
  "s1-3": {
    why: "Swing is the difference between a stiff loop and one that moves. Quantize lets you keep the feel while fixing sloppy hits. On Push, swing is applied when notes are quantized or played with Note Repeat, so you set the amount first, then quantize to hear it.",
    min: 15,
    steps: [
      "Make a straight 16th hat loop to hear the change on: in a drum clip, select the closed-hat pad and tap all 16 steps of the step sequencer (the top half of the pads), then press Play.",
      "Find the Swing and Tempo encoder: the small knob at the top left, below the Volume encoder and just above Tap Tempo. Tap it and the display shows whether it’s set to Tempo or Swing; press it to switch to Swing.",
      "Turn it to set the swing amount (0–100%, in 1% steps). Nothing changes yet: the amount is only applied when notes are quantized or repeated. The manual gives no recommended values, so set it by ear.",
      "Apply it to the same hats: hold Quantize and tap the closed-hat pad. Only the hats are quantized with your swing, so the off-16ths now land late. Change the amount and do it again to compare.",
      "Record a loose take of kick and snare on the pads, then press Quantize: with no notes selected it quantizes the whole clip, with the same swing.",
      "Hold Quantize to open its settings: Quantize To sets the grid (try 1/16) and Quantize Amount how far notes move (try 50–75% so some human timing survives). Swing Amount is here too, on the first encoder.",
    ],
    check: "You can set a swing amount, quantize just the hats with it, and hear the difference: none for techno, light for house, heavy for garage and lo-fi.",
    drill: "Load the UK garage and lo-fi patterns in the drum library, listen to their swing, then match it on Push by quantizing your hats at different amounts.",
    tip: "To hear swing live, turn on Repeat and hold the hat pad: repeated notes use the swing amount straight away.",
    controls: { 0: ["pads", "play"], 2: ["swing", "display"] },
    links: [["Drum patterns with swing", "/labs/drums"], ["Swing in the sequencer lab", "/labs/sequencer"], ["Push 3 hardware map", "/push?tab=hardware&controls=swing,quantize"]],
  },
  "s1-4": {
    why: "Variations come from copying and changing, not starting over. These buttons keep ideas safe while you experiment.",
    min: 15,
    steps: [
      "With a one-bar beat playing, press Double Loop. It doubles the loop’s length and copies what’s in it, so bar 2 is ready for a fill.",
      "Change a few hits in bar 2 to make a fill.",
      "Hold Delete and press a drum pad to delete that pad’s notes in the clip.",
      "Press Undo to bring it back. Shift + Undo redoes.",
      "Jam freely on the pads without recording, then press Capture. Push keeps the notes you just played as a clip.",
      "In Session mode, hold Duplicate and press a clip to copy it, then tap another clip slot to paste it there.",
    ],
    check: "You can make a two-bar variation of a beat in under a minute, and recover a jam you didn’t record with Capture.",
    drill: "Each session, make the loop, then three variations by doubling, deleting and duplicating.",
    links: [["Push: recording buttons", "/push?tab=recording"], ["Shortcuts", "/push?tab=shortcuts"]],
  },
  "s1-5": {
    why: "Session view is how you sketch and perform. Launching clips and scenes from the grid turns loops into a song.",
    min: 15,
    steps: [
      "Press Session. Each column of pads is a track and each row is a scene. Lit pads hold clips.",
      "Tap a lit pad to launch that clip. With Live’s default launch quantization of one bar, it starts on the next bar, so you stay in time.",
      "Press a Scene button on the right to launch a whole row at once.",
      "Hold Stop Clip and press a track’s lower display button to stop the clip playing on that track. Hold Shift and press Stop Clip to stop all clips.",
      "Use the Session D-pad to move around: left and right move between tracks, up and down between scenes.",
      "Hold Layout for Session Overview and jump to a far-away block of clips. Hold Shift and press Layout to keep it open.",
    ],
    check: "You can perform a 2-minute jam by launching four scenes and dropping tracks in and out.",
    drill: "Make three scenes of the same beat (sparse, full, breakdown) and switch between them in time.",
    links: [["Push: Session and mix", "/push?tab=session"]],
  },

  // ---------- Sprint 2: Harmony on the grid ----------
  "s2-0": {
    why: "Scale mode means every pad is a right note, so you can focus on melody and chords instead of wrong keys.",
    min: 15,
    steps: [
      "Load any synth on a MIDI track and press Note.",
      "Press Scale. Pick the key (try A) with the upper and lower display buttons, and Minor with the encoders or the Session D-pad.",
      "Root notes light up in the track’s color. In the default 4ths layout each row is a fourth above the one below, like the strings of a bass guitar.",
      "Press the leftmost lower display button to switch between In Key and Chromatic. In Key only puts the key’s notes on the pads; Chromatic has all 12, with out-of-key pads unlit.",
      "Play the scale up the bottom row. In In Key, the root an octave up is two rows up and one pad to the right of the root you started on.",
    ],
    check: "You can set any key and scale on Push and play its scale up and down an octave without stopping.",
    drill: "Use the Play along page with scale runs at a slow tempo, three keys a day.",
    links: [["Scales and chords lab", "/labs/theory"], ["Play along", "/labs/play-along"], ["Push: notes and scales", "/push?tab=notes"]],
  },
  "s2-1": {
    why: "Triads are the building block of every progression. On Push they are shapes, so learn the shape once and use it everywhere.",
    min: 20,
    steps: [
      "In In Key layout, find a root pad. The 3rd is two pads to the right on the same row; the 5th is one pad right on the row above.",
      "Press all three at once: that’s a triad in the key. Move the shape one pad right for the next chord.",
      "In Chromatic layout, a minor triad is root, 3 pads right, then 7 pads right (or 2 right on the next row).",
      "A major triad is root, 4 pads right, 7 pads right. Play major and minor back to back to hear the difference.",
      "Open the Scales and chords lab and play its chords while watching the Push grid diagram.",
    ],
    check: "Given a root, you can play its minor and major triads in Chromatic layout without counting.",
    drill: "Ear training: chord quality, 10 questions a day. Aim for 8 of 10.",
    links: [["Scales and chords lab", "/labs/theory"], ["Ear training", "/labs/ear"]],
  },
  "s2-2": {
    why: "These two progressions carry a huge share of wave, trance and progressive house. Owning them in three keys makes writing fast.",
    min: 25,
    steps: [
      "Set Push to A minor. i–VI–III–VII is Am–F–C–G: the triad shapes on degrees 1, 6, 3 and 7.",
      "Play each chord for one bar with the metronome on. Keep your hand in the same area by choosing the nearest shape.",
      "Now i–iv–v: Am–Dm–Em. Notice how it feels darker and more closed.",
      "Change the key to F minor, then C♯ minor. In In Key layout the shapes don’t change; only the sound does.",
      "Record each progression as a 4-bar clip so you have them to build on.",
    ],
    check: "You can play both progressions in A minor, F minor and C♯ minor at 120 BPM without stopping.",
    drill: "Build each in the chord progression lab, export the MIDI, and play along with it on Push.",
    tip: "The loop builder plays these progressions with genre sounds, a good check that yours sound right.",
    links: [["Chord progression builder", "/labs/progressions"], ["Loop builder", "/labs/loop-builder"], ["Circle of fifths", "/labs/theory?tab=circle"]],
  },
  "s2-3": {
    why: "A bassline that follows the chord roots locks everything together; passing notes make it move.",
    min: 20,
    steps: [
      "On a new MIDI track, load a bass sound and set Push to the same key.",
      "With your chord clip playing, play just the root of each chord, one long note per bar, an octave or two down.",
      "Try eighth-note roots, or offbeat roots for a house or trance roll.",
      "Add a passing note: on beat 4 of a bar, play a scale note between this root and the next.",
      "Record it as a clip the same length as your chords.",
    ],
    check: "Your bassline always lands on the chord’s root on beat 1, and at least one passing note leads into the next chord.",
    drill: "Use the loop builder: mute the bass, play your own over the chords, then compare with its bass.",
    links: [["Loop builder", "/labs/loop-builder"], ["Bass sounds", "/labs/sound-design"]],
  },
  "s2-4": {
    why: "Recording and overdubbing turn ideas into a sketch. Scenes with different clip lengths keep things interesting.",
    min: 20,
    steps: [
      "Turn on Fixed Length and hold it to set 4 bars. Select the chord track and press Record to record a chord clip.",
      "Press Record again to stop recording (the clip keeps playing), then press Record once more to overdub a higher voicing on top.",
      "Press New to stop the selected clip and prepare an empty clip slot on that track for a different idea. In the default Scene Workflow, New also makes a new scene with the other playing clips.",
      "In Session mode, launch your clips together as a scene. Change Fixed Length to 2 or 8 bars for other parts.",
      "Press Duplicate to make a new scene with all the clips that are playing, then change one part. (That’s the default Scene Workflow; in Clip Workflow, set in Setup, it’s Shift + Duplicate.)",
    ],
    check: "You have two scenes with drums, bass and chords, made only on Push, and can switch between them in time.",
    drill: "Every day, record one new scene variation from the previous one.",
    links: [["Push: recording", "/push?tab=recording"], ["Push: Session", "/push?tab=session"]],
  },

  // ---------- Sprint 3: Sound design ----------
  "s3-0": {
    why: "Device mode puts eight useful controls under your hands, so you shape sounds by ear instead of with the mouse.",
    min: 10,
    steps: [
      "Select a track with an instrument and press Device. The display shows its parameters, and each encoder controls the parameter above it.",
      "Turn each encoder and listen, watching the value change on the display.",
      "Press the upper display button above the device’s name to see all its parameter tabs, then pick a tab with the lower display buttons.",
      "For a Rack, the Rack’s display buttons switch between its parameter banks. Press Add to add another device to the track.",
      "To keep Push on one device while you select other tracks, right-click the device’s title bar in Live and look under Lock to… for your control surface. Not every surface supports locking. (Push 3’s own Lock button is different: it locks the lower display buttons to Stop Clip, Mute or Solo.)",
    ],
    check: "You can find a synth’s filter cutoff and envelope on Push without looking at the screen.",
    drill: "Pick one Live device a day and learn its first two banks by touch.",
    controls: { 4: [] },
    links: [["Push: hardware", "/push?tab=hardware"], ["Modulation guide", "/instruments?tab=modulation"]],
  },
  "s3-1": {
    why: "Drift is simple enough to learn completely, and every other synth works the same way: oscillator, filter, envelope, LFO.",
    min: 30,
    steps: [
      "Load Drift and play a note. Switch Oscillator 1’s waveform (Sine, Triangle, Shark Tooth, Saturated, Saw, Pulse, Rectangle) and turn Shape: saw is bright, rectangle hollow, sine pure.",
      "Lower the filter cutoff until it’s dark, then raise resonance to hear the peak.",
      "Set Env 1, which shapes the volume by default: short attack and decay with no sustain gives a pluck; long attack and release give a pad.",
      "In the filter’s Freq Mod, choose Env 2 as a modulation source and turn its amount up, then set Env 2’s decay short. Now each note opens bright and closes.",
      "Set the other filter modulation source to LFO, give it an amount, and slow the LFO’s rate for a wobble.",
      "Recreate one genre sound from the sound design lab, then match it in Drift.",
    ],
    check: "From Drift’s init patch you can make a pluck, a bass and a pad, each in under three minutes.",
    drill: "Play Match the sound for three rounds a day, then try the same knob changes in Drift.",
    links: [["Synth playground", "/labs/sound-design"], ["Match the sound", "/labs/sound-design"], ["Envelope in the glossary", "/instruments?tab=glossary#gl-envelope"]],
  },
  "s3-2": {
    why: "Wavetable gives you modern bass and pad tones; Meld adds textures and movement Drift can’t make.",
    min: 25,
    steps: [
      "Load Wavetable, pick a basic wavetable and move Wave Position. The tone morphs through the table.",
      "For a bass: one oscillator, Poly/Mono set to Mono, low-pass around 400–800 Hz, Sub on. Route an LFO to the oscillator’s position in the Matrix tab for movement.",
      "For a pad: both oscillators on, detune slightly, choose a Unison mode (Classic is a good start) and raise its Amount, then long attack and release.",
      "Load Meld, play chords and turn each engine’s two macro knobs, which change with the oscillator type you pick.",
      "Save each as a preset with your name in it so you can find them later.",
    ],
    check: "You have one Wavetable bass, one Wavetable pad and one Meld texture saved.",
    drill: "Use the genre sound cards: pick one per day built on Wavetable or Meld and rebuild it.",
    links: [["Genre sounds", "/labs/sound-design"], ["Wavetable position", "/instruments?tab=glossary#gl-position"]],
  },
  "s3-3": {
    why: "An Instrument Rack with eight macros gives you a performance-ready sound with the controls that matter, right on Push.",
    min: 20,
    steps: [
      "Select your instrument’s and effects’ title bars in Live, then press Cmd/Ctrl+G (or right-click and choose Group) to make an Instrument Rack.",
      "Show the Rack’s Macro Controls, turn on Map mode, click a parameter (like filter cutoff), then click a macro’s Map button.",
      "Map the other macros to what you tweak most: resonance, drive, attack, reverb send or dry/wet.",
      "Set each mapping’s Min and Max in Map mode so the whole knob is useful (Min above Max inverts it).",
      "On Push, press Device to control the Rack; use the Rack’s display buttons to switch macro banks. Save the Rack to your User Library.",
    ],
    check: "Your rack’s eight macros each change the sound in a useful way across their whole range.",
    drill: "Turn every preset you made this sprint into a rack with macros.",
    links: [["Macros in the glossary", "/instruments?tab=glossary#gl-macro"]],
  },
  "s3-4": {
    why: "Effects often make the sound more than the synth does. Learning a standard chain gets you most of the way.",
    min: 20,
    steps: [
      "After your synth, add Saturator (or Roar) for warmth and grit. Start with low drive and raise it until it thickens.",
      "Add Auto Filter for movement: a slow LFO on the cutoff, or keep it for automation later.",
      "Add Reverb and Delay on return tracks instead of on the sound, and send to them with the track’s sends.",
      "On Push, press Mix, then Sends, to set how much of each track goes to the returns.",
      "Compare with the effect bypassed. Keep it only if it’s better.",
    ],
    check: "Your sound has a chain of saturation, filter and send effects, and you can explain what each does.",
    drill: "Read one effect in the effects guide each day and try it on a loop.",
    links: [["Effects guide", "/instruments?tab=effects"], ["Mixing ears", "/labs/ear"]],
  },

  // ---------- Sprint 4: Sampling ----------
  "s4-0": {
    why: "Splice inside Live lets you audition samples already in your song’s key and tempo, which saves hours of searching.",
    min: 15,
    steps: [
      "Splice is in Live’s Browser from Live 12.3. Open it and log in (a free Splice account works).",
      "Search for what you need, like “phonk cowbell” or “vocal chop”.",
      "Audition samples while your loop plays: Live plays them in sync and in key with your Set.",
      "Drag the sample to a track or a Drum Rack pad to use it.",
      "On Push, load samples you’ve saved from Add’s browser, for example from a Collection you added them to. (Ableton’s Push 3 manual doesn’t cover browsing Splice itself from Push.)",
    ],
    check: "You can find and load three samples that fit your loop’s key and tempo in five minutes.",
    drill: "Each day, find one sample and save it to a Collection for this sprint.",
    links: [["Sampler lab", "/labs/sampler"]],
  },
  "s4-1": {
    why: "Simpler is the core sampling tool on Push. Its three modes cover one-shots, playable instruments and chopped loops.",
    min: 25,
    steps: [
      "Drag an audio file onto a MIDI track to load it into a Simpler. Press Device on Push to see it; choose the mode with the encoder above Mode.",
      "Classic mode plays the sample chromatically across the pads, like a synth. Try it with a vocal or a note.",
      "One-Shot is monophonic and doesn’t loop: good for drums and FX.",
      "Slicing mode cuts it up: slice by Transient, Beat, Region or Manual. Each slice plays from its own pad.",
      "In Slicing mode, play the pads in a new order to make a new phrase.",
    ],
    check: "You can switch a sample between all three modes and say when you’d use each.",
    drill: "Slice one loop a day in the sampler lab, then do the same in Simpler on Push.",
    links: [["Sampler lab", "/labs/sampler"], ["Slicing in the glossary", "/instruments?tab=glossary#gl-slice"]],
  },
  "s4-2": {
    why: "Warping keeps samples in time with your song. The right warp mode keeps them sounding natural.",
    min: 25,
    steps: [
      "Drag a loop into an audio track. With Live’s default settings it’s warped, and for an even-length loop Live assumes 1, 2, 4, 8 or 16 bars to estimate its tempo.",
      "Open the clip and check the first downbeat. If it’s wrong, put the insert marker on the real downbeat and choose Set 1.1.1 Here from the Sample Editor’s right-click menu.",
      "Choose the warp mode: Beats for drums, Tones for vocals and basslines, Texture for pads and noise, Complex or Complex Pro for full songs.",
      "Change the song’s tempo and listen for artifacts. Try another mode if it sounds smeared.",
      "Double-click in the upper half of the Sample Editor to add warp markers on strong hits if the loop drifts out of time.",
    ],
    check: "Any 2- or 4-bar loop you load plays in time with your song after a minute of warping.",
    drill: "Warp one loop at a very different tempo each day and pick the best mode.",
    tip: "This is the sprint where the mouse is fine: warp markers are easier on screen.",
    links: [["Warp in the glossary", "/instruments?tab=glossary#gl-warp"]],
  },
  "s4-3": {
    why: "Resampling turns a complex loop into audio you can chop, reverse and stretch, a big part of modern sampling.",
    min: 20,
    steps: [
      "Create an audio track and set its Audio From input to Resampling, which records Live’s main output.",
      "Turn on Fixed Length and set 4 bars. Arm the new track.",
      "Play your loop and press Record to record your own output into a clip.",
      "Drag the new clip into Simpler and slice it.",
      "Play a new phrase from the slices, the way you would with any sample.",
    ],
    check: "You’ve resampled your own loop and built a new variation from its slices.",
    drill: "Resample one loop a day and make a transition or fill from it.",
    links: [["Sampler lab", "/labs/sampler"]],
  },
  "s4-4": {
    why: "Pitched and reversed chops add movement and surprise. A pitched cowbell melody is the signature phonk sound.",
    min: 20,
    steps: [
      "Simpler’s Transpose and Reverse act on the whole sample. To pitch or reverse single slices, press Convert in Slicing mode: Push makes a Drum Rack with every slice on its own pad.",
      "Select one slice’s pad, then in its Simpler change Transpose, or turn on Reverse to make a swell into the next hit.",
      "For a cowbell melody, load a single cowbell into Simpler in Classic mode so the pads play it chromatically.",
      "Set Push to the song’s key and play a short riff in the high octave.",
      "Add Saturator after it for the hard phonk tone.",
    ],
    check: "You have a phonk cowbell riff in key and one reversed chop leading into a section.",
    drill: "Play the phonk cowbell sound in the sound design lab, then match its riff on Push.",
    links: [["Phonk sounds", "/genres/phonk"], ["Sampler lab", "/labs/sampler"]],
  },

  // ---------- Sprint 5: Arrangement ----------
  "s5-0": {
    why: "Performing scenes into Arrangement gives you a full structure in one take, with the feel of a live set.",
    min: 25,
    steps: [
      "Lay out 6–8 scenes in Session from sparse to full: intro, build, drop, breakdown and so on.",
      "In Live, turn on the Arrangement Record button in the Control Bar. Live logs the clips you launch into the Arrangement.",
      "On Push, launch the scenes in order, staying on each for 8 or 16 bars. Drop tracks in and out with Stop Clip.",
      "Press Arrangement Record again or stop playback, press Tab to see the Arrangement, and click Back to Arrangement so it plays instead of the Session clips.",
      "Listen back once all the way through before changing anything.",
    ],
    check: "You’ve recorded a full 2–3 minute take of your scenes into the Arrangement.",
    drill: "Do one take a day; keep the best.",
    links: [["Arrangement map", "/labs/arrangement"], ["Track planner", "/planner"]],
  },
  "s5-1": {
    why: "Automation is what makes an arrangement evolve. Recording it with encoders keeps the moves musical.",
    min: 20,
    steps: [
      "Press Automate on Push. It’s red when on and white when off.",
      "Play your clip or arrangement and turn a filter cutoff encoder slowly over 8 bars.",
      "Play it back. The move is recorded. Turn the same encoder again to override it.",
      "Hold Shift and press Automate to bring back automation you overrode.",
      "Hold Delete and press Automate to delete all automation in the clip. To clear one parameter, hold Delete and tap its encoder.",
    ],
    check: "Your track has at least two recorded moves, like a filter opening in the build and a reverb swell before the drop.",
    drill: "Record one automation move per section, one section a day.",
    links: [["Push: recording", "/push?tab=recording"]],
  },
  "s5-2": {
    why: "Tension and release are what make a drop land. These tools create the tension.",
    min: 20,
    steps: [
      "Add a noise riser: white noise through Auto Filter, automating the cutoff up over 8 bars.",
      "Add a reverse cymbal or crash into the drop: turn on Reverse in Simpler, or the Rev button in the audio clip’s Sample Editor.",
      "Drop out the kick and bass for the last bar before the drop.",
      "Add a downlifter or impact on the first beat of the drop.",
      "Listen to the build in your reference notebook track and compare.",
    ],
    check: "Your build has a riser, a drop-out and an impact, and the drop feels bigger than without them.",
    drill: "Make one new transition a day from noise, a reversed sound or a resampled loop.",
    links: [["Arrangement map", "/labs/arrangement"], ["Reference notebook", "/notebook"]],
  },
  "s5-3": {
    why: "Listeners stay interested when something changes every 8 or 16 bars. Layering is how you get there without new ideas.",
    min: 20,
    steps: [
      "Write down what changes every 8 bars in one section of a reference track.",
      "Add a rolling bass in the drop that wasn’t in the intro.",
      "Let the pad evolve with slow filter or volume automation.",
      "Bring in a new percussion layer (shaker, ride, perc loop) every 8 or 16 bars.",
      "Take one layer out at the start of each new section, so the next entry has impact.",
    ],
    check: "No 16-bar stretch of your track goes by without something entering or leaving.",
    drill: "Map one reference in the notebook, then mirror its layering in your track.",
    controls: { 2: [] },
    links: [["Reference notebook", "/notebook"], ["Track planner", "/planner"]],
  },
  "s5-4": {
    why: "Editing turns a take into a track. Small cuts and extensions fix flow problems.",
    min: 20,
    steps: [
      "In Arrangement view, select a section’s time range and use Duplicate Time (Cmd/Ctrl+Shift+D) to repeat it, pushing everything after it later.",
      "Use Cut Time (Cmd/Ctrl+Shift+X) to remove bars that drag.",
      "Make sure every section starts on a 4-, 8- or 16-bar boundary.",
      "Fix clips that start or end abruptly with short fades.",
      "Listen from the start once more and note anything that feels long.",
    ],
    check: "Your arrangement flows start to finish and every section starts on a phrase boundary.",
    drill: "Edit one section a day; listen to the whole track at the end of each session.",
    tip: "This is the one sprint where the screen leads. Use Push for automation, the mouse for edits.",
    links: [["Track planner", "/planner"]],
  },

  // ---------- Sprint 6: Mix and finish ----------
  "s6-0": {
    why: "Mixing on Push makes you listen instead of watch meters.",
    min: 15,
    steps: [
      "Press Mix. The encoders adjust the tracks’ volume, pan or sends.",
      "Use the upper display buttons to choose which: Volume, Pan or Sends.",
      "Set a rough balance with the kick loudest, then bass, then everything else around them.",
      "Hold Solo and press a track’s lower display button to solo it, and hold Mute to mute one the same way.",
      "Set sends to your reverb and delay returns.",
    ],
    check: "You can set a rough balance and send levels for your whole track from Push.",
    drill: "Do a quick mix pass from Push alone at the start of each session.",
    links: [["Push: Session and mix", "/push?tab=session"], ["Mixing lab", "/labs/mixing"]],
  },
  "s6-1": {
    why: "Leaving headroom keeps the mix clean and gives the master chain room to work.",
    min: 15,
    steps: [
      "Pull every fader down a bit, then bring up the kick until it peaks around −12 dB.",
      "Bring the bass up to sit with the kick, then everything else.",
      "Check the master: peaks should be near −6 dB with no limiter on it.",
      "Use Utility’s Gain on loud tracks instead of pulling faders all the way down.",
    ],
    check: "Your master peaks around −6 dB and nothing on any track clips.",
    drill: "Start every mix by gain staging before any EQ or compression.",
    links: [["Mixing lab", "/labs/mixing"]],
  },
  "s6-2": {
    why: "EQ makes room for each part. Cutting what you don’t need is more effective than boosting what you want.",
    min: 25,
    steps: [
      "Add EQ Eight to each track except kick and bass and high-pass it until you hear it thin out, then back off a little.",
      "On the bass, cut a little where the kick hits hardest, often 60–100 Hz, or sidechain instead.",
      "Find mud: boost a narrow band and sweep from 200–500 Hz; when it sounds ugly, cut there.",
      "Boost only gently, and only after cutting.",
      "Compare with EQ bypassed at the same loudness.",
    ],
    check: "Every track except kick and bass has a high-pass, and the low mids feel clear.",
    drill: "Mixing ears: the 7-band EQ drill, 10 questions a day.",
    links: [["Mixing ears", "/labs/ear"], ["Frequency map", "/labs/mixing"]],
  },
  "s6-3": {
    why: "Sidechain gives the kick room and adds groove; bus compression glues parts together.",
    min: 25,
    steps: [
      "Add a Compressor to the bass and turn on Sidechain, feeding it from the kick track.",
      "Set a fast attack, a release that ends before the next kick, and lower the threshold until the bass ducks.",
      "Do the same on pads for the house or wave pump.",
      "Group your drums and add Glue Compressor: slow attack, auto release, 1–3 dB of gain reduction.",
      "Add Glue on the master too, gently.",
    ],
    check: "The kick cuts through the bass every hit, and the drums sound like one kit.",
    drill: "Mixing ears: sidechained or not, and compressed or not, five each per day.",
    links: [["Sidechain lab", "/labs/mixing"], ["Mixing ears", "/labs/ear"], ["Sidechain in the glossary", "/instruments?tab=glossary#gl-sidechain"]],
  },
  "s6-4": {
    why: "A reference at the same loudness tells you what your mix needs. Exporting the right formats finishes the job.",
    min: 20,
    steps: [
      "Put a reference on its own audio track and set its Audio To output straight to your interface’s outputs, so it bypasses the Main track’s processing.",
      "Turn the reference down until it’s as loud as your mix, then switch back and forth.",
      "Note the biggest difference (too much low end, too dull, too quiet) and fix that first.",
      "Export with File › Export Audio/Video (Cmd/Ctrl+Shift+R): Rendered Track Main, File Type WAV, Bit Depth 24, Sample Rate as your Set.",
      "Turn on Encode MP3 to get a 320 kbps MP3 alongside it, then listen on your phone.",
    ],
    check: "You have a WAV and an MP3 of your track, and you’ve compared it with a reference at matched loudness.",
    drill: "A/B against the reference at every mix session.",
    links: [["Reference notebook", "/notebook"], ["Weekly exports", "/exports"]],
  },
}
