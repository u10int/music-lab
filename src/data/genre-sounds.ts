import type { FxSettings, Patch } from "@/audio/patch"
import type { Family } from "./patterns"

/** A note in a two-bar phrase: [start step, length in 16ths, scale degree or chord degrees, octave shift]. */
export type PhraseNote = [number, number, number | number[], number?]
export interface Macro {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  fmt: (v: number) => string
  apply: (p: Patch, fx: FxSettings, v: number) => void
}
export interface GenreSound {
  id: string
  family: Family
  genre: string
  name: string
  role: "Bass" | "Lead" | "Chords" | "Pad" | "Pluck" | "Perc"
  what: string
  use: string[]
  alt?: string[]
  steps: string[]
  chain: string[]
  tempo: number
  /** Drum pattern id to play underneath. */
  drums?: string
  /** Live octave of the key's root note for this sound (C3 = middle C). */
  oct: number
  mono?: boolean
  phrase: PhraseNote[]
  patch: Patch
  fx: FxSettings
  macros: Macro[]
}

const hz = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : Math.round(v) + " Hz")
const pct = (v: number) => Math.round(v * 100) + "%"
const ms = (v: number) => (v < 1 ? Math.round(v * 1000) + " ms" : v.toFixed(1) + " s")
const cents = (v: number) => Math.round(v) + " cents"

// Reusable macros
const cutoff = (value: number, min = 150, max = 6000): Macro => ({ id: "cutoff", label: "Cutoff", min, max, step: 1, value, fmt: hz, apply: (p, _f, v) => { p.filter.cutoff = v } })
const reso = (value: number): Macro => ({ id: "reso", label: "Resonance", min: 0.5, max: 18, step: 0.1, value, fmt: (v) => v.toFixed(1), apply: (p, _f, v) => { p.filter.q = v } })
const drive = (value: number): Macro => ({ id: "drive", label: "Drive", min: 0, max: 1, step: 0.01, value, fmt: pct, apply: (p, _f, v) => { p.drive = v } })
const space = (value: number): Macro => ({ id: "space", label: "Reverb", min: 0, max: 0.8, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { f.reverb = v } })
const detune = (value: number, max = 60): Macro => ({ id: "detune", label: "Detune", min: 0, max, step: 1, value, fmt: cents, apply: (p, _f, v) => { p.layers.forEach((l) => { if ((l.voices ?? 1) > 1) l.detune = v }) } })
const envAmt = (value: number, max = 6000): Macro => ({ id: "env", label: "Filter envelope", min: 0, max, step: 10, value, fmt: hz, apply: (p, _f, v) => { p.filter.env = v } })
const decay = (value: number, max = 1.5): Macro => ({ id: "decay", label: "Decay", min: 0.05, max, step: 0.01, value, fmt: ms, apply: (p, _f, v) => { p.amp.d = v; p.filter.decay = v } })
const attack = (value: number): Macro => ({ id: "attack", label: "Attack", min: 0.003, max: 2, step: 0.005, value, fmt: ms, apply: (p, _f, v) => { p.amp.a = v } })
const delayWet = (value: number): Macro => ({ id: "delay", label: "Delay", min: 0, max: 0.7, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { if (f.delay) f.delay.wet = v } })
const glide = (value: number): Macro => ({ id: "glide", label: "Glide", min: 0, max: 0.3, step: 0.005, value, fmt: ms, apply: (p, _f, v) => { p.glide = v } })
const lfoDepth = (value: number, max = 3000): Macro => ({ id: "lfo", label: "LFO depth", min: 0, max, step: 10, value, fmt: hz, apply: (p, _f, v) => { if (p.lfo) p.lfo.depth = v } })
const RATES = [1, 0.5, 1 / 3, 0.25, 1 / 6, 0.125]
const RATE_NAMES = ["1/4", "1/8", "1/8t", "1/16", "1/16t", "1/32"]
const lfoRate = (value: number): Macro => ({ id: "rate", label: "Wobble rate", min: 0, max: 5, step: 1, value, fmt: (v) => RATE_NAMES[v], apply: (p, _f, v) => { if (p.lfo) p.lfo.beats = RATES[v] } })
const pump = (value: number): Macro => ({ id: "pump", label: "Sidechain pump", min: 0, max: 0.95, step: 0.01, value, fmt: pct, apply: (_p, f, v) => { f.duck = v } })

const TRIAD = (r: number) => [r, r + 2, r + 4]
const SEVENTH = (r: number) => [r, r + 2, r + 4, r + 6]

export const GENRE_SOUNDS: GenreSound[] = [
  // ---------- Wave, phonk, progressive house ----------
  {
    id: "wave-reese", family: "yours", genre: "Wave", name: "Moving reese bass", role: "Bass",
    what: "Two detuned saws beating against each other, filtered dark and slowly moving. The emotional low end of wave.",
    use: ["wavetable"], alt: ["drift"],
    steps: ["Two oscillators on a saw, one detuned about ±0.3 semitones.", "Sub on, voices set to Mono.", "Low-pass around 600 Hz; route an LFO at a slow rate to the cutoff.", "Long notes that change on the chord roots."],
    chain: ["Roar", "Auto Filter", "Utility"],
    tempo: 145, drums: "wave", oct: 1, mono: true,
    phrase: [[0, 14, 0], [16, 6, 5], [24, 7, 3]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 30 }], sub: 0.5, filter: { cutoff: 600, q: 1 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.2 }, lfo: { target: "cutoff", rate: 0.4, depth: 250 }, drive: 0.3, glide: 0.04, level: 0.18 },
    fx: { reverb: 0.12 },
    macros: [cutoff(600, 150, 3000), detune(30), drive(0.3)],
  },
  {
    id: "wave-lead", family: "yours", genre: "Wave", name: "Wide supersaw lead", role: "Lead",
    what: "A big unison saw stack, soft attack and lots of space. Carries the euphoric topline.",
    use: ["wavetable"], alt: ["meld"],
    steps: ["Basic Shapes saw on both oscillators.", "Unison set to Classic, 6 to 8 voices, Amount around 40%.", "Filter mostly open, short attack so it isn't clicky.", "Layer an octave above for the drop."],
    chain: ["Chorus-Ensemble", "Hybrid Reverb", "Delay"],
    tempo: 145, drums: "wave", oct: 3, mono: true,
    phrase: [[0, 6, 4], [6, 2, 3], [8, 6, 2], [16, 4, 4], [20, 4, 5], [24, 8, 4]],
    patch: { layers: [{ wave: "sawtooth", voices: 6, detune: 25 }], filter: { cutoff: 4500, q: 0.8 }, amp: { a: 0.03, d: 0.3, s: 0.85, r: 0.4 }, level: 0.15, glide: 0.03 },
    fx: { reverb: 0.35, delay: { beats: 0.75, fb: 0.35, wet: 0.18 } },
    macros: [detune(25), cutoff(4500, 500, 9000), space(0.35)],
  },
  {
    id: "phonk-808", family: "yours", genre: "Phonk", name: "Distorted 808 with slides", role: "Bass",
    what: "A sine with a fast pitch drop, pushed hard into distortion so it reads on small speakers. Slides between notes.",
    use: ["simpler"], alt: ["operator"],
    steps: ["Load an 808 sample into Simpler in Classic mode.", "Set Voices to 1 and turn Glide on so overlapping notes slide.", "Lengthen the release so notes ring.", "Overlap notes in the clip to trigger slides."],
    chain: ["Roar", "Saturator", "EQ Eight"],
    tempo: 130, drums: "phonk", oct: 1, mono: true,
    phrase: [[0, 6, 0], [6, 4, 0, 1], [10, 6, 0], [16, 6, 3], [22, 4, 4], [26, 6, 0]],
    patch: { layers: [{ wave: "sine" }], filter: { cutoff: 4000 }, amp: { a: 0.003, d: 1.2, s: 0.5, r: 0.15 }, pitch: { semis: 12, time: 0.04 }, glide: 0.08, drive: 0.7, level: 0.32 },
    fx: {},
    macros: [drive(0.7), glide(0.08), decay(1.2, 2)],
  },
  {
    id: "phonk-cowbell", family: "yours", genre: "Phonk", name: "Cowbell melody", role: "Lead",
    what: "The drum machine cowbell played as a melody, with two inharmonic square partials through a band-pass.",
    use: ["simpler"], alt: ["operator"],
    steps: ["Load a cowbell one-shot into Simpler in Classic mode so it plays across the keys.", "Play the melody in a minor or Phrygian key.", "Short release so notes stay staccato.", "Operator version: two square-wave oscillators about 7 semitones apart through a band-pass filter."],
    chain: ["Saturator", "Reverb"],
    tempo: 130, drums: "phonk", oct: 3,
    phrase: [[0, 2, 0], [3, 2, 2], [6, 2, 4], [8, 2, 3], [11, 2, 2], [14, 2, 1], [16, 2, 0], [19, 2, -2], [22, 2, 0], [24, 2, 2], [28, 2, 1]],
    patch: { layers: [{ wave: "square", level: 0.7 }, { wave: "square", ratio: 1.48, level: 0.6 }], filter: { type: "bandpass", cutoff: 1100, track: 2, q: 1.4 }, amp: { a: 0.001, d: 0.25, s: 0, r: 0.1 }, level: 0.4 },
    fx: { reverb: 0.15 },
    macros: [decay(0.25, 0.8), { id: "tone", label: "Tone", min: 1, max: 4, step: 0.05, value: 2, fmt: (v) => v.toFixed(1) + "×", apply: (p, _f, v) => { p.filter.track = v } }, space(0.15)],
  },
  {
    id: "prog-pluck", family: "yours", genre: "Progressive house", name: "Classic delayed pluck", role: "Pluck",
    what: "A bright, short saw pluck whose filter snaps shut, with dotted-8th echoes filling the gaps.",
    use: ["drift"], alt: ["wavetable"],
    steps: ["Saw oscillator, low-pass filter around 2 kHz.", "Envelope 2 to filter cutoff with a short decay (about 200 ms).", "Envelope 1: zero sustain, decay around 400 ms.", "Arpeggiate chord tones in 16ths."],
    chain: ["Delay", "Hybrid Reverb", "Utility"],
    tempo: 124, drums: "prog", oct: 3,
    phrase: [0, 2, 4, 7, 4, 2, 0, 2, 5, 7, 9, 7, 5, 4, 2, 4].map((d, i): PhraseNote => [i * 2, 1, d]),
    patch: { layers: [{ wave: "sawtooth", voices: 3, detune: 12 }], filter: { cutoff: 900, q: 2, env: 3500, decay: 0.18 }, amp: { a: 0.002, d: 0.35, s: 0, r: 0.2 }, level: 0.2 },
    fx: { reverb: 0.25, delay: { beats: 0.75, fb: 0.42, wet: 0.32 } },
    macros: [envAmt(3500), decay(0.35, 1), delayWet(0.32)],
  },
  {
    id: "prog-bass", family: "yours", genre: "Progressive house", name: "Rolling offbeat bass", role: "Bass",
    what: "Short, punchy saw notes on the 16ths between kicks. Pairs with sidechain so the kick and bass take turns.",
    use: ["analog"], alt: ["drift"],
    steps: ["Saw or pulse oscillator, low-pass filter fairly closed.", "Filter envelope with a short decay so each note plucks.", "Program notes on the three 16ths after each kick.", "Mono, no glide."],
    chain: ["Saturator", "Compressor", "Utility"],
    tempo: 124, drums: "prog", oct: 1, mono: true,
    phrase: Array.from({ length: 32 }, (_, i) => i).filter((i) => i % 4 !== 0).map((i): PhraseNote => [i, 0.8, i >= 16 ? 5 : 0, i % 4 === 2 ? 1 : 0]),
    patch: { layers: [{ wave: "sawtooth" }], filter: { cutoff: 380, q: 3, env: 1400, decay: 0.12 }, amp: { a: 0.002, d: 0.18, s: 0, r: 0.05 }, level: 0.3 },
    fx: { duck: 0.5 },
    macros: [cutoff(380, 100, 2000), envAmt(1400, 4000), pump(0.5)],
  },
  {
    id: "prog-pad", family: "yours", genre: "Progressive house", name: "Warm evolving pad", role: "Pad",
    what: "Slow-attack detuned saws with a slowly moving filter. Fills the breakdown.",
    use: ["wavetable"], alt: ["drift", "analog"],
    steps: ["Saw-like wavetables, Unison Classic, 4 voices around 25%.", "Attack 0.5 to 1 second, release 2 to 3 seconds.", "Low-pass between 1.5 and 3 kHz, slow LFO on cutoff.", "Play long chords from the progression."],
    chain: ["Chorus-Ensemble", "Hybrid Reverb", "Utility"],
    tempo: 124, drums: "prog", oct: 2,
    phrase: [[0, 15, TRIAD(0)], [16, 15, TRIAD(5).map((d) => d - 7)]],
    patch: { layers: [{ wave: "sawtooth", voices: 4, detune: 15 }], filter: { cutoff: 1400, q: 1.5 }, amp: { a: 0.8, d: 1, s: 0.8, r: 1.4 }, lfo: { target: "cutoff", rate: 0.25, depth: 500 }, level: 0.07 },
    fx: { reverb: 0.5 },
    macros: [attack(0.8), cutoff(1400, 300, 5000), space(0.5)],
  },

  // ---------- House ----------
  {
    id: "deep-stab", family: "house", genre: "Deep house", name: "Minor 7th chord stab", role: "Chords",
    what: "Short, warm organ-like chords on the offbeats. The classic deep house stab, often a minor 7th or 9th.",
    use: ["analog"], alt: ["drift", "electric"],
    steps: ["Two oscillators: a square and a saw, an octave apart.", "Low-pass around 2 kHz, a little filter envelope.", "Short decay and low sustain so chords are stabs.", "Play minor 7th chords on syncopated 16ths."],
    chain: ["Chorus-Ensemble", "Delay", "Reverb"],
    tempo: 120, drums: "deep", oct: 2,
    phrase: [[3, 2, SEVENTH(0)], [6, 2, SEVENTH(0)], [11, 2, SEVENTH(0)], [19, 2, SEVENTH(3)], [22, 2, SEVENTH(3)], [27, 2, SEVENTH(-2)]],
    patch: { layers: [{ wave: "square", level: 0.6 }, { wave: "sawtooth", oct: 1, level: 0.4 }], filter: { cutoff: 1800, q: 1, env: 900, decay: 0.15 }, amp: { a: 0.004, d: 0.3, s: 0.15, r: 0.2 }, level: 0.14 },
    fx: { reverb: 0.25, delay: { beats: 0.75, fb: 0.3, wet: 0.15 } },
    macros: [decay(0.3, 1), cutoff(1800, 300, 6000), space(0.25)],
  },
  {
    id: "house-bass", family: "house", genre: "House", name: "Rubber bass", role: "Bass",
    what: "A round square-wave bass with a filter blip and a touch of glide, bouncing on octaves.",
    use: ["analog"], alt: ["drift"],
    steps: ["Square or pulse wave, plus a sine sub.", "Low-pass around 500 Hz with a quick filter envelope.", "Short glide, mono.", "Bounce between the root and its octave on the offbeats."],
    chain: ["Saturator", "Compressor"],
    tempo: 124, drums: "house", oct: 1, mono: true,
    phrase: [[0, 2, 0], [3, 1, 0, 1], [6, 2, 0], [10, 2, 0, 1], [14, 2, 0], [16, 2, 5, -1], [19, 1, 5], [22, 2, 5, -1], [26, 2, 6, -1], [30, 2, 6]],
    patch: { layers: [{ wave: "square" }], sub: 0.5, filter: { cutoff: 420, q: 2, env: 900, decay: 0.12 }, amp: { a: 0.003, d: 0.25, s: 0.4, r: 0.08 }, glide: 0.03, level: 0.22 },
    fx: { duck: 0.3 },
    macros: [cutoff(420, 100, 2000), envAmt(900, 3000), glide(0.03)],
  },
  {
    id: "tech-bass", family: "house", genre: "Tech house", name: "Plucky tech house bass", role: "Bass",
    what: "Tight, resonant and slightly driven, with the groove coming from short notes and accents.",
    use: ["drift"], alt: ["analog", "operator"],
    steps: ["Saw plus a quiet square, low-pass with high resonance.", "Strong, very short filter envelope.", "A little drive for bite.", "Short notes, mostly off the kick, with one or two accents per bar."],
    chain: ["Saturator", "Drum Buss", "Compressor"],
    tempo: 126, drums: "tech-house", oct: 1, mono: true,
    phrase: [[2, 1, 0], [3, 1, 0], [6, 1, 0, 1], [7, 1, 0], [10, 1, 0], [11, 1, 2], [14, 1, 0], [18, 1, 0], [19, 1, 0], [22, 1, 0, 1], [26, 1, 3], [27, 1, 2], [30, 1, 0]],
    patch: { layers: [{ wave: "sawtooth" }, { wave: "square", level: 0.4 }], filter: { cutoff: 300, q: 6, env: 1600, decay: 0.09 }, amp: { a: 0.002, d: 0.14, s: 0, r: 0.05 }, drive: 0.3, level: 0.3 },
    fx: { duck: 0.4 },
    macros: [reso(6), envAmt(1600, 4000), drive(0.3)],
  },
  {
    id: "afro-log", family: "world", genre: "Afro house, amapiano", name: "Log drum bass", role: "Perc",
    what: "A pitched, punchy sine hit with a quick pitch drop and drive. Plays rhythm and bassline at once.",
    use: ["operator"], alt: ["drift", "simpler"],
    steps: ["One sine oscillator with a fast downward pitch envelope.", "Short-to-medium decay, no sustain.", "Drive or saturate so it cuts through.", "Syncopated notes, sliding between a few pitches."],
    chain: ["Saturator", "EQ Eight", "Glue Compressor"],
    tempo: 113, drums: "afro", oct: 1,
    phrase: [[0, 2, 0], [3, 2, 0], [6, 2, 4], [10, 2, 0], [12, 2, 3], [16, 2, 0], [19, 2, 0], [22, 2, 2], [26, 2, 4, -1], [28, 3, 0]],
    patch: { layers: [{ wave: "sine" }, { wave: "triangle", level: 0.3 }], filter: { cutoff: 2500 }, amp: { a: 0.002, d: 0.35, s: 0, r: 0.1 }, pitch: { semis: 7, time: 0.06 }, drive: 0.5, level: 0.4 },
    fx: { reverb: 0.1 },
    macros: [decay(0.35, 1), drive(0.5), { id: "pitch", label: "Pitch drop", min: 0, max: 24, step: 1, value: 7, fmt: (v) => v + " semitones", apply: (p, _f, v) => { p.pitch = { semis: v, time: 0.06 } } }],
  },

  // ---------- Techno and trance ----------
  {
    id: "acid", family: "techno", genre: "Techno, acid house", name: "Acid line (303-style)", role: "Bass",
    what: "A single saw through a squelchy, resonant low-pass, with slides and accents. Turn the cutoff and resonance while it plays.",
    use: ["analog"], alt: ["drift"],
    steps: ["One saw (or square) oscillator, mono, short glide.", "Low-pass 24 dB with resonance well up.", "Filter envelope with a short decay; accents get more envelope.", "Program 16ths with octave jumps; ride the cutoff live with a Push encoder."],
    chain: ["Saturator", "Delay", "Auto Filter"],
    tempo: 130, drums: "techno", oct: 1, mono: true,
    phrase: [[0, 1, 0], [1, 1, 0, 1], [2, 1, 0], [3, 2, 2], [6, 1, 0], [7, 1, 3, 1], [8, 1, 0], [10, 2, 4], [12, 1, 0, 1], [13, 1, 0], [14, 2, 6, -1], [16, 1, 0], [17, 1, 0, 1], [18, 1, 2], [19, 1, 0], [22, 2, 3], [24, 1, 0, 1], [25, 1, 4], [26, 1, 0], [28, 2, 2], [30, 1, 0, 1], [31, 1, 0]],
    patch: { layers: [{ wave: "sawtooth" }], filter: { cutoff: 320, q: 14, env: 2400, decay: 0.16 }, amp: { a: 0.002, d: 0.2, s: 0.5, r: 0.04 }, glide: 0.05, drive: 0.4, level: 0.2 },
    fx: { delay: { beats: 0.75, fb: 0.3, wet: 0.12 } },
    macros: [cutoff(320, 100, 3000), reso(14), envAmt(2400, 5000)],
  },
  {
    id: "dub-chord", family: "techno", genre: "Dub techno", name: "Dub chord with echoes", role: "Chords",
    what: "One minor chord stab, filtered and fed into long delay feedback and reverb, so the echoes become the part.",
    use: ["analog"], alt: ["drift", "wavetable"],
    steps: ["Saw and square oscillators, low-pass around 1 kHz.", "Short stab: fast decay, no sustain.", "Send to a delay with high feedback and a filtered return, then a big reverb.", "Automate the filter and feedback slowly over 16 bars."],
    chain: ["Echo", "Auto Filter", "Hybrid Reverb"],
    tempo: 124, drums: "minimal", oct: 2,
    phrase: [[2, 1, SEVENTH(0)], [18, 1, SEVENTH(0)], [27, 1, SEVENTH(0)]],
    patch: { layers: [{ wave: "sawtooth", level: 0.6 }, { wave: "square", level: 0.4 }], filter: { cutoff: 900, q: 2, env: 600, decay: 0.1 }, amp: { a: 0.003, d: 0.2, s: 0, r: 0.15 }, level: 0.2 },
    fx: { reverb: 0.4, delay: { beats: 0.75, fb: 0.62, wet: 0.5 } },
    macros: [cutoff(900, 200, 4000), { id: "fb", label: "Echo feedback", min: 0, max: 0.85, step: 0.01, value: 0.62, fmt: pct, apply: (_p, f, v) => { if (f.delay) f.delay.fb = v } }, space(0.4)],
  },
  {
    id: "trance-gate", family: "techno", genre: "Trance", name: "Gated supersaw pad", role: "Pad",
    what: "A wide supersaw chord chopped into 16ths by a square LFO on volume. Drives a trance breakdown into the drop.",
    use: ["wavetable"], alt: ["drift"],
    steps: ["Supersaw: Unison Classic, 7 or 8 voices.", "Hold long chords.", "Add Auto Pan-Tremolo synced to 1/16 with a square shape, or a gate pattern.", "Open the filter over the build."],
    chain: ["Auto Pan-Tremolo", "Hybrid Reverb", "Delay"],
    tempo: 138, drums: "trance", oct: 2,
    phrase: [[0, 16, TRIAD(0)], [16, 16, TRIAD(5).map((d) => d - 7)]],
    patch: { layers: [{ wave: "sawtooth", voices: 7, detune: 22 }], filter: { cutoff: 3500, q: 0.8 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.3 }, lfo: { target: "amp", beats: 0.25, depth: 0.9, shape: "square" }, level: 0.1 },
    fx: { reverb: 0.35, delay: { beats: 0.75, fb: 0.3, wet: 0.15 } },
    macros: [{ id: "gate", label: "Gate depth", min: 0, max: 1, step: 0.01, value: 0.9, fmt: pct, apply: (p, _f, v) => { if (p.lfo) p.lfo.depth = v } }, cutoff(3500, 400, 9000), space(0.35)],
  },

  // ---------- Bass music ----------
  {
    id: "dubstep-wobble", family: "bass", genre: "Dubstep", name: "Wobble bass", role: "Bass",
    what: "A resonant low-pass swept by a tempo-synced LFO. Change the rate for different rhythms.",
    use: ["wavetable"], alt: ["drift", "analog"],
    steps: ["Saw plus square, Unison a little, mono.", "Low-pass with resonance around a third of the way up.", "LFO synced to 1/8 or 1/16 into the cutoff, with a large amount.", "Automate the LFO rate between bars for variation."],
    chain: ["Roar", "Multiband Dynamics", "EQ Eight"],
    tempo: 140, drums: "dubstep", oct: 1, mono: true,
    phrase: [[0, 12, 0], [12, 4, 0, 1], [16, 8, 5, -1], [24, 8, 3]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 10 }, { wave: "square", level: 0.5 }], sub: 0.4, filter: { cutoff: 260, q: 7 }, amp: { a: 0.005, d: 0.3, s: 1, r: 0.1 }, lfo: { target: "cutoff", beats: 0.5, depth: 1600, shape: "sine" }, drive: 0.45, level: 0.24 },
    fx: {},
    macros: [lfoRate(1), lfoDepth(1600, 3000), drive(0.45)],
  },
  {
    id: "dnb-reese", family: "bass", genre: "Drum and bass", name: "Neuro reese", role: "Bass",
    what: "A darker, more distorted reese with a filter that moves in rhythm. Sits under fast breaks.",
    use: ["wavetable"], alt: ["drift"],
    steps: ["Two detuned saws, wide unison, mono.", "Low-pass with some resonance; LFO synced to 1/4 into cutoff.", "Heavy distortion, then EQ out the mud.", "Long notes on the root, changing every bar or two."],
    chain: ["Roar", "Auto Filter", "Multiband Dynamics"],
    tempo: 174, drums: "dnb", oct: 1, mono: true,
    phrase: [[0, 10, 0], [12, 4, 3, -1], [16, 12, 0], [28, 4, 4, -1]],
    patch: { layers: [{ wave: "sawtooth", voices: 3, detune: 40 }], sub: 0.4, filter: { cutoff: 450, q: 4 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.15 }, lfo: { target: "cutoff", beats: 1, depth: 700, shape: "triangle" }, drive: 0.65, glide: 0.05, level: 0.2 },
    fx: { reverb: 0.08 },
    macros: [detune(40, 80), lfoDepth(700, 2000), drive(0.65)],
  },
  {
    id: "future-chords", family: "bass", genre: "Future bass", name: "Pumping supersaw chords", role: "Chords",
    what: "Wide supersaw 7th chords ducked hard on every beat by the kick, so they swell and pump.",
    use: ["wavetable"], alt: ["meld"],
    steps: ["Supersaw with lots of unison voices, a little pitch modulation.", "Big 7th or 9th chord voicings.", "Sidechain to the kick, or use Auto Pan-Tremolo shaped like a duck.", "Hold chords for a bar each; add vocal chops on top."],
    chain: ["Compressor", "Chorus-Ensemble", "Hybrid Reverb"],
    tempo: 150, drums: "future-bass", oct: 2,
    phrase: [[0, 15, SEVENTH(0)], [16, 15, SEVENTH(5).map((d) => d - 7)]],
    patch: { layers: [{ wave: "sawtooth", voices: 6, detune: 28 }], filter: { cutoff: 5000 }, amp: { a: 0.02, d: 0.4, s: 0.9, r: 0.3 }, lfo: { target: "pitch", rate: 5, depth: 6 }, level: 0.075 },
    fx: { reverb: 0.3, duck: 0.85 },
    macros: [pump(0.85), detune(28), cutoff(5000, 500, 9000)],
  },

  // ---------- Breaks and garage ----------
  {
    id: "ukg-bass", family: "breaks", genre: "UK garage, speed garage", name: "Warped garage bass", role: "Bass",
    what: "A square bass with a strong filter envelope and a little pitch dip, bouncing on a swung rhythm.",
    use: ["analog"], alt: ["drift", "operator"],
    steps: ["Square or pulse wave, plus a sine sub.", "Low-pass with a medium filter envelope and some resonance.", "A small downward pitch envelope on each note.", "Syncopated, swung notes; let some overlap."],
    chain: ["Saturator", "Auto Filter", "Compressor"],
    tempo: 132, drums: "ukg", oct: 1, mono: true,
    phrase: [[0, 3, 0], [4, 1, 0, 1], [6, 2, 0], [10, 3, 3], [14, 2, 2], [16, 3, 0], [20, 1, 0, 1], [22, 2, 0], [26, 2, 4, -1], [28, 4, 5, -1]],
    patch: { layers: [{ wave: "square" }], sub: 0.45, filter: { cutoff: 500, q: 3, env: 1800, decay: 0.22 }, amp: { a: 0.003, d: 0.3, s: 0.5, r: 0.08 }, pitch: { semis: 2, time: 0.05 }, drive: 0.25, level: 0.28 },
    fx: { duck: 0.3 },
    macros: [cutoff(500, 120, 2500), envAmt(1800, 4000), drive(0.25)],
  },
  {
    id: "electro-arp", family: "world", genre: "Electro, synthwave", name: "Octave arp bass", role: "Bass",
    what: "Driving 16th-note saw bass that jumps between root and octave, with a short filter pluck.",
    use: ["analog"], alt: ["drift"],
    steps: ["One saw oscillator, low-pass around 800 Hz.", "Filter envelope with a quick decay.", "Program root–octave 16ths, changing root each bar.", "Add Delay synced to 1/8 for width."],
    chain: ["Saturator", "Delay", "Glue Compressor"],
    tempo: 110, drums: "synthwave", oct: 1,
    phrase: Array.from({ length: 32 }, (_, i): PhraseNote => [i, 0.8, i < 16 ? 0 : i < 24 ? 5 : 3, i % 2 ? 1 : i >= 16 ? -1 : 0]),
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 8 }], filter: { cutoff: 600, q: 2.5, env: 1500, decay: 0.1 }, amp: { a: 0.002, d: 0.15, s: 0.2, r: 0.05 }, level: 0.22 },
    fx: { delay: { beats: 0.5, fb: 0.25, wet: 0.15 }, reverb: 0.1 },
    macros: [cutoff(600, 150, 3000), envAmt(1500, 4000), delayWet(0.15)],
  },
  {
    id: "synthwave-pad", family: "world", genre: "Synthwave", name: "Juno-style chorus pad", role: "Pad",
    what: "Warm, slightly detuned saws with lush chorus and a big reverb, straight out of the 80s.",
    use: ["analog"], alt: ["drift", "wavetable"],
    steps: ["Two saws, gently detuned, and a sub.", "Low-pass around 2 kHz, medium attack and long release.", "Chorus-Ensemble in Ensemble mode does most of the work.", "Big reverb; long chords."],
    chain: ["Chorus-Ensemble", "Hybrid Reverb", "EQ Eight"],
    tempo: 110, drums: "synthwave", oct: 2,
    phrase: [[0, 15, TRIAD(0)], [16, 7, TRIAD(5).map((d) => d - 7)], [24, 7, TRIAD(6).map((d) => d - 7)]],
    patch: { layers: [{ wave: "sawtooth", voices: 3, detune: 12 }], sub: 0.2, filter: { cutoff: 2000, q: 1 }, amp: { a: 0.35, d: 0.8, s: 0.8, r: 1.2 }, lfo: { target: "pitch", rate: 0.6, depth: 8 }, level: 0.075 },
    fx: { reverb: 0.5 },
    macros: [attack(0.35), cutoff(2000, 400, 6000), space(0.5)],
  },

  // ---------- Future garage ----------
  {
    id: "fg-vocal", family: "futuregarage", genre: "Future garage", name: "Ghostly vocal chop", role: "Lead",
    what: "Pitched, fragmented vocal syllables smeared with reverb and delay. Here a formant-filtered synth stands in for the sample; in Live you'd chop a real a cappella.",
    use: ["simpler"], alt: ["sampler", "granulator"],
    steps: ["Drop an a cappella into Simpler in Slice mode and slice by transients.", "Transpose chops up 5 to 12 semitones; reverse a few for swells.", "Warp in Complex Pro and raise Formants so pitched-up vocals stay soft rather than chipmunky.", "Play short, broken phrases on the pads, leaving gaps; send heavily to reverb and delay."],
    chain: ["EQ Eight", "Echo", "Hybrid Reverb"],
    tempo: 138, drums: "fg-broken", oct: 3, mono: true,
    phrase: [[0, 2, 4], [2, 1, 4], [3, 3, 6], [8, 2, 7], [11, 4, 6], [16, 2, 4], [19, 2, 2], [22, 6, 3], [30, 2, 4]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 8 }, { wave: "square", level: 0.3 }], filter: { type: "bandpass", cutoff: 1000, q: 3.5 }, amp: { a: 0.01, d: 0.25, s: 0.5, r: 0.5 }, lfo: { target: "pitch", rate: 5, depth: 15 }, glide: 0.06, level: 0.45 },
    fx: { reverb: 0.55, delay: { beats: 0.75, fb: 0.45, wet: 0.3 } },
    macros: [{ id: "vowel", label: "Vowel", min: 400, max: 2500, step: 10, value: 1000, fmt: (v) => (v < 700 ? "oo" : v < 1100 ? "oh" : v < 1600 ? "ah" : "eh") + ` (${hz(v)})`, apply: (p, _f, v) => { p.filter.cutoff = v } }, delayWet(0.3), space(0.55)],
  },
  {
    id: "fg-sub", family: "futuregarage", genre: "Future garage", name: "Deep sine sub", role: "Bass",
    what: "A pure, long sub that you feel more than hear, lightly saturated so it shows up on headphones, gliding between roots.",
    use: ["operator"], alt: ["drift"],
    steps: ["One sine oscillator, no filter movement.", "Mono with a short glide; overlap notes to slide.", "A little Saturator for harmonics, then low-pass the top end.", "Long notes on chord roots; leave space under the kick."],
    chain: ["Saturator", "EQ Eight", "Utility"],
    tempo: 134, drums: "fg-shuffle", oct: 1, mono: true,
    phrase: [[0, 10, 0], [11, 5, 0], [16, 8, 5, -1], [24, 4, 3, -1], [28, 4, 4, -1]],
    patch: { layers: [{ wave: "sine" }], filter: { cutoff: 900 }, amp: { a: 0.01, d: 0.5, s: 0.9, r: 0.2 }, glide: 0.06, drive: 0.25, level: 0.22 },
    fx: { duck: 0.25 },
    macros: [{ id: "sat", label: "Saturation", min: 0, max: 0.9, step: 0.01, value: 0.25, fmt: pct, apply: (p, _f, v) => { p.drive = v } }, glide(0.06), cutoff(900, 120, 3000)],
  },
  {
    id: "fg-pad", family: "futuregarage", genre: "Future garage", name: "Dark pad with crackle", role: "Pad",
    what: "Slow, dark detuned chords drowned in reverb, with a bed of hiss underneath. Most of the mood in future garage lives here.",
    use: ["wavetable"], alt: ["granulator", "drift"],
    steps: ["Saw-like wavetable, Unison 4 voices, slow attack and long release.", "Low-pass low, around 800 Hz to 1.2 kHz, with a slow LFO.", "Huge reverb (Hybrid Reverb, Dark Hall), then Auto Filter to darken the tail.", "Add a vinyl crackle or rain field recording on its own track, low in the mix."],
    chain: ["Auto Filter", "Hybrid Reverb", "Utility"],
    tempo: 140, drums: "fg-halftime", oct: 2,
    phrase: [[0, 15, SEVENTH(0)], [16, 15, SEVENTH(5).map((d) => d - 7)]],
    patch: { layers: [{ wave: "sawtooth", voices: 4, detune: 14 }], noise: 0.018, filter: { cutoff: 950, q: 1 }, amp: { a: 1.2, d: 1, s: 0.85, r: 1.6 }, lfo: { target: "cutoff", rate: 0.15, depth: 300 }, level: 0.09 },
    fx: { reverb: 0.65 },
    macros: [cutoff(950, 250, 4000), space(0.65), { id: "crackle", label: "Hiss", min: 0, max: 0.06, step: 0.001, value: 0.018, fmt: (v) => pct(v / 0.06), apply: (p, _f, v) => { p.noise = v } }],
  },
  {
    id: "fg-keys", family: "futuregarage", genre: "Future garage", name: "Detuned minor 9 stabs", role: "Chords",
    what: "Soft, slightly out-of-tune minor 9th chords on swung offbeats, echoing into the reverb.",
    use: ["electric"], alt: ["drift", "sampler"],
    steps: ["Electric or a soft Rhodes sample; or Drift with a triangle and slow attack.", "Minor 9th voicings: root, 3rd, 5th, 7th and 9th.", "A slow pitch wobble from Chorus-Ensemble in Vibrato mode.", "Short stabs on offbeats, then a dotted-8th Echo with ducking."],
    chain: ["Chorus-Ensemble", "Echo", "Reverb"],
    tempo: 130, drums: "fg-rolling", oct: 2,
    phrase: [[3, 3, [0, 2, 4, 6, 8]], [10, 3, [0, 2, 4, 6, 8]], [19, 3, [-2, 0, 2, 4, 6]], [26, 3, [-3, -1, 1, 3, 5]]],
    patch: { layers: [{ wave: "triangle" }, { wave: "sawtooth", level: 0.2 }], filter: { cutoff: 1800, q: 0.7 }, amp: { a: 0.01, d: 0.6, s: 0.25, r: 0.5 }, lfo: { target: "pitch", rate: 0.8, depth: 12 }, level: 0.095 },
    fx: { reverb: 0.4, delay: { beats: 0.75, fb: 0.4, wet: 0.28 } },
    macros: [{ id: "wobble", label: "Wobble", min: 0, max: 40, step: 1, value: 12, fmt: cents, apply: (p, _f, v) => { if (p.lfo) p.lfo.depth = v } }, decay(0.6, 1.5), delayWet(0.28)],
  },
  {
    id: "fg-pluck", family: "futuregarage", genre: "Future garage, melodic", name: "Glassy delay pluck", role: "Pluck",
    what: "A soft, bell-like pluck playing a sparse melody, with long dotted echoes that become a second part.",
    use: ["collision"], alt: ["operator", "drift"],
    steps: ["Collision with a Marimba or Beam resonator, or a sine with an octave partial.", "Short decay, no sustain.", "A long dotted-8th delay with high feedback, filtered so repeats get darker.", "Sparse notes: let the echoes fill the gaps."],
    chain: ["Delay", "Hybrid Reverb", "EQ Eight"],
    tempo: 130, drums: "fg-rolling", oct: 3,
    phrase: [[0, 2, 7], [3, 2, 4], [6, 2, 6], [12, 2, 4], [16, 2, 2], [19, 2, 4], [22, 4, 0]],
    patch: { layers: [{ wave: "triangle" }, { wave: "sine", ratio: 2, level: 0.35 }, { wave: "sine", ratio: 4.2, level: 0.08 }], filter: { cutoff: 5000 }, amp: { a: 0.002, d: 0.4, s: 0, r: 0.3 }, level: 0.22 },
    fx: { reverb: 0.4, delay: { beats: 0.75, fb: 0.55, wet: 0.4 } },
    macros: [decay(0.4, 1.2), delayWet(0.4), space(0.4)],
  },

  // ---------- Hip-hop and trap ----------
  {
    id: "trap-bell", family: "hiphop", genre: "Trap", name: "Dark bell melody", role: "Lead",
    what: "A glassy, inharmonic bell playing a sparse minor melody, with lots of space around it.",
    use: ["operator"], alt: ["collision"],
    steps: ["Operator: a sine carrier with one modulator.", "Set the modulator's Coarse ratio to a non-whole number (try 3.5).", "Short decay on the modulator, longer on the carrier.", "Sparse melody in natural minor or harmonic minor."],
    chain: ["Reverb", "Delay", "EQ Eight"],
    tempo: 140, drums: "trap", oct: 3,
    phrase: [[0, 3, 4], [4, 3, 2], [8, 6, 0], [16, 3, 4], [20, 2, 5], [22, 2, 4], [24, 8, 2]],
    patch: { layers: [{ wave: "sine" }, { wave: "sine", ratio: 3.5, level: 0.25 }, { wave: "triangle", ratio: 2, level: 0.2 }], filter: { cutoff: 7000 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.6 }, level: 0.2 },
    fx: { reverb: 0.4, delay: { beats: 0.75, fb: 0.3, wet: 0.2 } },
    macros: [decay(0.9, 2.5), { id: "metal", label: "Metallic", min: 0, max: 0.8, step: 0.01, value: 0.25, fmt: pct, apply: (p, _f, v) => { p.layers[1].level = v } }, space(0.4)],
  },
  {
    id: "trap-808", family: "hiphop", genre: "Trap, drill", name: "Long 808 with glide", role: "Bass",
    what: "Cleaner than the phonk 808: a long, booming sine that follows the kick and slides between notes.",
    use: ["simpler"], alt: ["operator", "drift"],
    steps: ["An 808 sample in Simpler, Classic mode, one voice with Glide on.", "Long release so notes ring into the next.", "Tune it to the key with Transpose.", "Overlap notes to slide; follow the kick rhythm."],
    chain: ["Saturator", "EQ Eight", "Glue Compressor"],
    tempo: 140, drums: "trap", oct: 1, mono: true,
    phrase: [[0, 7, 0], [7, 3, 0], [10, 6, 3], [16, 7, 0], [23, 3, 4], [26, 6, 0, 1]],
    patch: { layers: [{ wave: "sine" }], filter: { cutoff: 5000 }, amp: { a: 0.003, d: 2, s: 0.6, r: 0.3 }, pitch: { semis: 7, time: 0.03 }, glide: 0.1, drive: 0.2, level: 0.26 },
    fx: {},
    macros: [glide(0.1), drive(0.2), decay(2, 3)],
  },
  {
    id: "lofi-keys", family: "hiphop", genre: "Lo-fi hip-hop", name: "Wobbly lo-fi keys", role: "Chords",
    what: "Soft electric-piano-like 7th chords with tape wobble, a dark filter and a little hiss.",
    use: ["electric"], alt: ["sampler"],
    steps: ["Electric with a soft mallet, or a Rhodes sample in Sampler.", "Play 7th and 9th chords, lazy timing.", "Slow pitch wobble (Chorus-Ensemble in Vibrato mode, or an LFO to pitch).", "Low-pass the bus and add Vinyl Distortion or noise."],
    chain: ["Chorus-Ensemble", "Auto Filter", "Reverb"],
    tempo: 78, drums: "lofi", oct: 2,
    phrase: [[0, 14, SEVENTH(0)], [16, 14, SEVENTH(3).map((d) => d - 7)]],
    patch: { layers: [{ wave: "triangle" }, { wave: "sine", oct: 1, level: 0.3 }], noise: 0.012, filter: { cutoff: 1500, q: 0.7 }, amp: { a: 0.01, d: 1.5, s: 0.3, r: 0.6 }, lfo: { target: "pitch", rate: 0.7, depth: 14 }, level: 0.11 },
    fx: { reverb: 0.25 },
    macros: [{ id: "wobble", label: "Tape wobble", min: 0, max: 40, step: 1, value: 14, fmt: cents, apply: (p, _f, v) => { if (p.lfo) p.lfo.depth = v } }, cutoff(1500, 300, 5000), { id: "hiss", label: "Hiss", min: 0, max: 0.05, step: 0.001, value: 0.012, fmt: (v) => pct(v * 20), apply: (p, _f, v) => { p.noise = v } }],
  },
]
