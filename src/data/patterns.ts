/**
 * Drum patterns on a 16-step grid per bar (step 1 is the downbeat, 5/9/13 are
 * beats 2–4). Each row is [lane, steps, ghost steps]. Ghost steps play quietly.
 * These are starting points: the defining hits of each style, not transcriptions.
 */
export type Family = "wave" | "phonk" | "hardwave" | "prog" | "house" | "techno" | "dubtechno" | "trance" | "ambient" | "bass" | "breaks" | "futuregarage" | "hiphop" | "world"
export type Lane = "Kick" | "Snare" | "Clap" | "Rim" | "Hat" | "Open hat" | "Shaker" | "Tom" | "Ride" | "Cowbell"
export interface Pattern {
  id: string
  family: Family
  name: string
  bpm: string
  tempo: number
  /** 16 steps (one bar) unless set to 32 for two-bar patterns. */
  length?: 16 | 32
  /** Suggested swing, 0–0.6 of a 16th. */
  swing?: number
  rows: [Lane, number[], number[]?][]
  note: string
}

export const FAMILIES: [Family | "all", string][] = [
  ["all", "All"],
  ["wave", "Wave"],
  ["phonk", "Phonk"],
  ["hardwave", "Hardwave"],
  ["prog", "Progressive house"],
  ["house", "House"],
  ["techno", "Techno"],
  ["dubtechno", "Dub techno"],
  ["trance", "Trance and hard dance"],
  ["ambient", "Ambient"],
  ["bass", "Drum and bass, dubstep"],
  ["breaks", "Breaks and garage"],
  ["futuregarage", "Future garage"],
  ["hiphop", "Hip-hop and trap"],
  ["world", "Afro, Latin, retro"],
]
/** Older saved filters used these; map them to current ones. */
export function normalizeFamily(f: string): Family | "all" {
  return FAMILIES.some(([x]) => x === f) ? (f as Family | "all") : "all"
}

const ALL16 = Array.from({ length: 16 }, (_, i) => i + 1)
const EIGHTHS = [1, 3, 5, 7, 9, 11, 13, 15]
const OFFBEATS = [3, 7, 11, 15]
const FOUR = [1, 5, 9, 13]
const BACKBEAT = [5, 13]
const EVEN16 = [2, 4, 6, 8, 10, 12, 14, 16]
const without = (xs: number[], ys: number[]) => xs.filter((x) => !ys.includes(x))

export const PATTERNS: Pattern[] = [
  // Your three genres
  { id: "prog", family: "prog", name: "Progressive house", bpm: "124 BPM", tempo: 124,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Shaker", EVEN16, EIGHTHS]],
    note: "Keep the shaker quiet and vary its velocity so the offbeats lean forward." },
  { id: "prog-melodic", family: "prog", name: "Melodic progressive (Anjuna-style)", bpm: "120–124 BPM", tempo: 122, length: 32,
    rows: [
      ["Kick", [1, 5, 9, 13, 17, 21, 25, 29]],
      ["Clap", [5, 13, 21, 29]],
      ["Open hat", [3, 7, 11, 15, 19, 23, 27, 31]],
      ["Shaker", [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32], [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]],
      ["Rim", [8, 26], [15]],
      ["Tom", [], [30, 31, 32]],
    ],
    note: "Steady and warm under emotional chords. Percussion changes every 8 bars; the tom pickup leads into the next phrase." },
  { id: "prog-deep", family: "prog", name: "Deep progressive (rolling)", bpm: "122–126 BPM", tempo: 124, swing: 0.08,
    rows: [["Kick", FOUR], ["Hat", OFFBEATS], ["Shaker", ALL16, []], ["Tom", [4, 7, 12], [15]], ["Rim", [10], [14]], ["Clap", [13]]],
    note: "The late-90s and 2000s DJ sound: hypnotic and percussive, with the arp and bassline doing the melodic work. Keep the clap sparse." },
  { id: "wave", family: "wave", name: "Wave", bpm: "140–150 BPM, half-time feel", tempo: 145,
    rows: [["Kick", [1, 8, 11]], ["Snare", [9]], ["Hat", EIGHTHS]],
    note: "Add a 32nd-note hat roll into the snare with Note Repeat, then let the reese carry the low end." },
  { id: "phonk", family: "phonk", name: "Drift phonk", bpm: "About 130 BPM", tempo: 130,
    rows: [["Kick", [1, 7, 11]], ["Clap", BACKBEAT], ["Hat", EIGHTHS]],
    note: "Layer two claps, and let the distorted 808 follow the kick. The cowbell melody goes on its own track." },
  { id: "memphis", family: "phonk", name: "Memphis phonk (808)", bpm: "130–145 BPM, half-time feel", tempo: 140, swing: 0.1, length: 32,
    rows: [
      ["Kick", [1, 4, 11, 17, 20, 27], [24]],
      ["Snare", [9, 25]],
      ["Hat", [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27], [28, 29, 30, 31, 32]],
      ["Cowbell", [3, 7, 12, 15, 19, 23, 28, 31]],
      ["Open hat", [16]],
    ],
    note: "The hardware roots: a TR-808 kit with its cowbell as a rhythm part, a lazy half-time snare and hat rolls. Run the whole loop through tape saturation and a low-pass to get the dusty Memphis sound." },
  { id: "hard-phonk", family: "phonk", name: "Hard phonk (hardwave crossover)", bpm: "145–155 BPM", tempo: 150, length: 32,
    rows: [
      ["Kick", [1, 5, 9, 13, 17, 21, 25, 29]],
      ["Clap", [5, 13, 21, 29]],
      ["Hat", [3, 7, 11, 15, 19, 23, 27, 31], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]],
      ["Cowbell", [], [4, 12, 20, 28]],
      ["Snare", [31, 32], [30]],
    ],
    note: "Phonk sounds over a hardwave-style four-on-the-floor: a pumping kick, offbeat hats and a short roll. The cowbell melody and distorted 808 carry the phonk identity on top." },

  // House
  { id: "house", family: "house", name: "Classic house", bpm: "120–126 BPM", tempo: 124,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Hat", without(ALL16, [...OFFBEATS])]],
    note: "The open hat on every offbeat is the whole groove. Keep the closed hats low and let them breathe." },
  { id: "deep", family: "house", name: "Deep house", bpm: "118–122 BPM", tempo: 120, swing: 0.15,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Rim", [8, 15], [4, 11]], ["Hat", OFFBEATS], ["Shaker", ALL16]],
    note: "Softer and swung. The rimshots fill the gaps around the clap; pull their velocity down until they almost disappear." },
  { id: "tech-house", family: "house", name: "Tech house", bpm: "124–128 BPM", tempo: 126,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Hat", EVEN16, [1, 5, 9, 13]], ["Rim", [4, 7, 12], [15]]],
    note: "Busier percussion than classic house. The rim syncopation is what makes it bounce; nudge one or two hits late." },
  { id: "afro", family: "world", name: "Afro house", bpm: "120–124 BPM", tempo: 122, swing: 0.1,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Shaker", EVEN16, EIGHTHS], ["Tom", [4, 7, 11, 14]], ["Rim", [3, 10, 15]]],
    note: "Toms and rims stand in for congas and bongos. Pan them apart and keep the shaker running underneath." },

  // Techno and trance
  { id: "techno", family: "techno", name: "Techno", bpm: "128–138 BPM", tempo: 132,
    rows: [["Kick", FOUR], ["Open hat", OFFBEATS], ["Hat", without(ALL16, OFFBEATS), FOUR], ["Clap", [13]], ["Ride", EIGHTHS]],
    note: "Relentless kick and offbeat hat. Most of the movement comes from automating filters and decay, not new hits." },
  { id: "minimal", family: "techno", name: "Minimal techno", bpm: "124–128 BPM", tempo: 126, swing: 0.12,
    rows: [["Kick", FOUR], ["Rim", [4, 11], [7, 14]], ["Hat", OFFBEATS], ["Clap", [13]]],
    note: "Space is the point. Change one hit every 8 bars and let tiny timing shifts carry the groove." },
  { id: "dub-techno", family: "dubtechno", name: "Dub techno pulse", bpm: "118–124 BPM", tempo: 120,
    rows: [["Kick", FOUR], ["Hat", OFFBEATS, []], ["Shaker", [], EVEN16], ["Rim", [8], [15]]],
    note: "A soft, round kick and very little else. The chords and their echoes are the groove, so keep the drums dark and quiet." },
  { id: "dub-broken", family: "dubtechno", name: "Dub techno broken (2-bar)", bpm: "118–124 BPM", tempo: 122, swing: 0.1, length: 32,
    rows: [
      ["Kick", [1, 5, 9, 13, 17, 21, 25, 29], [16]],
      ["Hat", [3, 7, 11, 15, 19, 23, 27, 31]],
      ["Rim", [6, 22], [12, 28, 31]],
      ["Ride", [], [3, 7, 11, 15, 19, 23, 27, 31]],
      ["Snare", [], [13, 29]],
    ],
    note: "A rim that answers itself across two bars and a ghost kick before bar 2. Feed the rim into a long delay for the dub echoes." },
  { id: "trance", family: "trance", name: "Trance", bpm: "136–140 BPM", tempo: 138,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Hat", ALL16]],
    note: "Rolling 16th hats under a big offbeat open hat. Pull the kick out entirely for the breakdown, then bring it back for the drop." },
  { id: "hardstyle", family: "trance", name: "Hardstyle", bpm: "150 BPM", tempo: 150,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS]],
    note: "The distorted, pitched kick is the lead instrument. Keep the rest sparse so it has room." },
  { id: "trance-classic", family: "trance", name: "Classic trance (late 90s)", bpm: "136–140 BPM", tempo: 138,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Hat", without(ALL16, OFFBEATS), FOUR], ["Ride", EIGHTHS]],
    note: "The anthem groove: punchy kick, offbeat open hat, ride on the 8ths and a rolling bass on the 16ths between kicks." },
  { id: "trance-build", family: "trance", name: "Trance build (snare roll)", bpm: "138 BPM", tempo: 138, length: 32,
    rows: [
      ["Kick", [1, 5, 9, 13, 17, 21, 25, 29]],
      ["Snare", [1, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 26, 27, 28, 29, 30, 31, 32], [3, 7]],
      ["Open hat", [3, 7, 11, 15, 19, 23, 27, 31]],
    ],
    note: "Snares go from quarters to 8ths to 16ths as the build climbs. In a real build, stretch this over 8 or 16 bars and filter it open as it goes." },

  // Bass music
  { id: "dnb", family: "bass", name: "Drum and bass", bpm: "170–175 BPM", tempo: 174,
    rows: [["Kick", [1, 11]], ["Snare", BACKBEAT, [8, 15]], ["Hat", EIGHTHS], ["Shaker", EVEN16]],
    note: "The two-step: kick on 1 and the 'and' of 3, snare on 2 and 4. Ghost snares are what make it roll." },
  { id: "jungle", family: "bass", name: "Jungle (Amen-style break)", bpm: "160–170 BPM", tempo: 165,
    rows: [["Kick", [1, 3, 11, 12]], ["Snare", [5, 13], [8, 10, 15, 16]], ["Ride", EIGHTHS]],
    note: "A simplified Amen pattern. Better still, slice a real break in Simpler and re-sequence the slices on the pads." },
  { id: "dubstep", family: "bass", name: "Dubstep", bpm: "140 BPM, half-time", tempo: 140,
    rows: [["Kick", [1], [12]], ["Snare", [9]], ["Hat", EIGHTHS, EVEN16]],
    note: "One snare per bar on beat 3 gives the half-time weight. The bass does the rhythmic work between the hits." },
  { id: "future-bass", family: "bass", name: "Future bass", bpm: "140–160 BPM, half-time", tempo: 150,
    rows: [["Kick", [1, 8, 11]], ["Clap", [9]], ["Hat", EIGHTHS], ["Snare", [16], [15]]],
    note: "Sidechain the big supersaw chords hard to the kick so they pump, and add a snare roll into each phrase." },

  // Breaks and garage
  { id: "ukg", family: "breaks", name: "UK garage (2-step)", bpm: "130–135 BPM", tempo: 132, swing: 0.35,
    rows: [["Kick", [1, 11]], ["Snare", BACKBEAT], ["Hat", [3, 7, 11, 15], [6, 14]], ["Rim", [8], [16]], ["Shaker", EVEN16]],
    note: "Heavy swing is essential: try 55–60% in Live's groove or the Swing knob. The kick skips beat 3, which gives the 2-step its lurch." },
  { id: "breakbeat", family: "breaks", name: "Breakbeat", bpm: "125–135 BPM", tempo: 130,
    rows: [["Kick", [1, 3, 8, 11]], ["Snare", BACKBEAT, [10]], ["Hat", EIGHTHS], ["Open hat", [15]]],
    note: "Funky kick placement against a straight backbeat. Layer a chopped real break underneath for texture." },
  { id: "electro", family: "world", name: "Electro (808)", bpm: "125–130 BPM", tempo: 128,
    rows: [["Kick", [1, 7, 11]], ["Clap", BACKBEAT], ["Hat", ALL16, []], ["Tom", [15]]],
    note: "Classic drum-machine funk: syncopated kicks, steady 16th hats and a tom fill. Keep everything dry and punchy." },

  // Future garage: two-bar patterns, because the variation between bars is the style
  { id: "fg-shuffle", family: "futuregarage", name: "Future garage 2-step", bpm: "130–138 BPM, swung", tempo: 134, swing: 0.32, length: 32,
    rows: [
      ["Kick", [1, 11, 17, 27, 28]],
      ["Snare", [5, 13, 21, 29], [8, 15, 24, 31]],
      ["Rim", [4, 10, 20, 26], [14, 30, 32]],
      ["Hat", [3, 7, 11, 15, 19, 23, 27, 31], [6, 14, 22]],
      ["Shaker", [], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]],
    ],
    note: "The garage skip: kick on 1 and the 'and' of 3, with bar 2 answering bar 1. Keep ghost snares and rims very quiet, and pitch the snare down a few semitones." },
  { id: "fg-broken", family: "futuregarage", name: "Broken shuffle (Burial-style)", bpm: "135–140 BPM", tempo: 138, swing: 0.28, length: 32,
    rows: [
      ["Kick", [1, 8, 11, 17, 27], [22]],
      ["Snare", [5, 13, 21, 29], [16, 24, 32]],
      ["Rim", [3, 12, 19, 30], [6, 23]],
      ["Hat", [3, 7, 11, 19, 23, 27, 31], [15]],
      ["Shaker", [], [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]],
    ],
    note: "Hits sound slightly off the grid on purpose: turn Quantize off and nudge rims and ghost snares by hand. Layer vinyl crackle under everything and roll off the top end." },
  { id: "fg-halftime", family: "futuregarage", name: "Half-time atmospheric", bpm: "140 BPM, half-time feel", tempo: 140, swing: 0.2, length: 32,
    rows: [
      ["Kick", [1, 11, 17], [20, 28]],
      ["Snare", [9, 25], [16, 32]],
      ["Rim", [6, 14, 22, 30]],
      ["Hat", [], [3, 5, 7, 11, 13, 15, 19, 21, 23, 27, 29, 31]],
      ["Tom", [], [30, 31, 32]],
    ],
    note: "One snare per bar leaves room for long pads and vocal chops. The quiet hat bed and the tom pickup into bar 1 keep it moving without crowding it." },
  { id: "fg-rolling", family: "futuregarage", name: "Rolling melodic garage", bpm: "128–132 BPM, swung", tempo: 130, swing: 0.36, length: 32,
    rows: [
      ["Kick", [1, 7, 11, 17, 23, 26]],
      ["Clap", [5, 13, 21, 29], [31]],
      ["Rim", [10, 16, 26, 32], [4, 20]],
      ["Hat", [3, 7, 11, 15, 19, 23, 27, 31], [2, 6, 10, 14, 18, 22, 26, 30]],
      ["Open hat", [15, 31]],
      ["Shaker", [], [4, 8, 12, 16, 20, 24, 28, 32]],
    ],
    note: "Denser and bouncier, for the melodic end of the genre. Heavy swing on the hats, and let the open hat breathe into the next bar." },

  // Hardwave: wave melodies with club and hard dance drums; drops usually four-on-the-floor, with half-time sections
  { id: "hw-drop", family: "hardwave", name: "Hardwave drop", bpm: "145–155 BPM", tempo: 150, length: 32,
    rows: [
      ["Kick", [1, 5, 9, 13, 17, 21, 25, 29]],
      ["Clap", [5, 13, 21, 29]],
      ["Open hat", [3, 7, 11, 15, 19, 23, 27]],
      ["Hat", [1, 5, 9, 13, 17, 21, 25], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]],
      ["Snare", [29, 30, 31, 32], [28]],
    ],
    note: "Driving kick under offbeat hats, with a snare roll into the next phrase. Sidechain everything to the kick hard; the pumping is part of the sound." },
  { id: "hw-halftime", family: "hardwave", name: "Hardwave half-time", bpm: "145–155 BPM, half-time feel", tempo: 150, length: 32,
    rows: [
      ["Kick", [1, 8, 11, 17, 27], [24]],
      ["Snare", [9, 25]],
      ["Hat", [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], [26, 27, 28, 29, 30, 31, 32]],
      ["Open hat", [15]],
      ["Clap", [], [31]],
    ],
    note: "Trap-style hats with a roll at the end of bar 2 (use Note Repeat at 1/16 or 1/32). Use this for intros and breakdowns, then switch to the four-on-the-floor drop." },
  { id: "hw-drive", family: "hardwave", name: "Hard dance drive", bpm: "150 BPM", tempo: 150,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Ride", OFFBEATS], ["Shaker", EVEN16, EIGHTHS], ["Rim", [8, 15]]],
    note: "Borrowed from hardstyle and hard trance: a long, distorted kick with a pitched tail carries the low end, so keep the bass off the kick." },

  // Ambient: sparse or no drums
  { id: "ambient-pulse", family: "ambient", name: "Ambient pulse", bpm: "70–90 BPM", tempo: 80, length: 32,
    rows: [
      ["Tom", [1, 17], [11, 27]],
      ["Shaker", [], [3, 7, 11, 15, 19, 23, 27, 31]],
      ["Rim", [], [14, 22]],
    ],
    note: "No kick, just a soft heartbeat and texture. Turn velocity way down and send it to a long reverb." },
  { id: "ambient-techno", family: "ambient", name: "Ambient techno", bpm: "110–120 BPM", tempo: 116,
    rows: [["Kick", [], FOUR], ["Hat", [], OFFBEATS], ["Ride", [], [2, 6, 10, 14]], ["Rim", [], [11]]],
    note: "Everything is ghosted: a muffled kick and hats that sit under pads. Low-pass the drum bus around 2–4 kHz." },

  // Hip-hop and trap
  { id: "trap", family: "hiphop", name: "Trap", bpm: "140 BPM, half-time", tempo: 140,
    rows: [["Kick", [1, 4, 11]], ["Clap", [9]], ["Hat", ALL16], ["Open hat", [15]]],
    note: "Steady 16th hats with rolls and triplet flips (Note Repeat at 1/16t or 1/32). Let a long 808 follow the kick." },
  { id: "boom-bap", family: "hiphop", name: "Boom bap", bpm: "85–95 BPM", tempo: 90, swing: 0.25,
    rows: [["Kick", [1, 8, 11], [16]], ["Snare", BACKBEAT], ["Hat", EIGHTHS, EVEN16]],
    note: "Swing it and don't quantize too tightly. Layer the snare with a clap or rim from a sampled break." },
  { id: "lofi", family: "hiphop", name: "Lo-fi hip-hop", bpm: "70–85 BPM", tempo: 78, swing: 0.3,
    rows: [["Kick", [1, 11], [8]], ["Snare", BACKBEAT], ["Hat", EIGHTHS], ["Rim", [16]]],
    note: "Lazy and swung. Low-pass the whole drum bus a little and add vinyl noise for the classic sound." },

  // Latin and retro
  { id: "reggaeton", family: "world", name: "Reggaeton (dembow)", bpm: "90–100 BPM", tempo: 95,
    rows: [["Kick", FOUR], ["Snare", [4, 7, 12, 15]], ["Hat", EIGHTHS]],
    note: "The dembow rhythm: snare on the 'a' of 1 and the 'and' of 2 in every half bar, over a four-on-the-floor kick." },
  { id: "synthwave", family: "world", name: "Synthwave", bpm: "100–118 BPM", tempo: 110,
    rows: [["Kick", FOUR], ["Snare", BACKBEAT], ["Hat", EIGHTHS], ["Tom", [], [14, 15, 16]]],
    note: "Big, gated-reverb snare on 2 and 4 is the signature. Use Hybrid Reverb with a short gate, or a Gate after the reverb." },
]

/** MIDI notes on a Drum Rack (C1 = 36 is the first pad), matching General MIDI drums. */
export const LANE_NOTE: Record<Lane, number> = { Kick: 36, Rim: 37, Snare: 38, Clap: 39, Hat: 42, Tom: 45, "Open hat": 46, Ride: 51, Cowbell: 56, Shaker: 70 }
