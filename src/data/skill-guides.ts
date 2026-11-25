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
      "Press Add. Choose to add a MIDI track, then browse to Drums and load any Drum Rack kit with the jog wheel: turn to scroll, press to load.",
      "Press Note if you aren't there already. The lower-left 4×4 pads are the 16 drum pads; tap each to hear the kit.",
      "Tap a pad to select it, then press Swap. Browse to another kick or snare and press the jog wheel to replace just that pad’s sample.",
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
      "In Note mode with a Drum Rack, the top half of the pads is the step sequencer: 32 steps, each a 16th note. The lower right 4×4 pads are loop length pages.",
      "Select the kick pad, then tap steps 1, 5, 9 and 13 (the first pad of each group of four). That’s four on the floor.",
      "Select the snare or clap and tap the steps that land on beats 2 and 4.",
      "Hold a step and turn the encoders: one sets velocity, another nudges the note early or late, another sets its length. Watch the display as you turn.",
      "Turn a few hat steps down to low velocity for a softer, more human groove.",
      "Hold the first loop length pad and tap the second to make the loop two bars, then add a variation in bar 2.",
    ],
    check: "You can program a four-on-the-floor beat with quieter offbeat hats and a two-bar variation without looking at the screen.",
    drill: "Pick a pattern from the drum library, read its grid, and program it on Push from memory.",
    tip: "Hold several steps at once and turn an encoder to change all of them together.",
    links: [["Drum pattern library", "/labs/drums"], ["Step sequencer lab", "/labs/sequencer"], ["Push: drums", "/push?tab=drums"]],
  },
  "s1-2": {
    why: "Playing beats in real time captures feel the step sequencer can’t, and Note Repeat makes hi-hat rolls easy.",
    min: 20,
    steps: [
      "Hold Fixed Length and pick 2 bars on the display, then let go so it stays on. New recordings will stop and loop at two bars.",
      "Turn on the metronome with the Metronome button and set a tempo with the Tempo encoder or Tap Tempo.",
      "Press Record, play a kick and snare on the pads, and let it loop. Each pass overdubs more.",
      "Press Repeat, choose 1/16 from the buttons that light up on the right, then hold the hat pad. Press harder for louder hits.",
      "Switch to 1/16t or 1/32 briefly for a roll, then back.",
      "Press Record again to stop recording but keep the clip playing.",
    ],
    check: "You can record a two-bar beat in one or two takes, with a Note Repeat hat roll, and it loops cleanly.",
    drill: "Use the timing trainer for five minutes before each session, then record one beat live.",
    tip: "Tap Repeat to latch it on, or hold it for momentary rolls while you play.",
    links: [["Timing trainer", "/labs/timing"], ["Push: recording", "/push?tab=recording"], ["Note Repeat in the glossary", "/instruments?tab=glossary#gl-noterepeat"]],
  },
  "s1-3": {
    why: "Swing is the difference between a stiff loop and one that moves. Quantize lets you keep the feel while fixing sloppy hits. On Push, swing is applied when notes are quantized or played with Note Repeat, so you set the amount first, then quantize to hear it.",
    min: 15,
    steps: [
      "Make a straight 16th hat loop to hear the change on: in a drum clip, select the closed-hat pad and tap all 16 steps of the step sequencer (the top half of the pads), then press Play.",
      "Find the Swing and Tempo encoder: the small knob at the top left, below the Volume encoder and just above Tap Tempo. Tap it once and the display shows whether it’s set to Tempo or Swing; press it to switch to Swing.",
      "Turn it to set the swing amount, from 0% (straight) up to 100%, in 1% steps. Nothing changes yet: the amount is only applied when notes are quantized or repeated.",
      "Apply it to the same hats: hold Quantize and tap the closed-hat pad. Only the hats are quantized with your swing, so the off-16ths now land late. Change the amount and do it again to compare.",
      "Record a loose take of kick and snare on the pads, then press Quantize to snap the whole clip to the grid with the same swing.",
      "Hold Quantize to open its settings: set Quantize To 1/16 and Quantize Amount to 50–75% so some human timing survives. Swing Amount is here too, on the first encoder.",
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
      "With a one-bar beat playing, press Double Loop. The clip is now two bars with the beat copied, ready for a fill in bar 2.",
      "Change a few hits in bar 2 to make a fill.",
      "Hold Delete and tap a drum pad to clear every note of that drum in the clip.",
      "Press Undo to bring it back. Shift + Undo redoes.",
      "Jam freely on the pads without recording, then press Capture. Push turns what you just played into a clip.",
      "In Session mode, hold Duplicate and press the clip, then press an empty slot to copy it there.",
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
      "Tap a lit pad to launch that clip. It starts on the next bar, so you can stay in time.",
      "Press a Scene button on the right to launch a whole row at once.",
      "Hold Stop Clip and press a track’s lower display button to stop just that track. Shift + Stop Clip stops everything.",
      "Use the arrow pad to move around when you have more than eight tracks or scenes.",
      "Hold Layout to see the Session Overview and jump to a far-away block of clips.",
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
      "Press Scale. Pick a root note (try A) with the display buttons and Minor with the encoders.",
      "Root notes light up in a different color. Each row is a fourth above the one below, like the strings of a bass guitar.",
      "Press the leftmost lower display button to switch In Key and Chromatic. In Key hides wrong notes; Chromatic shows all 12 with out-of-key pads dark.",
      "Play the scale up the bottom row, then find the same root one row up and three pads left.",
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
      "Hold Fixed Length and set 4 bars. Arm the chord track and press Record to record a chord clip.",
      "While it loops, press Record again to stop, then press Record once more to overdub a higher voicing on top.",
      "Press New to stop the clip and get an empty slot on the same track for a different idea.",
      "In Session mode, launch your clips together as a scene. Change Fixed Length to 2 or 8 bars for other parts.",
      "Hold Shift and press Duplicate to make a new scene from what’s playing, then change one part.",
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
      "Select a track with an instrument and press Device. The display shows a bank of eight parameters.",
      "Turn each encoder and listen. Touch an encoder to see its value without changing it.",
      "Use the upper display buttons (or Page buttons) to move between parameter banks.",
      "Select another device in the chain with the display buttons to control it instead.",
      "In Live, right-click a device’s title bar and choose Lock to Control Surface so Push keeps controlling it when you select other tracks.",
    ],
    check: "You can find a synth’s filter cutoff and envelope on Push without looking at the screen.",
    drill: "Pick one Live device a day and learn its first two banks by touch.",
    links: [["Push: hardware", "/push?tab=hardware"], ["Modulation guide", "/instruments?tab=modulation"]],
  },
  "s3-1": {
    why: "Drift is simple enough to learn completely, and every other synth works the same way: oscillator, filter, envelope, LFO.",
    min: 30,
    steps: [
      "Load Drift and play a note. Turn its oscillator Shape and switch the waveform: saw is bright, square hollow, sine pure.",
      "Lower the filter cutoff until it’s dark, then raise resonance to hear the peak.",
      "Set the amp envelope: short attack and decay with no sustain gives a pluck; long attack and release give a pad.",
      "Route the filter envelope to cutoff and set its decay short. Now each note opens bright and closes.",
      "Turn up the LFO and point it at the filter for a slow wobble.",
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
      "Load Wavetable, pick a basic wavetable and turn Position. The tone morphs through the table.",
      "For a bass: one oscillator, Mono on, low-pass around 400–800 Hz, sub on. Map an LFO to Position for movement.",
      "For a pad: both oscillators on, detune slightly, add Unison, long attack and release.",
      "Load Meld, play chords and explore its macros. Textures come from its noise and modulated engines.",
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
      "Select your instrument and its effects in Live, then press Cmd/Ctrl+G to group them into an Instrument Rack.",
      "Click Show Macro Controls. Right-click a parameter (like filter cutoff) and choose Map to Macro 1.",
      "Map the other macros to what you tweak most: resonance, drive, attack, reverb send or dry/wet.",
      "Set each macro’s range in Map mode so the whole knob is useful.",
      "On Push, press Device: the macros are now on the first bank of encoders. Save the rack to your User Library.",
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
      "In Live’s browser, open the Splice section and sign in.",
      "Search for what you need, like “phonk cowbell” or “vocal chop”.",
      "Turn on the option to preview in the set’s key and tempo, then play your loop while you audition.",
      "Drag the sample to a track or Drum Rack pad. It downloads and lands in your Splice folder.",
      "On Push, browse to the Splice folder in Add to load samples without the mouse.",
    ],
    check: "You can find and load three samples that fit your loop’s key and tempo in five minutes.",
    drill: "Each day, find one sample and save it to a Collection for this sprint.",
    links: [["Sampler lab", "/labs/sampler"]],
  },
  "s4-1": {
    why: "Simpler is the core sampling tool on Push. Its three modes cover one-shots, playable instruments and chopped loops.",
    min: 25,
    steps: [
      "Drag an audio file onto a MIDI track to make a Simpler. Press Device on Push to see it.",
      "Classic mode plays the sample chromatically across the pads, like a synth. Try it with a vocal or a note.",
      "One-Shot plays the whole sample once per hit, good for drums and FX.",
      "Slice mode cuts it up: choose slice by Transient, Beat or Region. Each slice lands on its own pad.",
      "In Slice mode, play the pads in a new order to make a new phrase.",
    ],
    check: "You can switch a sample between all three modes and say when you’d use each.",
    drill: "Slice one loop a day in the sampler lab, then do the same in Simpler on Push.",
    links: [["Sampler lab", "/labs/sampler"], ["Slicing in the glossary", "/instruments?tab=glossary#gl-slice"]],
  },
  "s4-2": {
    why: "Warping keeps samples in time with your song. The right warp mode keeps them sounding natural.",
    min: 25,
    steps: [
      "Drag a loop into an audio track. Live warps it and guesses its tempo.",
      "Open the clip and check the first warp marker sits on the first beat. If not, drag it there.",
      "Choose the warp mode: Beats for drums, Tones for melodic lines, Texture for pads, Complex Pro for full mixes.",
      "Change the song’s tempo and listen for artifacts. Try another mode if it sounds smeared.",
      "Place a few more markers on strong hits if the loop drifts out of time.",
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
      "Create an audio track and set its input to Resampling in Live’s I/O section.",
      "Hold Fixed Length and set 4 bars. Arm the new track.",
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
      "In Simpler Slice mode, select a slice and use the encoders to change its Transpose.",
      "Turn on Reverse for one slice to make a swell into the next hit.",
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
      "In Live, press the Arrangement Record button in the transport bar.",
      "On Push, launch the scenes in order, staying on each for 8 or 16 bars. Drop tracks in and out with Stop Clip.",
      "Stop recording, press Tab in Live to see the Arrangement, and press Back to Arrangement so it plays.",
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
      "Press Automate on Push. It lights red when automation recording is armed.",
      "Play your clip or arrangement and turn a filter cutoff encoder slowly over 8 bars.",
      "Play it back. The move is recorded. Turn the same encoder again to override it.",
      "Hold Shift and press Automate to bring back automation you overrode.",
      "Hold Delete and press Automate to clear a clip’s automation and start over.",
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
      "Add a reverse cymbal or crash into the drop: reverse a crash in Simpler or in the clip.",
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
      "In Arrangement view, select a section’s time range and press Cmd/Ctrl+D to duplicate it, extending the section.",
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
      "Press Mix. The encoders now control track volumes.",
      "Use the upper display buttons to switch to Pan, then Sends.",
      "Set a rough balance with the kick loudest, then bass, then everything else around them.",
      "Hold Solo and press a lower display button to solo a track, then Mute to mute one.",
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
      "Put a reference track on its own track, routed straight to your speakers, not through your master chain.",
      "Turn the reference down until it’s as loud as your mix, then switch back and forth.",
      "Note the biggest difference (too much low end, too dull, too quiet) and fix that first.",
      "Export with File › Export Audio/Video: WAV, 24-bit, at your project’s sample rate.",
      "Also export an MP3 for sharing, then listen to it on your phone.",
    ],
    check: "You have a WAV and an MP3 of your track, and you’ve compared it with a reference at matched loudness.",
    drill: "A/B against the reference at every mix session.",
    links: [["Reference notebook", "/notebook"], ["Weekly exports", "/exports"]],
  },
}
