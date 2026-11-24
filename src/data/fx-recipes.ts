import { drum } from "@/audio/engine"
import { chain, crackle, degree, delay, filter, gain, noise, panner, ramp, reverb, saws, shaper, sing, type Vowel } from "@/audio/fx-render"
import type { Family } from "./patterns"

export type FxKind = "Atmosphere" | "Transition" | "Vocal"
export interface FxParam { id: string; label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string }
export interface FxRender {
  c: BaseAudioContext
  out: AudioNode
  /** Drums for this cycle play into this node, which goes to `out` until a recipe reroutes it. */
  drumIn: AudioNode
  t: number
  tempo: number
  root: number
  iv: number[]
  p: Record<string, number>
}
export interface FxRecipe {
  id: string
  kind: FxKind
  name: string
  families: Family[]
  what: string
  listen: string
  use: string[]
  alt?: string[]
  steps: string[]
  chain: string[]
  tempo: number
  drums: string
  /** Length of one loop cycle in bars. */
  bars: number | ((p: Record<string, number>) => number)
  /** Whether drums play on a 16th step of the cycle. Defaults to always. */
  drumsOn?: (step: number, p: Record<string, number>) => boolean
  params: FxParam[]
  render: (r: FxRender) => void
}

const pct = (v: number) => Math.round(v * 100) + "%"
const hz = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : Math.round(v) + " Hz")
const sec = (v: number) => v.toFixed(1) + " s"
const semis = (v: number) => (v > 0 ? "+" : "") + Math.round(v) + " st"
const P = (id: string, label: string, min: number, max: number, step: number, value: number, fmt: (v: number) => string): FxParam => ({ id, label, min, max, step, value, fmt })
const space = (v: number) => P("space", "Reverb", 0, 1, 0.01, v, pct)
const BAR = (tempo: number) => 240 / tempo

/** A source that lasts one cycle, with short fades so cycles join without clicks. */
function segment(c: BaseAudioContext, out: AudioNode, t: number, dur: number, level: number) {
  const g = gain(c, 0)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + 0.04)
  g.gain.setValueAtTime(level, t + dur)
  g.gain.linearRampToValueAtTime(0, t + dur + 0.04)
  g.connect(out)
  return g
}
/** A short low boom with a noise crack: the hit that marks a drop. */
function impact(c: BaseAudioContext, out: AudioNode, t: number, size = 0.6, level = 0.5) {
  const o = c.createOscillator(), g = gain(c, 0)
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(38, t + 0.5)
  ramp(g.gain, t, [[0, 0.0001], [0.005, level], [0.4 + size * 2, 0.0001]], "exp")
  const sat = shaper(c, 0.3)
  chain(o, sat, g, out)
  o.start(t); o.stop(t + 3)
  const n = noise(c, t, t + 3, "white"), ng = gain(c, 0), lp = filter(c, "lowpass", 3000)
  ramp(ng.gain, t, [[0, 0.0001], [0.003, level * 0.5], [0.25 + size, 0.0001]], "exp")
  lp.frequency.setValueAtTime(5000, t)
  lp.frequency.exponentialRampToValueAtTime(300, t + 1)
  chain(n, lp, ng, out)
  const rv = reverb(c, out, 0.35 + size * 0.4, 3.5, 0.5)
  g.connect(rv); ng.connect(rv)
}
/** A chord as a short stab, used under several transitions. */
function stab(c: BaseAudioContext, out: AudioNode, t: number, len: number, root: number, iv: number[], deg = 0, oct = 3, level = 0.12) {
  for (const d of [deg, deg + 2, deg + 4]) saws(c, out, t, len, degree(root, iv, d, oct), { voices: 3, detune: 14, cutoff: [2200, 900], level })
}

export const FX_RECIPES: FxRecipe[] = [
  /* ================= Atmospheres ================= */
  {
    id: "vinyl-crackle", kind: "Atmosphere", name: "Vinyl crackle and hiss", families: ["futuregarage", "lofi", "boombap", "phonk", "wave", "deephouse", "dubtechno", "house", "discohouse", "breakbeat", "jungle", "ukg"],
    what: "Random pops and clicks over a bed of soft hiss. The dusty floor under future garage, lo-fi and Memphis phonk, so the track sounds like it was sampled from a record.",
    listen: "Keep it just audible in the breakdown, then pull it back when the drums arrive. Pops should be uneven, never on the grid.",
    use: ["simpler"], alt: ["drift"],
    steps: [
      "On an empty audio or MIDI track, add Vinyl Distortion. Turn Tracing Model off and raise Crackle Volume and Density in the Crackle section.",
      "Or drag a vinyl noise loop into Simpler (Splice and Live’s packs have plenty) and loop it under the whole song.",
      "EQ Eight: cut below about 300 Hz so the pops don’t thump, and roll off above 8 kHz for an older record.",
      "Utility on the track: keep it quiet, usually 20 to 30 dB under the drums, and narrow the width a little.",
    ],
    chain: ["Vinyl Distortion", "EQ Eight", "Utility"],
    tempo: 130, drums: "fg-shuffle", bars: 2,
    params: [P("density", "Pops", 4, 60, 1, 18, (v) => Math.round(v) + " / s"), P("hiss", "Hiss", 0, 0.06, 0.001, 0.02, (v) => pct(v / 0.06)), P("tone", "Tone", 1500, 12000, 10, 5000, hz)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 2, end = t + dur + 0.1, bus = segment(c, out, t, dur, 1)
      chain(crackle(c, t, end, p.density, 0.3), filter(c, "highpass", 300), filter(c, "lowpass", p.tone), gain(c, 1.6), bus)
      chain(noise(c, t, end, "pink"), filter(c, "bandpass", 3500, 0.4), filter(c, "lowpass", p.tone), gain(c, p.hiss * 6), bus)
    },
  },
  {
    id: "rain", kind: "Atmosphere", name: "Rain on a window", families: ["futuregarage", "lofi", "ambient", "wave", "dnb", "dubstep"],
    what: "Thousands of tiny soft drops over a low wash, with a gutter drip now and then. The classic Burial-style weather layer that makes a track feel nocturnal and lonely.",
    listen: "Rain works best low-passed and sitting behind everything. Bring it up in the intro and the last breakdown.",
    use: ["simpler"], alt: ["drift"],
    steps: [
      "Easiest: a field recording of rain in Simpler, set to loop. Record your own on a phone; it doesn’t need to be clean.",
      "To make it: Drift with the noise oscillator only, a band-pass around 2.5 kHz, and Vinyl Distortion’s crackle at high density for the drops.",
      "Auto Filter low-pass around 2 to 4 kHz puts the rain outside the window.",
      "Hybrid Reverb on a short room so it sits in a space with the rest of the track.",
    ],
    chain: ["Vinyl Distortion", "Auto Filter", "Hybrid Reverb"],
    tempo: 130, drums: "fg-halftime", bars: 2,
    params: [P("rain", "Intensity", 150, 1500, 10, 600, (v) => (v < 400 ? "Drizzle" : v < 900 ? "Steady" : "Downpour")), P("dist", "Distance", 800, 8000, 10, 3000, hz), P("wash", "Wash", 0, 0.4, 0.01, 0.15, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 2, end = t + dur + 0.1, bus = segment(c, out, t, dur, 1), lp = filter(c, "lowpass", p.dist)
      lp.connect(bus)
      chain(crackle(c, t, end, p.rain, 0.9), filter(c, "bandpass", 2600, 0.5), gain(c, 0.7), lp)
      chain(noise(c, t, end, "pink"), filter(c, "lowpass", 1400), gain(c, p.wash), lp)
      for (let k = 0; k < 3; k++) {
        const at = t + Math.random() * dur, o = c.createOscillator(), g = gain(c, 0)
        o.frequency.setValueAtTime(900 + Math.random() * 700, at)
        o.frequency.exponentialRampToValueAtTime(2200, at + 0.03)
        ramp(g.gain, at, [[0, 0.0001], [0.004, 0.05], [0.09, 0.0001]], "exp")
        chain(o, g, lp)
        o.start(at); o.stop(at + 0.12)
      }
    },
  },
  {
    id: "tape-wow", kind: "Atmosphere", name: "Worn tape: hiss and wow", families: ["lofi", "synthwave", "futuregarage", "phonk", "dubtechno", "ambient", "boombap", "discohouse"],
    what: "Chords that drift slightly out of tune like a stretched cassette, with tape hiss and the highs rolled off. Wow is the slow pitch wander; flutter is the fast one.",
    listen: "A little wow makes chords feel nostalgic; a lot makes them seasick. Hear the pitch lean on the long notes.",
    use: ["simpler"], alt: ["electric"],
    steps: [
      "Put Chorus-Ensemble in Vibrato mode on your chords. Rate around 0.5 to 1 Hz for wow, Amount low.",
      "Add a second, faster vibrato (5 to 8 Hz, tiny amount) for flutter.",
      "Roar or Saturator with a soft curve for tape warmth, then EQ Eight to roll off above 6 to 8 kHz.",
      "Hiss: Vinyl Distortion with Crackle Volume at 0 adds none, so use a hiss loop in Simpler, or Drift’s noise oscillator low and filtered.",
    ],
    chain: ["Chorus-Ensemble", "Saturator", "EQ Eight"],
    tempo: 80, drums: "lofi", bars: 2,
    params: [P("wow", "Wow", 0, 60, 1, 22, (v) => Math.round(v) + " cents"), P("hiss", "Hiss", 0, 0.06, 0.001, 0.02, (v) => pct(v / 0.06)), P("age", "Age", 1200, 9000, 10, 3500, (v) => (v < 2500 ? "Worn out" : v < 5000 ? "Old" : "Fresh"))],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), dur = B * 2, end = t + dur + 0.1, bus = segment(c, out, t, dur, 1), lp = filter(c, "lowpass", p.age)
      chain(lp, shaper(c, 0.15), gain(c, 0.45), bus)
      const wow = c.createOscillator(), wg = gain(c, p.wow)
      wow.frequency.value = 0.6
      wow.connect(wg)
      wow.start(t); wow.stop(end)
      ;[[0, 0], [B, 5]].forEach(([at, d]) => {
        for (const x of [d, d + 2, d + 4, d + 6]) {
          const o = c.createOscillator(), g = gain(c, 0)
          o.type = "triangle"
          o.frequency.value = 440 * Math.pow(2, (degree(root, iv, x, 3) - 69) / 12)
          wg.connect(o.detune)
          ramp(g.gain, t + at, [[0, 0], [0.02, 0.05], [B - 0.05, 0.03], [B, 0]])
          chain(o, g, lp)
          o.start(t + at); o.stop(t + at + B + 0.02)
        }
      })
      chain(noise(c, t, end, "pink"), filter(c, "highpass", 2000), gain(c, p.hiss * 5), bus)
    },
  },
  {
    id: "radio", kind: "Atmosphere", name: "Radio static and tuning", families: ["futuregarage", "wave", "phonk", "hardwave", "dnb", "dubtechno", "electro", "jungle", "breakbeat", "ukg"],
    what: "A shortwave radio being tuned: hiss that jumps between stations, a whistle sweeping past and the odd crackle. Good under intros and between sections.",
    listen: "Hear the band-pass jump to a new frequency every few beats. Fade it in before the first chord and cut it on the downbeat.",
    use: ["drift"], alt: ["operator"],
    steps: [
      "Drift: noise oscillator only, filter set to band-pass with high resonance.",
      "Map an LFO in Sample and Hold (random) mode to the cutoff, at a slow rate, so the band jumps around like a tuning dial.",
      "A second oscillator, a sine with a slow pitch LFO, makes the whistle between stations.",
      "Redux to drop the bit depth and sample rate, then Vinyl Distortion for crackle.",
    ],
    chain: ["Auto Filter", "Redux", "Vinyl Distortion"],
    tempo: 145, drums: "wave", bars: 2,
    params: [P("tune", "Tuning speed", 1, 8, 1, 3, (v) => v + " jumps / bar"), P("whistle", "Whistle", 0, 0.12, 0.002, 0.05, (v) => pct(v / 0.12)), P("level", "Level", 0, 1, 0.01, 0.55, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), dur = B * 2, end = t + dur + 0.1, bus = segment(c, out, t, dur, p.level)
      const bp = filter(c, "bandpass", 1500, 6)
      const n = Math.round(p.tune * 2)
      for (let k = 0; k < n; k++) bp.frequency.setTargetAtTime(400 + Math.random() * 3500, t + (k * dur) / n, 0.04)
      chain(noise(c, t, end, "white"), bp, gain(c, 0.9), shaper(c, 0.2), bus)
      chain(crackle(c, t, end, 8, 0.2), filter(c, "highpass", 800), gain(c, 0.4), bus)
      const o = c.createOscillator(), g = gain(c, p.whistle)
      o.frequency.setValueAtTime(600, t)
      o.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.6)
      o.frequency.exponentialRampToValueAtTime(900, t + dur)
      chain(o, g, bus)
      o.start(t); o.stop(end)
    },
  },
  {
    id: "room-hum", kind: "Atmosphere", name: "Room tone and mains hum", families: ["dubtechno", "minimal", "techno", "ambient", "hardtechno"],
    what: "The low hum of electrical equipment plus the air of an empty room. Dub and minimal techno producers leave this kind of noise floor in on purpose; it glues sparse tracks together.",
    listen: "You should feel the room more than hear it. Mute it and the track suddenly sounds digital and empty.",
    use: ["operator"], alt: ["drift"],
    steps: [
      "Operator: a sine at 50 or 60 Hz (the mains frequency) with two quiet partials at 2× and 3×.",
      "A second track with pink noise (Drift’s noise oscillator) low-passed around 400 Hz for room air.",
      "Or record ten seconds of your room with a mic and loop it in Simpler. That’s literally room tone.",
      "Utility: keep both very quiet and mono.",
    ],
    chain: ["EQ Eight", "Utility"],
    tempo: 122, drums: "dub-techno", bars: 2,
    params: [P("hum", "Hum", 0, 0.12, 0.002, 0.05, (v) => pct(v / 0.12)), P("mains", "Mains", 50, 60, 10, 50, (v) => v + " Hz"), P("air", "Air", 0, 0.5, 0.01, 0.25, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 2, end = t + dur + 0.1, bus = segment(c, out, t, dur, 1)
      ;[[1, 1], [2, 0.5], [3, 0.35], [5, 0.12]].forEach(([m, g]) => {
        const o = c.createOscillator()
        o.frequency.value = p.mains * m
        chain(o, gain(c, p.hum * g), bus)
        o.start(t); o.stop(end)
      })
      chain(noise(c, t, end, "brown"), filter(c, "lowpass", 500), gain(c, p.air), bus)
    },
  },
  {
    id: "thunder", kind: "Atmosphere", name: "Distant thunder", families: ["wave", "futuregarage", "ambient", "dubstep", "phonk", "trap"],
    what: "A crack, then a long rumble that rolls and fades. Wave and phonk intros use storms for drama; future garage uses them for mood.",
    listen: "Put thunder right before a big chord or the first kick so the rumble hands over to the low end.",
    use: ["simpler"], alt: ["drift"],
    steps: [
      "A thunder sample in Simpler, One-Shot mode, triggered once at the start of a section.",
      "To make it: Drift with brown or pink noise, a slow attack of 0.3 s and a 4 to 6 s release, low-pass below 400 Hz.",
      "Add a short white-noise burst on top for the crack.",
      "Hybrid Reverb with a long, dark hall makes it sound far away.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb", "Utility"],
    tempo: 145, drums: "wave", bars: 4,
    params: [P("dist", "Distance", 120, 900, 5, 350, (v) => (v < 300 ? "Far" : v < 600 ? "Near" : "Overhead")), P("length", "Length", 2, 8, 0.1, 5, sec), space(0.45)],
    render: ({ c, out, t, p }) => {
      const at = t + 0.2, len = p.length, lp = filter(c, "lowpass", p.dist), g = gain(c, 0)
      const rv = reverb(c, out, p.space, 4, 0.8)
      chain(noise(c, at, at + len + 0.5, "brown"), lp, g, out)
      g.connect(rv)
      const pts: [number, number][] = [[0, 0.0001], [0.25, 0.9]]
      for (let k = 1; k < 6; k++) pts.push([0.25 + (k * len) / 6, 0.9 * (1 - k / 6) * (0.6 + Math.random() * 0.6) + 0.001])
      pts.push([len, 0.0001])
      ramp(g.gain, at, pts, "exp")
      const cr = gain(c, 0)
      ramp(cr.gain, at, [[0, 0.0001], [0.01, 0.25 * (p.dist / 900)], [0.4, 0.0001]], "exp")
      chain(noise(c, at, at + 0.6, "white"), filter(c, "lowpass", 2500), cr, out)
      cr.connect(rv)
    },
  },
  {
    id: "ocean", kind: "Atmosphere", name: "Ocean waves", families: ["ambient", "odesza", "prog", "deephouse", "synthwave", "trance", "reggaeton", "afrohouse"],
    what: "Pink noise that swells and recedes like waves on a beach, moving across the stereo field. A soft, wide bed for chilled intros and breakdowns.",
    listen: "Match the wave length to the phrase: one wave per two or four bars feels musical.",
    use: ["drift"], alt: ["simpler"],
    steps: [
      "Drift: noise only, low-pass around 1 kHz.",
      "Map a very slow LFO (or a long attack and release with a held note) to volume so each wave rises and falls.",
      "Auto Pan-Tremolo at a slow rate moves the waves left and right.",
      "A real recording in Simpler sounds better still; filter it the same way.",
    ],
    chain: ["Auto Filter", "Auto Pan-Tremolo", "Hybrid Reverb"],
    tempo: 120, drums: "ambient-pulse", bars: 4,
    params: [P("waves", "Waves per cycle", 1, 4, 1, 2, (v) => String(v)), P("tone", "Tone", 400, 4000, 10, 1100, hz), P("level", "Level", 0, 1, 0.01, 0.6, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 4
      for (let k = 0; k < p.waves; k++) {
        const at = t + (k * dur) / p.waves, len = dur / p.waves, g = gain(c, 0), lp = filter(c, "lowpass", p.tone * 0.5), pan = panner(c, -0.6)
        ramp(g.gain, at, [[0, 0], [len * 0.45, 0.5 * p.level], [len, 0]])
        lp.frequency.linearRampToValueAtTime(p.tone, at + len * 0.45)
        lp.frequency.linearRampToValueAtTime(p.tone * 0.4, at + len)
        pan.pan.linearRampToValueAtTime(0.6, at + len)
        chain(noise(c, at, at + len + 0.1, "pink"), lp, g, pan, out)
      }
    },
  },
  {
    id: "crickets", kind: "Atmosphere", name: "Night insects", families: ["ambient", "afrohouse", "deephouse", "minimal", "lofi", "reggaeton"],
    what: "High chirps in little bursts from a few insects spread across the stereo field. Afro house and deep house intros use them to set an outdoor, late-night scene.",
    listen: "They’re very high, so they never clash with the music. Pan them wide and keep them quiet.",
    use: ["operator"], alt: ["simpler"],
    steps: [
      "Operator: one sine oscillator around 4 to 5 kHz, very short attack and decay.",
      "Use Note Repeat or a fast 1/32 MIDI pattern in short groups of three or four hits for each chirp.",
      "Duplicate the track two or three times at slightly different pitches and pan them apart.",
      "Or use a field recording in Simpler, high-passed above 2 kHz.",
    ],
    chain: ["Auto Pan-Tremolo", "Hybrid Reverb"],
    tempo: 122, drums: "afro", bars: 2,
    params: [P("count", "Insects", 1, 5, 1, 3, String), P("pitch", "Pitch", 3000, 6500, 10, 4500, hz), P("level", "Level", 0, 1, 0.01, 0.5, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 2, rv = reverb(c, out, 0.3, 2, 0.3)
      for (let k = 0; k < p.count; k++) {
        const pan = panner(c, -0.8 + (1.6 * k) / Math.max(1, p.count - 1)), f = p.pitch * (0.9 + Math.random() * 0.2)
        pan.connect(out); pan.connect(rv)
        for (let at = Math.random() * 0.4; at < dur - 0.2; at += 0.35 + Math.random() * 0.5) {
          for (let j = 0; j < 3; j++) {
            const s = t + at + j * 0.032, o = c.createOscillator(), g = gain(c, 0)
            o.frequency.value = f
            ramp(g.gain, s, [[0, 0], [0.004, 0.14 * p.level], [0.018, 0]])
            chain(o, g, pan)
            o.start(s); o.stop(s + 0.03)
          }
        }
      }
    },
  },
  {
    id: "drops", kind: "Atmosphere", name: "Water drops", families: ["deephouse", "minimal", "ambient", "techhouse", "lofi", "odesza"],
    what: "Bloopy drips made from a sine whose pitch flicks up as it fades. Minimal and deep house use them as playful percussion and ear candy.",
    listen: "Each drop is a tiny upward pitch flick. Put them in a reverb and let them answer the hats.",
    use: ["operator"], alt: ["drift"],
    steps: [
      "Operator: one sine, amp decay around 80 ms, no sustain.",
      "Pitch envelope: start a little low and rise about an octave in 30 to 50 ms.",
      "Play random high notes in a sparse pattern, or use Live’s Random MIDI effect for pitch.",
      "Hybrid Reverb on a small, bright room and a little Delay.",
    ],
    chain: ["Hybrid Reverb", "Delay"],
    tempo: 124, drums: "minimal", bars: 2,
    params: [P("rate", "Drops", 2, 16, 1, 6, (v) => v + " per bar"), P("pitch", "Pitch", 500, 2500, 10, 1100, hz), space(0.4)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), rv = reverb(c, out, p.space, 2.2, 0.2)
      for (let b = 0; b < 2; b++) for (let k = 0; k < p.rate; k++) {
        const at = t + b * B + Math.floor(Math.random() * 16) * (B / 16), f = p.pitch * (0.7 + Math.random() * 0.8)
        const o = c.createOscillator(), g = gain(c, 0), pan = panner(c, Math.random() * 1.4 - 0.7)
        o.frequency.setValueAtTime(f * 0.7, at)
        o.frequency.exponentialRampToValueAtTime(f * 1.8, at + 0.04)
        ramp(g.gain, at, [[0, 0.0001], [0.003, 0.22], [0.1, 0.0001]], "exp")
        chain(o, g, pan, out)
        pan.connect(rv)
        o.start(at); o.stop(at + 0.12)
      }
    },
  },
  {
    id: "metal-space", kind: "Atmosphere", name: "Industrial metal ambience", families: ["hardtechno", "techno", "dnb", "dubstep", "hardwave", "electro", "hardstyle"],
    what: "Metal resonating in a big concrete room: noise hits through tuned resonances with a long tail. Warehouse techno and neuro drum and bass use these to fill space.",
    listen: "The pitches are inharmonic on purpose, like struck pipes. Keep the hits sparse so each tail has room.",
    use: ["collision"], alt: ["operator"],
    steps: [
      "Collision with the Noise exciter and the Pipe or Plate resonator, high Decay.",
      "Or Resonators after a noise burst, with the five resonators tuned to unrelated pitches.",
      "Trigger one hit every bar or two, off the beat.",
      "Hybrid Reverb with a big, dark space, and a high-pass so the low end stays clean.",
    ],
    chain: ["Resonators", "Hybrid Reverb", "EQ Eight"],
    tempo: 140, drums: "hard-techno", bars: 2,
    params: [P("hits", "Hits", 1, 6, 1, 2, (v) => v + " per cycle"), P("ring", "Ring", 0.5, 4, 0.1, 1.8, sec), space(0.55)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 2, rv = reverb(c, out, p.space, 4, 0.5), sixteenth = dur / 32
      for (let k = 0; k < p.hits; k++) {
        const at = t + (Math.floor(Math.random() * 30) + 1) * sixteenth, burst = gain(c, 0)
        ramp(burst.gain, at, [[0, 0], [0.002, 0.6], [0.03, 0]])
        const src = noise(c, at, at + p.ring + 0.2, "white")
        src.connect(burst)
        const pan = panner(c, Math.random() * 1.2 - 0.6), mix = gain(c, 0.5)
        chain(mix, filter(c, "highpass", 200), pan, out)
        pan.connect(rv)
        const base = 180 + Math.random() * 200
        for (const m of [1, 2.76, 5.4, 8.93]) {
          const bp = filter(c, "bandpass", base * m, 60), g = gain(c, 0)
          ramp(g.gain, at, [[0, 0.0001], [0.005, 14], [p.ring, 0.0001]], "exp")
          chain(burst, bp, g, mix)
        }
      }
    },
  },
  {
    id: "haze", kind: "Atmosphere", name: "Granular shimmer haze", families: ["ambient", "odesza", "trance", "prog", "futuregarage", "wave", "futurebass"],
    what: "Tiny grains of your chord scattered across octaves and the stereo field, like light on water. Built in Granulator, it turns any pad into a glittering cloud.",
    listen: "No single note stands out; the chord is there, but smeared. More density sounds smoother, less sounds like sparkles.",
    use: ["granulator"], alt: ["wavetable"],
    steps: [
      "Granulator III in Cloud mode. Drop in a pad or a sustained chord you’ve resampled.",
      "Raise Grain Density, add a little Spray (random position) and Pitch Spray of +12 for the shimmer.",
      "Hybrid Reverb with the Shimmer algorithm, or a long hall, mostly wet.",
      "Automate Density up into a drop and down in the breakdown.",
    ],
    chain: ["Hybrid Reverb", "EQ Eight"],
    tempo: 122, drums: "ambient-pulse", bars: 2,
    params: [P("density", "Density", 6, 60, 1, 24, (v) => v + " grains / bar"), P("shimmer", "Shimmer", 0, 1, 0.01, 0.4, pct), space(0.7)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), rv = reverb(c, out, p.space, 4.5, 0.3), dry = gain(c, 0.5)
      dry.connect(out); dry.connect(rv)
      for (let k = 0; k < p.density * 2; k++) {
        const at = t + Math.random() * B * 2, d = [0, 2, 4, 6][Math.floor(Math.random() * 4)] + (Math.random() < p.shimmer ? 7 : 0)
        const o = c.createOscillator(), g = gain(c, 0), len = 0.06 + Math.random() * 0.14, pan = panner(c, Math.random() * 2 - 1)
        o.type = Math.random() < 0.5 ? "sine" : "triangle"
        o.frequency.value = 440 * Math.pow(2, (degree(root, iv, d, 4) - 69) / 12)
        ramp(g.gain, at, [[0, 0], [len / 2, 0.12], [len, 0]])
        chain(o, g, pan, dry)
        o.start(at); o.stop(at + len + 0.01)
      }
    },
  },
  {
    id: "zaps", kind: "Atmosphere", name: "Laser zaps and sci-fi blips", families: ["electro", "synthwave", "dnb", "dubstep", "trap", "hardwave", "hardstyle", "breakbeat", "jungle", "basshouse"],
    what: "Fast downward pitch sweeps, the laser sound from 80s electro and sci-fi. Neuro drum and bass and dubstep use them as fills and call-and-response with the bass.",
    listen: "The whole sound is the pitch envelope: very high to low in a fraction of a second. A delay turns one zap into a volley.",
    use: ["operator"], alt: ["drift"],
    steps: [
      "Operator: a square or saw oscillator, amp decay around 150 ms.",
      "Pitch envelope: start up to 48 semitones high and fall in 100 to 200 ms.",
      "For FM grit, route a second oscillator into the first with a short envelope.",
      "Ping-pong Delay at 1/16 and a little Hybrid Reverb.",
    ],
    chain: ["Delay", "Hybrid Reverb"],
    tempo: 128, drums: "electro", bars: 2,
    params: [P("count", "Zaps", 1, 8, 1, 3, (v) => v + " per cycle"), P("top", "Start pitch", 1000, 8000, 10, 4000, hz), P("echo", "Echo", 0, 0.7, 0.01, 0.35, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), dl = delay(c, out, 60 / tempo / 4 * 3, 0.45, p.echo, 3000)
      for (let k = 0; k < p.count; k++) {
        const at = t + (Math.floor(Math.random() * 28) + 2) * (B / 16), o = c.createOscillator(), g = gain(c, 0)
        o.type = "square"
        o.frequency.setValueAtTime(p.top, at)
        o.frequency.exponentialRampToValueAtTime(120, at + 0.16)
        ramp(g.gain, at, [[0, 0.0001], [0.003, 0.2], [0.18, 0.0001]], "exp")
        const pan = panner(c, Math.random() * 1.4 - 0.7)
        chain(o, filter(c, "lowpass", 6000), g, pan, out)
        pan.connect(dl)
        o.start(at); o.stop(at + 0.2)
      }
    },
  },
  {
    id: "whisper", kind: "Atmosphere", name: "Whispers and breaths", families: ["futuregarage", "wave", "phonk", "ambient", "ukg", "trap", "futurebass"],
    what: "Breathy, unvoiced vowels drifting in and out with heavy reverb: no words, just the shape of a voice. Future garage and wave use them to haunt the background.",
    listen: "It’s filtered noise shaped by mouth formants. Pan them around and push them deep in the reverb.",
    use: ["simpler"], alt: ["drift"],
    steps: [
      "Record yourself whispering or breathing, or grab a breath sample, into Simpler.",
      "Reverse a few, pitch some down 5 to 12 semitones, and chop out the most interesting bits.",
      "Auto Filter band-pass to keep only the airy mids; Hybrid Reverb very wet.",
      "Sprinkle them off the grid at low volume, panned around.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb", "Auto Pan-Tremolo"],
    tempo: 130, drums: "fg-broken", bars: 2,
    params: [P("amount", "Whispers", 1, 6, 1, 3, (v) => v + " per cycle"), P("formant", "Size", 0.6, 1.5, 0.01, 1, (v) => (v < 0.85 ? "Big, dark" : v > 1.15 ? "Small, airy" : "Natural")), space(0.65)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), rv = reverb(c, out, p.space, 4, 0.5)
      const vowels: [number, number][] = [[600, 1800], [400, 2300], [700, 1100], [350, 900]]
      for (let k = 0; k < p.amount; k++) {
        const at = t + Math.random() * B * 1.6, len = 0.4 + Math.random() * 0.6, [f1, f2] = vowels[Math.floor(Math.random() * 4)]
        const src = noise(c, at, at + len + 0.1, "white"), g = gain(c, 0), pan = panner(c, Math.random() * 1.6 - 0.8), mix = gain(c, 1)
        ramp(g.gain, at, [[0, 0], [len * 0.3, 1.4], [len, 0]])
        for (const [f, q] of [[f1, 5], [f2, 7], [3000, 3]] as const) chain(src, filter(c, "bandpass", f * p.formant, q), mix)
        chain(mix, g, pan, out)
        pan.connect(rv)
      }
    },
  },

  {
    id: "crowd", kind: "Atmosphere", name: "Club crowd and room", families: ["house", "techhouse", "discohouse", "basshouse", "afrohouse", "hardstyle", "jungle", "reggaeton", "ukg", "breakbeat"],
    what: "The murmur of a crowd in a room, with an optional cheer swelling up. Producers drop it into intros and breakdowns to make a track feel like it’s playing live in a club.",
    listen: "It’s mostly band-limited noise with dozens of quiet voices underneath. The cheer works best rising into a drop.",
    use: ["simpler"], alt: ["drift"],
    steps: [
      "Record a crowd at a gig on your phone, or find a crowd loop in Live’s packs, and loop it in Simpler.",
      "EQ Eight: high-pass around 200 Hz and gently roll off above 6 kHz so it sits behind the music.",
      "Hybrid Reverb on a medium hall puts it in the same room as the drums.",
      "Automate it up in the breakdown and out when the kick returns.",
    ],
    chain: ["EQ Eight", "Hybrid Reverb", "Utility"],
    tempo: 124, drums: "house", bars: 4,
    params: [P("voices", "Crowd size", 4, 40, 1, 18, (v) => (v < 12 ? "Small room" : v < 28 ? "Club" : "Festival")), P("cheer", "Cheer", 0, 1, 0.01, 0.5, pct), P("dist", "Distance", 1500, 8000, 10, 3500, hz)],
    render: ({ c, out, t, tempo, p }) => {
      const dur = BAR(tempo) * 4, end = t + dur + 0.1, bus = segment(c, out, t, dur, 1), lp = filter(c, "lowpass", p.dist)
      const rv = reverb(c, lp, 0.25, 2.2, 0.4)
      chain(lp, bus)
      const bed = gain(c, 0.35)
      chain(noise(c, t, end, "pink"), filter(c, "bandpass", 700, 0.6), bed, lp)
      for (let k = 0; k < p.voices * 3; k++) {
        const at = t + Math.random() * dur, v = (["a", "e", "o", "i", "u"] as Vowel[])[Math.floor(Math.random() * 5)]
        const pan = panner(c, Math.random() * 1.8 - 0.9)
        pan.connect(lp); pan.connect(rv)
        sing(c, pan, at, 45 + Math.random() * 22, 0.1 + Math.random() * 0.25, v, { to: (["a", "e", "o"] as Vowel[])[k % 3], level: 0.05, attack: 0.02, release: 0.05, breath: 0.2, formant: 0.85 + Math.random() * 0.35 })
      }
      if (p.cheer > 0) {
        const g = gain(c, 0), at = t + dur * 0.5
        ramp(g.gain, at, [[0, 0], [dur * 0.4, 0.5 * p.cheer], [dur * 0.5, 0]])
        chain(noise(c, at, end, "white"), filter(c, "bandpass", 2200, 0.8), g, lp)
        g.connect(rv)
      }
    },
  },

  /* ================= Transitions ================= */
  {
    id: "air-horn", kind: "Transition", name: "Sound system air horn", families: ["jungle", "reggaeton", "dnb", "dubstep", "breakbeat", "hardstyle", "basshouse", "trap", "ukg"],
    what: "The brassy air horn blast from reggae sound systems, now a hype hit in jungle, dancehall, dubstep and festival bass music. Short bursts before or on the drop.",
    listen: "A few detuned brassy tones that dip in pitch at the start of each blast. The delay throw after the last blast is half the effect.",
    use: ["simpler"], alt: ["operator"],
    steps: [
      "The quick way: an air horn one-shot in Simpler. Every sample pack has one.",
      "To make it: Operator or Drift with three square or saw waves stacked a few semitones apart, plus a quick pitch dip at the start of each note.",
      "Saturator for edge, then Delay with high feedback on the last blast only.",
      "Play it in a rhythm: long, short short, long.",
    ],
    chain: ["Saturator", "Delay", "Hybrid Reverb"],
    tempo: 168, drums: "ragga-jungle", bars: 4, drumsOn: (s) => s >= 32,
    params: [P("blasts", "Blasts", 1, 4, 1, 4, String), P("echo", "Echo throw", 0, 0.8, 0.01, 0.5, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const beat = 60 / tempo, d = delay(c, out, beat * 0.75, 0.55, p.echo, 2500)
      const pattern: [number, number][] = [[0, 1.5], [2, 0.5], [2.75, 0.5], [3.5, 3]]
      pattern.slice(4 - p.blasts).forEach(([b, len], k, arr) => {
        const at = t + b * beat, g = gain(c, 0), sat = shaper(c, 0.5)
        ramp(g.gain, at, [[0, 0], [0.01, 0.18], [len * beat - 0.02, 0.15], [len * beat, 0]])
        chain(sat, filter(c, "lowpass", 4000), g, out)
        if (k === arr.length - 1) g.connect(d)
        for (const f of [740, 932, 1108]) {
          const o = c.createOscillator()
          o.type = "sawtooth"
          o.frequency.setValueAtTime(f * 0.85, at)
          o.frequency.exponentialRampToValueAtTime(f, at + 0.06)
          o.connect(sat)
          o.start(at); o.stop(at + len * beat + 0.02)
        }
      })
      impact(c, out, t + beat * 8, 0.5, 0.4)
    },
  },
  {
    id: "noise-riser", kind: "Transition", name: "White noise riser", families: ["prog", "trance", "techhouse", "basshouse", "futurebass", "house", "hardstyle", "odesza", "hardwave", "dubstep", "dnb", "techno", "electro"],
    what: "Noise that gets louder and brighter over several bars, then cuts right on the drop. The most common build-up sound in dance music.",
    listen: "The high-pass sweep does most of the work: the riser thins out as it rises, then the drop lands full-range.",
    use: ["drift"], alt: ["simpler", "operator"],
    steps: [
      "Drift with the noise oscillator only, held for the length of the build (4, 8 or 16 bars).",
      "Auto Filter set to high-pass: automate the cutoff from about 200 Hz up to 8 kHz over the build.",
      "Automate volume up too, with a curve that speeds up at the end (right-click a breakpoint to curve it).",
      "Hybrid Reverb and Delay for size, then cut everything dead on the downbeat of the drop.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb", "Utility"],
    tempo: 128, drums: "prog",
    bars: (p) => p.len + 2, drumsOn: (s, p) => s >= p.len * 16,
    params: [P("len", "Build length", 2, 8, 2, 4, (v) => v + " bars"), P("bright", "Top cutoff", 2000, 14000, 100, 9000, hz), space(0.3)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), len = B * p.len, g = gain(c, 0), hp = filter(c, "highpass", 150, 1.5), lp = filter(c, "lowpass", 1500)
      hp.frequency.setValueAtTime(150, t); hp.frequency.exponentialRampToValueAtTime(p.bright * 0.5, t + len)
      lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(p.bright, t + len)
      ramp(g.gain, t, [[0, 0.001], [len * 0.7, 0.07], [len - 0.005, 0.28], [len, 0.0001]], "exp")
      const rv = reverb(c, out, p.space, 2.5, 0.3)
      chain(noise(c, t, t + len, "white"), hp, lp, g, out)
      g.connect(rv)
      impact(c, out, t + len, 0.5, 0.45)
    },
  },
  {
    id: "pitch-riser", kind: "Transition", name: "Supersaw pitch riser", families: ["trance", "futurebass", "hardstyle", "prog", "wave", "hardwave", "basshouse", "dubstep", "synthwave"],
    what: "A detuned saw chord that bends up an octave while the filter opens. Layer it with a noise riser and the tension doubles.",
    listen: "Pitch rising is the strongest “something is coming” signal there is. The last beat is where it should feel unbearable.",
    use: ["wavetable"], alt: ["drift", "analog"],
    steps: [
      "Wavetable with a saw on both oscillators and Unison around 6 voices.",
      "Hold the root (or a chord) for the length of the build.",
      "Automate Transpose (or an envelope on pitch) from 0 up to +12 over the build, and open the filter at the same time.",
      "Delay and Hybrid Reverb, and stop dead on the drop.",
    ],
    chain: ["Auto Filter", "Delay", "Hybrid Reverb"],
    tempo: 138, drums: "trance",
    bars: (p) => p.len + 2, drumsOn: (s, p) => s >= p.len * 16,
    params: [P("len", "Build length", 2, 8, 2, 4, (v) => v + " bars"), P("bend", "Bend", 5, 24, 1, 12, semis), P("width", "Detune", 5, 50, 1, 25, (v) => v + " cents")],
    render: ({ c, out, t, tempo, root, p }) => {
      const len = BAR(tempo) * p.len, rv = reverb(c, out, 0.3, 2.5, 0.3)
      for (const n of [0, 7, 12]) {
        const g = saws(c, out, t, len, 48 + root + n, { voices: 6, detune: p.width, bend: p.bend, cutoff: [400, 9000], level: 0.08, attack: len * 0.3 })
        g.connect(rv)
      }
      impact(c, out, t + len, 0.6, 0.45)
    },
  },
  {
    id: "downlifter", kind: "Transition", name: "Downlifter", families: ["prog", "trance", "house", "techhouse", "futurebass", "odesza", "dubstep", "dnb", "wave", "basshouse"],
    what: "The opposite of a riser: noise that falls and darkens after a big moment, carrying the energy down into a breakdown.",
    listen: "Place it on the downbeat where the drums drop out, so it fills the hole they leave.",
    use: ["drift"], alt: ["simpler"],
    steps: [
      "Easiest: reverse a noise riser in an audio clip (Reverse in the Sample box).",
      "Or Drift noise with Auto Filter low-pass automated from about 10 kHz down to 200 Hz over 1 to 2 bars.",
      "Volume fades out with the filter.",
      "Lots of reverb so the tail hangs into the breakdown.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb"],
    tempo: 124, drums: "prog", bars: 4, drumsOn: (s) => s < 16,
    params: [P("len", "Fall time", 0.5, 2, 0.25, 1.5, (v) => v + " bars"), P("from", "Start cutoff", 3000, 14000, 100, 10000, hz), space(0.5)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), at = t + B, len = B * p.len, g = gain(c, 0), lp = filter(c, "lowpass", p.from)
      lp.frequency.setValueAtTime(p.from, at); lp.frequency.exponentialRampToValueAtTime(150, at + len)
      ramp(g.gain, at, [[0, 0.3], [len, 0.0001]], "exp")
      const rv = reverb(c, out, p.space, 3.5, 0.4)
      chain(noise(c, at, at + len + 0.1, "white"), lp, g, out)
      g.connect(rv)
      impact(c, out, t, 0.3, 0.35)
      stab(c, out, at, B * 2, root, iv, 0, 3, 0.06)
    },
  },
  {
    id: "impact", kind: "Transition", name: "Impact and boom", families: ["dubstep", "trap", "hardstyle", "wave", "phonk", "hardwave", "futurebass", "dnb", "basshouse", "odesza", "hardtechno"],
    what: "A short, huge hit on the first beat of a drop: a falling sub, a noise crack and a long tail. Tells the listener the drop has landed.",
    listen: "It should feel like weight in the chest, then vanish quickly so the drop’s groove takes over.",
    use: ["operator"], alt: ["simpler"],
    steps: [
      "Operator: a sine with a pitch envelope falling from around 150 Hz to 40 Hz in half a second, plus a 1 to 2 s decay.",
      "Layer a short noise burst with a falling low-pass for the crack.",
      "Saturator for punch, then Hybrid Reverb with a big hall on the noise layer.",
      "Sidechain the bass to it so they don’t fight on the first beat.",
    ],
    chain: ["Saturator", "Hybrid Reverb", "Compressor"],
    tempo: 140, drums: "dubstep", bars: 2,
    params: [P("size", "Size", 0, 1, 0.01, 0.6, pct), P("level", "Level", 0.1, 0.8, 0.01, 0.5, pct)],
    render: ({ c, out, t, p }) => impact(c, out, t, p.size, p.level),
  },
  {
    id: "reverse-cymbal", kind: "Transition", name: "Reverse cymbal", families: ["house", "deephouse", "techhouse", "discohouse", "ukg", "trance", "synthwave", "afrohouse", "breakbeat", "boombap", "reggaeton", "jungle", "futuregarage"],
    what: "A crash played backwards: it swells from nothing and cuts on the downbeat. The classic “suck-in” before a new section, used in every genre.",
    listen: "Line the very end up with the downbeat. A beat early or late and it sounds like a mistake.",
    use: ["simpler"], alt: ["drumsampler"],
    steps: [
      "Drop a crash cymbal into an audio clip and turn on Reverse in the clip’s Sample box.",
      "Move the clip so its loud end lands exactly on the downbeat of the next section.",
      "Trim the start to set the length: one or two beats is subtle, a whole bar is dramatic.",
      "High-pass with EQ Eight and add a little reverb.",
    ],
    chain: ["EQ Eight", "Hybrid Reverb"],
    tempo: 124, drums: "house", bars: 2, drumsOn: (s, p) => s < 32 - p.len * 4,
    params: [P("len", "Length", 1, 8, 1, 4, (v) => v + " beats"), P("tone", "Brightness", 3000, 12000, 100, 7000, hz)],
    render: ({ c, out, t, tempo, p }) => {
      const beat = 60 / tempo, end = t + beat * 8, at = end - beat * p.len, g = gain(c, 0), mix = gain(c, 1)
      ramp(g.gain, at, [[0, 0.0001], [end - at - 0.01, 0.35], [end - at, 0.0001]], "exp")
      const src = noise(c, at, end + 0.05, "white")
      chain(src, filter(c, "highpass", p.tone * 0.7), mix)
      for (const f of [3800, 5200, 7400, 9100]) chain(src, filter(c, "bandpass", f * (p.tone / 7000), 25), gain(c, 1.2), mix)
      chain(mix, g, out)
      drum(c, out, end, "ohat", 0.6)
    },
  },
  {
    id: "snare-build", kind: "Transition", name: "Snare roll build", families: ["trance", "futurebass", "dubstep", "hardstyle", "prog", "basshouse", "odesza", "hardwave", "trap", "electro", "breakbeat"],
    what: "A snare that speeds up from quarters to 8ths, 16ths and 32nds, getting louder and brighter. The engine of EDM and trance build-ups.",
    listen: "Each bar doubles the speed. The high-pass opening is what makes it feel like it’s lifting off.",
    use: ["drumrack"], alt: ["simpler"],
    steps: [
      "Program the snare yourself, or hold a snare pad on Push with Note Repeat and change the rate every bar: 1/4, 1/8, 1/16, 1/32.",
      "Draw velocity rising across the build.",
      "Auto Filter high-pass on the snare, automated from 100 Hz up to 1 to 2 kHz.",
      "Optional: automate the snare’s pitch up 12 semitones over the build.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb"],
    tempo: 128, drums: "trance-build", bars: 6, drumsOn: (s) => s >= 64,
    params: [P("open", "High-pass sweep", 100, 3000, 10, 1500, hz), P("vel", "Start level", 0.1, 0.8, 0.01, 0.3, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), hp = filter(c, "highpass", 80), rv = reverb(c, out, 0.25, 1.6, 0.3)
      hp.frequency.setValueAtTime(80, t); hp.frequency.exponentialRampToValueAtTime(p.open, t + B * 4)
      hp.connect(out); hp.connect(rv)
      ;[4, 8, 16, 32].forEach((n, b) => {
        for (let k = 0; k < n; k++) {
          const at = t + b * B + (k * B) / n, prog = (b * B + (k * B) / n) / (4 * B)
          drum(c, hp, at, "snare", (p.vel + (1 - p.vel) * prog) * 0.7)
        }
      })
      impact(c, out, t + B * 4, 0.5, 0.45)
    },
  },
  {
    id: "tape-stop", kind: "Transition", name: "Tape stop", families: ["dubstep", "trap", "phonk", "wave", "dnb", "futurebass", "basshouse", "hardwave", "lofi", "boombap"],
    what: "Everything slows to a halt like a turntable losing power, right before the drop or a switch-up. Pitch and speed fall together.",
    listen: "The pitch dive is what sells it. The quick version lasts about one beat; the dramatic one a whole bar.",
    use: ["simpler"],
    steps: [
      "Consolidate the section into one audio clip (select it and press Cmd/Ctrl+J).",
      "Set the clip’s Warp mode to Re-Pitch, so changing tempo or transposing changes speed and pitch together.",
      "Automate Transpose down to −48 over the last beat or bar, with a curve that drops faster at the end.",
      "Fade the volume out at the same time, then hit the drop.",
    ],
    chain: ["Utility"],
    tempo: 140, drums: "dubstep", bars: 2, drumsOn: (s, p) => s < 32 - p.len * 4,
    params: [P("len", "Stop length", 1, 4, 1, 2, (v) => v + (v === 1 ? " beat" : " beats"))],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const beat = 60 / tempo, stopAt = t + beat * (8 - p.len), stopLen = beat * p.len
      const notes = [0, 0, 3, 0, 4, 3, 0, 6]
      notes.forEach((d, k) => {
        const at = t + k * beat, o = c.createOscillator(), g = gain(c, 0)
        o.type = "sawtooth"
        const f = 440 * Math.pow(2, (degree(root, iv, d, 2) - 69) / 12)
        o.frequency.setValueAtTime(f, at)
        if (at >= stopAt - 0.001) o.frequency.exponentialRampToValueAtTime(f * 0.06, at + beat)
        else if (at + beat > stopAt) o.frequency.setValueAtTime(f, stopAt)
        const fall = Math.max(0, (at - stopAt) / stopLen)
        ramp(g.gain, at, [[0, 0], [0.01, 0.12 * (1 - fall * 0.6)], [beat * 0.9, 0.08 * (1 - fall)], [beat, 0]])
        chain(o, filter(c, "lowpass", 1400), g, out)
        o.start(at); o.stop(at + beat + 0.02)
      })
      impact(c, out, t, 0.3, 0.3)
    },
  },
  {
    id: "filter-build", kind: "Transition", name: "Filter sweep build", families: ["house", "discohouse", "deephouse", "techhouse", "prog", "techno", "afrohouse", "ukg", "minimal", "trance", "dubtechno"],
    what: "The whole groove plays through a low-pass that opens over several bars, from muffled to full. The DJ-friendly way to build in house and techno.",
    listen: "Hear the hats and claps appear as the cutoff rises. A little resonance makes the sweep sing.",
    use: ["drumrack"],
    steps: [
      "Group the tracks you want to sweep (Cmd/Ctrl+G), or use the master.",
      "Add Auto Filter in low-pass with resonance around 30%.",
      "Automate the cutoff from about 200 Hz up to fully open across 4 to 16 bars.",
      "Map the cutoff to a Push encoder to perform it live instead.",
    ],
    chain: ["Auto Filter"],
    tempo: 124, drums: "house", bars: 4,
    params: [P("from", "Start cutoff", 100, 1500, 10, 250, hz), P("res", "Resonance", 0.5, 12, 0.1, 4, (v) => v.toFixed(1))],
    render: ({ c, out, drumIn, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), lp = filter(c, "lowpass", p.from, p.res)
      lp.frequency.setValueAtTime(p.from, t); lp.frequency.exponentialRampToValueAtTime(16000, t + B * 4)
      lp.connect(out)
      drumIn.disconnect(); drumIn.connect(lp)
      for (let b = 0; b < 4; b++) for (const s of [2, 6, 10, 14]) stab(c, lp, t + b * B + s * (B / 16), B / 16 * 1.5, root, iv, b % 2 ? 5 : 0, 3, 0.1)
    },
  },
  {
    id: "sub-drop", kind: "Transition", name: "Sub drop", families: ["dubstep", "trap", "phonk", "wave", "hardwave", "dnb", "futurebass", "basshouse", "reggaeton"],
    what: "A sub bass note that falls in pitch on the first beat of the drop, rumbling underneath everything.",
    listen: "Felt more than heard. On small speakers you’ll mostly hear the distortion; on a system it shakes the room.",
    use: ["operator"], alt: ["simpler"],
    steps: [
      "Operator: a sine, long decay of 1.5 to 3 s.",
      "Pitch envelope falling about two octaves over the decay.",
      "Saturator to add harmonics so it’s audible on phones.",
      "Place it on beat one of the drop, and keep the bass out of its way for that beat.",
    ],
    chain: ["Saturator", "EQ Eight", "Utility"],
    tempo: 140, drums: "dubstep", bars: 4, drumsOn: (s) => s >= 32,
    params: [P("fall", "Fall", 6, 36, 1, 24, (v) => v + " semitones"), P("len", "Length", 0.5, 3, 0.1, 1.8, sec), P("drive", "Drive", 0, 1, 0.01, 0.35, pct)],
    render: ({ c, out, t, tempo, root, p }) => {
      const at = t + BAR(tempo) * 2, o = c.createOscillator(), g = gain(c, 0), f = 440 * Math.pow(2, (36 + root - 69) / 12) * Math.pow(2, p.fall / 24)
      o.frequency.setValueAtTime(f, at)
      o.frequency.exponentialRampToValueAtTime(f * Math.pow(2, -p.fall / 12), at + p.len)
      ramp(g.gain, at, [[0, 0.0001], [0.01, 0.5], [p.len, 0.0001]], "exp")
      chain(o, shaper(c, p.drive), filter(c, "lowpass", 900), g, out)
      o.start(at); o.stop(at + p.len + 0.05)
    },
  },
  {
    id: "siren", kind: "Transition", name: "Siren uplifter", families: ["hardstyle", "trance", "jungle", "dnb", "dubstep", "hardtechno", "reggaeton", "hardwave", "electro"],
    what: "A rave siren whose wobble speeds up and pitch climbs into the drop. Straight out of jungle and hardcore, still all over hardstyle and hard techno.",
    listen: "Two things accelerate at once: the wobble rate and the pitch. That double acceleration is pure urgency.",
    use: ["drift"], alt: ["operator", "analog"],
    steps: [
      "Drift: a square or saw oscillator.",
      "An LFO on pitch, fairly deep, at about 4 Hz.",
      "Automate the LFO rate up (to 12 Hz or more) and transpose up over the build.",
      "Delay and reverb, and cut it on the drop.",
    ],
    chain: ["Delay", "Hybrid Reverb"],
    tempo: 150, drums: "hardstyle", bars: 6, drumsOn: (s) => s >= 64,
    params: [P("depth", "Wobble depth", 100, 1200, 10, 500, (v) => Math.round(v) + " cents"), P("climb", "Climb", 0, 24, 1, 12, semis)],
    render: ({ c, out, t, tempo, root, p }) => {
      const len = BAR(tempo) * 4, o = c.createOscillator(), lfo = c.createOscillator(), lg = gain(c, p.depth), g = gain(c, 0)
      o.type = "square"
      const f = 440 * Math.pow(2, (72 + root - 69) / 12)
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * Math.pow(2, p.climb / 12), t + len)
      lfo.frequency.setValueAtTime(3, t); lfo.frequency.exponentialRampToValueAtTime(16, t + len)
      lfo.connect(lg); lg.connect(o.detune)
      ramp(g.gain, t, [[0, 0.01], [len - 0.01, 0.07], [len, 0]])
      const dl = delay(c, out, 60 / tempo * 0.75, 0.35, 0.25)
      chain(o, filter(c, "lowpass", 4000), g, out)
      g.connect(dl)
      o.start(t); lfo.start(t); o.stop(t + len); lfo.stop(t + len)
      impact(c, out, t + len, 0.6, 0.45)
    },
  },
  {
    id: "whoosh", kind: "Transition", name: "Whoosh", families: ["odesza", "futurebass", "prog", "synthwave", "trap", "ukg", "house", "afrohouse", "reggaeton", "lofi", "futuregarage", "ambient"],
    what: "Air sweeping past from one side to the other in about a beat. A quick way to glue two sections together, or to throw a vocal into the next bar.",
    listen: "The band-pass rising and falling sounds like movement; the pan makes it fly past you.",
    use: ["drift"], alt: ["simpler"],
    steps: [
      "Drift noise through a band-pass with medium resonance.",
      "Automate the cutoff up from 300 Hz to 6 kHz and back down over one or two beats.",
      "Auto Pan-Tremolo or pan automation from left to right across the same time.",
      "Reverb, and place it so the peak lands on the next downbeat.",
    ],
    chain: ["Auto Filter", "Auto Pan-Tremolo", "Hybrid Reverb"],
    tempo: 110, drums: "future-bass", bars: 2,
    params: [P("len", "Length", 1, 4, 1, 2, (v) => v + (v === 1 ? " beat" : " beats")), P("peak", "Peak", 2000, 10000, 100, 5500, hz)],
    render: ({ c, out, t, tempo, p }) => {
      const beat = 60 / tempo, end = t + beat * 8, len = beat * p.len, at = end - len * 0.6
      const bp = filter(c, "bandpass", 300, 3), g = gain(c, 0), pan = panner(c, -0.9)
      bp.frequency.setValueAtTime(300, at); bp.frequency.exponentialRampToValueAtTime(p.peak, at + len * 0.6); bp.frequency.exponentialRampToValueAtTime(400, at + len)
      ramp(g.gain, at, [[0, 0], [len * 0.6, 3], [len, 0]])
      pan.pan.linearRampToValueAtTime(0.9, at + len)
      const rv = reverb(c, out, 0.3, 2.2, 0.3)
      chain(noise(c, at, at + len + 0.05, "pink"), bp, g, pan, out)
      pan.connect(rv)
    },
  },
  {
    id: "reverse-swell", kind: "Transition", name: "Reverse reverb swell", families: ["wave", "futuregarage", "odesza", "ambient", "trance", "dubtechno", "prog", "synthwave", "phonk"],
    what: "The reverb tail of a chord, flipped so it swells up into the chord itself. A ghostly, sucking lead-in used in wave, future garage and ODESZA breakdowns.",
    listen: "It grows from nothing and cuts exactly where the dry chord starts. That snap is the effect.",
    use: ["simpler"],
    steps: [
      "Duplicate the chord or vocal clip and put a 100% wet Hybrid Reverb on the copy.",
      "Resample or Freeze and Flatten the copy, then turn on Reverse in its clip.",
      "Line the reversed tail up so it ends exactly where the dry sound begins.",
      "Trim and fade the start, and high-pass it a little.",
    ],
    chain: ["Hybrid Reverb", "EQ Eight"],
    tempo: 140, drums: "wave", bars: 2, drumsOn: (s) => s >= 16,
    params: [P("len", "Swell length", 1, 4, 1, 4, (v) => v + (v === 1 ? " beat" : " beats")), P("tone", "Tone", 800, 6000, 10, 2500, hz)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const beat = 60 / tempo, hit = t + beat * 4, at = hit - beat * p.len, len = hit - at, lp = filter(c, "lowpass", p.tone)
      lp.connect(out)
      for (const d of [0, 2, 4, 7]) {
        const g = saws(c, lp, at, len, degree(root, iv, d, 3), { voices: 4, detune: 30, cutoff: [p.tone * 0.4, p.tone], level: 0.04, attack: len * 0.98 })
        g.gain.cancelScheduledValues(at)
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(0.06, hit - 0.01)
        g.gain.linearRampToValueAtTime(0, hit)
      }
      const ng = gain(c, 0)
      ng.gain.setValueAtTime(0.0001, at); ng.gain.exponentialRampToValueAtTime(0.06, hit - 0.01); ng.gain.linearRampToValueAtTime(0, hit)
      chain(noise(c, at, hit, "pink"), filter(c, "bandpass", 1200, 0.7), ng, lp)
      stab(c, out, hit, beat * 3, root, iv, 0, 3, 0.1)
    },
  },
  {
    id: "gated-build", kind: "Transition", name: "Gated noise build", families: ["trance", "hardstyle", "techno", "hardtechno", "prog", "techhouse", "electro"],
    what: "Noise chopped into a rhythmic gate that gets faster and brighter. Trance and techno builds use it to add rhythm to the tension.",
    listen: "The gate turns noise into a rhythm. In the last bar it switches to 32nds and turns into a buzz.",
    use: ["drift"], alt: ["simpler"],
    steps: [
      "Drift noise held through the build, through Auto Filter high-pass rising over the build.",
      "Auto Pan-Tremolo in Tremolo mode with a square shape, synced to 1/16, depth 100%.",
      "Automate the rate to 1/32 for the last bar.",
      "Reverb on a send; cut on the drop.",
    ],
    chain: ["Auto Filter", "Auto Pan-Tremolo", "Hybrid Reverb"],
    tempo: 138, drums: "trance", bars: 6, drumsOn: (s) => s >= 64 || s % 4 === 0,
    params: [P("open", "Top cutoff", 2000, 12000, 100, 7000, hz), P("swing", "Gate length", 0.2, 0.9, 0.01, 0.5, pct)],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), len = B * 4, g = gain(c, 0), hp = filter(c, "highpass", 200)
      hp.frequency.setValueAtTime(200, t); hp.frequency.exponentialRampToValueAtTime(p.open, t + len)
      chain(noise(c, t, t + len, "white"), hp, g, out)
      g.gain.setValueAtTime(0, t)
      for (let b = 0; b < 4; b++) {
        const n = b === 3 ? 32 : 16, step = B / n
        for (let k = 0; k < n; k++) {
          const at = t + b * B + k * step, lvl = 0.04 + 0.2 * ((b * B + k * step) / len)
          g.gain.setValueAtTime(lvl, at)
          g.gain.setValueAtTime(0, at + step * p.swing)
        }
      }
      impact(c, out, t + len, 0.5, 0.45)
    },
  },
  {
    id: "echo-out", kind: "Transition", name: "Echo out", families: ["dubtechno", "house", "deephouse", "techno", "minimal", "dnb", "jungle", "reggaeton", "ukg", "afrohouse", "futuregarage", "ambient"],
    what: "The music stops feeding the delay, but the echoes keep repeating and fading. A dub trick DJs use to leave one track and bring in the next.",
    listen: "After the last stab, only echoes remain, each darker than the one before.",
    use: ["drumrack"],
    steps: [
      "Put Echo (or Delay) on a return track, feedback around 70%, a 1/4 dotted or 1/8 dotted time.",
      "Send the drums and chords to it.",
      "On the last beat before the transition, turn the send up and mute the dry tracks.",
      "The tail carries over the gap. Echo’s filter darkens each repeat.",
    ],
    chain: ["Echo", "Auto Filter"],
    tempo: 122, drums: "dub-techno", bars: 4, drumsOn: (s) => s < 30,
    params: [P("fb", "Feedback", 0.3, 0.88, 0.01, 0.72, pct), P("time", "Time", 0, 2, 1, 1, (v) => ["1/8", "1/8 dotted", "1/4 dotted"][v]), P("tone", "Tone", 800, 5000, 10, 1800, hz)],
    render: ({ c, out, drumIn, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), beat = 60 / tempo, times = [beat / 2, beat * 0.75, beat * 1.5]
      const d = delay(c, out, times[p.time], p.fb, 0.6, p.tone)
      drumIn.connect(d)
      for (const s of [2, 6, 10, 14, 18, 22, 26, 29]) stab(c, out, t + s * (B / 16), B / 16, root, iv, 0, 3, 0.08)
      const last = gain(c, 1)
      last.connect(d)
      for (const s of [2, 6, 10, 14, 18, 22, 26, 29]) stab(c, last, t + s * (B / 16), B / 16, root, iv, 0, 3, 0.06)
    },
  },
  {
    id: "stutter-build", kind: "Transition", name: "Stutter build", families: ["futurebass", "dubstep", "basshouse", "electro", "trap", "breakbeat", "hardwave", "techhouse"],
    what: "One slice of the music repeated faster and faster while it climbs in pitch, like a glitching record. Beat Repeat does this on any track.",
    listen: "Each bar halves the slice length. Pitch climbing on each repeat makes it a build instead of a glitch.",
    use: ["drumrack"],
    steps: [
      "Add Beat Repeat to the group you want to stutter, Chance 100%, Mix to Insert.",
      "Automate Grid from 1/4 to 1/8, 1/16 and 1/32 across the build.",
      "Turn up Pitch Decay, or put Shifter after it and automate pitch up.",
      "Turn Beat Repeat off on the drop.",
    ],
    chain: ["Beat Repeat", "Shifter", "Auto Filter"],
    tempo: 140, drums: "future-bass", bars: 6, drumsOn: (s) => s >= 64,
    params: [P("climb", "Pitch climb", 0, 12, 1, 7, semis), P("cut", "Slice length", 0.3, 1, 0.01, 0.6, pct)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo)
      ;[4, 8, 16, 32].forEach((n, b) => {
        for (let k = 0; k < n; k++) {
          const at = t + b * B + (k * B) / n, prog = (b * B + (k * B) / n) / (4 * B)
          const r = root + Math.round(p.climb * prog)
          for (const d of [0, 2, 4]) saws(c, out, at, (B / n) * p.cut, degree(r, iv, d, 3), { voices: 3, detune: 15, cutoff: [1200 + prog * 6000, 1200 + prog * 6000], level: 0.045 })
          if (k % 2 === 0) drum(c, out, at, "kick", 0.25 + prog * 0.25)
        }
      })
      impact(c, out, t + B * 4, 0.6, 0.45)
    },
  },
  {
    id: "kick-roll", kind: "Transition", name: "Kick roll build", families: ["hardstyle", "hardtechno", "techno", "hardwave", "trance", "minimal"],
    what: "The kick itself rolls faster into the drop, high-passed so it builds energy without muddying the low end. Hardstyle and hard techno’s favorite build.",
    listen: "As the high-pass rises the kick loses its weight; then the drop brings the full kick back like a punch.",
    use: ["drumrack"],
    steps: [
      "Copy the kick into its own clip for the build bars.",
      "Program quarters, then 8ths, then 16ths across the build (Note Repeat on Push works).",
      "Auto Filter high-pass automated up to about 1 kHz, with a little resonance.",
      "Leave the last half beat silent before the drop.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb"],
    tempo: 150, drums: "hardstyle", bars: 6, drumsOn: (s) => s >= 64,
    params: [P("open", "High-pass sweep", 100, 2000, 10, 900, hz), P("gap", "Gap before drop", 0, 1, 0.5, 0.5, (v) => (v ? v + " beat" : "None"))],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), hp = filter(c, "highpass", 40, 4), end = t + B * 4 - p.gap * (60 / tempo)
      hp.frequency.setValueAtTime(40, t); hp.frequency.exponentialRampToValueAtTime(p.open, t + B * 4)
      hp.connect(out)
      ;[4, 4, 8, 16].forEach((n, b) => {
        for (let k = 0; k < n; k++) {
          const at = t + b * B + (k * B) / n
          if (at < end) drum(c, hp, at, "kick", 0.3 + 0.3 * (b / 4))
        }
      })
      impact(c, out, t + B * 4, 0.4, 0.4)
    },
  },
  {
    id: "drop-gap", kind: "Transition", name: "Silence before the drop", families: ["dubstep", "trap", "futurebass", "wave", "phonk", "hardwave", "basshouse", "hardstyle", "reggaeton", "dnb"],
    what: "Everything cuts out for half a beat to a whole beat right before the drop. The shortest transition and often the most powerful.",
    listen: "Silence is louder than any riser. Hear how the drop feels bigger after the gap.",
    use: ["drumrack"],
    steps: [
      "Select the last beat (or half beat) before the drop across all tracks.",
      "Delete the notes or clips there, or automate the master Utility gain to −inf for that moment.",
      "Leave a vocal or a single impact in the gap if you want a call before the drop.",
      "Keep reverb tails short so the silence is real.",
    ],
    chain: ["Utility"],
    tempo: 140, drums: "wave-rolls", bars: 4, drumsOn: (s, p) => s < 64 - p.gap * 4,
    params: [P("gap", "Gap", 0.5, 2, 0.5, 1, (v) => v + (v === 1 ? " beat" : " beats"))],
    render: ({ c, out, t, tempo, p }) => {
      const B = BAR(tempo), len = B * 4 - p.gap * (60 / tempo), g = gain(c, 0), hp = filter(c, "highpass", 200)
      hp.frequency.setValueAtTime(200, t + B * 2); hp.frequency.exponentialRampToValueAtTime(6000, t + len)
      ramp(g.gain, t + B * 2, [[0, 0.001], [len - B * 2 - 0.01, 0.2], [len - B * 2, 0.0001]], "exp")
      chain(noise(c, t + B * 2, t + len, "white"), hp, g, out)
      impact(c, out, t, 0.5, 0.45)
    },
  },

  /* ================= Vocal effects ================= */
  {
    id: "vocal-chops", kind: "Vocal", name: "Ghostly vocal chops", families: ["futuregarage", "ukg", "odesza", "futurebass", "deephouse", "prog", "wave"],
    what: "Short vowel slices pitched up, played as a rhythm, and drowned in reverb and delay. The Burial and ODESZA signature: a voice that sings without words.",
    listen: "Each chop is a different vowel on a scale note. Pitched up with the formants raised, the voice sounds young and far away.",
    use: ["simpler"], alt: ["sampler"],
    steps: [
      "Drop an a cappella into Simpler and switch to Slice mode (slice by Transient or Beat).",
      "Pick the slices with open vowels (ah, oh, ee) and play them as a melody on Push in your key.",
      "Transpose up 3 to 12 semitones. In an audio clip, Complex Pro with Formants raised keeps it from sounding like chipmunks.",
      "Echo at a dotted 1/8, then a long Hybrid Reverb. Low-pass the reverb so it’s dark and wide.",
    ],
    chain: ["Auto Filter", "Echo", "Hybrid Reverb"],
    tempo: 130, drums: "fg-shuffle", bars: 2,
    params: [P("formant", "Formant", 0.7, 1.5, 0.01, 1.15, (v) => (v < 0.9 ? "Deep" : v > 1.2 ? "Bright" : "Natural")), P("len", "Chop length", 0.3, 1, 0.01, 0.6, pct), space(0.55)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, rv = reverb(c, out, p.space, 4, 0.6), dl = delay(c, out, s16 * 3, 0.4, 0.3), lp = filter(c, "lowpass", 5000)
      chain(lp, out); lp.connect(rv); lp.connect(dl)
      const pat: [number, number, Vowel][] = [[0, 4, "a"], [3, 2, "o"], [6, 2, "e"], [10, 4, "a"], [16, 7, "o"], [19, 4, "i"], [22, 2, "a"], [26, 5, "u"], [28, 4, "o"]]
      for (const [s, d, v] of pat) sing(c, lp, t + s * s16, degree(root, iv, d, 4), s16 * 2 * p.len, v, { formant: p.formant, attack: 0.008, release: 0.05, level: 0.35, breath: 0.03 })
    },
  },
  {
    id: "phonk-vocal", kind: "Vocal", name: "Pitched-down Memphis vocal", families: ["phonk", "hardwave", "trap", "wave", "boombap"],
    what: "A rap or chant sample slowed and pitched way down, gritty and repeated. The Memphis-tape sound phonk is built on, usually chopped into one phrase that repeats.",
    listen: "Pitching down lowers the formants too, so the voice sounds huge and menacing. The repeat on the last word is the hook.",
    use: ["simpler"],
    steps: [
      "Put a vocal phrase in an audio clip, Warp mode Re-Pitch, and transpose down 3 to 7 semitones (it also slows down).",
      "Or Simpler in Classic mode and play the root a few semitones lower.",
      "Saturator or Roar for grit, then Redux lightly for a dusty tape feel.",
      "Chop the last word and repeat it in 1/16s for the stutter, and send a little to a dark reverb.",
    ],
    chain: ["Roar", "Redux", "EQ Eight", "Hybrid Reverb"],
    tempo: 130, drums: "memphis", bars: 2,
    params: [P("down", "Pitch down", 0, 12, 1, 5, (v) => "−" + v + " st"), P("grit", "Grit", 0, 1, 0.01, 0.5, pct), P("repeat", "Stutter", 0, 1, 1, 1, (v) => (v ? "On" : "Off"))],
    render: ({ c, out, t, tempo, root, p }) => {
      const s16 = BAR(tempo) / 16, f = Math.pow(2, -p.down / 12), base = 50 + root - p.down
      const bus = gain(c, 1), rv = reverb(c, out, 0.2, 2.5, 0.8)
      chain(bus, shaper(c, p.grit), filter(c, "lowpass", 3500), gain(c, 0.3), out)
      bus.connect(rv)
      const words: [number, number, Vowel, number][] = [[0, 2, "a", 0], [3, 2, "o", 0], [6, 3, "e", -2], [12, 2, "a", 3], [16, 2, "o", 0], [19, 2, "a", 0], [22, 3, "i", -2]]
      for (const [s, l, v, d] of words) sing(c, bus, t + s * s16, base + d, s16 * l * 0.9, v, { formant: f, attack: 0.01, release: 0.04, level: 0.45, breath: 0.05, scoop: -2 })
      if (p.repeat) for (let k = 0; k < 6; k++) sing(c, bus, t + (26 + k) * s16, base, s16 * 0.6, "o", { formant: f, attack: 0.003, release: 0.02, level: 0.4 })
      else sing(c, bus, t + 26 * s16, base, s16 * 5, "o", { formant: f, release: 0.1, level: 0.4 })
    },
  },
  {
    id: "formant-shift", kind: "Vocal", name: "Formant shifting", families: ["futuregarage", "futurebass", "ukg", "trap", "odesza", "house", "phonk", "dubstep", "reggaeton"],
    what: "Moving a voice’s formants (the resonances that make it sound like a person and a vowel) without changing the notes. Lower sounds like a giant, higher like a child or a character.",
    listen: "The melody stays put while the character of the voice changes. That’s the difference between formant and pitch.",
    use: ["simpler"],
    steps: [
      "Put the vocal in an audio clip and set Warp mode to Complex Pro.",
      "Turn the Formants knob in the clip’s Sample box; leave Transpose alone to keep the notes.",
      "Or transpose up and lower Formants to keep a natural voice while changing key.",
      "Ableton’s Shifter can also add character, with its Pitch mode and window size.",
    ],
    chain: ["Shifter", "EQ Eight", "Hybrid Reverb"],
    tempo: 124, drums: "house", bars: 2,
    params: [P("formant", "Formant", 0.55, 1.7, 0.01, 1, (v) => (v < 0.8 ? "Giant" : v < 0.95 ? "Deeper" : v < 1.08 ? "Natural" : v < 1.3 ? "Younger" : "Cartoon")), space(0.3)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, rv = reverb(c, out, p.space, 2.5, 0.5), bus = gain(c, 1)
      bus.connect(out); bus.connect(rv)
      const mel: [number, number, number, Vowel][] = [[0, 4, 4, "a"], [4, 2, 2, "e"], [6, 6, 0, "o"], [16, 4, 4, "a"], [20, 2, 5, "i"], [22, 8, 4, "o"]]
      for (const [s, l, d, v] of mel) sing(c, bus, t + s * s16, degree(root, iv, d, 4), s16 * l * 0.92, v, { formant: p.formant, vibrato: 18, release: 0.08, level: 0.35, breath: 0.02 })
    },
  },
  {
    id: "telephone", kind: "Vocal", name: "Telephone and radio voice", families: ["wave", "phonk", "dnb", "techno", "electro", "breakbeat", "synthwave", "futuregarage", "hardwave", "minimal", "hardtechno", "jungle", "dubstep", "boombap"],
    what: "A voice squeezed through a narrow band, slightly distorted, like a phone call or an old radio. Great for intros, verses and contrast before a full-range drop.",
    listen: "No lows, no highs: everything lives between about 400 Hz and 3 kHz. Switch to the full voice on the drop for impact.",
    use: ["simpler"],
    steps: [
      "EQ Eight: steep high-pass around 400 Hz and low-pass around 3 kHz (48 dB slopes).",
      "Saturator or Roar for mild distortion.",
      "Optional: Redux for lo-fi crunch and Vinyl Distortion for crackle.",
      "Automate the filter open to full range on the drop.",
    ],
    chain: ["EQ Eight", "Saturator", "Redux"],
    tempo: 145, drums: "wave", bars: 2,
    params: [P("band", "Bandwidth", 0.3, 1, 0.01, 0.55, (v) => (v < 0.5 ? "Phone" : v < 0.8 ? "Radio" : "Wide")), P("grit", "Grit", 0, 1, 0.01, 0.4, pct)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, lo = 900 - p.band * 700, hi = 1500 + p.band * 4000
      const bus = gain(c, 1)
      chain(bus, filter(c, "highpass", lo, 1.2), filter(c, "highpass", lo, 1.2), shaper(c, p.grit), filter(c, "lowpass", hi, 1.2), filter(c, "lowpass", hi, 1.2), gain(c, 0.3), out)
      chain(crackle(c, t, t + BAR(tempo) * 2, 6, 0.2), gain(c, 0.15), bus)
      const words: [number, number, number, Vowel][] = [[0, 3, 0, "a"], [4, 2, 0, "o"], [6, 4, 2, "e"], [12, 3, 0, "a"], [16, 2, 0, "i"], [18, 2, 1, "o"], [20, 6, 0, "a"]]
      for (const [s, l, d, v] of words) sing(c, bus, t + s * s16, degree(root, iv, d, 3), s16 * l * 0.9, v, { attack: 0.01, release: 0.04, level: 0.4, breath: 0.04 })
    },
  },
  {
    id: "delay-throw", kind: "Vocal", name: "Delay throw", families: ["dubtechno", "house", "deephouse", "ukg", "reggaeton", "dnb", "techhouse", "afrohouse", "discohouse", "lofi", "minimal", "techno", "hardtechno", "jungle", "dubstep"],
    what: "Only the last word of a phrase gets sent to a long delay, so it echoes into the gap. Dub, garage and house mixes do this on almost every vocal line.",
    listen: "The phrase stays dry; only the final word repeats. Hear the echoes fill the space before the next line.",
    use: ["simpler"],
    steps: [
      "Put Echo or Delay on a return track, 1/4 dotted or 1/8 dotted, feedback 50 to 70%, 100% wet.",
      "Automate the vocal’s send to that return: zero most of the time, a short spike on the last word of a line.",
      "Filter the return (Echo’s filter section) so the repeats get darker.",
      "A little reverb after the delay softens the repeats.",
    ],
    chain: ["Echo", "Hybrid Reverb"],
    tempo: 124, drums: "deep", bars: 2,
    params: [P("fb", "Feedback", 0.2, 0.85, 0.01, 0.6, pct), P("time", "Time", 0, 2, 1, 1, (v) => ["1/8", "1/8 dotted", "1/4 dotted"][v])],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, beat = 60 / tempo, d = delay(c, out, [beat / 2, beat * 0.75, beat * 1.5][p.time], p.fb, 0.7, 2000), send = gain(c, 1)
      send.connect(d)
      const line: [number, number, number, Vowel][] = [[0, 2, 4, "a"], [2, 2, 4, "e"], [4, 4, 2, "o"], [8, 4, 0, "a"]]
      for (const [s, l, dg, v] of line) sing(c, out, t + s * s16, degree(root, iv, dg, 4), s16 * l * 0.9, v, { level: 0.35, release: 0.05, vibrato: 12 })
      sing(c, out, t + 12 * s16, degree(root, iv, 2, 4), s16 * 3, "o", { level: 0.35, release: 0.06 })
      sing(c, send, t + 12 * s16, degree(root, iv, 2, 4), s16 * 3, "o", { level: 0.35, release: 0.06 })
    },
  },
  {
    id: "vocoder", kind: "Vocal", name: "Vocoder and talkbox chords", families: ["discohouse", "electro", "synthwave", "futurebass", "house", "techhouse", "odesza", "afrohouse"],
    what: "A synth chord that talks: the voice shapes the vowels, the synth supplies the notes. Daft Punk, electro and modern disco house all lean on it.",
    listen: "The chord moves through vowels in rhythm. It’s the synth’s harmonics, filtered by the shape of a mouth.",
    use: ["wavetable"], alt: ["drift"],
    steps: [
      "Put Vocoder on a synth track playing chords (the carrier).",
      "Set Vocoder’s Carrier to External and pick your vocal track as the modulator; or use the built-in Noise carrier for whispers.",
      "Use a bright, buzzy carrier: a saw pad with no effects. 20 to 40 bands.",
      "Chorus-Ensemble and reverb after. For a talkbox feel, use fewer bands and a short release.",
    ],
    chain: ["Vocoder", "Chorus-Ensemble", "Hybrid Reverb"],
    tempo: 120, drums: "disco-house", bars: 2,
    params: [P("speed", "Vowel changes", 1, 8, 1, 4, (v) => v + " per bar"), P("formant", "Mouth size", 0.7, 1.4, 0.01, 1, pct)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), n = p.speed * 2, rv = reverb(c, out, 0.2, 2, 0.4), bus = gain(c, 1)
      bus.connect(out); bus.connect(rv)
      const vowels: Vowel[] = ["a", "o", "e", "u", "i", "o", "a", "e"]
      for (let k = 0; k < n; k++) {
        const at = t + (k * B * 2) / n, len = (B * 2) / n, chord = k < n / 2 ? 0 : 5
        for (const d of [chord, chord + 2, chord + 4]) sing(c, bus, at, degree(root, iv, d, 3), len * 0.95, vowels[k % 8], { to: vowels[(k + 1) % 8], formant: p.formant, attack: 0.01, release: 0.03, level: 0.2 })
      }
    },
  },
  {
    id: "vocal-stutter", kind: "Vocal", name: "Vocal stutter and glitch", families: ["futurebass", "dubstep", "electro", "basshouse", "trap", "breakbeat", "jungle", "techhouse", "hardwave", "minimal", "hardtechno", "reggaeton", "boombap"],
    what: "The first syllable repeated in quick bursts before the full word lands, or a phrase chopped into a rhythmic glitch. A hook in itself.",
    listen: "Repeats get faster, then the full note arrives on the beat. The rhythm of the repeats is the hook.",
    use: ["simpler"],
    steps: [
      "Simpler in Slice mode, and play the first slice repeatedly before the full word.",
      "Or Beat Repeat on the vocal: Grid 1/16, Chance 100%, Mix set to Insert, automated on for half a beat.",
      "Shorten the release on repeats so each is clipped.",
      "Pitch the repeats up a few semitones for a playful version.",
    ],
    chain: ["Beat Repeat", "Hybrid Reverb"],
    tempo: 150, drums: "future-bass", bars: 2,
    params: [P("reps", "Repeats", 2, 8, 1, 6, String), P("rise", "Pitch rise", 0, 12, 1, 0, semis)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, rv = reverb(c, out, 0.25, 2, 0.4), bus = gain(c, 1)
      bus.connect(out); bus.connect(rv)
      for (const start of [0, 16]) {
        for (let k = 0; k < p.reps; k++) {
          const span = 6 / p.reps, at = t + (start + k * span) * s16
          sing(c, bus, at, degree(root, iv, 4, 4) + Math.round((p.rise * k) / p.reps), s16 * span * 0.45, "a", { attack: 0.002, release: 0.01, level: 0.35 })
        }
        sing(c, bus, t + (start + 6) * s16, degree(root, iv, start ? 2 : 4, 4), s16 * 6, "o", { release: 0.08, level: 0.35, vibrato: 15 })
      }
    },
  },
  {
    id: "choir", kind: "Vocal", name: "Ooh choir pad", families: ["trance", "ambient", "odesza", "wave", "futuregarage", "synthwave", "prog", "hardstyle", "dubtechno"],
    what: "A stack of soft “ooh” voices holding a chord, with vibrato and a slow fade in. Trance breakdowns, wave intros and ambient all use choir pads for an epic, human feel.",
    listen: "Several slightly different voices on each note make it a choir rather than one singer.",
    use: ["sampler"], alt: ["simpler"],
    steps: [
      "Sampler with a choir multisample, or record yourself singing “ooh” on each chord tone and layer the takes.",
      "Slow attack (0.3 to 1 s) and long release.",
      "Chorus-Ensemble to widen; Hybrid Reverb with a cathedral or long hall.",
      "Low-pass gently around 5 kHz so it sits behind the lead.",
    ],
    chain: ["Chorus-Ensemble", "Hybrid Reverb", "EQ Eight"],
    tempo: 138, drums: "trance", bars: 2, drumsOn: () => false,
    params: [P("air", "Breath", 0, 0.15, 0.005, 0.05, (v) => pct(v / 0.15)), P("vowel", "Vowel", 0, 2, 1, 0, (v) => ["Ooh", "Oh", "Ah"][v]), space(0.65)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const B = BAR(tempo), rv = reverb(c, out, p.space, 4.5, 0.6), bus = gain(c, 1), v = (["u", "o", "a"] as Vowel[])[p.vowel]
      chain(bus, filter(c, "lowpass", 5000), out); bus.connect(rv)
      ;[[0, 0], [B, 5]].forEach(([at, ch]) => {
        for (const d of [ch, ch + 2, ch + 4]) for (const det of [-1, 0, 1]) {
          sing(c, bus, t + at + Math.random() * 0.05, degree(root, iv, d, 4), B * 0.95, v, { attack: 0.5, release: 0.4, vibrato: 10 + det * 4, level: 0.09, breath: p.air, formant: 1 + det * 0.04 })
        }
      })
    },
  },
  {
    id: "vocal-riser", kind: "Vocal", name: "Vocal riser", families: ["trance", "futurebass", "odesza", "prog", "hardstyle", "house", "basshouse", "afrohouse"],
    what: "A held vocal note that slides up in pitch while the reverb grows, pulling the track into the drop. More human than a noise riser.",
    listen: "The slide and the swelling reverb together read as a breath before a jump.",
    use: ["simpler"],
    steps: [
      "Take a sustained vowel from a vocal and stretch it to the build length (Complex Pro).",
      "Automate Transpose up 12 semitones across the build.",
      "Automate a reverb send up at the same time, and Auto Filter high-pass rising.",
      "Cut it on the drop.",
    ],
    chain: ["Auto Filter", "Hybrid Reverb"],
    tempo: 128, drums: "prog", bars: 4, drumsOn: (s) => s >= 32,
    params: [P("bend", "Rise", 3, 24, 1, 12, semis), space(0.45)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const len = BAR(tempo) * 2, rv = reverb(c, out, p.space, 3, 0.4)
      const g = gain(c, 0)
      g.gain.setValueAtTime(0.4, t); g.gain.linearRampToValueAtTime(1.1, t + len)
      g.connect(out); g.connect(rv)
      sing(c, g, t, degree(root, iv, 4, 4), len, "a", { bend: p.bend, attack: 0.4, release: 0.01, vibrato: 20, level: 0.3, breath: 0.04, to: "e" })
      impact(c, out, t + len, 0.4, 0.4)
    },
  },
  {
    id: "slowed-reverb", kind: "Vocal", name: "Slowed and reverb vocal", families: ["wave", "phonk", "lofi", "trap", "synthwave", "futuregarage", "ambient"],
    what: "A vocal slowed down so the pitch drops with it, then washed in reverb. The dreamy, sad “slowed + reverb” style that shaped wave and drift phonk.",
    listen: "Slowing a recording lowers its pitch and formants together: the voice gets darker and heavier, and the reverb makes it distant.",
    use: ["simpler"],
    steps: [
      "Set the vocal clip’s Warp mode to Re-Pitch (or turn Warp off) so tempo and pitch move together.",
      "Slow it to 80 to 90% speed: about 2 to 4 semitones down.",
      "Hybrid Reverb with a long, dark hall around 30 to 50% wet.",
      "Low-pass around 6 kHz and add soft saturation.",
    ],
    chain: ["Hybrid Reverb", "EQ Eight", "Saturator"],
    tempo: 140, drums: "wave", bars: 4,
    params: [P("slow", "Slow down", 0, 6, 1, 3, (v) => Math.round(100 * Math.pow(2, -v / 12)) + "% speed"), space(0.55)],
    render: ({ c, out, t, tempo, root, iv, p }) => {
      const s16 = BAR(tempo) / 16, f = Math.pow(2, -p.slow / 12), rv = reverb(c, out, p.space, 4.5, 0.7), bus = gain(c, 1)
      chain(bus, filter(c, "lowpass", 6000), shaper(c, 0.12), gain(c, 0.4), out); bus.connect(rv)
      const mel: [number, number, number, Vowel][] = [[0, 6, 4, "o"], [6, 2, 2, "a"], [8, 8, 0, "e"], [16, 4, 2, "a"], [20, 4, 4, "o"], [24, 8, 5, "a"]]
      for (const [s, l, d, v] of mel) sing(c, bus, t + (s * s16) / f, degree(root, iv, d, 4) - p.slow, (s16 * l * 0.9) / f, v, { formant: f, vibrato: 14, release: 0.12, level: 0.35, breath: 0.03 })
    },
  },
]

export const FX_KINDS: FxKind[] = ["Atmosphere", "Transition", "Vocal"]
export const barsOf = (r: FxRecipe, p: Record<string, number>) => (typeof r.bars === "number" ? r.bars : r.bars(p))
