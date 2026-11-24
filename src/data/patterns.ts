/**
 * One-bar drum patterns on a 16-step grid (step 1 is the downbeat, 5/9/13 are
 * beats 2–4). Each row is [lane, steps, ghost steps]. Ghost steps play quietly.
 * These are starting points: the defining hits of each style, not transcriptions.
 */
export type Family = "yours" | "house" | "techno" | "bass" | "breaks" | "hiphop" | "world"
export type Lane = "Kick" | "Snare" | "Clap" | "Rim" | "Hat" | "Open hat" | "Shaker" | "Tom" | "Ride"
export interface Pattern {
  id: string
  family: Family
  name: string
  bpm: string
  tempo: number
  /** Suggested swing, 0–0.6 of a 16th. */
  swing?: number
  rows: [Lane, number[], number[]?][]
  note: string
}

export const FAMILIES: [Family | "all", string][] = [
  ["all", "All"],
  ["yours", "Wave, phonk, prog"],
  ["house", "House"],
  ["techno", "Techno and trance"],
  ["bass", "Drum and bass, dubstep"],
  ["breaks", "Breaks and garage"],
  ["hiphop", "Hip-hop and trap"],
  ["world", "Afro, Latin, retro"],
]

const ALL16 = Array.from({ length: 16 }, (_, i) => i + 1)
const EIGHTHS = [1, 3, 5, 7, 9, 11, 13, 15]
const OFFBEATS = [3, 7, 11, 15]
const FOUR = [1, 5, 9, 13]
const BACKBEAT = [5, 13]
const EVEN16 = [2, 4, 6, 8, 10, 12, 14, 16]
const without = (xs: number[], ys: number[]) => xs.filter((x) => !ys.includes(x))

export const PATTERNS: Pattern[] = [
  // Your three genres
  { id: "prog", family: "yours", name: "Progressive house", bpm: "124 BPM", tempo: 124,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Shaker", EVEN16, EIGHTHS]],
    note: "Keep the shaker quiet and vary its velocity so the offbeats lean forward." },
  { id: "wave", family: "yours", name: "Wave", bpm: "140–150 BPM, half-time feel", tempo: 145,
    rows: [["Kick", [1, 8, 11]], ["Snare", [9]], ["Hat", EIGHTHS]],
    note: "Add a 32nd-note hat roll into the snare with Note Repeat, then let the reese carry the low end." },
  { id: "phonk", family: "yours", name: "Drift phonk", bpm: "About 130 BPM", tempo: 130,
    rows: [["Kick", [1, 7, 11]], ["Clap", BACKBEAT], ["Hat", EIGHTHS]],
    note: "Layer two claps, and let the distorted 808 follow the kick. The cowbell melody goes on its own track." },

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
  { id: "trance", family: "techno", name: "Trance", bpm: "136–140 BPM", tempo: 138,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS], ["Hat", ALL16]],
    note: "Rolling 16th hats under a big offbeat open hat. Pull the kick out entirely for the breakdown, then bring it back for the drop." },
  { id: "hardstyle", family: "techno", name: "Hardstyle", bpm: "150 BPM", tempo: 150,
    rows: [["Kick", FOUR], ["Clap", BACKBEAT], ["Open hat", OFFBEATS]],
    note: "The distorted, pitched kick is the lead instrument. Keep the rest sparse so it has room." },

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
export const LANE_NOTE: Record<Lane, number> = { Kick: 36, Rim: 37, Snare: 38, Clap: 39, Hat: 42, Tom: 45, "Open hat": 46, Ride: 51, Shaker: 70 }
