export type Genre = "wave" | "phonk" | "prog"
export interface SprintWeek { mon: string; mid: string; fri: string; wknd: string }
export interface Sprint {
  id: string; n: number; c: string; title: string; short: string
  goal: string; done: string; mouse: string; skills: string[]; weeks: SprintWeek[]
}
export interface Resource { k: "Watch" | "Read" | "Try"; t: string; u?: string; links?: [string, string][]; n: string }
export interface StuckItem { g: Genre | "any"; t: string; src: string; u: string; n: string }

export const SPRINTS: Sprint[] = [
  { id: "s1", n: 1, c: "--s1", title: "Drive Live from Push", short: "Push + drums",
    goal: "An 8-bar drum loop at 140–150 BPM, made entirely on Push.",
    done: "You can make a new 4-bar beat from a blank pad in under 10 minutes without the mouse.",
    mouse: "Saving the template and setting audio preferences.",
    skills: ["Create tracks, load a Drum Rack, browse and swap pads from Push", "Step sequencer: loop length, hits, per-step velocity and nudge", "Real-time recording with Note Repeat and fixed length", "Swing/groove and quantize from Push", "Duplicate, double loop, delete, undo, Capture MIDI", "Launch clips and scenes from the grid"],
    weeks: [
      { mon: "Learn the Push layout and Drum Rack basics.", mid: "One kick/snare/hat pattern a day: straight, swung, half-time.", fri: "Recreate the drums from a phonk or wave track by ear.", wknd: "Build the 8-bar loop with a fill in bar 8." },
      { mon: "Ghost notes and low-velocity layers.", mid: "ODESZA-style percussion: shakers, claps, offbeat perc on their own pads.", fri: "Copy one percussion idea from a reference.", wknd: "Save your default set: drums, bass, chords, reverb and delay returns." }
    ] },
  { id: "s2", n: 2, c: "--s2", title: "Harmony on the grid", short: "Scales + chords",
    goal: "A 4-scene Session sketch in a minor key: drums, bass, chords and a short lead in each scene.",
    done: "You can pick a key on Push and play a 4-chord minor progression without looking anything up.",
    mouse: "Nothing. Keep 15 minutes a day on scales and chords; the grid stands in for the keyboard.",
    skills: ["Scale mode: key, scale, In Key vs Chromatic layout", "Find root, 3rd and 5th; play minor and major triads as one hand shape", "Play i–VI–III–VII and i–iv–v in 3 keys", "Bassline on chord roots, then passing notes", "Record, loop and overdub; clip lengths per scene"],
    weeks: [
      { mon: "Scale mode and why the grid is laid out in fourths.", mid: "One key a day: A minor, F minor, C# minor. Play its chords, record a clip.", fri: "Play a progression from a reference track on Push.", wknd: "Build scenes 1 and 2." },
      { mon: "Basslines that follow the roots.", mid: "Add bass, then a 4–8 note lead hook per scene.", fri: "Copy a hook's rhythm from a reference.", wknd: "Scenes 3 and 4, then export 30 seconds of all four in order." }
    ] },
  { id: "s3", n: 3, c: "--s3", title: "Sound design with the encoders", short: "Sound design",
    goal: "A 4-sound preset pack in your User Library: bass, pluck or lead, pad, and a custom drum kit.",
    done: "You can start Drift from its init patch and reach something usable in 10 minutes.",
    mouse: "Saving presets. Ignore Operator FM, Max for Live synths and third-party plugins.",
    skills: ["Device mode: parameter tabs and Rack banks; lock a device to Push", "Drift basics: oscillator, filter, envelope, LFO", "Wavetable for bass and pads; Meld for textures", "Instrument Rack with 8 macros, saved", "Effects chain: Saturator or Roar, Auto Filter, Reverb, Delay"],
    weeks: [
      { mon: "What envelopes and filters do (Learning Synths).", mid: "One sound a day in Drift, tweaked only with the encoders.", fri: "Match a bass sound from a reference track.", wknd: "Finish bass and pluck, map macros, save both." },
      { mon: "Instrument and Drum Racks.", mid: "Build the pad, then a kit from layered Splice one-shots.", fri: "Match a pad or texture from a reference.", wknd: "Swap all 4 presets into your Sprint 2 sketch." }
    ] },
  { id: "s4", n: 4, c: "--s4", title: "Sampling", short: "Sampling",
    goal: "A 1-minute phonk or wave sketch built on one chopped sample: a vocal, a cowbell line or a melodic loop.",
    done: "You can warp an unfamiliar loop, slice it and play a new phrase in 15 minutes.",
    mouse: "Placing warp markers precisely.",
    skills: ["Browse Splice from Live; audition in key and tempo", "Simpler: Classic, One-Shot, Slice; play chops on the grid", "Warping: modes, markers, fitting a loop to tempo", "Resample your output and chop it again", "Pitch and reverse chops; a phonk cowbell melody in Simpler"],
    weeks: [
      { mon: "Simpler's three modes.", mid: "Chop one sample a day into 8–16 slices and play a new rhythm.", fri: "Recreate a sample flip from a reference.", wknd: "Start the sketch: chopped sample, Sprint 1 drums, Sprint 3 bass." },
      { mon: "Resampling.", mid: "Resample the main loop and build a variation from the audio.", fri: "Add one reversed or pitched transition.", wknd: "Finish and export the 1-minute sketch." }
    ] },
  { id: "s5", n: 5, c: "--s5", title: "Arrangement", short: "Arrangement",
    goal: "A 2:30–3:00 progressive house arrangement at 120–124 BPM: intro, build, drop, breakdown, drop, outro.",
    done: "The track holds your attention start to finish without you touching anything.",
    mouse: "Arrangement editing. This is the one sprint where the screen leads.",
    skills: ["Perform 6–8 Session scenes into Arrangement from Push", "Record automation live with the encoders", "Tension tools: risers, noise sweeps, drop-outs, reverse cymbals", "Layering: rolling bass, evolving pad, perc every 8–16 bars", "Cut, extend and clean up in Arrangement view"],
    weeks: [
      { mon: "Map a reference track bar by bar: what enters and leaves where.", mid: "Build the scenes that match the map.", fri: "Perform the scenes into Arrangement in one take.", wknd: "Record the full take with automation." },
      { mon: "Transitions at 8- and 16-bar boundaries.", mid: "Edit and refine one section a day.", fri: "Compare your structure against the reference map.", wknd: "Export a rough mix of the whole track." }
    ] },
  { id: "s6", n: 6, c: "--s6", title: "Mix and finish", short: "Mix + finish",
    goal: "A finished, exported version of your Sprint 5 track that you'd share.",
    done: "The file is exported and someone else has heard it.",
    mouse: "Export settings. Ignore mastering plugins, mid/side and spectral tools.",
    skills: ["Mixer mode on Push: volume, pan, sends", "Gain staging: master peaks near −6 dB before processing", "EQ Eight: high-pass all but kick and bass, cut before boost", "Sidechain kick to bass and pads; Glue on drum and mix buses", "Reference at matched loudness; export WAV and MP3"],
    weeks: [
      { mon: "Gain staging and mix order: levels, EQ, compression, space.", mid: "One pass a day: levels and pan, then EQ, then compression and sidechain.", fri: "A/B against your reference.", wknd: "Full mix pass." },
      { mon: "Listen on headphones, speakers, and a phone or car.", mid: "Fix the top 3 problems, one a day.", fri: "Light master chain: EQ, Glue, Limiter.", wknd: "Export and share it with one person." }
    ] }
];

export const M = "https://www.ableton.com/en/live-manual/12/";

export const VIDS = "https://help.ableton.com/hc/en-us/articles/360000147624-Learn-Live-Videos-Push";

export const PUSHMAN: [string, string][] = [["Push 3", "https://www.ableton.com/en/push/manual/"], ["Push 2", M + "using-push-2/"]];

export const RES: Record<string, Resource[]> = {
  s1: [
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "Sequencing drums, Playing drums, Creating drum variations. The Push 3 playlist is linked at the top." },
    { k: "Read", t: "Push manual", links: PUSHMAN, n: "The drum and step sequencer sections, plus Note Repeat." },
    { k: "Read", t: "Instrument, Drum and Effect Racks", u: M + "instrument-drum-and-effect-racks/", n: "How Drum Rack pads and chains are built." },
    { k: "Read", t: "Using Grooves", u: M + "using-grooves/", n: "Groove Pool swing and groove templates: Live’s other way to add swing, alongside Push’s quantize swing." },
    { k: "Read", t: "10 tips for getting started with Push 3", u: "https://www.musicradar.com/news/10-tips-ableton-push-3", n: "MusicRadar. Quick workflow habits worth adopting early." }
  ],
  s2: [
    { k: "Try", t: "Learning Music", u: "https://learningmusic.ableton.com", n: "Ableton's free browser course. Chords, basslines and melodies on a grid, like Push." },
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "Play melodies, Play chords, Chromatic Note Mode, Step sequencing melodies." },
    { k: "Read", t: "Push manual", links: PUSHMAN, n: "Melodic playing, layouts and scale settings." },
    { k: "Read", t: "Session View", u: M + "session-view/", n: "Clip slots, scenes and how launching works." },
    { k: "Read", t: "Recording New Clips", u: M + "recording-new-clips/", n: "Overdubbing, Record Quantization and Capture MIDI." }
  ],
  s3: [
    { k: "Try", t: "Learning Synths", u: "https://learningsynths.ableton.com", n: "Free interactive lessons on oscillators, filters, envelopes and LFOs." },
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "Sound design: drums, Sound design: melodic parts, Sound design." },
    { k: "Read", t: "Live Instrument Reference", u: M + "live-instrument-reference/", n: "The Drift, Wavetable and Meld sections." },
    { k: "Read", t: "Instrument, Drum and Effect Racks", u: M + "instrument-drum-and-effect-racks/", n: "Macro controls and saving racks as presets." },
    { k: "Read", t: "Live Audio Effect Reference", u: M + "live-audio-effect-reference/", n: "Saturator, Roar, Auto Filter, Reverb and Delay." }
  ],
  s4: [
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "The five Sampling videos: Classic, One Shot, Slicing, creative techniques, warping." },
    { k: "Read", t: "Audio Clips, Tempo, and Warping", u: M + "audio-clips-tempo-and-warping/", n: "Warp modes and warp markers." },
    { k: "Read", t: "Warping in Simpler", u: "https://help.ableton.com/hc/en-us/articles/209072629-Warping-in-Simpler", n: "Ableton help article on keeping chops in time." },
    { k: "Read", t: "Chop beats with Simpler's Slice mode", u: "https://musicradar.com/tuition/tech/how-to-chop-beats-with-ableton-simplers-new-slice-mode-632939", n: "MusicRadar walkthrough of slicing a loop to pads." },
    { k: "Read", t: "Warp and time-stretch with Splice in Live 12.3", u: "https://support.splice.com/en/articles/12062819-using-warp-and-timestretch-with-splice-in-ableton-live-12-3", n: "Splice support. How samples land in key and tempo." },
    { k: "Read", t: "Routing and I/O", u: M + "routing-and-i-o/", n: "The Resampling input, for recording your own output." }
  ],
  s5: [
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "Session View: advanced, Automation, Recording in the Arrangement View." },
    { k: "Read", t: "Arrangement View", u: M + "arrangement-view/", n: "Editing, looping and moving sections around." },
    { k: "Read", t: "Automation", u: M + "automation/", n: "Recording, drawing and editing automation." },
    { k: "Read", t: "Session View", u: M + "session-view/", n: "Recording Sessions into the Arrangement, and Back to Arrangement." }
  ],
  s6: [
    { k: "Watch", t: "Learn Push videos", u: VIDS, n: "Mixing and Routing." },
    { k: "Read", t: "Mixing", u: M + "mixing/", n: "The mixer, sends, returns and the master track." },
    { k: "Read", t: "Live Audio Effect Reference", u: M + "live-audio-effect-reference/", n: "EQ Eight, Compressor, Glue Compressor and Limiter." },
    { k: "Read", t: "How gain staging keeps your mix clean", u: "https://www.attackmagazine.com/technique/tutorials/how-gain-staging-in-your-daw-can-help-keep-your-mix-clean-and-punchy/", n: "Attack Magazine. Headroom before processing." },
    { k: "Read", t: "Managing Files and Sets", u: M + "managing-files-and-sets/", n: "The export section: WAV and MP3 settings." }
  ]
};

export const GENRES: [Genre | "all", string][] = [["all", "All genres"], ["wave", "Wave"], ["phonk", "Phonk"], ["prog", "Progressive house"]];

export const GNAME: Record<Genre, string> = { wave: "Wave", phonk: "Phonk", prog: "Progressive house" };

export const ALL16: number[] = Array.from({ length: 16 }, (_, i) => i + 1);



export const AT = "https://www.attackmagazine.com/technique/beat-dissected/";

export const EP_PHONK = "https://www.edmprod.com/how-to-make-phonk/";

export const NI_PHONK = "https://www.native-instruments.com/blogs/blog/phonk-music";

export const NI_PROG = "https://www.native-instruments.com/blogs/blog/progressive-house";

export const EP_PROG = "https://www.edmprod.com/how-to-make-progressive-house/";

export const LANDR_PHONK = "https://blog.landr.com/what-is-phonk";

export const ODESZA = "https://splice.com/blog/hits-decoded-odesza-line-of-sight/";

export const STUCK: Record<string, StuckItem[]> = {
  s1: [
    { g: "any", t: "Beat Dissected", src: "Attack Magazine", u: AT, n: "Dozens of genre beats broken down hit by hit. Open one when your loop feels stale." },
    { g: "any", t: "Pocket Patterns", src: "darosh.github.io", u: "https://darosh.github.io/pocket-patterns/", n: "Classic drum machine patterns on a 16-step grid, which maps straight onto the Push step sequencer." },
    { g: "any", t: "Hits decoded: ODESZA, “Line of Sight”", src: "Splice", u: ODESZA, n: "A kick and layered clap carry the track. Verses drop the hats, and short fills mark the end of each phrase." },
    { g: "prog", t: "Deep & melodic progressive techno beat", src: "Attack Magazine", u: AT + "deep-melodic-progressive-techno/", n: "120–123 BPM. Four-on-the-floor kick, two layered offbeat hats, 16th-note maracas, tuned conga and tom." },
    { g: "prog", t: "How to make a progressive house track", src: "Native Instruments", u: NI_PROG, n: "126–128 BPM. Kick, hats, shaker and clap programming, plus drum bus processing." },
    { g: "wave", t: "How to make a trap beat", src: "Native Instruments", u: "https://www.native-instruments.com/blogs/blog/how-to-make-a-trap-beat", n: "Wave drums come from trap. Half-time feel, claps on beat 3 and 32nd-note hat rolls." },
    { g: "phonk", t: "How to make phonk", src: "EDMProd", u: EP_PHONK, n: "Drift phonk at about 130 BPM: drill-style drums with layered claps and hats under a cowbell lead." }
  ],
  s2: [
    { g: "any", t: "How to build chord progressions", src: "Splice", u: "https://splice.com/blog/build-chord-progressions-free-midi/", n: "50 free MIDI files, including progressive house and trap. Drop one into a clip and play along on Push." },
    { g: "any", t: "7 chord progressions producers should know", src: "Splice", u: "https://splice.com/blog/chord-progressions-producers-should-know/", n: "Free MIDI, from basic progressions up to borrowed chords." },
    { g: "any", t: "TheoryTab", src: "Hooktheory", u: "https://www.hooktheory.com/theorytab/charts?chart=top", n: "Look up the chords and melody of a track you like, then play them in Scale mode." },
    { g: "any", t: "Strike a Chord", src: "Ableton", u: "https://www.ableton.com/en/blog/chords-theory-racks-push/", n: "Chords in Push's Scale mode, plus free chord-generating MIDI racks." },
    { g: "prog", t: "Progressive house eighth-note chords", src: "MusicRadar", u: "https://musicradar.com/how-to/how-to-program-progressive-house-eighth-note-chords", n: "Pulsing chords on every eighth note, with the bassline copied from the lowest notes." },
    { g: "prog", t: "Progressive house like Anjuna", src: "EDMProd", u: EP_PROG, n: "Built in Live at 125 BPM: drums, bass, classic plucks, piano and arps." },
    { g: "wave", t: "Exploring Wave, Beatport's newest genre", src: "Beatportal", u: "https://www.beatportal.com/articles/450877-exploring-wave-beatports-newest-genre", n: "Euphoric, trance-like melodies over a melancholic mood, plus a list of artists to study." },
    { g: "phonk", t: "What is phonk?", src: "LANDR", u: LANDR_PHONK, n: "Memphis rap roots, and the drum machine cowbell used as a melodic stab." }
  ],
  s3: [
    { g: "any", t: "Ableton Wavetable: the complete guide", src: "EDMProd", u: "https://www.edmprod.com/ableton-wavetable/", n: "Recipes for an 808 with pitch drop and glide, a wide reese, an evolving pad and a synthesized kick." },
    { g: "any", t: "Hits decoded: ODESZA, “Line of Sight”", src: "Splice", u: ODESZA, n: "Saw and square synths, low-passed in verses and opened in choruses, with an eighth-note volume LFO on the chords." },
    { g: "wave", t: "The reese bass", src: "Native Instruments", u: "https://www.native-instruments.com/blogs/blog/reese-bass", n: "Two detuned saws (about ±0.3 semitones), low-pass near 650 Hz, mono, then overdrive. Works the same in Drift or Wavetable." },
    { g: "phonk", t: "What is phonk music?", src: "Native Instruments", u: NI_PHONK, n: "Distorted 808s, cowbell samples and lo-fi processing." },
    { g: "prog", t: "Progressive house like Anjuna", src: "EDMProd", u: EP_PROG, n: "The classic progressive pluck, plus atmosphere and bass." }
  ],
  s4: [
    { g: "any", t: "5 advanced sample manipulation techniques", src: "Splice", u: "https://splice.com/blog/advanced-sample-manipulation-techniques/", n: "In Live: percussion from warped slices, chords from vocals in Simpler, Groove Pool timing, samples inside Wavetable." },
    { g: "any", t: "Simpler and Sampler pro tips", src: "Ableton", u: "https://www.ableton.com/en/blog/simpler-and-sampler-pro-tips-and-techniques-slynk/", n: "Slynk on slicing, building melodies from samples and a bass synth made in Simpler." },
    { g: "phonk", t: "What is phonk?", src: "LANDR", u: LANDR_PHONK, n: "Where the Memphis samples come from, and how rap vocals get chopped." },
    { g: "phonk", t: "What is phonk music?", src: "Native Instruments", u: NI_PHONK, n: "Chopped vocals and cowbell samples, step by step." }
  ],
  s5: [
    { g: "any", t: "The ultimate guide to build-ups", src: "EDMProd", u: "https://www.edmprod.com/ultimate-guide-build-ups/", n: "Filter, reverb and pitch automation, snare and kick rolls, and a moment of silence before the drop." },
    { g: "any", t: "9 ways to create better transitions", src: "MusicRadar", u: "https://www.musicradar.com/tuition/tech/9-ways-to-create-better-transitions-641798", n: "Record stops, volume drops, selective muting and regenerating delay." },
    { g: "any", t: "Make a riser with Analog", src: "Ableton", u: "https://www.ableton.com/en/blog/make-riser-transition-effect-analog/", n: "A transition riser built from Live's own Analog synth." },
    { g: "prog", t: "How to make progressive house music", src: "Splice", u: "https://splice.com/blog/how-to-make-progressive-house", n: "Free Ableton project. Maps the structure with markers on a reference track." },
    { g: "prog", t: "How to make a progressive house track", src: "Native Instruments", u: NI_PROG, n: "A full section order from intro to outro." }
  ],
  s6: [
    { g: "any", t: "Sidechain compression, part 2", src: "Ableton", u: "https://www.ableton.com/en/blog/sidechain-compression-part-2-common-and-uncommon-uses/", n: "Kick ducking, sidechain gating and Envelope Follower tricks." },
    { g: "any", t: "An introduction to sidechaining in Live", src: "Ableton", u: "https://www.ableton.com/en/blog/elphnt-introduction-sidechaining-live/", n: "ELPHNT on Compressor, Auto Filter and Gate driven by a sidechain." },
    { g: "phonk", t: "How to make phonk", src: "EDMProd", u: EP_PHONK, n: "Heavy distortion across the whole track for the gritty sound." },
    { g: "phonk", t: "What is phonk music?", src: "Native Instruments", u: NI_PHONK, n: "Lo-fi processing and mastering for phonk." },
    { g: "prog", t: "How to make a progressive house track", src: "Native Instruments", u: NI_PROG, n: "Sidechained bass and drum bus processing." }
  ]
};

export const KIND: Record<string, string> = { Watch: "Video", Read: "Reading", Try: "Interactive" };
