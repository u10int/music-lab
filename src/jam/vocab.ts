/**
 * The jam generator’s vocabulary: every value a recipe can use, with a short
 * description used in summaries, `--list` and the app. Inspired by jamburgr’s
 * documented options; the behaviour behind each one is our own.
 */

export type Opt = [id: string, describe: string]
const ids = <T extends readonly Opt[]>(xs: T) => xs.map(([id]) => id) as unknown as T[number][0][]

export const CHORDS = [
  ["auto", "the style’s usual chord colour"],
  ["triad", "plain triads"],
  ["power", "root-and-fifth power chords"],
  ["sus2", "open sus2 chords"],
  ["sus4", "suspended sus4 chords"],
  ["seventh", "7th chords"],
  ["ninth", "9th chords"],
  ["add9", "add9 chords"],
  ["sixth", "6th chords"],
  ["eleventh", "11th chords"],
  ["quartal", "quartal chords stacked in 4ths"],
  ["cluster", "close cluster chords"],
] as const satisfies readonly Opt[]
/** Names jamburgr recipes use, mapped to ours. */
export const CHORD_ALIASES: Record<string, string> = {
  minor7: "seventh", major7: "seventh", dominant7: "seventh", m7: "seventh", maj7: "seventh", "7": "seventh",
  minor9: "ninth", major9: "ninth", m9: "ninth", maj9: "ninth", "9": "ninth",
  minor_add9: "add9", major_add9: "add9", minor11: "eleventh", "11": "eleventh", major6: "sixth", minor6: "sixth",
}

export const VOICINGS = [
  ["closed", "closed voicings"],
  ["open", "open voicings"],
  ["wide", "wide, spread voicings"],
  ["drop2", "drop-2 voicings"],
  ["rootless", "rootless voicings that leave the root to the bass"],
  ["shell", "shell voicings (root, 3rd and 7th)"],
  ["auto_voice_leading", "smooth voice leading"],
] as const satisfies readonly Opt[]

export const PATTERNS = [
  ["sustain", "held chords"],
  ["half_bar", "half-bar chords"],
  ["pulse_quarters", "quarter-note pulses"],
  ["pulse_8ths", "pulsed 8th-note chords"],
  ["offbeat_stabs", "offbeat stabs"],
  ["stabs_332", "3-3-2 chord nudges"],
  ["two_step_skip", "skipping two-step chops"],
  ["push_pull", "push-pull chord timing"],
  ["gate_16ths", "16th-note trance gates"],
  ["sidechain_gaps", "chords with sidechain gaps"],
  ["broken", "broken chords"],
  ["arp_up", "rising 16th arps"],
  ["arp_updown", "up-and-down arps"],
  ["euclid_5_16", "5-in-16 Euclidean stabs"],
  ["euclid_7_16", "7-in-16 Euclidean stabs"],
  ["dub_stab", "single dub stabs"],
] as const satisfies readonly Opt[]

export const BASSES = [
  ["none", "no bass"],
  ["root", "long root notes"],
  ["root_pulse", "quarter-note root pulses"],
  ["octave_pulse", "octave-jumping 8ths"],
  ["offbeat", "an offbeat house bass"],
  ["rolling", "a rolling 16th bass"],
  ["acid_303", "a squelchy 303 line with slides"],
  ["reese", "a long, gliding reese"],
  ["sub_808", "a gliding 808"],
  ["walking", "a walking bass"],
  ["root_fifth", "root-fifth bass"],
  ["pedal", "a pedal bass on the key’s root"],
  ["log_drum", "a log-drum-style bass"],
  ["two_step", "a bouncing two-step bass"],
  ["half_time", "a half-time sub"],
  ["dembow", "a dembow bass"],
] as const satisfies readonly Opt[]

export const PADS = [
  ["none", "no pad"],
  ["sustain", "sustained pads"],
  ["root_drone", "a root drone"],
  ["fifth_drone", "fifth drones"],
  ["high_shimmer", "a high shimmer pad"],
  ["swell", "slow pad swells"],
] as const satisfies readonly Opt[]

export const LEADS = [
  ["none", "no lead"],
  ["simple_motif", "a simple motif"],
  ["chord_tone", "a chord-tone lead"],
  ["pentatonic", "a pentatonic motif"],
  ["pluck_arp", "a plucked arp line"],
  ["call_response", "call-and-response phrases"],
  ["chop", "chopped, vocal-style stabs"],
  ["hook", "a repeating hook"],
  ["sparse", "a sparse, long-note lead"],
] as const satisfies readonly Opt[]

export const DENSITIES = [["sparse", "sparse"], ["normal", "normal"], ["busy", "busy"]] as const satisfies readonly Opt[]

export const ARCHETYPES = [
  ["club", "intro, build, drop, breakdown, second drop and outro"],
  ["hook_first", "a hook up front, verse, hooks and a short break"],
  ["cold_open", "drums and bass first, with the chords and lead revealed late"],
  ["song", "intro, verses and hooks"],
  ["slow_bloom", "a slow bloom from haze to pulse and back"],
  ["dj_tool", "long DJ-friendly intro and outro around two main sections"],
] as const satisfies readonly Opt[]

export const OUTPUT_MODES = [
  ["single", "one MIDI file with every layer on its own track"],
  ["multi", "every recipe in the run back to back in one file"],
  ["pack", "a folder with the full MIDI, one file per layer and section, the recipe and notes"],
] as const satisfies readonly Opt[]

export type ChordColor = Exclude<(typeof CHORDS)[number][0], "auto">
export type Voicing = (typeof VOICINGS)[number][0]
export type ChordPattern = (typeof PATTERNS)[number][0]
export type BassStyle = (typeof BASSES)[number][0]
export type PadStyle = (typeof PADS)[number][0]
export type LeadStyle = (typeof LEADS)[number][0]
export type Density = (typeof DENSITIES)[number][0]
export type Archetype = (typeof ARCHETYPES)[number][0]
export type OutputMode = (typeof OUTPUT_MODES)[number][0]

export const IDS = {
  chord: ids(CHORDS), voicing: ids(VOICINGS), pattern: ids(PATTERNS), bass_style: ids(BASSES), pad_style: ids(PADS),
  lead_style: ids(LEADS), drum_density: ids(DENSITIES), lead_density: ids(DENSITIES), arrangement_archetype: ids(ARCHETYPES), output_mode: ids(OUTPUT_MODES),
}
const DESCRIBE = new Map<string, string>([...CHORDS, ...VOICINGS, ...PATTERNS, ...BASSES, ...PADS, ...LEADS, ...ARCHETYPES].map(([k, v]) => [k, v]))
export const describe = (id: string) => DESCRIBE.get(id) ?? id.replace(/_/g, " ")

/** Named progressions any style can use, as Roman numerals relative to the key’s scale. */
export const NAMED_PROGRESSIONS: Record<string, string> = {
  classic: "i,VI,III,VII",
  dark_drive: "i,i,VI,VII",
  epic: "VI,VII,i,i",
  sad_loop: "i,VII,VI,VII",
  minor_cadence: "i,iv,v,i",
  dorian_vamp: "i,IV,i,IV",
  phrygian: "i,II,i,i",
  pop: "I,V,vi,IV",
  jazz_turn: "ii,V,I,vi",
  one_chord: "i,i,i,i",
  descending: "i,VII,VI,v",
  soul: "i,iv,VII,III",
}
