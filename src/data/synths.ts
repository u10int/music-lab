/**
 * Synth learning: the four synths this app teaches (Live's Wavetable and Drift,
 * and the plugins Massive and Spire), the core concepts with where each control
 * lives in each synth, and step-by-step builds of the synth-heavy genre sounds.
 * Massive here means classic Massive (Native Instruments, 2007), not Massive X.
 */

export type SynthId = "wavetable" | "drift" | "massive" | "spire"

export interface SynthInfo {
  id: SynthId
  name: string
  maker: string
  kind: "Live instrument" | "Plugin"
  /** What it does best, one line. */
  best: string
  /** The panel, section by section, left to right. */
  layout: [string, string][]
  tips: string[]
}

export const SYNTHS: SynthInfo[] = [
  {
    id: "wavetable", name: "Wavetable", maker: "Ableton", kind: "Live instrument",
    best: "Supersaws, moving pads and modern basses. Two wavetable oscillators, a sub, two filters and a mod matrix.",
    layout: [
      ["Oscillators", "Osc 1 and Osc 2 each pick a wavetable and a position in it; Sub adds a sine or square an octave or two down."],
      ["Filters", "Filter 1 and 2, in serial or parallel. Low-pass, high-pass, band-pass, notch and morph, with Clean, OSR, MS2, SMP and PRD circuits."],
      ["Matrix", "Envelopes 1–3, LFOs 1–2, MIDI and macros as sources. Drag a source onto any knob or use the Matrix tab."],
      ["Global", "Unison mode (Classic, Shimmer, Noise, Phase Sync, Position Spread, Random Note), voices and amount; Glide and Mono."],
    ],
    tips: ["Unison “Classic” with 6–8 voices and Amount around 30–50% is the quickest supersaw in Live.", "Wavetable shows its modulation as a ring around each knob: you can see exactly what an envelope or LFO is doing.", "Use Mono with Glide for 808s, reeses and acid lines."],
  },
  {
    id: "drift", name: "Drift", maker: "Ableton", kind: "Live instrument",
    best: "Warm analog-style leads, plucks and basses. Simple, light on CPU and very playable from Push.",
    layout: [
      ["Oscillators", "Osc 1 and Osc 2 with classic shapes (saw, pulse, triangle, sine and more) plus a Shape knob; noise."],
      ["Filter", "One low-pass (Type I or II) with resonance, key tracking and its own envelope amount; a high-pass too."],
      ["Envelopes", "Env 1 for amp, Env 2 for the filter or anything else via the mod slots."],
      ["Modulation", "LFO and Cycling envelope, three mod slots, and the Drift knob for analog-style pitch wander."],
    ],
    tips: ["Drift’s Voice Mode “Unison” turns any patch into a thick lead.", "Turn up the Drift knob a little on pads and leads for an analog feel.", "Everything fits on one Push page: great for performing filter sweeps."],
  },
  {
    id: "massive", name: "Massive", maker: "Native Instruments", kind: "Plugin",
    best: "Huge, aggressive basses, reeses, growls and supersaw leads. Three wavetable oscillators and very flexible routing.",
    layout: [
      ["Oscillators", "Osc 1–3, each with a wavetable, Pitch, Wt-position (where in the table), Intens and Amp. Plus the Modulation Osc, Noise and Feedback."],
      ["Filters", "Filter 1 and 2 with a Serial/Parallel blend and a mix knob for each oscillator’s route. Lowpass 2/4, Bandpass, Highpass, Daft, Scream, Acid and more."],
      ["Modulation", "Envelopes 1–4 (Envelope 4 is the amp), LFOs 5–8 (also Stepper or Performer). Drag a source’s blue cross onto a knob’s slot, then set the amount."],
      ["Voicing and FX", "Voicing tab for unison voices, detune, pan spread and glide; two Insert slots, FX1 and FX2 (Dimension Expander, Chorus, Delay, Reverb, Classic Tube), EQ, and 8 macro knobs."],
    ],
    tips: [
      "In Live, load Massive from Plug-ins in the browser. Click the wrench (Configure) on the device and move Massive’s controls to add them to Live’s panel, so Push can reach them.",
      "Map the knobs you’ll perform (cutoff, Wt-position, wobble rate) to Massive’s macros 1–8, then add those macros in Configure.",
      "Massive is heavy on CPU with lots of unison: Freeze the track, or resample it to audio once the part is written.",
      "Save your own sounds with Massive’s browser (File > Save), and also as a Live preset (the save icon on the device) so they show up in Live’s browser.",
    ],
  },
  {
    id: "spire", name: "Spire", maker: "Reveal Sound", kind: "Plugin",
    best: "Bright trance supersaws, plucks and leads with a polished, wide sound. Four oscillators with built-in unison each.",
    layout: [
      ["Oscillators", "Osc 1–4, each with a mode (Classic and others), Wave, Ctrl A and Ctrl B shape knobs, octave and semitone, and its own unison: Density (voices), Detune and Wide."],
      ["Filters", "Filter 1 and 2 with several characters (Perfecto, Acido and more) and modes (low-pass, band-pass, high-pass), Cut, Res and key tracking. Serial or parallel."],
      ["Modulation", "Amp Env plus Envelopes 1–4, LFOs 1–4, Steppers 1–2. Assign them in the Matrix: pick a source, a destination and an amount."],
      ["Voice and FX", "Mono, Legato and Portamento; an arpeggiator; FX: Shaper, Phaser, Chorus/Flanger, Delay, Reverb, Decimator and EQ."],
    ],
    tips: [
      "Spire’s per-oscillator unison is what makes its supersaws famous: raise Density and Detune on two oscillators and pan them wide with Wide.",
      "In Live, Configure the device (the wrench) and touch the Spire controls you want on Push, like Filter 1 Cut and the macro-style knobs you use most.",
      "Spire’s arpeggiator is built in: use it for trance plucks, or keep Live’s Arpeggiator in front for more control.",
      "Save your patches in Spire’s own bank and as Live presets so they’re easy to find in Live’s browser.",
    ],
  },
]

export interface Concept {
  id: "unison" | "filterenv" | "glide" | "lfo" | "drive" | "pitchenv" | "fm" | "sub"
  name: string
  what: string
  heard: string
  /** Where the control lives in each synth. */
  where: Record<SynthId, string>
}

export const CONCEPTS: Concept[] = [
  {
    id: "unison", name: "Unison and detune", heard: "Trance and wave supersaws, hardwave leads, wide pads.",
    what: "Several copies of the same oscillator, each slightly out of tune and spread across the stereo field. One voice is thin; seven detuned voices beat against each other into a huge, shimmering wall.",
    where: {
      wavetable: "Global section: Unison mode Classic, Voices, and Amount for the detune.",
      drift: "Voice Mode: Unison, with the Thickness knob for the spread.",
      massive: "Voicing tab: Unisono voices, then the Pitch cycle knob for detune and Pan Position for width.",
      spire: "Each oscillator: Density for the voice count, Detune for the spread, Wide for stereo width.",
    },
  },
  {
    id: "filterenv", name: "Filter envelope", heard: "Plucks, stabs, trance arps, acid lines.",
    what: "An envelope that opens the filter at the start of each note and closes it again. A short decay turns a held saw into a pluck; a long one makes a swelling pad.",
    where: {
      wavetable: "Drag Envelope 2 onto Filter 1’s Frequency (or set it in the Matrix) and lower its Decay and Sustain.",
      drift: "Filter section: the envelope amount knob, using Env 2’s Attack, Decay and Sustain.",
      massive: "Drag Envelope 1’s blue cross onto Filter 1 Cutoff, set the amount, and shorten Envelope 1’s decay.",
      spire: "Matrix: Env 1 → Filter 1 Cut, then shape Env 1 with a short Decay and low Sustain.",
    },
  },
  {
    id: "glide", name: "Glide (portamento)", heard: "Sliding 808s in phonk and trap, reese bass, acid, hoovers.",
    what: "In mono mode, the pitch slides from one note to the next instead of jumping. Overlap the notes in the clip and you hear a slide; leave a gap and it plays normally.",
    where: {
      wavetable: "Global: Mono on, then the Glide time.",
      drift: "Voice Mode: Mono, then Glide.",
      massive: "Voicing tab: Monophon, then Glide time.",
      spire: "Voice section: Mono and Legato on, then Portamento.",
    },
  },
  {
    id: "lfo", name: "LFO wobble", heard: "Dubstep and riddim wobbles, moving reese basses, gated trance pads.",
    what: "A slow, repeating wave moving another control. Synced to the tempo on the filter it makes a wobble; on volume it makes a gate or tremolo.",
    where: {
      wavetable: "Drag LFO 1 onto Filter 1 Frequency, turn on Sync and pick a rate like 1/8.",
      drift: "LFO section: pick a sync rate and send it to the filter in a mod slot.",
      massive: "LFO 5 with Sync on: drag its blue cross onto Filter 1 Cutoff and set the rate.",
      spire: "Matrix: LFO 1 → Filter 1 Cut, with LFO 1 synced to the tempo.",
    },
  },
  {
    id: "drive", name: "Drive and distortion", heard: "Phonk and driftwave 808s, hardwave basses, hardstyle kicks.",
    what: "Pushing the sound into clipping adds harmonics. A sine 808 is nearly invisible on phone speakers; driven, it grows upper harmonics you can hear everywhere.",
    where: {
      wavetable: "Filter Drive, or put Roar or Saturator after the synth.",
      drift: "Put Roar or Saturator after it; Drift itself stays clean.",
      massive: "Insert 1: Hardclipper or Sine Shaper, or FX1: Classic Tube.",
      spire: "FX: Shaper with Drive up, or the Decimator for grit.",
    },
  },
  {
    id: "pitchenv", name: "Pitch envelope", heard: "808 punch, kicks, laser zaps, plucky leads.",
    what: "An envelope on pitch that starts high and drops to the note in a few milliseconds. Short and deep, it adds a click and punch; slower, it becomes a zap.",
    where: {
      wavetable: "Drag an envelope onto Osc Pitch and set a fast Decay.",
      drift: "Use a mod slot: Env 2 → Osc Pitch, with a short decay.",
      massive: "Drag Envelope 2 onto Osc 1 Pitch with a high amount and a short decay.",
      spire: "Matrix: Env 2 → Osc 1 Pitch (or oscillator pitch) with a short Decay.",
    },
  },
  {
    id: "fm", name: "FM (frequency modulation)", heard: "Bells, glassy plucks, cowbell-like tones, gritty basses.",
    what: "One oscillator rapidly changes another’s pitch. Whole-number ratios sound harmonic; odd ratios like 3.5 or 1.48 sound metallic, like bells and cowbells.",
    where: {
      wavetable: "FM is an oscillator effect mode: set Osc 1’s effect to FM and raise Amount and Tune.",
      drift: "Not built in: use Operator, Live’s dedicated FM synth.",
      massive: "Use the Modulation Osc in Phase mode, targeting Osc 1, and tune its Pitch for the ratio.",
      spire: "Set an oscillator’s mode to FM, then turn its Ctrl A and Ctrl B knobs while watching the waveform display: one sets how much modulation, the other the ratio.",
    },
  },
  {
    id: "sub", name: "Sub oscillator", heard: "Every bass, especially reese and supersaw basses.",
    what: "A pure sine (or square) an octave below the main note. Detuned saws lose focus in the low end; a sub holds it steady and mono.",
    where: {
      wavetable: "The Sub section: turn up Gain and pick an octave.",
      drift: "Set Osc 2 to a sine an octave down.",
      massive: "Osc 3 on the Sin-Tri wavetable, Wt-position on the sine, Pitch −12, with no unison spread.",
      spire: "Osc 4 in Classic mode set to a sine, Octave −1, Density 1 so it stays mono.",
    },
  },
]

/** Massive and Spire builds of the synth-heavy genre sounds, by sound id. */
export const SYNTH_STEPS: Record<string, { massive: string[]; spire: string[] }> = {
  "wave-reese": {
    massive: ["Osc 1 and Osc 2 on Squ-Sw I with Wt-position on the saw. Pitch Osc 2 about +0.3 semitones against Osc 1.", "Osc 3 on Sin-Tri set to the sine, Pitch −12, for the sub. Voicing tab: Monophon.", "Filter 1 Lowpass 4 around 600 Hz; drag LFO 5 (Sync on, slow rate like 2 bars) onto Cutoff.", "Insert 1 Sine Shaper for grit. Map Cutoff to macro 1."],
    spire: ["Osc 1 and Osc 2 in Classic mode on a saw, Osc 2 Fine-tuned a little sharp (about +30 cents).", "Osc 4 as a sine one octave down for the sub. Voice: Mono.", "Filter 1 low-pass around 600 Hz; Matrix: LFO 1 (synced, slow) → Filter 1 Cut.", "FX: Shaper for warmth."],
  },
  "wave-lead": {
    massive: ["Osc 1 and Osc 2 on Squ-Sw I set to the saw; Osc 2 Pitch +12 at lower Amp.", "Voicing tab: 6–8 Unisono voices, Pitch cycle detune up, Pan Position wide.", "Filter 1 Lowpass 4 mostly open; a little Glide in the Voicing tab.", "FX1 Dimension Expander, FX2 Delay; add reverb in Live."],
    spire: ["Osc 1 and 2 in Classic mode on a saw, Osc 2 one octave up and quieter.", "Density 7, Detune around a third, Wide up on both.", "Filter 1 low-pass mostly open; Voice: Mono with a short Portamento.", "FX: Delay (dotted 8th) and Reverb."],
  },
  "wave-pluck": {
    massive: ["Osc 1 on Squ-Sw I (saw), Osc 2 on Sin-Tri an octave up, quieter.", "Filter 1 Lowpass 4 fairly low; drag Envelope 1 onto Cutoff with a short decay.", "Envelope 4 (amp): fast attack, short decay, no sustain.", "FX2 Delay, then reverb in Live."],
    spire: ["Osc 1 Classic saw, Osc 2 a softer shape an octave up.", "Filter 1 low-pass; Matrix: Env 1 → Filter 1 Cut with a short Decay.", "Amp Env: fast attack, short decay, Sustain at zero.", "FX: Delay and Reverb."],
  },
  "wave-pad": {
    massive: ["Osc 1 and 2 on a soft table (Sin-Sqr or Squ-Sw I), slightly detuned; 4–6 Unisono voices.", "Envelope 4: slow attack (300 ms+) and long release.", "Filter 1 Lowpass 4 around 1.5 kHz; LFO 5 slowly on Wt-position for movement.", "FX1 Chorus, FX2 Reverb."],
    spire: ["Osc 1 and 2 Classic saw with Density 5, Detune moderate, Wide up.", "Amp Env: slow attack and long release.", "Filter 1 low-pass around 1.5 kHz; Matrix: LFO 1 (slow) → Filter 1 Cut, small amount.", "FX: Chorus and Reverb."],
  },
  "phonk-808": {
    massive: ["Osc 1 on Sin-Tri at the sine; Voicing tab Monophon with Glide around 80 ms.", "Drag Envelope 2 onto Osc 1 Pitch, high amount, very short decay, for the punch.", "Envelope 4: long decay with some sustain.", "Insert 1 Hardclipper (or FX1 Classic Tube) and drive it hard."],
    spire: ["Osc 1 Classic set to a sine; Voice: Mono, Legato, Portamento about 80 ms.", "Matrix: Env 2 → Osc 1 Pitch, short Decay, for the punch.", "Amp Env: long decay with some sustain.", "FX: Shaper with heavy Drive."],
  },
  "phonk-cowbell": {
    massive: ["Osc 1 on a square table (Squ-Sw I at the square end); Osc 2 the same, Pitch about +6.8 semitones (the 1.48 ratio).", "Filter 1 Bandpass around 1 kHz.", "Envelope 4: instant attack, short decay, no sustain.", "FX2 Reverb, small."],
    spire: ["Osc 1 and 2 Classic on a square; Osc 2 tuned about +6.8 semitones.", "Filter 1 in band-pass around 1 kHz.", "Amp Env: instant attack, short decay, Sustain zero.", "FX: Reverb, small."],
  },
  "phonk-hardbell": {
    massive: ["Same as the cowbell (two squares about +6.8 semitones apart into Bandpass).", "Insert 1 Hardclipper hard, Insert 2 Bitcrusher a little.", "Envelope 4 a touch longer than a normal cowbell.", "Map Insert 1’s drive to a macro to push it in the drop."],
    spire: ["Cowbell build: two Classic squares about +6.8 semitones apart into a band-pass.", "FX: Shaper with heavy Drive, then the Decimator lightly.", "Amp Env a touch longer.", "Turn the Shaper up for the drop."],
  },
  "trance-gate": {
    massive: ["Osc 1 and 2 on Squ-Sw I (saw), 7 Unisono voices, Pitch cycle detune up.", "Set LFO 5 to Stepper mode with a 16-step on/off pattern, Sync on; drag it onto the amp (Osc Amp knobs) or use Performer.", "Filter 1 Lowpass 4 fairly open.", "FX1 Dimension Expander, FX2 Reverb."],
    spire: ["Osc 1 and 2 Classic saw, Density 7, Detune up, Wide up.", "Stepper 1 with an on/off 16th pattern, synced; Matrix: STP 1 → Osc 1 and Osc 2 volume (or Master).", "Filter 1 low-pass fairly open.", "FX: Chorus and Reverb."],
  },
  "trance-supersaw": {
    massive: ["Osc 1, 2 and 3 on Squ-Sw I (saw); Osc 2 +12, Osc 3 −12 quieter.", "Voicing tab: 8 Unisono voices, generous detune, Pan Position wide.", "Filter 1 Lowpass 4 open; Envelope 4 fast attack, full sustain.", "FX1 Dimension Expander, FX2 Delay; big reverb in Live."],
    spire: ["Osc 1 and 2 Classic saw with Density 9, Detune around 40%, Wide full; Osc 3 an octave up, quieter.", "Filter 1 low-pass open (Perfecto).", "Amp Env: fast attack, full sustain, medium release.", "FX: Chorus, Delay (dotted 8th) and Reverb. This is Spire’s signature sound."],
  },
  "trance-pluck": {
    massive: ["Osc 1 on Squ-Sw I (saw) with 4 Unisono voices.", "Filter 1 Lowpass 4 low with resonance up; Envelope 1 → Cutoff, short decay.", "Envelope 4: no sustain, short decay.", "FX2 Delay (dotted 8th), reverb in Live; play 16th arps."],
    spire: ["Osc 1 Classic saw, Density 3–5, a little Detune.", "Filter 1 low-pass with Res up; Matrix: Env 1 → Filter 1 Cut, short Decay.", "Amp Env: Sustain zero, short decay. Turn on Spire’s arpeggiator at 1/16.", "FX: Delay and Reverb."],
  },
  "trance-bass": {
    massive: ["Osc 1 on Squ-Sw I (saw), Osc 3 Sin-Tri sine at −12 for weight.", "Filter 1 Lowpass 4 around 500 Hz; Envelope 1 → Cutoff with a short decay.", "Envelope 4 short; play 16th offbeats (the “and” of each beat).", "Sidechain to the kick in Live."],
    spire: ["Osc 1 Classic saw, Osc 4 sine an octave down.", "Filter 1 low-pass around 500 Hz; Matrix: Env 1 → Filter 1 Cut, short.", "Amp Env short; offbeat 16ths.", "Sidechain to the kick in Live."],
  },
  "trance-hoover": {
    massive: ["Osc 1 and 2 on a saw table, Osc 2 detuned about +0.2; 6 Unisono voices.", "Voicing tab: Monophon, Glide long (about 150 ms).", "Drag Envelope 2 onto Osc Pitch (both) with a small negative amount so each note dips into pitch.", "FX1 Chorus, Insert 1 Sine Shaper."],
    spire: ["Osc 1 and 2 Classic saw (try Ctrl A for a PWM-like shape), Density 6, wide Detune.", "Voice: Mono, Legato, Portamento about 150 ms.", "Matrix: Env 2 → oscillator pitch, small negative amount, for the dip.", "FX: Chorus and Shaper."],
  },
  "hw-bass": {
    massive: ["Osc 1 and 2 on Squ-Sw I (saw), slightly detuned; Osc 3 sine −12.", "Filter 1 Lowpass 4 around 800 Hz; Voicing tab Monophon.", "Insert 1 Hardclipper, FX1 Classic Tube.", "Play offbeat 8ths and sidechain hard to the kick."],
    spire: ["Osc 1 and 2 Classic saw, slight detune; Osc 4 sine an octave down.", "Filter 1 low-pass around 800 Hz; Voice: Mono.", "FX: Shaper hard, then EQ.", "Offbeat 8ths, heavy sidechain."],
  },
  "hw-lead": {
    massive: ["Osc 1–3 on Squ-Sw I saws, Osc 2 +12; 8 Unisono voices, wide detune.", "Insert 1 Hardclipper for the scream; Filter 1 Lowpass 4 open.", "LFO 5 small amount on Pitch for vibrato on long notes.", "FX1 Dimension Expander, FX2 Delay."],
    spire: ["Osc 1 and 2 Classic saw, Density 9, Detune high, Wide full; Osc 3 an octave up.", "FX: Shaper with Drive up for the scream.", "Matrix: LFO 2 → oscillator pitch, small, for vibrato.", "FX: Delay and Reverb."],
  },
  "hw-808": {
    massive: ["Osc 1 Sin-Tri sine with Envelope 2 on Pitch for the punch; Voicing Monophon with Glide.", "Osc 2 on a saw detuned slightly, quieter, for the reese layer.", "Filter 1 Lowpass 4 on Osc 2’s route only (route Osc 1 straight to the amp with the mix fader).", "Insert 1 Hardclipper."],
    spire: ["Osc 1 Classic sine with Env 2 → Osc 1 Pitch for punch; Voice Mono with Portamento.", "Osc 2 and 3 Classic saws slightly detuned, quieter, through Filter 1 low-pass.", "Route Osc 1 so it skips Filter 1 (use the per-oscillator filter routing), keeping the sub clean.", "FX: Shaper."],
  },
  "dw-cowbell": {
    massive: ["Two squares about +6.8 semitones apart (Osc 1 and Osc 2 on Squ-Sw I at the square end).", "Filter 1 Bandpass around 1 kHz; Envelope 4 short with no sustain.", "LFO 5 tiny amount on Pitch for wobble.", "FX1 Chorus, FX2 Reverb long."],
    spire: ["Osc 1 and 2 Classic squares about +6.8 semitones apart.", "Filter 1 band-pass around 1 kHz; Amp Env short, no sustain.", "Matrix: LFO 1 → oscillator pitch, tiny amount.", "FX: Chorus and a long Reverb."],
  },
  "dw-pad": {
    massive: ["Osc 1 and 2 on Squ-Sw I saws with 6 Unisono voices and wide detune.", "Envelope 4: attack about 300 ms, long release.", "Filter 1 Lowpass 4 around 2 kHz.", "FX1 Chorus, FX2 Reverb; sidechain in Live."],
    spire: ["Osc 1 and 2 Classic saw, Density 6, Detune high, Wide up.", "Amp Env: slow attack and long release.", "Filter 1 low-pass around 2 kHz.", "FX: Chorus and Reverb; sidechain in Live."],
  },
  "dw-808": {
    massive: ["Osc 1 Sin-Tri sine, Voicing tab Monophon with Glide about 80 ms.", "Envelope 2 → Osc 1 Pitch, high amount, very short decay.", "Envelope 4 long decay with some sustain.", "Insert 1 Hardclipper and FX1 Classic Tube for heavy drive."],
    spire: ["Osc 1 Classic sine; Voice: Mono, Legato, Portamento about 80 ms.", "Matrix: Env 2 → Osc 1 Pitch, short Decay.", "Amp Env long decay with some sustain.", "FX: Shaper with heavy Drive."],
  },
  "dw-lead": {
    massive: ["Osc 1 on a saw, Osc 2 the same saw at +12, lower Amp.", "Voicing: 6–8 Unisono voices, detune up, a short Glide.", "Filter 1 Lowpass 4 mostly open.", "FX2 Delay; reverb and light sidechain in Live."],
    spire: ["Osc 1 Classic saw, Osc 2 an octave up and quieter; Density 7, Detune moderate.", "Voice: Mono with short Portamento.", "Filter 1 low-pass mostly open.", "FX: Delay and Reverb."],
  },
  "dw-bell": {
    massive: ["Osc 1 on Sin-Tri at the sine.", "Modulation Osc in Phase mode targeting Osc 1, Pitch about +21.7 semitones (the 3.5 ratio).", "Envelope 4 short; drag Envelope 1 onto the Modulation Osc amount for a bright attack.", "FX2 Delay and reverb."],
    spire: ["Osc 1 in FM mode; turn Ctrl A and Ctrl B until it sounds glassy and slightly metallic (one knob is the amount, the other the ratio).", "Matrix: Env 1 → the FM amount knob, so the attack is brighter.", "Amp Env short with no sustain; Spire’s arpeggiator at 1/16.", "FX: Delay and Reverb."],
  },
  "outrun-lead": {
    massive: ["Osc 1 on Squ-Sw I saw, 3 Unisono voices, light detune.", "Filter 1 Lowpass 4 with a little resonance; Envelope 1 → Cutoff, medium decay.", "LFO 5 on Pitch, small, delayed for vibrato.", "FX1 Chorus, FX2 Delay."],
    spire: ["Osc 1 Classic saw, Density 3, light Detune.", "Filter 1 low-pass with some Res; Matrix: Env 1 → Filter 1 Cut.", "Matrix: LFO 2 → oscillator pitch, small, for vibrato.", "FX: Chorus and Delay."],
  },
  "synthwave-pad": {
    massive: ["Osc 1 on Squ-Sw I near the square (a pulse), Osc 2 a saw, both slightly detuned.", "Envelope 4 slow attack, long release.", "Filter 1 Lowpass 4 around 2.5 kHz.", "FX1 Chorus (the Juno sound), FX2 Reverb."],
    spire: ["Osc 1 Classic pulse (use Ctrl A for width), Osc 2 Classic saw.", "Amp Env slow attack, long release.", "Filter 1 low-pass around 2.5 kHz.", "FX: Chorus heavy, then Reverb."],
  },
  "future-chords": {
    massive: ["Osc 1 and 2 on saws, 7 Unisono voices, wide detune; Osc 2 +12.", "Envelope 4 short attack, full sustain.", "Filter 1 Lowpass 4 open.", "FX1 Dimension Expander; heavy sidechain in Live for the pump."],
    spire: ["Osc 1 and 2 Classic saw, Density 8, Detune high, Wide full; Osc 2 an octave up.", "Amp Env fast attack, full sustain.", "Filter 1 low-pass open.", "FX: Chorus and Reverb; sidechain hard in Live."],
  },
}
