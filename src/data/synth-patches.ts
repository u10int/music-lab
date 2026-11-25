import type { FxSettings, Layer, Patch } from "@/audio/patch"
import type { Macro, PhraseNote } from "./genre-sounds"
import type { Family } from "./patterns"
import { attack, cutoff, decay, delayWet, detune, drive, envAmt, glide, lfoDepth, lfoRate, pump, reso, space, SEVENTH, TRIAD } from "./sound-macros"

export type PatchCategory = "Bass" | "Lead" | "Pad" | "Pluck" | "Arp" | "FX" | "Texture"
export const PATCH_CATEGORIES: PatchCategory[] = ["Bass", "Lead", "Pad", "Pluck", "Arp", "FX", "Texture"]

/** A general-purpose synth patch: one sound, playable on its own, with settings for each synth. */
export interface SynthPatch {
  id: string
  name: string
  cat: PatchCategory
  /** Genres the patch suits, for the tags. */
  genres: Family[]
  what: string
  /** The one move that makes this patch work. */
  key: string
  tempo: number
  oct: number
  mono?: boolean
  phrase: PhraseNote[]
  patch: Patch
  fx: FxSettings
  macros: Macro[]
}

const arp = (degs: number[], len = 0.8, every = 1): PhraseNote[] => Array.from({ length: 32 / every }, (_, i): PhraseNote => [i * every, len, degs[i % degs.length]])
const lo = (ch: number[]) => ch.map((d) => d - 7)

export const SYNTH_PATCHES: SynthPatch[] = [
  // ---------- Bass ----------
  {
    id: "p-reese", name: "Reese", cat: "Bass", genres: ["dnb", "wave", "dubstep"],
    what: "Two saws detuned against each other so they beat and phase. Long notes; the movement comes from the detune itself.",
    key: "Detune the two saws apart by 15–30 cents and keep it mono with a clean sine sub under it.",
    tempo: 174, oct: 1, mono: true,
    phrase: [[0, 14, 0], [16, 8, 5], [24, 7, 3]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 28 }, { wave: "sawtooth", voices: 2, detune: 14, level: 0.6 }], sub: 0.5, filter: { cutoff: 900, q: 1 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.15 }, lfo: { target: "cutoff", rate: 0.3, depth: 300 }, drive: 0.35, glide: 0.04, level: 0.15 },
    fx: { reverb: 0.08 },
    macros: [detune(28), cutoff(900, 200, 4000), drive(0.35)],
  },
  {
    id: "p-acid", name: "Acid line", cat: "Bass", genres: ["techno", "trance"],
    what: "A single saw through a resonant low-pass with a snappy filter envelope, the 303 sound. Slides on tied notes.",
    key: "Push resonance high and keep cutoff low, then let the filter envelope do the squelch. Accent a few notes louder.",
    tempo: 130, oct: 2, mono: true,
    phrase: [0, 0, 7, 0, 3, 0, 5, 7, 0, 0, 10, 0, 3, 5, 0, 7].flatMap((d, i): PhraseNote[] => [[i * 2, i % 4 === 3 ? 2 : 1, d]]),
    patch: { layers: [{ wave: "sawtooth" }], filter: { cutoff: 350, q: 12, env: 2400, decay: 0.14 }, amp: { a: 0.002, d: 0.2, s: 0.6, r: 0.04 }, glide: 0.06, drive: 0.3, level: 0.16 },
    fx: { delay: { beats: 0.75, fb: 0.3, wet: 0.15 } },
    macros: [cutoff(350, 100, 2500), reso(12), envAmt(2400, 5000)],
  },
  {
    id: "p-wobble", name: "Wobble bass", cat: "Bass", genres: ["dubstep", "trap"],
    what: "A square and saw through a low-pass that an LFO opens and closes in time with the track.",
    key: "Sync the LFO to the tempo and change its rate (1/4, 1/8, triplets) from bar to bar; that rhythm is the part.",
    tempo: 140, oct: 1, mono: true,
    phrase: [[0, 12, 0], [12, 4, 0, 1], [16, 8, 5], [24, 8, 3]],
    patch: { layers: [{ wave: "square" }, { wave: "sawtooth", voices: 2, detune: 12, level: 0.6 }], sub: 0.5, filter: { cutoff: 250, q: 6 }, amp: { a: 0.005, d: 0.2, s: 1, r: 0.08 }, lfo: { target: "cutoff", beats: 0.5, depth: 1800, shape: "sine" }, drive: 0.5, level: 0.16 },
    fx: {},
    macros: [lfoRate(1), lfoDepth(1800, 3500), reso(6)],
  },
  {
    id: "p-pluckbass", name: "Plucked offbeat bass", cat: "Bass", genres: ["trance", "prog", "techno"],
    what: "A short saw bass on every offbeat 16th, the rolling bass under trance and progressive house.",
    key: "Short decay with no sustain, and sidechain it hard to the kick so the offbeats bounce.",
    tempo: 138, oct: 1,
    phrase: Array.from({ length: 32 }, (_, i) => i).filter((i) => i % 4 !== 0).map((i): PhraseNote => [i, 0.8, i >= 24 ? 3 : i >= 16 ? 5 : 0]),
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 6 }], filter: { cutoff: 500, q: 2, env: 1600, decay: 0.1 }, amp: { a: 0.002, d: 0.16, s: 0, r: 0.05 }, level: 0.28 },
    fx: { duck: 0.55 },
    macros: [cutoff(500, 120, 2500), envAmt(1600, 4000), pump(0.55)],
  },
  {
    id: "p-subsine", name: "Clean sub", cat: "Bass", genres: ["dubstep", "ukg", "trap"],
    what: "A pure sine with a touch of saturation for harmonics, so it still reads on laptop speakers.",
    key: "Keep it mono and below about 100 Hz; add a little drive rather than a second oscillator.",
    tempo: 140, oct: 1, mono: true,
    phrase: [[0, 6, 0], [8, 4, 0], [12, 3, 3], [16, 6, 5], [24, 4, 3], [28, 3, 2]],
    patch: { layers: [{ wave: "sine" }], filter: { cutoff: 1200 }, amp: { a: 0.005, d: 0.4, s: 0.9, r: 0.08 }, glide: 0.02, drive: 0.25, level: 0.22 },
    fx: {},
    macros: [drive(0.25), glide(0.02), decay(0.4, 1.5)],
  },

  // ---------- Lead ----------
  {
    id: "p-supersaw", name: "Supersaw lead", cat: "Lead", genres: ["trance", "wave", "futurebass"],
    what: "Seven detuned saws, almost no filtering, a soft attack and a long tail. The euphoric trance and wave lead.",
    key: "Lots of unison voices with moderate detune; open the filter and let reverb and delay make the size.",
    tempo: 138, oct: 3, mono: true,
    phrase: [[0, 6, 4], [6, 2, 3], [8, 6, 2], [16, 4, 4], [20, 4, 5], [24, 8, 7]],
    patch: { layers: [{ wave: "sawtooth", voices: 7, detune: 24 }], filter: { cutoff: 5000, q: 0.8 }, amp: { a: 0.02, d: 0.3, s: 0.85, r: 0.35 }, glide: 0.02, level: 0.14 },
    fx: { reverb: 0.4, delay: { beats: 0.75, fb: 0.35, wet: 0.2 } },
    macros: [detune(24), cutoff(5000, 600, 10000), space(0.4)],
  },
  {
    id: "p-screech", name: "FM screech", cat: "Lead", genres: ["hardwave", "dubstep", "phonk"],
    what: "A bright, nasal lead with a moving band-pass and drive, the screech of hardwave drops.",
    key: "FM or a harsh wavetable into a band-pass, with an LFO moving the band; distort after the synth.",
    tempo: 140, oct: 3, mono: true,
    phrase: [[0, 3, 0], [4, 2, 2], [6, 2, 3], [8, 6, 4], [16, 3, 3], [20, 4, 2], [24, 6, 0]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 10 }, { wave: "square", ratio: 2.01, level: 0.5 }], filter: { type: "bandpass", cutoff: 1800, q: 3 }, amp: { a: 0.005, d: 0.3, s: 0.9, r: 0.1 }, lfo: { target: "cutoff", beats: 0.5, depth: 900 }, glide: 0.04, drive: 0.75, level: 0.2 },
    fx: { reverb: 0.15 },
    macros: [cutoff(1800, 500, 5000), lfoDepth(900, 2500), drive(0.75)],
  },
  {
    id: "p-square", name: "Hollow square lead", cat: "Lead", genres: ["synthwave", "wave"],
    what: "A square wave with gentle vibrato and a little glide, the hollow 80s lead.",
    key: "Delayed vibrato (LFO to pitch, slow fade-in) is what makes it sing.",
    tempo: 100, oct: 3, mono: true,
    phrase: [[0, 4, 0], [4, 4, 2], [8, 8, 4], [16, 4, 5], [20, 4, 4], [24, 8, 2]],
    patch: { layers: [{ wave: "square" }, { wave: "square", oct: 1, level: 0.25 }], filter: { cutoff: 2600, q: 1 }, amp: { a: 0.01, d: 0.3, s: 0.8, r: 0.25 }, lfo: { target: "pitch", rate: 5.5, depth: 18 }, glide: 0.05, level: 0.12 },
    fx: { reverb: 0.3, delay: { beats: 0.75, fb: 0.35, wet: 0.2 } },
    macros: [cutoff(2600, 500, 8000), glide(0.05), space(0.3)],
  },
  {
    id: "p-hoover", name: "Hoover", cat: "Lead", genres: ["hardtechno", "dnb", "trance"],
    what: "Detuned saws with a downward pitch swoop on each note: the rave hoover.",
    key: "A pitch envelope that starts above the note and falls, with heavy unison and chorus.",
    tempo: 150, oct: 2, mono: true,
    phrase: [[0, 6, 0], [8, 6, 0], [16, 4, 3], [20, 4, 2], [24, 8, 0]],
    patch: { layers: [{ wave: "sawtooth", voices: 5, detune: 40 }, { wave: "sawtooth", oct: -1, voices: 2, detune: 20, level: 0.5 }], filter: { cutoff: 2400, q: 1.2 }, amp: { a: 0.005, d: 0.3, s: 0.9, r: 0.15 }, pitch: { semis: 5, time: 0.12 }, glide: 0.08, drive: 0.3, level: 0.13 },
    fx: { reverb: 0.25 },
    macros: [detune(40), glide(0.08), drive(0.3)],
  },

  // ---------- Pad ----------
  {
    id: "p-warmpad", name: "Warm analog pad", cat: "Pad", genres: ["deephouse", "synthwave", "ambient"],
    what: "Detuned saws filtered warm, with a slow attack and long release. Sits under everything.",
    key: "Slow attack, long release, and a cutoff low enough that it never competes with the lead.",
    tempo: 120, oct: 2,
    phrase: [[0, 16, SEVENTH(0)], [16, 16, lo(SEVENTH(5))]],
    patch: { layers: [{ wave: "sawtooth", voices: 4, detune: 14 }, { wave: "triangle", level: 0.5 }], filter: { cutoff: 1400, q: 0.8 }, amp: { a: 0.7, d: 1, s: 0.9, r: 1.4 }, lfo: { target: "cutoff", rate: 0.15, depth: 300 }, level: 0.07 },
    fx: { reverb: 0.55 },
    macros: [attack(0.7), cutoff(1400, 300, 5000), space(0.55)],
  },
  {
    id: "p-gated", name: "Gated trance pad", cat: "Pad", genres: ["trance", "prog"],
    what: "A bright pad chopped into 16ths by an LFO on volume, the stuttering trance gate.",
    key: "A square LFO synced to 1/16 on the amp; vary the gate pattern for interest.",
    tempo: 138, oct: 2,
    phrase: [[0, 16, TRIAD(0)], [16, 8, lo(TRIAD(5))], [24, 8, lo(TRIAD(6))]],
    patch: { layers: [{ wave: "sawtooth", voices: 5, detune: 18 }], filter: { cutoff: 3000, q: 1 }, amp: { a: 0.01, d: 0.3, s: 1, r: 0.3 }, lfo: { target: "amp", beats: 0.25, depth: 0.9, shape: "square" }, level: 0.08 },
    fx: { reverb: 0.35, delay: { beats: 0.75, fb: 0.3, wet: 0.15 } },
    macros: [cutoff(3000, 500, 8000), detune(18), space(0.35)],
  },
  {
    id: "p-darkpad", name: "Dark sidechained pad", cat: "Pad", genres: ["wave", "hardwave", "driftwave"],
    what: "A low, wide minor pad that breathes with the kick. The bed under wave and hardwave drops.",
    key: "Heavy sidechain so it pumps, and a cutoff under 1.5 kHz so it stays out of the lead’s way.",
    tempo: 140, oct: 2,
    phrase: [[0, 16, TRIAD(0)], [16, 16, lo(TRIAD(5))]],
    patch: { layers: [{ wave: "sawtooth", voices: 6, detune: 20 }], sub: 0.15, filter: { cutoff: 1000, q: 1 }, amp: { a: 0.4, d: 1, s: 0.9, r: 1.2 }, level: 0.08 },
    fx: { reverb: 0.6, duck: 0.6 },
    macros: [cutoff(1000, 250, 4000), pump(0.6), space(0.6)],
  },

  // ---------- Pluck ----------
  {
    id: "p-pluck", name: "Bright pluck", cat: "Pluck", genres: ["futurebass", "trance", "house"],
    what: "Saws with a fast filter envelope and no sustain: the all-purpose melodic pluck.",
    key: "Filter envelope amount high, decay short; the amp decay sets how long each note rings.",
    tempo: 128, oct: 3,
    phrase: [0, 4, 7, 4, 2, 4, 9, 7].map((d, i): PhraseNote => [i * 4, 2, d]).concat([5, 4, 2, 0].map((d, i): PhraseNote => [16 + i * 4, 2, d])),
    patch: { layers: [{ wave: "sawtooth", voices: 3, detune: 12 }], filter: { cutoff: 700, q: 2, env: 4000, decay: 0.16 }, amp: { a: 0.002, d: 0.35, s: 0, r: 0.2 }, level: 0.13 },
    fx: { reverb: 0.3, delay: { beats: 0.75, fb: 0.4, wet: 0.25 } },
    macros: [envAmt(4000, 7000), decay(0.35, 1.2), delayWet(0.25)],
  },
  {
    id: "p-bell", name: "FM bell", cat: "Pluck", genres: ["ambient", "lofi", "phonk", "driftwave"],
    what: "A sine with an inharmonic partial above it, decaying slowly: glassy and bell-like.",
    key: "A modulator at a non-whole ratio (around 3.5×) gives the metallic overtone; long decay, no sustain.",
    tempo: 90, oct: 4,
    phrase: [[0, 4, 0], [6, 4, 4], [12, 4, 2], [16, 4, 7], [22, 4, 4], [28, 4, 2]],
    patch: { layers: [{ wave: "sine" }, { wave: "sine", ratio: 3.5, level: 0.35 }, { wave: "sine", ratio: 7.1, level: 0.1 }], filter: { cutoff: 9000 }, amp: { a: 0.002, d: 1.4, s: 0, r: 1 }, level: 0.2 },
    fx: { reverb: 0.45, delay: { beats: 1.5, fb: 0.35, wet: 0.2 } },
    macros: [decay(1.4, 3), space(0.45), delayWet(0.2)],
  },
  {
    id: "p-chordstab", name: "House chord stab", cat: "Pluck", genres: ["house", "deephouse", "ukg"],
    what: "A short minor 7th chord with a quick filter snap, played on the offbeats.",
    key: "Whole chords on one note, short decay, and swing the rhythm a little.",
    tempo: 124, oct: 3,
    phrase: [[2, 1.5, SEVENTH(0)], [6, 1.5, SEVENTH(0)], [11, 1.5, SEVENTH(0)], [18, 1.5, lo(SEVENTH(5))], [22, 1.5, lo(SEVENTH(5))], [27, 1.5, lo(SEVENTH(5))]],
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 10 }, { wave: "square", level: 0.4 }], filter: { cutoff: 900, q: 2, env: 2500, decay: 0.12 }, amp: { a: 0.002, d: 0.22, s: 0, r: 0.12 }, level: 0.1 },
    fx: { reverb: 0.3, delay: { beats: 0.75, fb: 0.3, wet: 0.15 } },
    macros: [envAmt(2500, 5000), decay(0.22, 0.8), space(0.3)],
  },

  // ---------- Arp ----------
  {
    id: "p-trancearp", name: "16th trance arp", cat: "Arp", genres: ["trance", "prog"],
    what: "Chord tones cycling up in 16ths with a dotted-8th delay filling the gaps.",
    key: "Short notes, a filter envelope for bite, and a dotted-8th delay so the pattern rolls.",
    tempo: 138, oct: 3,
    phrase: arp([0, 2, 4, 7, 4, 2]),
    patch: { layers: [{ wave: "sawtooth", voices: 2, detune: 10 }], filter: { cutoff: 1000, q: 3, env: 2800, decay: 0.1 }, amp: { a: 0.002, d: 0.14, s: 0, r: 0.08 }, level: 0.15 },
    fx: { reverb: 0.3, delay: { beats: 0.75, fb: 0.45, wet: 0.3 } },
    macros: [cutoff(1000, 200, 5000), reso(3), delayWet(0.3)],
  },
  {
    id: "p-synthwavearp", name: "Synthwave 8th arp", cat: "Arp", genres: ["synthwave", "wave"],
    what: "A bright square arp in 8ths, with chorus and a long delay: the night-drive pulse.",
    key: "Straight 8ths, octave jumps, and a chorus to widen it.",
    tempo: 100, oct: 2,
    phrase: arp([0, 7, 9, 7, 0, 7, 11, 7], 1.4, 2),
    patch: { layers: [{ wave: "square", voices: 2, detune: 8 }, { wave: "sawtooth", oct: 1, level: 0.3 }], filter: { cutoff: 1800, q: 2, env: 1500, decay: 0.15 }, amp: { a: 0.002, d: 0.25, s: 0.2, r: 0.1 }, level: 0.12 },
    fx: { reverb: 0.35, delay: { beats: 0.75, fb: 0.4, wet: 0.25 } },
    macros: [cutoff(1800, 300, 6000), decay(0.25, 1), delayWet(0.25)],
  },

  // ---------- FX ----------
  {
    id: "p-riser", name: "Noise riser", cat: "FX", genres: ["trance", "wave", "dubstep", "house"],
    what: "Filtered noise and a saw whose filter climbs over two bars, building into a drop.",
    key: "One long note with a slow filter envelope rising (or automate the cutoff), plus a lot of reverb.",
    tempo: 140, oct: 3,
    phrase: [[0, 31, 0]],
    patch: { layers: [{ wave: "sawtooth", voices: 3, detune: 30, level: 0.4 }], noise: 0.6, filter: { type: "highpass", cutoff: 200, q: 4 }, amp: { a: 2.5, d: 0.2, s: 1, r: 0.1 }, pitch: { semis: -12, time: 2.6 }, lfo: { target: "cutoff", rate: 0.24, depth: 2500, shape: "sawtooth" }, level: 0.2 },
    fx: { reverb: 0.55 },
    macros: [attack(2.5), lfoDepth(2500, 5000), space(0.55)],
  },
  {
    id: "p-zap", name: "Laser zap", cat: "FX", genres: ["dubstep", "phonk", "trap"],
    what: "A short sine that drops several octaves in a few milliseconds: a zap or a pew.",
    key: "A big, very fast pitch envelope on a simple wave, then reverb.",
    tempo: 140, oct: 4,
    phrase: [[0, 2, 0], [6, 2, 4], [12, 2, 0], [20, 2, 7], [28, 2, 0]],
    patch: { layers: [{ wave: "triangle" }], filter: { cutoff: 9000 }, amp: { a: 0.002, d: 0.2, s: 0, r: 0.1 }, pitch: { semis: 36, time: 0.08 }, drive: 0.2, level: 0.3 },
    fx: { reverb: 0.35, delay: { beats: 0.5, fb: 0.3, wet: 0.2 } },
    macros: [decay(0.2, 0.8), space(0.35), delayWet(0.2)],
  },

  // ---------- Texture ----------
  {
    id: "p-air", name: "Breathy air", cat: "Texture", genres: ["ambient", "futuregarage", "wave"],
    what: "Filtered noise with a slowly moving band-pass: wind and air behind a mix.",
    key: "Noise only, a band-pass with an LFO moving it slowly, and a very long reverb.",
    tempo: 120, oct: 3,
    phrase: [[0, 31, 0]],
    patch: { layers: [{ wave: "sine", level: 0.05 }], noise: 0.9, filter: { type: "bandpass", cutoff: 1500, q: 2 }, amp: { a: 1.2, d: 1, s: 1, r: 1.5 }, lfo: { target: "cutoff", rate: 0.1, depth: 900 }, level: 0.32 },
    fx: { reverb: 0.7 },
    macros: [cutoff(1500, 300, 6000), lfoDepth(900, 2500), space(0.7)],
  },
  {
    id: "p-drone", name: "Evolving drone", cat: "Texture", genres: ["ambient", "dubtechno"],
    what: "A low root and fifth with slow detune and filter drift, for intros and beds.",
    key: "Slow LFOs on several targets at different rates, so it never repeats exactly.",
    tempo: 100, oct: 1,
    phrase: [[0, 32, [0, 4]]],
    patch: { layers: [{ wave: "sawtooth", voices: 4, detune: 18 }, { wave: "triangle", oct: 1, level: 0.5 }], filter: { cutoff: 600, q: 2 }, amp: { a: 2, d: 1, s: 1, r: 2 }, lfo: { target: "cutoff", rate: 0.07, depth: 500 }, level: 0.08 },
    fx: { reverb: 0.65, delay: { beats: 1.5, fb: 0.5, wet: 0.2 } },
    macros: [cutoff(600, 150, 3000), detune(18), space(0.65)],
  },
]

/* ---------- Translating a patch into each synth’s panel ---------- */

export type PatchSynth = "wavetable" | "drift" | "massive" | "spire"

const WAVE = {
  wavetable: { sawtooth: "Basic Shapes, saw", square: "Basic Shapes, square", sine: "Basic Shapes, sine", triangle: "Basic Shapes, triangle" },
  drift: { sawtooth: "Saw", square: "Rectangle (Shape at 50%)", sine: "Sine", triangle: "Triangle" },
  massive: { sawtooth: "Squ-Sw I, Wt-position fully right (saw)", square: "Squ-Sw I, Wt-position fully left (square)", sine: "Sin-Tri, Wt-position left (sine)", triangle: "Sin-Tri, Wt-position right (triangle)" },
  spire: { sawtooth: "Classic, Ctrl A at 0 (saw)", square: "Classic, Ctrl A around 50% (square)", sine: "Classic, Ctrl A fully right (sine)", triangle: "Classic, Ctrl A around 75% (triangle)" },
} as const

const FILTER = {
  wavetable: { lowpass: "Low-pass, 24 dB Clean", highpass: "High-pass, 24 dB", bandpass: "Band-pass", notch: "Notch" },
  drift: { lowpass: "Low-pass, Type II (24 dB)", highpass: "Low-pass open, HP knob up", bandpass: "Low-pass with the HP knob raised to make a band", notch: "Low-pass" },
  massive: { lowpass: "Lowpass 4", highpass: "Highpass 4", bandpass: "Bandpass", notch: "Bandreject" },
  spire: { lowpass: "Perfecto, LP4", highpass: "Perfecto, HP4", bandpass: "Perfecto, BP4", notch: "Infecto, Notch" },
} as const

const t = (s: number) => (s >= 1 ? s.toFixed(1) + " s" : Math.max(1, Math.round(s * 1000)) + " ms")
const f = (hz: number) => (hz >= 1000 ? (hz / 1000).toFixed(1) + " kHz" : Math.round(hz) + " Hz")
/** Where a frequency sits on a 20 Hz–20 kHz log knob, for synths that show percent instead of Hz. */
const knob = (hz: number) => Math.round(Math.max(0, Math.min(1, Math.log(hz / 20) / Math.log(1000))) * 100) + "%"
const rateName = (beats: number) => ({ 4: "1 bar", 2: "1/2", 1: "1/4", 0.5: "1/8", 0.25: "1/16", [1 / 3]: "1/8 triplet" } as Record<number, string>)[beats] ?? `${beats} beats`

function oscLine(s: PatchSynth, l: Layer, i: number, firstUnison: boolean) {
  const wave = WAVE[s][l.wave as keyof (typeof WAVE)["drift"]] ?? l.wave
  const bits: string[] = [wave]
  if (l.oct) bits.push(`${l.oct > 0 ? "+" : ""}${l.oct} octave`)
  if (l.ratio) bits.push(s === "massive" || s === "spire" ? `pitch about +${Math.round(12 * Math.log2(l.ratio))} semitones (or FM it from another oscillator)` : `tuned to about ×${l.ratio} of the note (inharmonic)`)
  if ((l.voices ?? 1) > 1 && s === "massive" && !firstUnison) bits.push("unison from the Voicing tab applies here too")
  else if ((l.voices ?? 1) > 1) {
    const amt = l.detune ?? 0
    bits.push(s === "wavetable" ? `Unison Classic, ${l.voices} voices, Amount about ${Math.min(100, Math.round(amt * 1.6))}%`
      : s === "drift" ? `detune Osc 2 by ${Math.round(amt)} cents against it${(l.voices ?? 1) > 2 ? " (Voice Mode Unison for more)" : ""}`
      : s === "massive" ? `Voicing tab: Unisono ${l.voices}, Pitch detune about ${Math.round(amt)} cents`
      : `Voices ${l.voices}, Detune about ${Math.round(amt * 0.4)}%`)
  }
  if (l.level != null && l.level !== 1) bits.push(`level ${Math.round(l.level * 100)}%`)
  return [`Osc ${i + 1}`, bits.join("; ")] as [string, string]
}

/** Starting settings for a patch in one synth. Values are approximate: tune by ear. */
export function patchSettings(p: Patch, s: PatchSynth, mono?: boolean): [string, string][] {
  const rows: [string, string][] = []
  const layers = s === "drift" ? p.layers.slice(0, 2) : p.layers.slice(0, s === "spire" ? 4 : 3)
  const firstU = layers.findIndex((l) => (l.voices ?? 1) > 1)
  layers.forEach((l, i) => rows.push(oscLine(s, l, i, i === firstU)))
  if (s === "drift" && p.layers.length > 2) rows.push(["Note", "Drift has two oscillators; fold the extra layer into Osc 2 or layer a second Drift."])
  if (p.sub) rows.push(["Sub", s === "massive" ? `OSC 3 on Sin-Tri at −12, level ${Math.round(p.sub * 100)}%` : s === "spire" ? `A spare oscillator on a sine at −1 octave, level ${Math.round(p.sub * 100)}%` : s === "drift" ? `Osc 2 on Sine at −1 octave, level ${Math.round(p.sub * 100)}%` : `Sub on, Gain ${Math.round(p.sub * 100)}%, −1 octave`])
  if (p.noise) rows.push(["Noise", s === "massive" ? `Noise on (White), level ${Math.round(p.noise * 100)}%` : s === "spire" ? `An oscillator set to Noise, level ${Math.round(p.noise * 100)}%` : s === "drift" ? `Noise in the mixer at ${Math.round(p.noise * 100)}%` : `Osc 2 on a Noise wavetable at ${Math.round(p.noise * 100)}%`])
  const type = (p.filter.type ?? "lowpass") as keyof (typeof FILTER)["drift"]
  const cut = p.filter.track ? `tracking the note (about ×${p.filter.track})` : s === "massive" || s === "spire" ? `about ${knob(p.filter.cutoff)} (≈ ${f(p.filter.cutoff)})` : f(p.filter.cutoff)
  rows.push(["Filter", `${FILTER[s][type] ?? type}, cutoff ${cut}, resonance ${Math.round(Math.min(1, (p.filter.q ?? 0.7) / 18) * 100)}%`])
  if (p.filter.env) {
    const env = s === "massive" ? "Env 1 (drag its cross onto Cutoff)" : s === "spire" ? "Env 2 → Cutoff 1 in the matrix" : s === "drift" ? "Env 2 → Filter Freq" : "Env 2 → Filter 1 Freq in the matrix"
    rows.push(["Filter envelope", `${env}: attack 0, decay ${t(p.filter.decay ?? 0.2)}, sustain 0, amount about +${f(p.filter.env)}`])
  }
  const { a, d, s: sus, r } = p.amp
  rows.push(["Amp envelope", `${s === "massive" ? "Env 4: " : ""}A ${t(a)}, D ${t(d)}, S ${Math.round(sus * 100)}%, R ${t(r)}`])
  if (p.pitch) rows.push(["Pitch envelope", `${s === "massive" ? "Env 2 → Pitch" : s === "spire" ? "Env 3 → Pitch (all oscillators) in the matrix" : s === "drift" ? "Env 2 → Pitch (Mod matrix)" : "Env 3 → Global Pitch in the matrix"}: start ${p.pitch.semis > 0 ? "+" : ""}${p.pitch.semis} semitones, falling over ${t(p.pitch.time)}`])
  if (p.lfo) {
    const where = p.lfo.target === "cutoff" ? "filter cutoff" : p.lfo.target === "amp" ? "volume" : "pitch"
    const rate = p.lfo.beats ? `synced, ${rateName(p.lfo.beats)}` : `free, ${p.lfo.rate} Hz`
    const depth = p.lfo.target === "cutoff" ? `±${f(p.lfo.depth)}` : p.lfo.target === "pitch" ? `±${Math.round(p.lfo.depth)} cents` : `${Math.round(p.lfo.depth * 100)}%`
    const shape = p.lfo.shape === "square" ? "square" : p.lfo.shape === "sawtooth" ? "saw up" : "sine"
    rows.push(["LFO", `${s === "massive" ? "LFO 5" : "LFO 1"} (${shape}, ${rate}) → ${where}, depth ${depth}`])
  }
  if (mono || p.glide) rows.push(["Voicing", `${mono ? "Mono" : "Poly"}${p.glide ? `, glide ${t(p.glide)}${s === "massive" ? " (Voicing tab: Glide, Monophon)" : ""}` : ""}`])
  if (p.drive) rows.push(["Drive", s === "massive" ? `Insert 1: Parabolic Shaper, Dry/Wet ${Math.round(p.drive * 100)}%` : s === "spire" ? `Shaper section or FX Distortion, amount ${Math.round(p.drive * 100)}%` : s === "drift" ? `Drive in the filter section, then Saturator after Drift at about ${Math.round(p.drive * 18)} dB` : `Filter Drive up, then Roar or Saturator after at about ${Math.round(p.drive * 18)} dB`])
  return rows
}

export function fxSettings(fx: FxSettings): string[] {
  const out: string[] = []
  if (fx.duck) out.push(`Sidechain compression to the kick, ducking about ${Math.round(fx.duck * 100)}%`)
  if (fx.delay) out.push(`Delay at ${fx.delay.beats === 0.75 ? "dotted 1/8" : fx.delay.beats === 1.5 ? "dotted 1/4" : rateName(fx.delay.beats)}, feedback ${Math.round(fx.delay.fb * 100)}%, wet ${Math.round(fx.delay.wet * 100)}%`)
  if (fx.reverb) out.push(`Reverb, ${fx.reverb > 0.5 ? "large and long" : fx.reverb > 0.25 ? "medium hall" : "short room"}, wet about ${Math.round(fx.reverb * 60)}%`)
  return out
}
