/**
 * What to do on each day of the 12-week plan. Each sprint week has four kinds
 * of day: Monday (learn), Tuesday–Thursday (practice), Friday (reference) and
 * the weekend (build). Every day has a warm-up that recalls earlier skills and
 * points at one specific thing to practice, a session plan in timed steps, and
 * a check for when it's done.
 *
 * Tuesday–Thursday days can have three variants, one per day. `{v}` in any text
 * becomes the day's variant, and `{q}` in a link becomes its query string (a
 * key, a drum pattern or a preset), so a link opens the tool set up for today.
 */
export interface DayLink { to: string; label: string }
export interface Drill { text: string; min: number; link?: DayLink }
export interface Step { title: string; detail: string; min: number; link?: DayLink }
export interface Variant { label: string; q?: string; focus: string }
export interface DayPlan {
  /** What you'll have at the end of the session. */
  outcome: string
  variants?: Variant[]
  warmup: Drill[]
  steps: Step[]
  /** You're done when… */
  check: string[]
  tip?: string
  /** Indexes into the sprint's skills that this day practices. */
  skills: number[]
}

const L = (to: string, label: string): DayLink => ({ to, label })

// Warm-ups that come back across sprints, so earlier skills stay fresh.
const W = {
  timing: (bpm = 140): Drill => ({ text: `Two minutes on the timing trainer at ${bpm} BPM: tap quarter notes, then eighths, and watch how early or late you land`, min: 3, link: L("/labs/timing", "Timing trainer") }),
  cards: (deck: string): Drill => ({ text: `Flashcards: ${deck}. Say each answer before you flip`, min: 5, link: L("/flashcards", "Flashcards") }),
  beat: (what: string): Drill => ({ text: `From a blank clip on Push, program ${what} in under 4 minutes, then delete it. Sprint 1 speed, kept sharp`, min: 5 }),
  chords: (key: string, q: string): Drill => ({ text: `Play i–VI–III–VII in ${key} on the grid as triad shapes, eyes off the screen. Sprint 2 hands, kept warm`, min: 5, link: L(`/labs/theory?tab=chords&${q}`, `Chords in ${key}`) }),
  ear: (quiz: string, what: string): Drill => ({ text: `Ten ${what} questions. Aim for 8 right`, min: 5, link: L(`/labs/ear?quiz=${quiz}`, "Ear training") }),
  mixEar: (): Drill => ({ text: "Ten rounds of “which band is boosted” on a loop. Your EQ decisions this sprint lean on this", min: 5, link: L("/labs/mixing", "Mixing ears") }),
  drift: (what: string): Drill => ({ text: `Init Drift and get to ${what} using only the encoders. Sprint 3 muscle memory`, min: 5, link: L("/labs/sound-design?preset=pluck", "Synth playground") }),
}

export const DAY_PLANS: Record<string, DayPlan> = {
  /* ------------------------------------------------------------ Sprint 1: Drive Live from Push */
  "s1-w1-mon": {
    outcome: "A Live Set with a Drum Rack you loaded from Push and a first one-bar beat in the step sequencer.",
    warmup: [
      { text: "On the virtual Push, tap the 16 drum pads and find kick, snare and hat without reading the labels", min: 5, link: L("/push", "Virtual Push") },
      { text: "Read the hardware map once, top to bottom: mode buttons, transport, encoders, pads", min: 5, link: L("/push?tab=hardware", "Hardware map") },
    ],
    steps: [
      { title: "Tour the buttons", detail: "Press Note, Session, Device, Mix and Browse in turn and watch what Live shows. Then find Add Track, Play, Record, Fixed Length, Duplicate, Delete and Undo.", min: 10, link: L("/push?tab=hardware", "Hardware map") },
      { title: "Make a drum track", detail: "Press Add Track and pick MIDI. Press Browse, go to Drums, and load a kit with the Load button: 808 Core Kit for wave and phonk, or any house kit. The pads light up in the drum layout.", min: 10 },
      { title: "Learn the 64-pad layout", detail: "Bottom-left 16 pads play the kit, the top four rows are steps for the selected pad, bottom-right sets loop length. Tap every pad once. Select the kick.", min: 10, link: L("/push?tab=drums", "Drum layouts") },
      { title: "Program four on the floor", detail: "Kick selected: press steps 1, 5, 9 and 13. Select the clap: steps 5 and 13. Closed hat: every other step from 3. Press Play.", min: 15, link: L("/labs/sequencer?pattern=house", "Hear it first") },
      { title: "Swap one sound", detail: "Select the clap pad, press Browse, and audition replacements with the encoder. Load the one that cuts through best.", min: 5 },
    ],
    check: ["You can find Note, Session, Browse and Add Track without looking", "A one-bar beat is playing from a kit you loaded on Push", "You swapped at least one pad's sound from Push"],
    tip: "Keep the mouse out of reach today. When something goes wrong, press Undo, not the mouse.",
    skills: [0, 1],
  },
  "s1-w1-mid": {
    outcome: "A new one-bar {v} beat, programmed on Push and saved in its own clip slot.",
    variants: [
      { label: "straight", q: "pattern=prog", focus: "Straight: every hit on the grid, swing at 0%. Four on the floor, offbeat hats. Steady, like progressive house." },
      { label: "swung", q: "pattern=ukg", focus: "Swung: turn the Swing encoder to 55–62% so every second 16th arrives late. The same pattern suddenly bounces, like UK garage." },
      { label: "half-time", q: "pattern=wave", focus: "Half-time: at 140–150 BPM, put the snare on step 9 only, once per bar. The tempo stays fast but the beat feels half as fast, like wave and trap." },
    ],
    warmup: [
      W.timing(140),
      { text: "Play today's reference pattern and say out loud where the kick and snare land before you program anything", min: 5, link: L("/labs/sequencer?{q}", "Today's pattern") },
      W.cards("Push 3 controls"),
    ],
    steps: [
      { title: "Hear the target", detail: "Play today's pattern. Count the 16 steps and note which ones the kick, snare and hats use.", min: 5, link: L("/labs/sequencer?{q}", "Today's pattern") },
      { title: "Program it on Push", detail: "Pick an empty clip slot on your drum track, set the loop to one bar, and step in kick, then snare, then hats. Match it by ear rather than copying the grid.", min: 15 },
      { title: "Make it {v}", detail: "Follow today's focus above. Play it against yesterday's clip so you hear the difference in feel.", min: 10 },
      { title: "Shape velocity", detail: "Hold a step and turn the velocity encoder. Drop the offbeat hats to about 60% so the beat leans on the downbeats.", min: 10, link: L("/push?tab=drums", "Step sequencer guide") },
      { title: "Record a live layer", detail: "Turn on Fixed Length (1 bar), hold Repeat at 1/16 and play hats over the loop, letting the pressure on the pad set the velocity.", min: 5, link: L("/push?tab=drums", "Note Repeat") },
    ],
    check: ["The beat loops cleanly with no gap", "You changed the velocity of at least four steps", "Played next to yesterday's clip, today's {v} feel is obvious"],
    tip: "Program the kick and snare first. If they feel right, everything else is decoration.",
    skills: [1, 2, 3],
  },
  "s1-w1-fri": {
    outcome: "A one-bar copy of a wave or phonk reference beat, close enough that you could swap it in.",
    warmup: [
      { text: "Play the wave and phonk patterns back to back. Which has the cowbell, and where does each snare land?", min: 5, link: L("/genres/phonk", "Phonk") },
      W.timing(140),
    ],
    steps: [
      { title: "Pick a reference", detail: "Choose a wave or phonk track with an exposed drum section: an intro or a breakdown works best. Loop four bars of it.", min: 5, link: L("/notebook", "Reference notebook") },
      { title: "Kick and snare first", detail: "Tap along on a pad to find the kick pattern, then program it. Do the same for the snare or clap. In wave it's usually a half-time snare on beat 3.", min: 15 },
      { title: "Hats and rolls", detail: "Count the hat rate (8ths or 16ths). For rolls, turn on Fixed Length, set Repeat to 1/32, and play the roll live on the hat pad.", min: 15 },
      { title: "A/B and fix one thing", detail: "Play four bars of the reference, then four of yours. Fix the single biggest difference, usually hat density or the kick placement.", min: 5 },
      { title: "Write it down", detail: "Add the track to your Reference notebook with one line on what makes the groove work.", min: 5, link: L("/notebook", "Reference notebook") },
    ],
    check: ["Kick and snare land where the reference's do", "Hat density and rolls are close", "One note about the groove is in your notebook"],
    skills: [1, 2],
  },
  "s1-w1-wknd": {
    outcome: "An 8-bar drum loop at 140–150 BPM with a fill in bar 8, made entirely on Push and exported.",
    warmup: [
      W.beat("this week's half-time beat"),
      W.cards("Push 3 controls"),
      W.timing(145),
    ],
    steps: [
      { title: "Choose the base beat", detail: "Pick your best clip from this week and Duplicate it into a new slot, so the original stays safe. Set the tempo between 140 and 150.", min: 10 },
      { title: "Grow it to 8 bars", detail: "Press Double Loop until the clip is 8 bars (1 → 2 → 4 → 8). In bars 4 and 8 change one hat or add a ghost so it doesn't feel copy-pasted.", min: 20 },
      { title: "Write the fill", detail: "Page to bar 8 in the step sequencer. Over the last 4–8 steps, add a snare or tom roll with velocity rising toward the end.", min: 30, link: L("/labs/sequencer?pattern=wave-rolls", "Roll ideas") },
      { title: "Play a take and capture it", detail: "With the loop playing, play along on the pads with Repeat for 8 bars without recording. When a take feels good, press Capture to keep it.", min: 30 },
      { title: "Listen like a stranger", detail: "In Session mode, launch the clip and listen five times without touching anything. Fix the one thing that bugs you most.", min: 25 },
      { title: "Export and log it", detail: "Export 30 seconds and add it to Exports with the BPM and one sentence about it.", min: 10, link: L("/exports", "Exports") },
    ],
    check: ["8 bars loop with no seam", "Bar 8 tells you the loop is about to restart", "You didn't touch the mouse except to export", "It's logged in Exports"],
    tip: "If the fill sounds busy, delete half of it. A fill is a signal, not a solo.",
    skills: [4, 5, 1, 2],
  },
  "s1-w2-mon": {
    outcome: "Your 8-bar loop with ghost snares and a quiet hat layer that make it groove without getting louder.",
    warmup: [
      { text: "Play a pattern with ghost notes and listen only for the quiet hits", min: 5, link: L("/labs/drums#pat-liquid-dnb", "Liquid drum and bass pattern") },
      W.beat("last weekend's kick and snare"),
    ],
    steps: [
      { title: "Hear what ghosts do", detail: "In the pattern library, the light squares are ghost notes. Load one into the step sequencer, play it, then clear the light squares and hear what's missing.", min: 10, link: L("/labs/sequencer?pattern=liquid-dnb", "Try it in the sequencer") },
      { title: "Make velocity matter", detail: "Open the snare pad's Simpler and set Vel > Vol to about 70%, so a velocity of 30 is actually quiet.", min: 5 },
      { title: "Add ghost snares", detail: "On your 8-bar loop, add snare hits at velocity 20–40 on the 16th just before and after each backbeat. Keep them barely audible.", min: 15 },
      { title: "Layer a quiet hat", detail: "Put a shaker or second hat on a new pad, velocity 30–60, on offbeats only.", min: 10 },
      { title: "A/B it", detail: "Mute the ghost pads, then unmute. The version with ghosts should feel busier, not louder.", min: 5 },
    ],
    check: ["At least four ghost hits below velocity 40", "Muting the ghosts makes the loop feel stiffer", "The peak level didn't go up"],
    skills: [1],
  },
  "s1-w2-mid": {
    outcome: "A {v} layer on its own pad, sitting under your loop like an ODESZA groove.",
    variants: [
      { label: "shaker", q: "pattern=odz-chill", focus: "Shakers: 16ths with a steady accent pattern (loud, soft, soft, medium). Play them live with Repeat at 1/16 and vary the pressure." },
      { label: "layered clap", q: "pattern=odz-clap", focus: "Layered claps: two claps on adjacent pads, one tight and one roomy, both on the backbeat. Nudge the roomy one a few milliseconds late." },
      { label: "offbeat perc", q: "pattern=odz-march", focus: "Offbeat percussion: a rim, tom or conga on the and of beats, never on the beat. Give it its own pad and a little reverb." },
    ],
    warmup: [
      { text: "Play today's ODESZA-style pattern and pick out the {v} part", min: 5, link: L("/labs/sequencer?{q}", "Today's pattern") },
      W.timing(120),
    ],
    steps: [
      { title: "Find the sound", detail: "Browse from Push for a {v} sample. Audition five and keep the one that sits under your kick without fighting it.", min: 10 },
      { title: "Program or play it", detail: "Follow today's focus. Program the skeleton in the step sequencer, then play over it with Repeat for human variation.", min: 15, link: L("/push?tab=drums", "Note Repeat") },
      { title: "Velocity and nudge", detail: "Vary velocity on every hit of the {v} part. Nudge two or three hits slightly late so it breathes against the kick.", min: 10 },
      { title: "Give it space", detail: "Pan the layer slightly off center and turn down its volume until you only miss it when it's muted.", min: 10 },
    ],
    check: ["The {v} layer is on its own pad", "It has varied velocity, not one level", "Muting it makes the loop feel emptier, but you barely notice it while it plays"],
    skills: [1, 2, 3],
  },
  "s1-w2-fri": {
    outcome: "One percussion idea copied from a reference, rebuilt on your own pads.",
    warmup: [W.beat("a four-on-the-floor beat with offbeat hats"), W.timing(122)],
    steps: [
      { title: "Pick the idea", detail: "From an ODESZA, Lane 8 or progressive house track, choose one percussion part you love: a shaker pattern, a tom fill, a clap layer.", min: 5, link: L("/notebook", "Reference notebook") },
      { title: "Map its rhythm", detail: "Loop two bars and tap the part on a pad until you can play it without the reference. Then program it.", min: 20 },
      { title: "Match the sound", detail: "Browse for a sample that's close. If it's too bright, lower the Simpler filter; if it's too long, shorten the decay.", min: 10 },
      { title: "Drop it into your loop", detail: "Add it to your 8-bar loop and A/B against the reference at the same volume.", min: 10 },
    ],
    check: ["The rhythm matches the reference", "It sits in your loop without crowding the kick", "The reference has a note in your notebook"],
    skills: [1, 2],
  },
  "s1-w2-wknd": {
    outcome: "A default Live Set you can open every day: drums, bass and chords tracks, with reverb and delay returns ready.",
    warmup: [W.beat("your 8-bar loop's first bar"), W.cards("Push 3 controls")],
    steps: [
      { title: "Start clean", detail: "New Live Set. Add a drum track with your favorite kit from this sprint, and MIDI tracks for bass and chords with simple Drift presets.", min: 20 },
      { title: "Returns", detail: "Return A: Reverb, 100% wet, about 2 s decay. Return B: Delay synced to 1/8 dotted, 100% wet. Leave the sends down by default.", min: 20 },
      { title: "Colors and names", detail: "Name and color the tracks so you can read Push's display at a glance. Set the tempo to 140.", min: 10 },
      { title: "Save as default", detail: "In Live's settings, save this as the default Set so every new Set starts here.", min: 10 },
      { title: "Test it from Push", detail: "Close Live, reopen, and make a 4-bar beat from a blank pad using only Push. Time yourself: the goal for this sprint is under 10 minutes.", min: 30 },
      { title: "Ship the sprint", detail: "Export the best 8-bar loop and mark the deliverable shipped on the sprint page.", min: 20, link: L("/sprints/1", "Sprint 1") },
    ],
    check: ["New Sets open with your tracks and returns", "You made a 4-bar beat from blank in under 10 minutes", "The Sprint 1 deliverable is marked shipped"],
    skills: [0, 4, 5],
  },

  /* ------------------------------------------------------------ Sprint 2: Harmony on the grid */
  "s2-w1-mon": {
    outcome: "Scale mode set to A minor, and you can explain why the grid is laid out in fourths.",
    warmup: [W.beat("a half-time wave beat at 145 BPM"), W.ear("keys", "major or minor")],
    steps: [
      { title: "See the layout", detail: "Open the In Key grid in A minor. Each pad to the right is the next scale note; each row up is three scale notes (a fourth) higher.", min: 10, link: L("/labs/theory?tab=chords&key=9&scale=minor", "A minor on the grid") },
      { title: "Set it on Push", detail: "Press Scale. Choose A, Minor, In Key, 4ths. Play from the bottom-left pad (the root) to the right and up.", min: 10, link: L("/push?tab=notes", "Notes and scales") },
      { title: "Find the octaves", detail: "Roots are lit. Find every A on the grid, then play A–C–E as one hand shape: root, two to the right, then up one and right one.", min: 15 },
      { title: "Chromatic for contrast", detail: "Switch to Chromatic and back. Notice how many wrong notes appear. In Key is your default this sprint.", min: 5 },
      { title: "Learn the why", detail: "Fourths mean a chord shape works anywhere on the grid, and a scale is always two rows of a familiar pattern.", min: 5, link: L("/labs/theory?tab=circle", "Circle of fifths") },
    ],
    check: ["You can set any key and scale on Push", "You can find every root on the grid", "You can play A minor as a single hand shape"],
    skills: [0, 1],
  },
  "s2-w1-mid": {
    outcome: "The chords of {v} played on Push and recorded as a 4-bar clip.",
    variants: [
      { label: "A minor", q: "key=9&scale=minor", focus: "A minor: no sharps or flats, the home key for wave. Chords: Am, Bdim, C, Dm, Em, F, G." },
      { label: "F minor", q: "key=5&scale=minor", focus: "F minor: four flats, dark and heavy, common in phonk. Chords: Fm, Gdim, A♭, B♭m, Cm, D♭, E♭." },
      { label: "C♯ minor", q: "key=1&scale=minor", focus: "C♯ minor: bright for a minor key, common in progressive house. Chords: C♯m, D♯dim, E, F♯m, G♯m, A, B." },
    ],
    warmup: [
      { text: "Open {v}, play each of its seven chords and say the name of each as you go", min: 5, link: L("/labs/theory?tab=chords&{q}", "Chords in {v}") },
      W.ear("chords", "chord quality"),
      W.beat("a straight 4-on-the-floor beat"),
    ],
    steps: [
      { title: "Set the key", detail: "On Push press Scale and set {v}, In Key. The lit pads are the roots.", min: 5 },
      { title: "Play the seven triads", detail: "Use the hand shape from Monday on each scale degree, from i up to VII. Today's focus lists the chord names.", min: 10, link: L("/labs/theory?tab=chords&{q}", "Chords in {v}") },
      { title: "Loop a progression", detail: "Play i–VI–III–VII, one chord per bar, until you can do it with your eyes closed.", min: 10, link: L("/labs/progressions?{q}", "Hear it looped") },
      { title: "Record it", detail: "Turn on Fixed Length (4 bars), arm a chord track, and record the progression. Quantize to 1/16 if needed.", min: 10 },
      { title: "One more progression", detail: "Try i–iv–v and record it in the next clip slot. Which one feels more like your genre?", min: 5 },
    ],
    check: ["You can play all seven chords of {v} without looking up names", "A clean 4-bar chord clip is recorded", "You know which of the two progressions you prefer"],
    skills: [1, 2, 4],
  },
  "s2-w1-fri": {
    outcome: "A progression from a reference track, played on Push in its original key.",
    warmup: [W.ear("progressions", "progression"), W.chords("A minor", "key=9&scale=minor")],
    steps: [
      { title: "Pick and loop", detail: "Choose a wave, phonk or progressive track with clear chords. Loop 8 bars.", min: 5, link: L("/notebook", "Reference notebook") },
      { title: "Find the key", detail: "Hum the note the track keeps returning to, find it on the grid, then tap in notes you hear to narrow down the key.", min: 10, link: L("/labs/theory?tab=find", "Find the key") },
      { title: "Find the bass notes", detail: "Follow the bass. Each new bass note is usually a new chord root.", min: 10 },
      { title: "Build the chords", detail: "On each root, try the minor shape, then the major shape. Keep whichever matches.", min: 10 },
      { title: "Record and note it", detail: "Record the progression as a clip and write the Roman numerals in your notebook.", min: 10, link: L("/notebook", "Reference notebook") },
    ],
    check: ["You know the key of the reference", "Your clip's chords match the track", "The numerals are in your notebook"],
    skills: [0, 1, 2],
  },
  "s2-w1-wknd": {
    outcome: "Scenes 1 and 2 of your Session sketch: drums and chords in a minor key.",
    warmup: [W.chords("your sketch's key", "key=9&scale=minor"), W.beat("your Sprint 1 beat")],
    steps: [
      { title: "Choose a key and tempo", detail: "Pick the key from this week you liked most. Open your default Set and set the tempo for your genre.", min: 10 },
      { title: "Scene 1 drums", detail: "Bring your best Sprint 1 beat into scene 1. Simplify it for an intro if needed.", min: 20 },
      { title: "Scene 1 chords", detail: "Record a 4- or 8-bar progression. Try a held chord per bar, then an eighth-note pulse.", min: 30, link: L("/labs/progressions", "Rhythm ideas") },
      { title: "Scene 2", detail: "Duplicate scene 1 and change one thing: a different progression, a fuller beat, or chords an octave up.", min: 40 },
      { title: "Launch and judge", detail: "Launch scene 1 for 8 bars, then scene 2. Does 2 feel like a step up? Adjust until it does.", min: 20 },
    ],
    check: ["Two scenes launch cleanly from Push", "Scene 2 feels like it builds on scene 1", "Both use the same key"],
    skills: [2, 4],
  },
  "s2-w2-mon": {
    outcome: "A bassline for scene 1 that follows the chord roots, then adds passing notes.",
    warmup: [W.chords("your sketch's key", "key=9&scale=minor"), W.ear("intervals", "interval")],
    steps: [
      { title: "Roots only", detail: "On a bass track, play just the root of each chord, one long note per bar, an octave or two below the chords.", min: 10, link: L("/labs/progressions", "Hear roots under chords") },
      { title: "Give it rhythm", detail: "Same notes, new rhythm: 8th notes, or a syncopated pattern that leaves space for the kick.", min: 15 },
      { title: "Passing notes", detail: "On the last beat of each bar, step toward the next root using a scale note between them.", min: 15 },
      { title: "Check it with the drums", detail: "Play scene 1 with the bass. If bass and kick collide, move bass notes off the kick.", min: 5 },
    ],
    check: ["The bass hits every chord's root", "It has at least two passing notes", "It sits with the kick without crowding it"],
    skills: [3],
  },
  "s2-w2-mid": {
    outcome: "{v} written and recorded in your sketch.",
    variants: [
      { label: "Basslines for scenes 1 and 2", focus: "Bass first: copy Monday's approach to scene 2, with a busier rhythm than scene 1 so it builds." },
      { label: "A hook for scene 1", focus: "Hook: 4–8 notes, mostly chord tones on the beats, and one repeated rhythm. Sing it before you play it." },
      { label: "A hook for scene 2", focus: "Second hook: keep scene 1's rhythm but move the notes higher, or answer scene 1's hook with a variation." },
    ],
    warmup: [
      W.chords("your sketch's key", "key=9&scale=minor"),
      { text: "Write a quick 4-note hook in the melody tool over i–VI–III–VII, then play it on Push", min: 5, link: L("/labs/melody", "Melody") },
    ],
    steps: [
      { title: "Sketch it", detail: "Follow today's focus. Sketch ideas in the melody tool or straight on Push: playing is faster than clicking.", min: 15, link: L("/labs/melody", "Melody") },
      { title: "Record it", detail: "Record 4 bars with Fixed Length on. Record three takes, then keep the best with Capture or Undo.", min: 15 },
      { title: "Fix the timing", detail: "Quantize the take to 1/16 at about 50% strength so it tightens without going robotic.", min: 5 },
      { title: "Listen in context", detail: "Launch the scene and listen 4 times. Change one note that bothers you.", min: 10 },
    ],
    check: ["{v} is recorded as a clip", "It uses notes from the key", "It works with the drums and chords already in the scene"],
    skills: [3, 4],
  },
  "s2-w2-fri": {
    outcome: "A hook rhythm copied from a reference and reused with your own notes.",
    warmup: [W.ear("degrees", "scale degree"), W.chords("your sketch's key", "key=9&scale=minor")],
    steps: [
      { title: "Pick a hook", detail: "Choose a reference with a clear lead line. Loop 2 bars of it.", min: 5, link: L("/notebook", "Reference notebook") },
      { title: "Tap the rhythm", detail: "Tap the hook's rhythm on one pad until it's locked in. Ignore the notes.", min: 10 },
      { title: "Put it in the melody tool", detail: "Enter the rhythm on one row, then move notes to chord tones of your progression.", min: 15, link: L("/labs/melody", "Melody") },
      { title: "Play it on Push", detail: "Record your version in a free scene slot and compare it with your scene 1 hook.", min: 15 },
    ],
    check: ["The rhythm matches the reference", "The notes are yours, from your key", "It's recorded as a clip"],
    skills: [4],
  },
  "s2-w2-wknd": {
    outcome: "Scenes 3 and 4, then a 30-second export of all four scenes in order.",
    warmup: [W.chords("your sketch's key", "key=9&scale=minor"), W.beat("scene 1's beat")],
    steps: [
      { title: "Scene 3: the peak", detail: "Everything in: full drums, bass with passing notes, the brightest hook.", min: 35 },
      { title: "Scene 4: the comedown", detail: "Strip back to chords and one element, or a new progression for contrast.", min: 30 },
      { title: "Run the four scenes", detail: "Launch 1 → 2 → 3 → 4, 8 bars each. Adjust clip lengths so each change lands on a bar line.", min: 25 },
      { title: "Record and export", detail: "Record the run into Arrangement and export 30 seconds. Log it in Exports.", min: 30, link: L("/exports", "Exports") },
      { title: "Ship the sprint", detail: "Mark the Sprint 2 deliverable shipped.", min: 10, link: L("/sprints/2", "Sprint 2") },
    ],
    check: ["Four scenes, each with drums, bass, chords and a lead", "The order tells a small story", "Exported and logged"],
    skills: [2, 3, 4],
  },

  /* ------------------------------------------------------------ Sprint 3: Sound design */
  "s3-w1-mon": {
    outcome: "You can explain what an envelope and a filter do, and you've heard both change a sound.",
    warmup: [W.chords("A minor", "key=9&scale=minor"), W.cards("Sound design terms")],
    steps: [
      { title: "Envelopes by ear", detail: "Drag the envelope points and hold a note. Try Pluck, then Pad. Switch the target to Filter and hear the tone open and close.", min: 15, link: L("/instruments?tab=modulation", "Envelope and LFO") },
      { title: "Filters by ear", detail: "In the synth playground, sweep the cutoff slowly while holding a note, then raise the resonance.", min: 10, link: L("/labs/sound-design?preset=pluck", "Synth playground") },
      { title: "Learning Synths", detail: "Do the envelope and filter lessons in Ableton's Learning Synths.", min: 10, link: L("https://learningsynths.ableton.com", "Learning Synths") },
      { title: "Find them in Drift", detail: "Load Drift on Push. In Device mode, page to the filter and envelope and turn each encoder while holding a pad.", min: 10 },
    ],
    check: ["You can say what attack, decay, sustain and release each do", "You can make a sound brighter or darker with the filter", "You found both on Push's encoders"],
    skills: [0, 1],
  },
  "s3-w1-mid": {
    outcome: "A {v} built in Drift from its init patch, tweaked only with Push's encoders.",
    variants: [
      { label: "pluck", q: "preset=pluck", focus: "Pluck: saw wave, filter around 2–3 kHz, amp envelope with zero sustain and a short decay. A filter envelope makes it snap." },
      { label: "reese bass", q: "preset=reese", focus: "Reese bass: two detuned saws, low-pass around 600 Hz, mono, full sustain. Slow detune movement makes it growl." },
      { label: "lead", q: "preset=lead", focus: "Lead: square or saw, a touch of glide, filter open enough to cut through, and a slow vibrato LFO on pitch." },
    ],
    warmup: [
      { text: "Load the {v} preset in the synth playground and play it from your computer keyboard", min: 5, link: L("/labs/sound-design?{q}", "Synth playground") },
      W.chords("your sketch's key", "key=9&scale=minor"),
    ],
    steps: [
      { title: "Start from init", detail: "Load Drift and reset it. Lock the device to the encoders so they stay on Drift while you play.", min: 5 },
      { title: "Oscillator", detail: "Pick the waveform from today's focus. Add the second oscillator detuned if the focus calls for it.", min: 10 },
      { title: "Filter and envelope", detail: "Set the filter, then the amp envelope, while playing a phrase in your key. Use today's focus as the target.", min: 15, link: L("/labs/sound-design?{q}", "Reference settings") },
      { title: "Movement", detail: "Add one LFO or a filter envelope so the sound changes as it plays.", min: 10 },
      { title: "Save it", detail: "Save it to your User Library with a name you'll find later.", min: 5 },
    ],
    check: ["You never touched the mouse to edit the sound", "The {v} sounds like the reference settings", "It's saved"],
    skills: [0, 1],
  },
  "s3-w1-fri": {
    outcome: "A bass sound that matches one from a reference track.",
    warmup: [{ text: "Three rounds of Match the sound: hear it, then find the knob settings", min: 5, link: L("/labs/sound-design", "Match the sound") }, W.drift("a short pluck")],
    steps: [
      { title: "Isolate the bass", detail: "Pick a reference where the bass is exposed. Loop it and listen for three things: bright or dark, short or long, still or moving.", min: 10 },
      { title: "Match the shape", detail: "Set the amp envelope first: how fast it starts and how long it rings.", min: 10 },
      { title: "Match the tone", detail: "Set the waveform and filter. A/B often at the same volume.", min: 15 },
      { title: "Match the movement", detail: "If the reference wobbles or growls, add an LFO or detune to match.", min: 10 },
    ],
    check: ["Envelope, tone and movement are all close to the reference", "Saved as a preset"],
    skills: [1, 2],
  },
  "s3-w1-wknd": {
    outcome: "Your bass and pluck presets finished, in Instrument Racks with 8 macros, saved.",
    warmup: [W.drift("a reese bass"), W.chords("your sketch's key", "key=9&scale=minor")],
    steps: [
      { title: "Pick the best two", detail: "From this week, choose the bass and the pluck (or lead) you'll keep.", min: 10 },
      { title: "Wrap in a Rack", detail: "Group each into an Instrument Rack.", min: 10 },
      { title: "Map 8 macros", detail: "Map the controls you'll actually turn: cutoff, resonance, attack, decay, drive, detune, LFO amount, reverb send.", min: 40 },
      { title: "Set macro ranges", detail: "Narrow each range so the whole macro sweep sounds usable.", min: 25 },
      { title: "Add effects", detail: "After the instrument: Saturator, then Auto Filter, then a little reverb or delay.", min: 25, link: L("/instruments?tab=effects", "Effects guide") },
      { title: "Save and test", detail: "Save both Racks, open a new Set, load them from Push and play.", min: 15 },
    ],
    check: ["Two Racks with 8 named macros each", "Every macro sweep sounds musical", "They load from Push's browser"],
    skills: [3, 4],
  },
  "s3-w2-mon": {
    outcome: "You understand Instrument and Drum Racks well enough to build a kit from scratch.",
    warmup: [W.drift("a soft pad"), W.beat("a phonk beat with cowbell")],
    steps: [
      { title: "Read the structure", detail: "A Drum Rack is 16 chains, one per pad, each holding a Simpler and its own effects.", min: 10, link: L("https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/", "Racks in the manual") },
      { title: "Build an empty kit", detail: "Load an empty Drum Rack. Drag or browse in a kick, snare, clap and hat from Push.", min: 15 },
      { title: "Per-pad processing", detail: "On the kick chain add Saturator; on the hat chain add EQ Eight to cut the lows.", min: 10 },
      { title: "Save it", detail: "Save the kit as a preset. Tomorrow you start layering.", min: 5 },
    ],
    check: ["You built a 4-pad kit from an empty Drum Rack", "Two pads have their own effects", "Saved"],
    skills: [3],
  },
  "s3-w2-mid": {
    outcome: "{v} for your preset pack.",
    variants: [
      { label: "A pad", q: "preset=pad", focus: "Pad: slow attack (0.5–1.5 s), long release, detuned saws, filter around 1–2 kHz, and a slow LFO on cutoff or wavetable position. Wavetable or Meld." },
      { label: "A layered kick and snare", focus: "Layer a punchy transient over a body: two samples per pad, high-pass the body layer's top, trim tails so they don't smear." },
      { label: "Layered hats and perc", focus: "Hats and perc: two hats with different decays, a shaker, a rim. Tune them so they sit with your key." },
    ],
    warmup: [W.drift("a pluck"), W.chords("your sketch's key", "key=9&scale=minor")],
    steps: [
      { title: "Gather sources", detail: "Follow today's focus. Find samples in Splice or Live's library, or start from a Wavetable or Meld init.", min: 10 },
      { title: "Build it", detail: "Layer or design the sound until it works alone.", min: 20 },
      { title: "Check it in the sketch", detail: "Drop it into your Sprint 2 sketch. Adjust tone so it sits with everything else.", min: 10 },
      { title: "Save it", detail: "Save into your preset pack folder.", min: 5 },
    ],
    check: ["{v} is saved", "It sounds right in your sketch, not just alone"],
    skills: [2, 3],
  },
  "s3-w2-fri": {
    outcome: "A pad or texture that matches one from a reference.",
    warmup: [{ text: "Three rounds of Match the sound", min: 5, link: L("/labs/sound-design", "Match the sound") }, W.drift("a pad")],
    steps: [
      { title: "Choose a reference", detail: "Pick a pad, a vocal texture or an atmosphere from a track you love.", min: 5 },
      { title: "Shape over time", detail: "How does it start, swell and fade? Set the amp envelope first.", min: 10 },
      { title: "Tone and width", detail: "Detune, chorus or unison for width; filter for darkness.", min: 15 },
      { title: "Space", detail: "Most pads live in reverb. Add it and match the tail length.", min: 15 },
    ],
    check: ["Envelope, tone and space all match", "Saved to your pack"],
    skills: [2, 4],
  },
  "s3-w2-wknd": {
    outcome: "All four presets in your Sprint 2 sketch, replacing the stock sounds.",
    warmup: [W.drift("a reese bass"), W.beat("scene 1's beat")],
    steps: [
      { title: "Swap the bass", detail: "Replace the Sprint 2 bass with your bass Rack. Adjust macros to fit.", min: 25 },
      { title: "Swap the lead and pad", detail: "Replace the hook and chord sounds. Re-voice chords if the pad gets muddy.", min: 35 },
      { title: "Swap the kit", detail: "Load your custom kit on the drum track and check every pad still lines up.", min: 25 },
      { title: "Balance", detail: "Rough levels so nothing jumps out.", min: 20 },
      { title: "Export and ship", detail: "Export 30 seconds, log it, and mark Sprint 3 shipped.", min: 20, link: L("/sprints/3", "Sprint 3") },
    ],
    check: ["All four sounds are yours", "The sketch sounds better than the Sprint 2 version", "Exported and shipped"],
    skills: [2, 3, 4],
  },

  /* ------------------------------------------------------------ Sprint 4: Sampling */
  "s4-w1-mon": {
    outcome: "You know Simpler's Classic, One-Shot and Slice modes and when to use each.",
    warmup: [W.drift("an 808-style sub"), W.chords("F minor", "key=5&scale=minor")],
    steps: [
      { title: "See slicing first", detail: "In the sampler, load a drum loop and watch it slice to 16 pads. Play the pads from your keyboard.", min: 10, link: L("/labs/sampler", "Sampler") },
      { title: "Classic", detail: "Load a melodic sample into Simpler (Classic). Play it chromatically from Push: it repitches across the pads.", min: 10 },
      { title: "One-Shot", detail: "Switch to One-Shot with a drum hit. It plays the whole sample once per press.", min: 5 },
      { title: "Slice", detail: "Switch to Slice with a drum loop. Each pad gets one slice. Play a new rhythm.", min: 15, link: L("/labs/drums", "Slicing a loop") },
    ],
    check: ["You can say which mode suits a melody, a hit and a loop", "You played a new rhythm from slices"],
    skills: [1],
  },
  "s4-w1-mid": {
    outcome: "A {v} chopped into 8–16 slices and played as a new phrase.",
    variants: [
      { label: "drum loop", focus: "Drum loop: slice by transient so each hit gets a pad. Rearrange kick and snare into a new groove." },
      { label: "vocal phrase", focus: "Vocal: slice by beat or manually at syllables. Play a new phrase that says something different." },
      { label: "melodic loop", focus: "Melodic loop: slice by beat at 1/8. Reorder slices into a new melody, keeping the key." },
    ],
    warmup: [W.beat("a phonk beat"), { text: "Load any sound in the sampler, slice it and shuffle the slices twice", min: 5, link: L("/labs/sampler", "Sampler") }],
    steps: [
      { title: "Find a {v}", detail: "Browse Splice from Live and audition in key and tempo. Pick something with clear parts.", min: 10 },
      { title: "Warp it", detail: "Make sure it's warped to your tempo. Fix the first downbeat marker if it drifts.", min: 10 },
      { title: "Slice", detail: "Simpler in Slice mode, following today's focus.", min: 10 },
      { title: "Play a new phrase", detail: "Record 4 bars of your own rhythm from the slices.", min: 15 },
    ],
    check: ["8–16 clean slices", "A recorded phrase that's clearly new, not the original order"],
    skills: [0, 1, 2],
  },
  "s4-w1-fri": {
    outcome: "A sample flip from a reference recreated with your own sample.",
    warmup: [W.chords("F minor", "key=5&scale=minor"), W.ear("intervals", "interval")],
    steps: [
      { title: "Study the flip", detail: "Pick a track built on a sample (phonk tracks are full of them). Listen for how it's chopped: repeated slices, pitch changes, reverses.", min: 10 },
      { title: "Find a similar source", detail: "Find a sample with a similar vibe in Splice.", min: 10 },
      { title: "Copy the technique", detail: "Chop and play it the same way the reference does.", min: 20 },
      { title: "Note it", detail: "Add the reference and the technique to your notebook.", min: 5, link: L("/notebook", "Reference notebook") },
    ],
    check: ["Your flip uses the same technique as the reference", "Noted in your notebook"],
    skills: [1, 2],
  },
  "s4-w1-wknd": {
    outcome: "The start of your 1-minute sketch: a chopped sample, Sprint 1 drums and your Sprint 3 bass.",
    warmup: [W.beat("a phonk beat"), W.drift("a sub bass")],
    steps: [
      { title: "Pick the main sample", detail: "Choose your best chop from this week as the centerpiece.", min: 15 },
      { title: "Drums", detail: "Bring in your Sprint 1 drums and adapt them to the sample's groove.", min: 30 },
      { title: "Bass", detail: "Load your Sprint 3 bass and write a line under the sample's key.", min: 30, link: L("/labs/theory?tab=find", "Find the sample's key") },
      { title: "Arrange 30 seconds", detail: "Intro with the sample alone, then drums and bass in.", min: 40 },
      { title: "Save", detail: "Save the Set. Next week you resample and finish.", min: 5 },
    ],
    check: ["Sample, drums and bass play together in key", "About 30 seconds is laid out"],
    skills: [0, 1, 2],
  },
  "s4-w2-mon": {
    outcome: "You can resample your own output and chop it again.",
    warmup: [{ text: "Slice a loop in the sampler and reverse two slices", min: 5, link: L("/labs/sampler", "Sampler") }, W.beat("the sketch's beat")],
    steps: [
      { title: "Set up resampling", detail: "New audio track, input set to Resampling. Arm it.", min: 10, link: L("https://www.ableton.com/en/live-manual/12/routing-and-i-o/", "Routing in the manual") },
      { title: "Record your sketch", detail: "Record 4 bars of your sketch playing.", min: 10 },
      { title: "Chop the result", detail: "Drop it into Simpler, Slice mode, and play the slices back as a new loop.", min: 15 },
      { title: "Mangle it", detail: "Add Roar or Saturator to the resample and record it again.", min: 10 },
    ],
    check: ["A resampled clip of your own music", "A new loop played from its slices"],
    skills: [3],
  },
  "s4-w2-mid": {
    outcome: "{v} built from resampled audio.",
    variants: [
      { label: "A variation of the main loop", focus: "Resample the main loop and rearrange its slices into a variation for the second half." },
      { label: "A stutter fill", focus: "Resample one bar and repeat a 1/16 slice with Note Repeat for a stutter fill before a change." },
      { label: "A cowbell or bell melody", focus: "Phonk cowbell: a single cowbell hit in Simpler Classic mode, played as a melody in your key, then resampled with distortion." },
    ],
    warmup: [W.chords("the sketch's key", "key=5&scale=minor"), { text: "Play the phonk cowbell sound and hear how a single hit becomes a melody", min: 5, link: L("/labs/sound-design#sound-phonk-cowbell", "Phonk cowbell") }],
    steps: [
      { title: "Record the source", detail: "Resample the part of the sketch you need for today's focus.", min: 10 },
      { title: "Chop and play", detail: "Follow today's focus.", min: 20 },
      { title: "Place it", detail: "Put it in the sketch where it adds the most contrast.", min: 15 },
    ],
    check: ["{v} is in the sketch", "It was made from resampled audio"],
    skills: [3, 4],
  },
  "s4-w2-fri": {
    outcome: "One reversed or pitched transition into a section change.",
    warmup: [W.beat("the sketch's beat"), W.ear("intervals", "interval")],
    steps: [
      { title: "Pick the moment", detail: "Find the biggest section change in your sketch.", min: 5 },
      { title: "Reverse", detail: "Resample a crash, a vocal syllable or a chord, and reverse it so it swells into the change.", min: 15 },
      { title: "Or pitch", detail: "Alternatively, pitch a slice down an octave for a drop, or ramp it up for a riser.", min: 15 },
      { title: "Line it up", detail: "The peak of the transition should land exactly on the downbeat.", min: 10 },
    ],
    check: ["The transition peaks on the downbeat", "The change feels deliberate"],
    skills: [4],
  },
  "s4-w2-wknd": {
    outcome: "The finished, exported 1-minute sampling sketch.",
    warmup: [W.beat("the sketch's beat"), W.chords("the sketch's key", "key=5&scale=minor")],
    steps: [
      { title: "Fill out the minute", detail: "Arrange to about 60 seconds: intro, main loop, variation, the transition, ending.", min: 50 },
      { title: "Balance", detail: "Levels and a little EQ so the sample sits on top.", min: 30 },
      { title: "Listen through three times", detail: "Fix one thing per listen.", min: 30 },
      { title: "Export and ship", detail: "Export, log it, and mark Sprint 4 shipped.", min: 20, link: L("/sprints/4", "Sprint 4") },
    ],
    check: ["About a minute long", "Built on one chopped sample", "Exported, logged and shipped"],
    skills: [1, 2, 3, 4],
  },

  /* ------------------------------------------------------------ Sprint 5: Arrangement */
  "s5-w1-mon": {
    outcome: "A bar-by-bar map of a progressive house reference: what enters and leaves, and where.",
    warmup: [W.chords("your track's key", "key=1&scale=minor"), W.beat("a progressive house beat at 122 BPM")],
    steps: [
      { title: "See a template", detail: "Play the progressive house arrangement and watch parts enter and leave by section.", min: 10, link: L("/labs/arrangement", "Arrangement map") },
      { title: "Pick your reference", detail: "Choose a 120–124 BPM progressive house track you'd love to make.", min: 5, link: L("/genres/prog", "Progressive house") },
      { title: "Map it", detail: "Listen with a timer. At every 8- or 16-bar boundary, write what enters or leaves.", min: 20, link: L("/notebook", "Reference notebook") },
      { title: "Plan yours", detail: "Copy the reference's section lengths into the track planner.", min: 10, link: L("/planner", "Track planner") },
    ],
    check: ["A section-by-section map with bar counts", "Your track plan has the same shape"],
    skills: [0],
  },
  "s5-w1-mid": {
    outcome: "Session scenes for {v}, matching your map.",
    variants: [
      { label: "the intro and build", focus: "Intro and build: drums and one texture first, then add bass and rising energy. Two or three scenes." },
      { label: "the drop", focus: "Drop: everything in, at full energy. One or two scenes with small variations." },
      { label: "the breakdown and outro", focus: "Breakdown: drums out, chords and the hook exposed. Outro: mirror the intro so DJs can mix out." },
    ],
    warmup: [W.beat("a progressive house beat"), W.chords("your track's key", "key=1&scale=minor")],
    steps: [
      { title: "Check the map", detail: "Read your plan for {v}: which parts play and for how long.", min: 5, link: L("/planner", "Track planner") },
      { title: "Build the scenes", detail: "Duplicate existing scenes and mute, add or vary parts until they match the plan.", min: 30 },
      { title: "Test the transitions", detail: "Launch from the previous scene into these at 8-bar boundaries.", min: 10 },
    ],
    check: ["Scenes for {v} exist", "They launch smoothly from the scene before"],
    skills: [0, 3],
  },
  "s5-w1-fri": {
    outcome: "Your scenes performed into Arrangement in one take.",
    warmup: [W.beat("your track's main beat"), W.timing(122)],
    steps: [
      { title: "Rehearse", detail: "Run through your scenes twice, following the plan.", min: 15 },
      { title: "Record the take", detail: "Arrangement Record on, launch scenes from Push in order.", min: 15 },
      { title: "Listen back", detail: "Play the whole take without stopping. Note where it drags.", min: 15 },
    ],
    check: ["A full take is in Arrangement", "You have notes on what drags"],
    skills: [0],
  },
  "s5-w1-wknd": {
    outcome: "A full take with automation recorded live from the encoders.",
    warmup: [{ text: "Play the LFO and envelope editor and hear what a filter sweep does over 8 bars", min: 5, link: L("/instruments?tab=modulation", "Modulation") }, W.beat("your track's main beat")],
    steps: [
      { title: "Choose 3 moves", detail: "Pick three parameters to ride: a filter on the build, a reverb send on the breakdown, a volume swell before the drop.", min: 15 },
      { title: "Map them", detail: "Put them on macros or lock the device to the encoders.", min: 20 },
      { title: "Record", detail: "Perform the whole track again, riding the encoders. Do 2–3 takes.", min: 60 },
      { title: "Keep the best", detail: "Keep the best take, delete the rest.", min: 20 },
      { title: "Listen", detail: "Listen end to end once.", min: 20 },
    ],
    check: ["A full arrangement with three automated moves", "It holds together end to end"],
    skills: [0, 1, 2],
  },
  "s5-w2-mon": {
    outcome: "A transition toolkit: three ways to cross an 8- or 16-bar boundary.",
    warmup: [W.beat("your track's main beat"), W.ear("progressions", "progression")],
    steps: [
      { title: "Riser", detail: "White noise with a rising filter over 8 bars into the drop.", min: 15 },
      { title: "Drop-out", detail: "Mute the kick for the last bar before a section.", min: 10 },
      { title: "Reverse cymbal", detail: "A reversed crash peaking on the downbeat.", min: 10 },
      { title: "Use one", detail: "Put the best one into your arrangement.", min: 10 },
    ],
    check: ["Three transitions built", "One is in the track"],
    skills: [2],
  },
  "s5-w2-mid": {
    outcome: "{v} edited and refined.",
    variants: [
      { label: "The intro and build", focus: "Intro and build: does energy rise every 8 bars? Add one element or one automation move at each boundary." },
      { label: "The first drop", focus: "First drop: is it the loudest, fullest moment so far? Clear anything that competes with the kick and bass." },
      { label: "The breakdown and second drop", focus: "Breakdown and second drop: the breakdown needs contrast; the second drop needs one new element the first didn't have." },
    ],
    warmup: [W.beat("your track's main beat"), W.mixEar()],
    steps: [
      { title: "Listen to {v}", detail: "Listen with today's focus in mind and write 3 things to change.", min: 10 },
      { title: "Fix them", detail: "Cut, extend, duplicate or automate in Arrangement view.", min: 30 },
      { title: "Listen in context", detail: "Play from 16 bars before to 16 bars after.", min: 5 },
    ],
    check: ["Three changes made to {v}", "It flows into the next section"],
    skills: [1, 3, 4],
  },
  "s5-w2-fri": {
    outcome: "Your structure compared side by side with the reference map, with the gaps closed.",
    warmup: [W.beat("your track's main beat"), W.mixEar()],
    steps: [
      { title: "Side by side", detail: "Line your arrangement up with the map you made two Mondays ago.", min: 15, link: L("/notebook", "Reference notebook") },
      { title: "Find the gaps", detail: "Where does yours have less change, or change too late?", min: 10 },
      { title: "Close two gaps", detail: "Fix the two biggest differences.", min: 20 },
    ],
    check: ["You can point to how your structure matches the reference", "Two gaps closed"],
    skills: [3, 4],
  },
  "s5-w2-wknd": {
    outcome: "A rough mix of the whole 2:30–3:00 track, exported.",
    warmup: [W.beat("your track's main beat"), W.mixEar()],
    steps: [
      { title: "Clean up", detail: "Delete unused clips, consolidate, name everything.", min: 20 },
      { title: "Rough levels", detail: "Kick and bass first, then everything else around them.", min: 40 },
      { title: "Listen end to end", detail: "Twice, without stopping. Fix only what jumps out.", min: 40 },
      { title: "Export and ship", detail: "Export the rough mix, log it, and mark Sprint 5 shipped.", min: 30, link: L("/sprints/5", "Sprint 5") },
    ],
    check: ["2:30–3:00 long", "It holds your attention without touching anything", "Exported and shipped"],
    skills: [4],
  },

  /* ------------------------------------------------------------ Sprint 6: Mix and finish */
  "s6-w1-mon": {
    outcome: "Your track gain-staged, with peaks near −6 dB on the master before any processing.",
    warmup: [W.mixEar(), W.cards("Effects")],
    steps: [
      { title: "Learn the order", detail: "Levels → pan → EQ → compression → space. Today is levels only.", min: 10, link: L("/labs/mixing", "Mixing") },
      { title: "Pull everything down", detail: "On Push's Mix mode, bring all faders down, then bring up the kick to about −12 dB.", min: 10 },
      { title: "Build around the kick", detail: "Bass next, then drums, chords, lead, FX. Stop when the master peaks near −6 dB.", min: 20 },
    ],
    check: ["Master peaks around −6 dB at the loudest part", "Kick and bass are balanced"],
    skills: [0, 1],
  },
  "s6-w1-mid": {
    outcome: "One full mix pass: {v}.",
    variants: [
      { label: "levels and pan", focus: "Levels and pan: balance by ear on Push, then spread hats, perc and pads left and right. Keep kick, bass and lead centered." },
      { label: "EQ", focus: "EQ: high-pass everything except kick and bass. Cut mud around 200–400 Hz before boosting anything." },
      { label: "compression and sidechain", focus: "Compression: sidechain the bass and pads to the kick, then Glue on the drum bus at 2:1 with 1–3 dB of gain reduction." },
    ],
    warmup: [W.mixEar(), { text: "Play the sidechain demo and hear the bass duck under the kick", min: 3, link: L("/labs/mixing", "Sidechain demo") }],
    steps: [
      { title: "Focus", detail: "Follow today's focus on every track, loudest part of the song first.", min: 30 },
      { title: "Check in mono", detail: "Flip to mono briefly: anything that disappears needs attention.", min: 5 },
      { title: "Listen through", detail: "Play the whole track once at low volume.", min: 10 },
    ],
    check: ["{v} done on every track", "The mix sounds clearer than yesterday"],
    skills: [0, 2, 3],
  },
  "s6-w1-fri": {
    outcome: "Your mix A/B'd against your reference at matched loudness, with notes.",
    warmup: [W.mixEar()],
    steps: [
      { title: "Match loudness", detail: "Turn the reference down until it's as loud as your mix. Louder always sounds better, so this is the fair test.", min: 10 },
      { title: "Compare by section", detail: "Drop vs drop, breakdown vs breakdown. Listen for low end, brightness and width.", min: 20 },
      { title: "Write 3 differences", detail: "Rank them by how much they bother you.", min: 15, link: L("/notebook", "Reference notebook") },
    ],
    check: ["Compared at matched loudness", "Three ranked differences written down"],
    skills: [4],
  },
  "s6-w1-wknd": {
    outcome: "A complete mix pass, start to finish.",
    warmup: [W.mixEar()],
    steps: [
      { title: "Levels and pan", detail: "Rebalance with fresh ears.", min: 30 },
      { title: "EQ", detail: "Fix Friday's top differences with EQ.", min: 40 },
      { title: "Compression and space", detail: "Sidechain, bus glue, and reverb and delay sends.", min: 40 },
      { title: "Bounce a version", detail: "Export a mix and listen away from the computer.", min: 25, link: L("/exports", "Exports") },
    ],
    check: ["Every track has been touched in each stage", "A mix version is exported"],
    skills: [0, 1, 2, 3],
  },
  "s6-w2-mon": {
    outcome: "A list of problems heard on three different systems.",
    warmup: [W.mixEar()],
    steps: [
      { title: "Headphones", detail: "Listen through and write what you hear.", min: 15 },
      { title: "Speakers", detail: "Same again on speakers.", min: 15 },
      { title: "Phone or car", detail: "Same again on your phone or in the car.", min: 15 },
    ],
    check: ["One list of problems that showed up on more than one system"],
    skills: [4],
  },
  "s6-w2-mid": {
    outcome: "{v} from your list, fixed.",
    variants: [
      { label: "Problem 1", focus: "Fix the problem that showed up on all three systems." },
      { label: "Problem 2", focus: "Fix the next problem. Bounce a quick version and check it on the system where it was worst." },
      { label: "Problem 3", focus: "Fix the last one, then stop. More tweaks now rarely help." },
    ],
    warmup: [W.mixEar()],
    steps: [
      { title: "Diagnose", detail: "Solo the parts involved and find the cause.", min: 10 },
      { title: "Fix", detail: "Make the smallest change that solves it.", min: 25 },
      { title: "Check", detail: "Bounce and listen on the system where it was worst.", min: 10 },
    ],
    check: ["{v} no longer bothers you on any system"],
    skills: [2, 3],
  },
  "s6-w2-fri": {
    outcome: "A light master chain: EQ, Glue and a Limiter, without crushing the mix.",
    warmup: [W.mixEar()],
    steps: [
      { title: "EQ", detail: "Gentle broad moves only, 1–2 dB.", min: 10 },
      { title: "Glue", detail: "2:1, slow attack, auto release, 1–2 dB of gain reduction.", min: 10 },
      { title: "Limiter", detail: "Ceiling at −1 dB, raise gain until peaks are caught, not squashed.", min: 15 },
      { title: "Compare", detail: "Bypass the chain at matched loudness. If it's not better, pull back.", min: 10 },
    ],
    check: ["The chain makes the track better at matched loudness", "Peaks never exceed −1 dB"],
    skills: [4],
  },
  "s6-w2-wknd": {
    outcome: "Your finished track exported and heard by one other person.",
    warmup: [W.mixEar()],
    steps: [
      { title: "Final listen", detail: "One last listen, start to finish. Change nothing unless it's broken.", min: 20 },
      { title: "Export", detail: "WAV at 24-bit for keeping, MP3 at 320 kbps for sharing.", min: 15 },
      { title: "Share it", detail: "Send it to one person whose opinion you trust.", min: 10 },
      { title: "Look back", detail: "Do your weekly review, and look at how far you've come since Sprint 1.", min: 30, link: L("/review", "Weekly review") },
      { title: "Ship it", detail: "Mark Sprint 6 shipped.", min: 5, link: L("/sprints/6", "Sprint 6") },
    ],
    check: ["Exported as WAV and MP3", "Someone else has heard it", "Sprint 6 shipped"],
    skills: [4],
  },
}

/** The plan for a sprint week and slot, with the day's variant filled in. */
export function dayPlan(sprintId: string, week: 1 | 2, slot: "mon" | "mid" | "fri" | "wknd", variantIdx = 0) {
  const p = DAY_PLANS[`${sprintId}-w${week}-${slot}`]
  if (!p) return null
  const v = p.variants?.[Math.max(0, Math.min(p.variants.length - 1, variantIdx))]
  const fill = (s: string) => s.replaceAll("{v}", v?.label ?? "").replaceAll("{q}", v?.q ?? "")
  const link = (l?: DayLink) => (l ? { to: fill(l.to).replace(/[?&]$/, ""), label: fill(l.label) } : undefined)
  return {
    outcome: fill(p.outcome),
    variant: v ? { ...v, label: v.label } : null,
    variants: p.variants ?? [],
    warmup: p.warmup.map((d) => ({ ...d, text: fill(d.text), link: link(d.link) })),
    steps: p.steps.map((st) => ({ ...st, title: fill(st.title), detail: fill(st.detail), link: link(st.link) })),
    check: p.check.map(fill),
    tip: p.tip,
    skills: p.skills,
  }
}
