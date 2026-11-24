import type { LaneState } from "./labs"

/**
 * Arrangement templates: how a typical track in each genre is laid out.
 * Lanes are always Kick, Drums, Bass, Chords, Lead, FX, so the player can map
 * them onto the loop builder's parts.
 */
export interface ArrSection { name: string; bars: number; lanes: LaneState[] }
export interface ArrTemplate { id: string; family: string; name: string; tempo: number; sections: ArrSection[]; note: string }

export const ARR_LANES = ["Kick", "Drums", "Bass", "Chords", "Lead", "FX"] as const
export const ARR_LANE_HELP = ["The kick drum on its own", "Snare, clap, hats and percussion", "Bass", "Chords and pads", "Lead, pluck or hook", "Risers, impacts and sweeps"]

const S = (name: string, bars: number, l: string): ArrSection => ({
  name, bars,
  // One letter per lane: o on, - off, h half, f filtered, r riser, i impact, s sweep.
  lanes: l.split("").map((c) => ({ o: "on", "-": "off", h: "half", f: "filt", r: "riser", i: "impact", s: "sweep" })[c] as LaneState),
})

export const ARR_TEMPLATES: ArrTemplate[] = [
  {
    id: "prog", family: "prog", name: "Progressive house", tempo: 124,
    note: "Long intro and outro for DJs, a melodic breakdown, and two drops that build on each other.",
    sections: [S("Intro", 16, "oh-f--"), S("Build", 8, "ooffhr"), S("Drop", 16, "oooooi"), S("Breakdown", 16, "---oh-"), S("Build", 8, "hofoor"), S("Drop", 16, "oooooi"), S("Outro", 16, "oh-f-s")],
  },
  {
    id: "wave", family: "wave", name: "Wave", tempo: 140,
    note: "Atmosphere first, a big half-time drop, a quiet break, then a heavier second drop.",
    sections: [S("Intro", 8, "---f--"), S("Build", 8, "-hfohr"), S("Drop", 16, "oooooi"), S("Break", 8, "---oh-"), S("Build", 8, "-ofoor"), S("Drop", 16, "oooooi"), S("Outro", 8, "--hf-s")],
  },
  {
    id: "trance", family: "trance", name: "Trance anthem", tempo: 138,
    note: "A groove section, then the long breakdown with the full melody, a snare-roll build and the climax.",
    sections: [S("Intro", 16, "oho---"), S("Groove", 16, "oooh--"), S("Breakdown", 16, "---ohs"), S("Build", 8, "-hfoor"), S("Climax", 16, "oooooi"), S("Outro", 16, "ohof-s")],
  },
  {
    id: "techno", family: "techno", name: "Techno", tempo: 130,
    note: "Few sections, long and hypnotic. Change one thing every 16 bars, and let filters do the storytelling.",
    sections: [S("Intro", 16, "oh----"), S("Groove", 32, "oof---"), S("Peak", 32, "oooh-i"), S("Break", 8, "--fo-s"), S("Peak", 32, "oooo-i"), S("Outro", 16, "oh----")],
  },
  {
    id: "phonk", family: "phonk", name: "Drift phonk", tempo: 140,
    note: "Short and loop-based: the cowbell riff hooks you in, then the 808 drops.",
    sections: [S("Intro", 4, "---fo-"), S("Drop", 16, "oooooi"), S("Switch", 8, "-ho-o-"), S("Drop", 16, "oooooi"), S("Outro", 4, "----hs")],
  },
  {
    id: "dnb", family: "dnb", name: "Drum and bass", tempo: 174,
    note: "DJ intro, a long build, the drop at bar 33, a breakdown, then a second drop with a bass switch.",
    sections: [S("Intro", 16, "-h-f--"), S("Build", 16, "oofohr"), S("Drop", 32, "oooo-i"), S("Breakdown", 16, "--hoo-"), S("Drop", 32, "oooooi"), S("Outro", 16, "oho---")],
  },
  {
    id: "futuregarage", family: "futuregarage", name: "Future garage", tempo: 136,
    note: "Textures fade in before the drums, and sections blur into each other rather than drop.",
    sections: [S("Intro", 8, "---f--"), S("Verse", 16, "hoho--"), S("Theme", 16, "ooooo-"), S("Break", 8, "--fo--"), S("Theme", 16, "ooooo-"), S("Outro", 8, "-h-f-s")],
  },
  {
    id: "house", family: "house", name: "House", tempo: 124,
    note: "Groove-led: drums carry the intro, the chords arrive with a vocal or stab, and the break resets energy.",
    sections: [S("Intro", 16, "oo----"), S("Groove", 16, "ooof--"), S("Main", 16, "ooooo-"), S("Break", 8, "--ho-r"), S("Main", 16, "oooooi"), S("Outro", 16, "oo-f--")],
  },
]

export const SECTION_TIPS: Record<string, string> = {
  Intro: "Give DJs (and listeners) a clean start. Drums alone, or atmosphere, so the first change has impact.",
  Build: "Raise tension: open a filter, add a riser, speed up a snare roll, and drop the kick for the last bar.",
  Drop: "The payoff. Everything plays, the bass and lead carry the hook. Hit the first beat with an impact.",
  Climax: "The biggest moment. Full lead, everything open, no filters.",
  Peak: "The most intense groove. Add one more layer than the section before.",
  Breakdown: "Strip back to the melody and chords. Let the listener breathe before the next build.",
  Break: "A short reset: remove the drums or the bass so the return hits harder.",
  Switch: "Change one main element (a new bass pattern or melody) to keep a short track interesting.",
  Groove: "The steady main section. Drums and bass lock in; small changes every 8 bars.",
  Main: "The full groove with chords and hook.",
  Verse: "A calmer section that sets up the theme.",
  Theme: "The main idea: vocal chops, lead and the full beat.",
  Outro: "Wind down for the mix out. Remove layers one at a time.",
}

/** Rough intensity of a section from what's playing, 0–10. */
export function energyOf(lanes: LaneState[]) {
  const w = [2.2, 1.6, 2.2, 1.4, 1.6]
  let e = 0
  lanes.slice(0, 5).forEach((st, i) => { e += w[i] * (st === "on" ? 1 : st === "half" ? 0.6 : st === "filt" ? 0.45 : 0) })
  const fx = lanes[5]
  if (fx === "riser") e += 0.5
  if (fx === "impact") e += 0.6
  return Math.min(10, Math.round(e * 10) / 10)
}
