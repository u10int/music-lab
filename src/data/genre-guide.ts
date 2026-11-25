import type { Family } from "./patterns"

/** A reference to listen to: an artist, and a track when we name one. */
export interface Ref { artist: string; track?: string; year?: number; why: string }
/** Another chord move that suits the genre, as scale degrees (0 = the key's root chord). */
export interface Move { prog: number[]; name: string; note: string }

/** The deeper, jamburgr-style guide for a genre: how it grooves, what each part does and what to study. */
export interface GenreGuide {
  tagline: string
  era: string
  moods: string[]
  /** Chord colour: 0 plain triads, 7 sevenths, 9 ninths. */
  ext: 0 | 7 | 9
  moves: Move[]
  groove: string
  parts: [string, string][]
  refs: Ref[]
}

export const GENRE_GUIDE: Record<Family, GenreGuide> = {
  wave: {
    tagline: "Half-time drums, a heavy low end and pads that fill the room.",
    era: "2015–present", moods: ["dreamy", "melancholic", "dark", "spacious"], ext: 9,
    moves: [
      { prog: [0, 6, 5, 6], name: "Rising sadness", note: "i–VII–VI–VII never lands back home, so the loop keeps longing." },
      { prog: [0, 2, 6, 5], name: "Open sky", note: "i–III–VII–VI lifts through the major chords before sinking back." },
    ],
    groove: "Half-time: a kick on 1, the snare or clap on beat 3, and ghost kicks pushing into the next bar. Hats sit on 8ths with quick 32nd or triplet flicks before the snare. Leave space; the pads and reverb tails do the filling.",
    parts: [["Drums", "Trap-style kit: punchy kick, clap layered with a snare, crisp hats with rolls."], ["Bass", "Clean mono 808 or reese, sidechained to the kick, with a lightly distorted mid layer."], ["Pads", "Wide wavetable or granular pad with a slow attack and a long reverb."], ["Lead", "Sparse glassy lead or pluck with glide; often an octave above the pad."], ["Vocals", "Breathy one-shots and chops, pitched and formant-shifted, drenched in reverb."]],
    refs: [{ artist: "Klimeks", why: "Atmosphere first: long pads and space." }, { artist: "Skeler", why: "Driving drums under emotional chords." }, { artist: "Sidewalks and Skeletons", why: "The darker, witch-house end." }, { artist: "Kareful", why: "Huge, reverb-heavy drops." }],
  },
  phonk: {
    tagline: "Memphis rap samples, distorted 808s and a cowbell riff.",
    era: "1990s roots, 2019–present", moods: ["menacing", "gritty", "hypnotic", "fast"], ext: 0,
    moves: [
      { prog: [0, 0, 1, 0], name: "Flat-two menace", note: "Sitting on i and stabbing the ♭II is the whole sound of Phrygian." },
      { prog: [0, 5, 6, 0], name: "Short loop", note: "i–VI–VII–i keeps the riff circling without a lift." },
    ],
    groove: "Drift phonk drives a four-on-the-floor kick with claps on 2 and 4 and a busy 8th-note cowbell. Memphis-style phonk is half-time and dustier, with the snare on 3 and swung hats.",
    parts: [["Drums", "Hard kick, tight clap, 808 hats; everything saturated."], ["Bass", "Long-tail 808 with glide, distorted so it reads on phones."], ["Cowbell", "The 808 cowbell played as the melody, short and syncopated."], ["Vocals", "Chopped, pitched Memphis rap phrases, dry and crunchy."]],
    refs: [{ artist: "Kordhell", track: "Murder in My Mind", year: 2021, why: "The drift phonk template: cowbell, 808, chant." }, { artist: "DVRST", track: "Close Eyes", year: 2021, why: "Slower and moodier, with the vocal hook up front." }, { artist: "INTERWORLD", track: "Metamorphosis", year: 2021, why: "The cowbell riff carrying a whole track." }],
  },
  driftwave: {
    tagline: "Drift phonk’s cowbell and 808 with wave’s pads and melancholy.",
    era: "2021–present", moods: ["nostalgic", "driving", "hazy", "bittersweet"], ext: 7,
    moves: [
      { prog: [0, 6, 5, 6], name: "Late-night loop", note: "i–VII–VI–VII; the cowbell can sit on the chord tones of each." },
      { prog: [0, 5, 3, 4], name: "Darker turn", note: "i–VI–iv–v keeps it minor all the way round." },
    ],
    groove: "Switches between a driving four-on-the-floor section and a half-time one. The 808 follows the kick, and the cowbell or bell plays 8th-note syncopations on top.",
    parts: [["Drums", "Phonk kit, a little softer: kick, clap, open hats."], ["Bass", "Gliding long-tail 808, sidechained so it pumps."], ["Hook", "Cowbell or FM bell, washed in reverb and delay."], ["Pads", "Wave-style wide pad, low-passed under the hook."], ["Vocals", "Pitched, reverbed chops instead of dry Memphis samples."]],
    refs: [{ artist: "LXST CXNTURY", why: "The darker, heavier edge of the sound." }, { artist: "Narvent", why: "Melancholic hooks over drift drums." }, { artist: "Tokyo Tears", why: "Pads and bells front and centre." }, { artist: "VØJ", why: "Collaborations across wave and phonk." }],
  },
  hardwave: {
    tagline: "Wave’s trap drums with screeching saw basses and hard sidechain.",
    era: "2018–present", moods: ["aggressive", "euphoric", "wide", "heavy"], ext: 9,
    moves: [
      { prog: [0, 5, 2, 4], name: "Hardwave lift", note: "i–VI–III–v with 9ths: big and emotional before the screech." },
      { prog: [0, 6, 5, 4], name: "Falling line", note: "i–VII–VI–v steps down, good under a long breakdown." },
    ],
    groove: "Half-time trap: a syncopated 808 kick, snare and clap together on beat 3, and hats that roll into the next bar. Some tracks switch to four on the floor for a section to lift the energy.",
    parts: [["Drums", "Punchy trap kit, layered snare and clap, rolling hats."], ["Bass", "Screech saw bass through a moving band-pass, heavily driven."], ["808", "Slow 808 with glide under the bass for weight."], ["Pads", "Wide 9th-chord pad, pumping from the sidechain."], ["Lead", "FM screech or supersaw lead for the hook."]],
    refs: [{ artist: "Juche", why: "Defines the screech-bass sound." }, { artist: "Ennja", why: "Heavy drops with melodic breakdowns." }, { artist: "Artonoise", why: "Aggressive, fast hardwave." }, { artist: "ROUDS", why: "Where wave and hardwave meet." }],
  },
  prog: {
    tagline: "Long builds, rolling basslines and slowly evolving melodies.",
    era: "1990s–present", moods: ["hypnotic", "uplifting", "patient", "melodic"], ext: 7,
    moves: [
      { prog: [0, 5, 2, 6], name: "Classic lift", note: "i–VI–III–VII, the most common progressive house loop." },
      { prog: [5, 2, 6, 0], name: "Start on VI", note: "Starting on the major VI makes the same chords feel brighter." },
    ],
    groove: "Four on the floor, claps on 2 and 4, offbeat open hats, and 16th shakers. The bass plays rolling offbeat 16ths, and elements arrive one at a time every 8 or 16 bars.",
    parts: [["Drums", "Clean kick, clap, offbeat open hat, shaker loop."], ["Bass", "Rolling offbeat bass, sidechained."], ["Pluck", "Filtered pluck arp that slowly opens over the track."], ["Pad", "Warm pad under the breakdown."], ["FX", "Long risers and sweeps between sections."]],
    refs: [{ artist: "Eric Prydz", track: "Opus", year: 2015, why: "One idea developed over a long build." }, { artist: "deadmau5", track: "Strobe", year: 2009, why: "A slow, patient build to the main theme." }, { artist: "Lane 8", why: "Modern, melodic and soft-edged." }],
  },
  odesza: {
    tagline: "Cinematic, chopped-vocal electronica with big drums and warm synths.",
    era: "2012–present", moods: ["euphoric", "cinematic", "warm", "hopeful"], ext: 9,
    moves: [
      { prog: [3, 4, 5, 0], name: "IV–V–vi–I", note: "Climbs to the vi then resolves home; the big emotional chorus move." },
      { prog: [0, 4, 5, 3], name: "Pop loop", note: "I–V–vi–IV; let the vocal chops make it fresh." },
    ],
    groove: "Mid-tempo with a heavy half-time feel in places: big kick, snare on 2 and 4 or on 3, and live-sounding percussion, toms and claps layered for size.",
    parts: [["Drums", "Big, roomy kit with toms and layered claps."], ["Vocals", "Pitched and chopped vocal phrases as the hook."], ["Chords", "Warm saw or piano chords, sidechained."], ["Bass", "Round sub with a soft saw on top."], ["Texture", "Brass, strings or field recordings for scale."]],
    refs: [{ artist: "ODESZA", track: "Say My Name", year: 2014, why: "Chopped vocals as the hook." }, { artist: "ODESZA", track: "A Moment Apart", year: 2017, why: "The cinematic build and drop." }, { artist: "Tycho", why: "The softer, guitar-and-synth side." }],
  },
  futuregarage: {
    tagline: "Swung, broken garage drums, ghostly vocals and crackle.",
    era: "2006–present", moods: ["nocturnal", "rainy", "lonely", "intimate"], ext: 9,
    moves: [
      { prog: [0, 5, 3, 4], name: "Night bus", note: "i–VI–iv–v keeps everything minor and unresolved." },
      { prog: [0, 3, 0, 5], name: "Two-chord drift", note: "Alternating i and iv with a VI turn: almost static." },
    ],
    groove: "Two-step garage: the kick skips beat 3, the snare is on 2 and 4, and hats and shakers are swung and slightly off the grid. Leave plenty of gaps.",
    parts: [["Drums", "Thin, swung garage kit, often sampled and low-passed."], ["Bass", "Deep sub or a soft reese."], ["Vocals", "Pitched, reversed and reverbed R&B fragments."], ["Pads", "Dark, filtered chords."], ["Texture", "Vinyl crackle, rain, distant city sound."]],
    refs: [{ artist: "Burial", track: "Archangel", year: 2007, why: "The template: swung drums and ghostly vocals." }, { artist: "Burial", track: "Near Dark", year: 2007, why: "Crackle and space as part of the music." }, { artist: "Sorrow", why: "The melodic, modern side." }],
  },
  house: {
    tagline: "Four on the floor, offbeat hats and a bassline that moves.",
    era: "1984–present", moods: ["groovy", "warm", "uplifting", "danceable"], ext: 7,
    moves: [
      { prog: [0, 3, 6, 5], name: "Classic house", note: "i–iv–VII–VI, a soulful minor loop." },
      { prog: [0, 3, 0, 3], name: "Two-chord vamp", note: "i–iv back and forth leaves room for a vocal." },
    ],
    groove: "Kick on every beat, clap on 2 and 4, closed hats on every offbeat, and a shaker or percussion layer on 16ths. A little swing keeps it human.",
    parts: [["Drums", "909 or 808 kick, clap, offbeat hats."], ["Bass", "A moving bassline that answers the kick."], ["Chords", "Piano or organ stabs, or a warm pad."], ["Vocal", "Soulful vocal hook or chops."]],
    refs: [{ artist: "Marshall Jefferson", track: "Move Your Body", year: 1986, why: "Piano-led classic house." }, { artist: "Frankie Knuckles", track: "Your Love", year: 1987, why: "Warm pads and a hypnotic bassline." }, { artist: "Mr. Fingers", track: "Can You Feel It", year: 1986, why: "Chords and bass doing everything." }],
  },
  deephouse: {
    tagline: "Jazzy 9th chords, a walking bass and a soft, steady groove.",
    era: "Mid-1980s–present", moods: ["warm", "soulful", "rooted", "jazzy"], ext: 9,
    moves: [
      { prog: [0, 3, 6, 2], name: "Modal cycle", note: "i–IV–VII–III in Dorian: the IV is major, which lifts it." },
      { prog: [0, 3, 0, 3], name: "Dorian vamp", note: "Two chords, i9 and IV9, for a long hypnotic groove." },
    ],
    groove: "Soft kick on every beat, a rimshot or clap on 2 and 4, offbeat hats sitting slightly behind the beat. The bass walks between chord tones on the offbeats.",
    parts: [["Chords", "Rhodes, organ or pad stabs with 9ths, rootless so the bass has room."], ["Bass", "Round, walking offbeat bass."], ["Pad", "Warm, low-passed pad."], ["Drums", "Soft, swung kit with shakers."], ["Vocal", "Soulful chops or a spoken phrase."]],
    refs: [{ artist: "Mr. Fingers", track: "Mystery of Love", year: 1985, why: "Where deep house starts." }, { artist: "Kerri Chandler", why: "Chords, bass and a swung groove." }, { artist: "Moodymann", why: "Sample-based, soulful and raw." }],
  },
  techhouse: {
    tagline: "Rolling bass, punchy drums and a groove built for the club.",
    era: "1990s–present", moods: ["groovy", "punchy", "playful", "driving"], ext: 0,
    moves: [
      { prog: [0, 0, 0, 0], name: "One chord", note: "Most tech house barely changes chord; the bass rhythm is the hook." },
      { prog: [0, 0, 5, 6], name: "Turnaround", note: "i–i–VI–VII adds a small lift every 4 bars." },
    ],
    groove: "Four on the floor with a tight clap, rolling 16th hats, and percussion loops. The bassline is short and syncopated, answering the kick on the offbeats.",
    parts: [["Drums", "Punchy kick, tight clap, busy percussion."], ["Bass", "Short, rubbery bassline with filter movement."], ["Vocal", "A short, repeated vocal hook or shout."], ["FX", "Sweeps and percussion fills between sections."]],
    refs: [{ artist: "FISHER", track: "Losing It", year: 2018, why: "A bassline and a build doing everything." }, { artist: "Green Velvet", track: "La La Land", year: 2001, why: "Vocal-led, quirky and minimal." }, { artist: "Chris Lake", why: "Modern, bass-led tech house." }],
  },
  discohouse: {
    tagline: "Filtered disco samples looped over a house beat.",
    era: "1990s–present", moods: ["joyful", "funky", "sunny", "retro"], ext: 7,
    moves: [
      { prog: [1, 4, 0, 5], name: "Disco ii–V–I–vi", note: "Jazz-funk chords that keep cycling." },
      { prog: [0, 3, 4, 3], name: "I–IV–V–IV", note: "Bright and simple for a filtered loop." },
    ],
    groove: "House beat with a fuller, live-feeling groove: offbeat open hats, tambourine, and a funky, octave-jumping bassline. The loop is often filtered in and out.",
    parts: [["Loop", "A disco sample or played chords through a sweeping filter."], ["Bass", "Octave-jumping funk bass."], ["Drums", "House kit with tambourine and congas."], ["Vocal", "A short vocal phrase looped and filtered."]],
    refs: [{ artist: "Daft Punk", track: "One More Time", year: 2000, why: "Filtered, pumping and vocal-led." }, { artist: "Stardust", track: "Music Sounds Better with You", year: 1998, why: "A single loop, filtered and compressed." }, { artist: "Modjo", track: "Lady (Hear Me Tonight)", year: 2000, why: "Guitar loop with a pop vocal." }],
  },
  basshouse: {
    tagline: "House drums with growling, distorted bass as the lead.",
    era: "2010s–present", moods: ["heavy", "bouncy", "aggressive", "playful"], ext: 0,
    moves: [
      { prog: [0, 0, 0, 0], name: "One chord", note: "The bass riff carries all the movement." },
      { prog: [0, 0, 5, 6], name: "Riff turnaround", note: "Move the riff to VI and VII in the last bar of each phrase." },
    ],
    groove: "Four on the floor, clap on 2 and 4, rolling hats. The bass plays short, syncopated stabs between the kicks, often with pitch bends.",
    parts: [["Bass", "Distorted, formant-heavy or FM bass with movement."], ["Drums", "Hard kick and clap, rolling hats."], ["Vocal", "Short hype vocal or chopped phrase."], ["FX", "Risers, impacts and bass fills."]],
    refs: [{ artist: "Jauz", why: "Big, heavy bass house drops." }, { artist: "Habstrakt", why: "Growling, French-style bass." }, { artist: "AC Slater", why: "Night Bass: groovier, UK-influenced." }],
  },
  afrohouse: {
    tagline: "Rolling percussion, deep grooves and haunting melodies.",
    era: "2000s–present", moods: ["hypnotic", "spiritual", "rolling", "warm"], ext: 7,
    moves: [
      { prog: [0, 3, 0, 4], name: "Minor vamp", note: "i–iv–i–v keeps it dark and circling." },
      { prog: [0, 6, 5, 6], name: "Rising loop", note: "i–VII–VI–VII lifts under a vocal." },
    ],
    groove: "Four on the floor with layers of congas, shakers and rimshots playing cross-rhythms over the beat. Amapiano adds a pitched log-drum bass on syncopated hits.",
    parts: [["Percussion", "Congas, bongos, shakers and claves in interlocking patterns."], ["Bass", "Deep sub, or a pitched log drum in amapiano."], ["Melody", "Marimba, flute or a soft pluck."], ["Vocal", "Chanted or soulful vocal phrases."]],
    refs: [{ artist: "Black Coffee", why: "Deep, minimal afro house." }, { artist: "Kabza De Small", why: "Amapiano’s log-drum sound." }, { artist: "Culoe De Song", why: "Melodic, spiritual afro house." }],
  },
  techno: {
    tagline: "A relentless kick, hypnotic loops and sound design as the melody.",
    era: "1987–present", moods: ["driving", "dark", "hypnotic", "industrial"], ext: 0,
    moves: [
      { prog: [0, 0, 0, 0], name: "No chords", note: "Techno often sits on one note; change the sound, not the harmony." },
      { prog: [0, 0, 0, 1], name: "♭II stab", note: "A flat-two stab every four bars adds tension." },
    ],
    groove: "Four on the floor, offbeat hats, a clap or snare on 2 and 4 or only on 3, and a rumble or bass on the offbeats. Change happens through filters and adding or removing loops.",
    parts: [["Kick", "The loudest element; often with a rumble tail."], ["Hats", "Offbeat open hats and busy 16th closed hats."], ["Synth", "A short stab or sequence, slowly filtered."], ["Texture", "Noise, reverb tails and industrial hits."]],
    refs: [{ artist: "Jeff Mills", track: "The Bells", year: 1997, why: "A single hypnotic loop." }, { artist: "Rhythim Is Rhythim", track: "Strings of Life", year: 1987, why: "Detroit techno’s melodic side." }, { artist: "Amelie Lens", why: "Modern, driving peak-time techno." }],
  },
  minimal: {
    tagline: "Tiny clicks, deep space and grooves that change very slowly.",
    era: "1990s–present", moods: ["hypnotic", "subtle", "deep", "playful"], ext: 0,
    moves: [
      { prog: [0, 0, 0, 0], name: "One note", note: "A single bass note; the groove is the music." },
      { prog: [0, 0, 3, 0], name: "Small move", note: "One bar on iv every four bars is enough." },
    ],
    groove: "Kick on every beat, light clicks and rims instead of claps, and swung micro-percussion. Notes are short, with lots of silence between them.",
    parts: [["Kick", "Soft, short kick."], ["Percussion", "Clicks, rims and tiny sampled sounds, swung."], ["Bass", "Short, deep notes with subtle filter movement."], ["Texture", "Dub delays on small sounds."]],
    refs: [{ artist: "Plastikman", track: "Spastik", year: 1993, why: "Percussion only, endlessly varied." }, { artist: "Ricardo Villalobos", why: "Long, hypnotic, swung grooves." }, { artist: "Richie Hawtin", why: "Stripped-back and precise." }],
  },
  hardtechno: {
    tagline: "Fast, distorted kicks and relentless energy.",
    era: "1990s, revived 2018–present", moods: ["relentless", "intense", "raw", "fast"], ext: 0,
    moves: [
      { prog: [0, 0, 0, 1], name: "Phrygian stab", note: "A ♭II hit at the end of each phrase." },
      { prog: [0, 0, 0, 0], name: "One note", note: "Drive comes from the kick and rumble alone." },
    ],
    groove: "Four on the floor at 145–155 BPM, a distorted kick with a rumble on the offbeats, rolling 16th hats and offbeat open hats.",
    parts: [["Kick", "Distorted, with a long rumble or bass tail."], ["Hats", "Rolling 16ths and offbeat opens."], ["Lead", "Rave stab or hoover, short and repetitive."], ["Vocal", "Short shouted or spoken samples."]],
    refs: [{ artist: "I Hate Models", why: "Emotional, industrial hard techno." }, { artist: "Charlotte de Witte", why: "Acid-tinged, driving." }, { artist: "999999999", why: "Raw, fast and acid." }],
  },
  dubtechno: {
    tagline: "Echoing chord stabs swimming in delay and hiss.",
    era: "1993–present", moods: ["deep", "foggy", "meditative", "warm"], ext: 7,
    moves: [
      { prog: [0, 0, 0, 0], name: "One chord", note: "A single minor 7th stab, filtered and echoed." },
      { prog: [0, 3, 0, 3], name: "Slow sway", note: "i7 to iv7 every bar or two." },
    ],
    groove: "Soft four-on-the-floor kick, quiet hats, and a chord stab on an offbeat that echoes through a filtered delay. The delay feedback and filter are played like instruments.",
    parts: [["Chord", "Minor 7th stab through a filtered dub delay."], ["Kick", "Soft, round kick."], ["Bass", "Deep sub, barely moving."], ["Texture", "Tape hiss, vinyl noise and reverb."]],
    refs: [{ artist: "Basic Channel", track: "Phylyps Trak", year: 1993, why: "The original dub techno sound." }, { artist: "Deepchord", why: "Hazy, field-recording-heavy dub techno." }, { artist: "Rhythm & Sound", why: "Dub techno with reggae roots." }],
  },
  trance: {
    tagline: "Rolling bass, big supersaws and euphoric breakdowns.",
    era: "1990s–present", moods: ["euphoric", "uplifting", "epic", "emotional"], ext: 0,
    moves: [
      { prog: [0, 5, 2, 6], name: "Euphoric loop", note: "i–VI–III–VII: the classic trance chord loop." },
      { prog: [5, 6, 0, 0], name: "Breakdown climb", note: "VI–VII–i–i, building into the drop." },
    ],
    groove: "Four on the floor at 136–140, offbeat open hats, 16th closed hats, and a rolling offbeat bass. The breakdown drops the kick for 16–32 bars, then a snare roll returns to the drop.",
    parts: [["Bass", "Rolling offbeat 16th bass, sidechained."], ["Lead", "Supersaw lead with lots of unison, reverb and delay."], ["Arp", "16th arp or gated pad driving the energy."], ["Pad", "Big, wide pad in the breakdown."], ["FX", "Snare rolls, risers and crashes."]],
    refs: [{ artist: "Paul van Dyk", track: "For an Angel", year: 1998, why: "Arps and an uplifting melody." }, { artist: "ATB", track: "9 PM (Till I Come)", year: 1998, why: "A memorable lead over a simple groove." }, { artist: "Tiësto", track: "Adagio for Strings", year: 2004, why: "The epic, big-room trance build." }],
  },
  hardstyle: {
    tagline: "Distorted kicks, euphoric melodies and big drops.",
    era: "2000s–present", moods: ["euphoric", "aggressive", "epic", "loud"], ext: 0,
    moves: [
      { prog: [0, 5, 6, 4], name: "Euphoric", note: "i–VI–VII–v builds a strong, heroic feel." },
      { prog: [5, 6, 0, 0], name: "Climb", note: "VI–VII–i lifts into the kick." },
    ],
    groove: "Four on the floor at 150, with a long, pitched, distorted kick that also acts as the bass. Offbeat hats, claps on 2 and 4, and a long melodic breakdown before the climax.",
    parts: [["Kick", "Layered, distorted, pitched kick with a tail tuned to the key."], ["Lead", "Huge supersaw or screech lead."], ["Pad", "Big chords under the breakdown."], ["Vocal", "Spoken intro or anthemic vocal."]],
    refs: [{ artist: "Headhunterz", why: "Euphoric, melodic hardstyle." }, { artist: "Brennan Heart", why: "Big, anthemic drops." }, { artist: "Sub Zero Project", why: "Modern, heavy kicks." }],
  },
  ambient: {
    tagline: "Slow, drifting sound without a beat to follow.",
    era: "1970s–present", moods: ["calm", "spacious", "drifting", "meditative"], ext: 9,
    moves: [
      { prog: [0, 3, 5, 3], name: "Gentle sway", note: "I–IV–vi–IV, each chord held for a long time." },
      { prog: [0, 0, 3, 3], name: "Two chords", note: "I and IV, two bars each, like breathing." },
    ],
    groove: "Often no drums at all. Time is set by slow swells, repeating notes of different lengths, and long reverb tails.",
    parts: [["Pad", "Slow-attack pad with movement."], ["Texture", "Field recordings, noise and granular sounds."], ["Melody", "Sparse piano or bell notes."], ["Drone", "A low sustained note under everything."]],
    refs: [{ artist: "Brian Eno", track: "An Ending (Ascent)", year: 1983, why: "Simple chords and space." }, { artist: "Aphex Twin", track: "#3", year: 1994, why: "Slow, pure tones (from Selected Ambient Works Volume II)." }, { artist: "Stars of the Lid", why: "Drones built from strings and guitar." }],
  },
  dnb: {
    tagline: "Fast breakbeats, heavy bass and a two-step groove.",
    era: "1990s–present", moods: ["energetic", "rolling", "dark", "fast"], ext: 7,
    moves: [
      { prog: [0, 4, 5, 2], name: "Liquid move", note: "i–v–VI–III, smooth and emotional." },
      { prog: [0, 0, 5, 6], name: "Neuro loop", note: "Mostly one chord; the bass sound changes instead." },
    ],
    groove: "Two-step at 174: kick on 1 and the ‘and’ of 3, snares on 2 and 4, and ghost snares and shakers rolling between them.",
    parts: [["Drums", "Chopped breaks layered with a punchy kick and snare."], ["Bass", "Reese, neuro or round sub, depending on the style."], ["Pad", "Warm chords in liquid; dark atmospheres in neuro."], ["Vocal", "Soulful vocal in liquid; MC or chops in jump-up."]],
    refs: [{ artist: "Goldie", track: "Inner City Life", year: 1994, why: "Breaks, strings and soul." }, { artist: "Pendulum", track: "Watercolour", year: 2010, why: "Big, rock-influenced drops." }, { artist: "Netsky", why: "Liquid, melodic DnB." }],
  },
  jungle: {
    tagline: "Chopped Amen breaks, deep sub bass and reggae samples.",
    era: "1992–present", moods: ["frantic", "raw", "bassy", "playful"], ext: 0,
    moves: [
      { prog: [0, 0, 5, 6], name: "Minor loop", note: "Mostly i, with a VI–VII turn." },
      { prog: [0, 3, 0, 4], name: "Dub move", note: "i–iv–i–v, like a reggae bassline." },
    ],
    groove: "Fast chopped breaks, usually the Amen, rearranged and pitched, with a slow, deep sub bass playing at half the speed of the drums.",
    parts: [["Breaks", "Amen or Think breaks, chopped and rearranged."], ["Bass", "Deep, slow sub, reggae-style."], ["Samples", "Reggae vocals, horns and dub sirens."], ["Pad", "Short atmospheric pads."]],
    refs: [{ artist: "Shy FX", track: "Original Nuttah", year: 1994, why: "Ragga jungle at full power." }, { artist: "Remarc", why: "Intricate, chopped breaks." }, { artist: "Tim Reaper", why: "Modern jungle with classic techniques." }],
  },
  dubstep: {
    tagline: "Half-time drums at 140 with huge wobbling bass.",
    era: "2002–present", moods: ["heavy", "dark", "spacious", "wobbly"], ext: 0,
    moves: [
      { prog: [0, 0, 1, 0], name: "Phrygian menace", note: "Sitting on i with a ♭II move." },
      { prog: [0, 5, 6, 0], name: "Melodic", note: "i–VI–VII–i for melodic dubstep." },
    ],
    groove: "Half-time at 140: kick on 1, snare on 3, sparse hats. The bass carries the rhythm with wobbles and syncopated stabs.",
    parts: [["Bass", "Wobble, growl or deep sub, often resampled."], ["Drums", "Punchy kick and big snare on 3."], ["Pad", "Dark atmospheres in the intro."], ["FX", "Risers, impacts and reverse sounds."]],
    refs: [{ artist: "Skream", track: "Midnight Request Line", year: 2005, why: "Early, minimal UK dubstep." }, { artist: "Benga & Coki", track: "Night", year: 2007, why: "Rhythm and sub as the hook." }, { artist: "Skrillex", track: "Scary Monsters and Nice Sprites", year: 2010, why: "The aggressive US sound." }],
  },
  futurebass: {
    tagline: "Bright, wobbling supersaw chords over half-time drums.",
    era: "2012–present", moods: ["bright", "emotional", "bouncy", "colourful"], ext: 9,
    moves: [
      { prog: [0, 5, 2, 4], name: "Emotional lift", note: "i–VI–III–v with extended chords." },
      { prog: [5, 6, 0, 4], name: "VI–VII–i", note: "A rising, hopeful loop." },
    ],
    groove: "Half-time at 140–160, snare on 3, with chords played in syncopated stabs and volume-shaped by an LFO or sidechain.",
    parts: [["Chords", "Detuned supersaw chords with pitch and volume wobble."], ["Drums", "Trap-style kit with a big snare."], ["Vocal", "Pitched-up vocal chops as the lead."], ["Bass", "Clean sub following the chords."]],
    refs: [{ artist: "Flume", track: "Never Be Like You", year: 2016, why: "Wobbling chords and a pop vocal." }, { artist: "San Holo", track: "Light", year: 2016, why: "Guitar-led, emotional future bass." }, { artist: "Illenium", why: "Big, melodic drops." }],
  },
  ukg: {
    tagline: "Swung two-step beats, chopped vocals and bouncy bass.",
    era: "1990s–present", moods: ["swung", "bouncy", "soulful", "playful"], ext: 7,
    moves: [
      { prog: [0, 4, 5, 6], name: "Garage loop", note: "i–v–VI–VII, soulful and rising." },
      { prog: [0, 3, 0, 3], name: "Organ vamp", note: "i–iv: leave room for a vocal." },
    ],
    groove: "Two-step: the kick skips beats, the snare is on 2 and 4, and everything is swung. Hats are shuffled, and the bass bounces between short notes.",
    parts: [["Drums", "Swung two-step kit with shuffled hats."], ["Bass", "Bouncy, short sub or organ bass."], ["Vocal", "R&B vocal, chopped and pitched."], ["Chords", "Organ or piano stabs."]],
    refs: [{ artist: "Artful Dodger", track: "Re-Rewind", year: 1999, why: "Vocal-led two-step." }, { artist: "MJ Cole", track: "Sincere", year: 1998, why: "Jazzy chords and a swung groove." }, { artist: "Sweet Female Attitude", track: "Flowers", year: 2000, why: "The classic vocal garage sound." }],
  },
  breakbeat: {
    tagline: "Funky sampled breaks with big basslines and riffs.",
    era: "1990s–present", moods: ["funky", "punchy", "rowdy", "energetic"], ext: 0,
    moves: [
      { prog: [0, 0, 5, 6], name: "Riff loop", note: "A riff on i, turning on VI–VII." },
      { prog: [0, 6, 5, 6], name: "Rock move", note: "i–VII–VI–VII, guitar-style." },
    ],
    groove: "Syncopated breakbeats instead of four on the floor: kick on 1 and around the 3, snares on 2 and 4, often from a sampled funk break.",
    parts: [["Breaks", "Funk breaks, layered with punchy hits."], ["Bass", "Big, distorted or acid bass riff."], ["Riff", "Synth or guitar riff."], ["Vocal", "Shouted or sampled vocal hook."]],
    refs: [{ artist: "The Chemical Brothers", track: "Block Rockin’ Beats", year: 1997, why: "Breaks, bass and a vocal sample." }, { artist: "The Prodigy", track: "Firestarter", year: 1996, why: "Punk energy over breaks." }, { artist: "Fatboy Slim", why: "Sample-based big beat." }],
  },
  electro: {
    tagline: "Robotic 808 rhythms and synth basslines.",
    era: "1981–present", moods: ["robotic", "funky", "cold", "futuristic"], ext: 0,
    moves: [
      { prog: [0, 0, 6, 5], name: "Machine loop", note: "i–i–VII–VI keeps it cold and repetitive." },
      { prog: [0, 0, 0, 0], name: "One chord", note: "Let the bass sequence do the moving." },
    ],
    groove: "Syncopated 808 kick patterns, snare or clap on 2 and 4, fast 16th hats. Not four on the floor; the kick dances around the beat.",
    parts: [["Drums", "808 kit: kick, clap, hats, cowbell."], ["Bass", "Sequenced synth bass."], ["Lead", "Simple, cold synth melody."], ["Vocal", "Vocoder or robotic voice."]],
    refs: [{ artist: "Afrika Bambaataa & the Soulsonic Force", track: "Planet Rock", year: 1982, why: "The 808 electro groove." }, { artist: "Cybotron", track: "Clear", year: 1983, why: "Cold, machine funk." }, { artist: "Kraftwerk", track: "Numbers", year: 1981, why: "Where the rhythms came from." }],
  },
  synthwave: {
    tagline: "1980s analog synths, gated drums and neon nostalgia.",
    era: "2006–present", moods: ["nostalgic", "neon", "cinematic", "driving"], ext: 7,
    moves: [
      { prog: [0, 5, 2, 6], name: "Night drive", note: "i–VI–III–VII, the classic synthwave loop." },
      { prog: [0, 6, 5, 4], name: "Descending", note: "i–VII–VI–v for a darker, filmic feel." },
    ],
    groove: "Straight 8th-note feel at 90–115 BPM: big gated snare on 2 and 4, a steady kick, and an 8th-note sequenced bass driving under everything.",
    parts: [["Bass", "8th-note sequenced analog bass."], ["Drums", "Gated reverb snare and drum machine kit."], ["Arp", "Bright square or saw arpeggio."], ["Lead", "Hollow square or saw lead with vibrato."], ["Pad", "Wide, chorused analog pads."]],
    refs: [{ artist: "Kavinsky", track: "Nightcall", year: 2010, why: "Dark, slow and cinematic." }, { artist: "FM-84", track: "Running in the Night", year: 2016, why: "Pop synthwave with vocals." }, { artist: "The Midnight", why: "Sax, nostalgia and big choruses." }],
  },
  trap: {
    tagline: "Long 808s, rolling hats and snares on beat 3.",
    era: "2000s–present", moods: ["dark", "hard", "bouncy", "confident"], ext: 0,
    moves: [
      { prog: [0, 5, 0, 6], name: "Dark loop", note: "i–VI–i–VII, often played as a bell melody." },
      { prog: [0, 0, 1, 0], name: "Phrygian", note: "i with a ♭II for menace." },
    ],
    groove: "Half-time: kick syncopated with the 808, snare or clap on beat 3, and hi-hats on 8ths with 16th, 32nd and triplet rolls.",
    parts: [["808", "Long, gliding 808 tuned to the key."], ["Hats", "Fast, rolling hats with pitch and velocity changes."], ["Melody", "Dark bells, plucks or piano."], ["Snare", "Clap or snare layered on beat 3."]],
    refs: [{ artist: "Baauer", track: "Harlem Shake", year: 2012, why: "EDM trap’s breakout." }, { artist: "RL Grime", why: "Big, cinematic EDM trap." }, { artist: "Metro Boomin", why: "Dark, minimal hip-hop trap production." }],
  },
  boombap: {
    tagline: "Dusty sampled drums, chopped soul loops and a head-nod groove.",
    era: "Late 1980s–present", moods: ["dusty", "soulful", "head-nod", "gritty"], ext: 7,
    moves: [
      { prog: [0, 3, 0, 4], name: "Minor loop", note: "i–iv–i–v, like a chopped soul sample." },
      { prog: [0, 6, 5, 4], name: "Descending", note: "i–VII–VI–v, the jazzy walk-down." },
    ],
    groove: "Around 90 BPM: kick on 1 and around the ‘and’ of 2, a hard snare on 2 and 4, and swung 8th or 16th hats. Nothing is perfectly quantized.",
    parts: [["Drums", "Sampled kick and snare, swung, with a bit of crunch."], ["Sample", "Chopped soul or jazz loop."], ["Bass", "Upright or filtered bass line."], ["Scratches", "Turntable scratches in the hook."]],
    refs: [{ artist: "Nas", track: "N.Y. State of Mind", year: 1994, why: "Dark, piano-loop boom bap." }, { artist: "Gang Starr", track: "Mass Appeal", year: 1994, why: "DJ Premier’s minimal loop and chops." }, { artist: "Pete Rock & CL Smooth", track: "T.R.O.Y.", year: 1992, why: "Horns and a swung groove." }],
  },
  lofi: {
    tagline: "Soft, swung beats with jazzy chords and tape warmth.",
    era: "2000s–present", moods: ["cozy", "nostalgic", "mellow", "warm"], ext: 9,
    moves: [
      { prog: [1, 4, 0, 5], name: "ii–V–I–vi", note: "A jazz turnaround with 7ths and 9ths." },
      { prog: [3, 2, 1, 0], name: "Walk down", note: "IV–iii–ii–I, gentle and resolving." },
    ],
    groove: "70–90 BPM, very swung: lazy kick, soft snare on 2 and 4, and hats dragging behind the beat. Notes are slightly off the grid on purpose.",
    parts: [["Keys", "Rhodes or piano with jazzy 7th and 9th chords."], ["Drums", "Soft, swung, low-passed kit."], ["Bass", "Warm upright or sine bass."], ["Texture", "Vinyl crackle, tape wobble and rain."]],
    refs: [{ artist: "Nujabes", track: "Feather", year: 2005, why: "Jazz chords over a swung beat." }, { artist: "J Dilla", track: "Don’t Cry", year: 2006, why: "The off-grid swing lo-fi borrows." }, { artist: "Jinsang", why: "Soft, modern lo-fi." }],
  },
  reggaeton: {
    tagline: "The dembow rhythm, a deep bass and catchy melodies.",
    era: "1990s–present", moods: ["sensual", "bouncy", "sunny", "danceable"], ext: 0,
    moves: [
      { prog: [0, 5, 2, 6], name: "Pop loop", note: "i–VI–III–VII, the most common reggaeton chord loop." },
      { prog: [0, 3, 6, 5], name: "Romantic", note: "i–iv–VII–VI for a softer feel." },
    ],
    groove: "The dembow at about 95 BPM: kick on every beat, and a snare on the last 16th of beat 1 and the second 16th after beat 2, repeating every half bar. That 3-3-2 push is the whole rhythm; hats and percussion stay light.",
    parts: [["Drums", "Dembow kick and snare, with percussion."], ["Bass", "Deep, simple sub following the chords."], ["Chords", "Plucks, pads or guitar."], ["Vocal", "Catchy melodic vocal hook."]],
    refs: [{ artist: "Daddy Yankee", track: "Gasolina", year: 2004, why: "The classic dembow sound." }, { artist: "Bad Bunny", track: "Tití Me Preguntó", year: 2022, why: "Modern, genre-mixing reggaeton." }, { artist: "Tainy", why: "Producer behind the modern sound." }],
  },
  minimaldeep: {
    tagline: "Two ideas per minute, done precisely.",
    era: "2010s–present", moods: ["minimal", "restrained", "precise", "mid-set"], ext: 7,
    moves: [
      { prog: [0, 0, 0, 0], name: "One stab", note: "A single minor 7th stab all the way through; the vocal chop and bass do the moving." },
      { prog: [0, 3, 0, 4], name: "Small lift", note: "i–iv–i–v, still minor 7ths, for a section that needs a bit more pull." },
    ],
    groove: "Four on the floor at about 124, with an offbeat bass that ducks under every kick. Open hats on the offbeats, closed 16ths kept very low, and a short clap on 2 and 4. A one-bar vocal chop loops as the hook.",
    parts: [["Bass", "Warm sub and mid bass on the offbeats, saturated, mono and heavily sidechained."], ["Chord stab", "A short Rhodes-style minor 7th, sometimes only in the main section."], ["Kick", "Punchy 909-style kick, EQ’d for club systems."], ["Vocal chop", "One bar from a soul or disco phrase, pitched, gated and filtered."], ["Hats", "Open on the offbeats, closed 16ths low with a little stereo width."], ["FX", "Short noise risers and reverse cymbals at section edges."]],
    refs: [{ artist: "Toman", track: "Wisemen", year: 2018, why: "How few elements a club track needs." }, { artist: "Solardo", track: "Tribesmen", year: 2017, why: "Offbeat bass and a loud, clean groove." }, { artist: "Hot Since 82", track: "Like You", year: 2017, why: "A vocal hook carrying a minimal arrangement." }],
  },
  chill: {
    tagline: "Mid-tempo, headphone electronica between house and ambient.",
    era: "2000s–present", moods: ["mellow", "cinematic", "warm", "drive-time"], ext: 9,
    moves: [
      { prog: [0, 6, 5, 6], name: "Slow lift", note: "i–VII–VI–VII, each chord held for two bars." },
      { prog: [5, 2, 6, 0], name: "Start on VI", note: "Starting on the major VI makes the same chords feel like a sunrise." },
    ],
    groove: "Around 100–115 BPM, either a soft four on the floor or a broken, half-time feel. The kick is soft, snares are rare or replaced by rims, and shakers, congas and found sounds carry the rhythm. The bass holds long notes on the chord roots while filters move over 16-bar phrases.",
    parts: [["Chord pad", "Wide poly-synth 9ths with a long attack and a hall reverb."], ["Bass", "Warm sub with a soft mid layer on the roots."], ["Live instruments", "Pitched and processed strings, brass, guitar or vocal phrases."], ["Percussion", "Shakers, congas, processed hats and found sounds, layered."], ["Atmosphere", "Field recordings, room tone and a little vinyl crackle."]],
    refs: [{ artist: "Bonobo", track: "Cirrus", year: 2013, why: "Percussion and bells built into a slow swell." }, { artist: "Tycho", track: "Awake", year: 2014, why: "Guitar, synths and a drive-time pulse." }, { artist: "Kiasmos", track: "Blurred", year: 2014, why: "Piano and minimal techno, patient and wide." }, { artist: "Maribou State", track: "Turnmills", year: 2018, why: "Live instruments over a soft groove." }],
  },
  chillstep: {
    tagline: "Half-time dubstep drums under soft, emotional chords and a clean sub.",
    era: "2009–present", moods: ["emotional", "airy", "melancholic", "spacious"], ext: 9,
    moves: [
      { prog: [5, 6, 0, 0], name: "Rising to home", note: "VI–VII–i: a build that lands on the minor home chord." },
      { prog: [0, 6, 5, 4], name: "Falling", note: "i–VII–VI–v steps down under a long vocal." },
    ],
    groove: "Half-time at 140: kick on 1, a big, reverbed snare on beat 3, and light hats and shakers in between. Compared with dubstep there are fewer hits and more space; the sub and chords carry the drop.",
    parts: [["Drums", "Soft half-time kit with a large, reverbed snare."], ["Sub", "Clean sine sub following the chord roots, sidechained to the kick."], ["Pads and piano", "Lush pads and piano chords with long reverb."], ["Vocal", "Airy, chopped or pitched vocal, often female."], ["Lead", "A soft supersaw or pluck in the drop; no harsh mid basses."]],
    refs: [{ artist: "Blackmill", why: "The soft, melodic chillstep template." }, { artist: "Seven Lions", why: "Melodic dubstep with trance-like chords." }, { artist: "Synx", why: "Ambient, vocal-led chillstep." }],
  },
  ambienttechno: {
    tagline: "Slow, textural techno for headphones, where time is the instrument.",
    era: "1990s–present", moods: ["textural", "spacious", "slow", "heady"], ext: 9,
    moves: [
      { prog: [0, 0, 5, 5], name: "Long drift", note: "i for eight bars, VI for eight: the change should feel like weather." },
      { prog: [0, 2, 5, 4], name: "Open loop", note: "i–III–VI–v, voiced wide across two octaves." },
    ],
    groove: "A soft, recessed four on the floor at 100–120. Hats are glitched or absent, a backbeat is rare, and percussion becomes texture: granular noise, bit-crushed clicks and processed field recordings moving in stereo.",
    parts: [["Pad", "Lush poly synth: 800 ms+ attack, 4 s release, a plate or hall, a slow filter LFO."], ["Sub", "Deep sine on the chord roots, long notes."], ["Lead or arp", "Optional sparse plucks or arps with delay, often at half tempo."], ["Drums", "A low, soft kick and glitchy textures; no backbeat needed."], ["Atmosphere", "Field recordings, granular textures and analog-style noise."]],
    refs: [{ artist: "Aphex Twin", track: "Xtal", year: 1992, why: "Soft kick, voices and pads: the template." }, { artist: "The Black Dog", track: "Object Orient", year: 1995, why: "Glitchy percussion as texture." }, { artist: "B12", track: "Telefone 529", year: 1992, why: "Detroit chords, slowed and spacious." }, { artist: "Global Communication", track: "14:31", year: 1994, why: "Pure atmosphere with a pulse." }],
  },
  liquid: {
    tagline: "Rolling breaks with jazz, soul and warm pads.",
    era: "1990s–present", moods: ["rolling", "soulful", "lush", "jazzy"], ext: 9,
    moves: [
      { prog: [0, 3, 6, 2], name: "Jazz cycle", note: "i–iv–VII–III, every chord a 9th, two bars each." },
      { prog: [5, 6, 0, 0], name: "Soul lift", note: "VI–VII–i for the build into the drop." },
    ],
    groove: "A rolling break at 174 in a cut-time feel: kick on 1 and the ‘and’ of 3, snares on 2 and 4 with ghost snares around them, and continuous 16th hats, often from live drums. The bassline carries much of the melody, with its filter always moving.",
    parts: [["Pads", "Rich poly-synth chords: soft attack, long release, gentle sidechain."], ["Bass", "Sine sub layered with a soft reese mid, low-pass moved by an LFO."], ["Drums", "Chopped Amen or layered breaks, reverb on the snare, light tape on the bus."], ["Lead", "Optional sax, Rhodes or vocal hook, used sparingly."], ["Atmosphere", "Vinyl crackle, jazz piano stabs and field recordings, low in the mix."]],
    refs: [{ artist: "LTJ Bukem", track: "Music", year: 1995, why: "Where liquid starts: jazz and breaks." }, { artist: "High Contrast", track: "Return of Forever", year: 2002, why: "Soulful, sample-based and rolling." }, { artist: "Calibre", why: "Deep, minimal, musical liquid." }, { artist: "London Elektricity", why: "Hospital Records’ jazzy, song-led sound." }],
  },
}

/** A web search for a reference, so the link always lands somewhere useful. */
export const refUrl = (r: Ref) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(r.track ? `${r.artist} ${r.track}` : r.artist)
