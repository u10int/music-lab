/**
 * Content that supports the day plans: practice in Live itself (not only
 * Push), a check for each skill, weekly challenges, listening sheets, help for
 * when you're stuck, and the ear drill each sprint leans on.
 */
import type { DayLink, Drill } from "./days"

const M = "https://www.ableton.com/en/live-manual/12/"
const L = (to: string, label: string): DayLink => ({ to, label })

/** Mouse-and-keyboard drills in Live, so the screen workflow keeps pace with Push. One rotates into each day's warm-up. */
export const LIVE_DRILLS: Record<string, Drill[]> = {
  s1: [
    { text: "In Live, press Tab to flip between Session and Arrangement, then Shift+Tab to flip the bottom panel between Clip and Device view. Do it ten times without looking at the keyboard", min: 3, link: L(M + "live-concepts/", "Live concepts") },
    { text: "In Live, drag a kit from the Browser (⌘⌥B / Ctrl+Alt+B toggles it) onto a new MIDI track, then drag one sample onto a single Drum Rack pad to replace it", min: 4, link: L(M + "instrument-drum-and-effect-racks/", "Drum Racks") },
    { text: "In Live, double-click an empty clip slot, draw four kicks with the pencil (B), set the loop length in the Clip View and press 0 to switch a note off and on", min: 4, link: L(M + "editing-midi/", "Editing MIDI") },
    { text: "In Live, select a clip and press ⌘D / Ctrl+D to duplicate it, ⌘U / Ctrl+U to quantize it, and ⌘R / Ctrl+R to rename it", min: 3, link: L("/flashcards", "Live shortcuts deck") },
    { text: "In Live, open the Groove Pool, drag an MPC swing groove onto a hat clip and turn Amount up and down while it plays", min: 4, link: L(M + "using-grooves/", "Using grooves") },
  ],
  s2: [
    { text: "In Live, open a MIDI clip, turn on Scale in the Clip View, set the key, and watch the piano roll highlight scale notes", min: 3, link: L(M + "editing-midi/", "Editing MIDI") },
    { text: "In Live, draw a 4-chord progression with the pencil (B) in the piano roll, then select all and transpose with the arrow keys (Shift+↑ for an octave)", min: 5, link: L(M + "editing-midi/", "Editing MIDI") },
    { text: "In Live, use ⌘1 / ⌘2 (Ctrl+1 / Ctrl+2) to narrow and widen the grid and ⌘4 / Ctrl+4 to toggle snap while moving notes", min: 3, link: L("/flashcards", "Live shortcuts deck") },
    { text: "In Live, launch scenes with the mouse and with Enter on a selected scene; set a clip's launch quantization to 1 bar", min: 3, link: L(M + "session-view/", "Session view") },
    { text: "In Live, drag a MIDI clip out of Session into Arrangement and back, then use ⌘L / Ctrl+L to loop a selection", min: 4, link: L(M + "arrangement-view/", "Arrangement view") },
  ],
  s3: [
    { text: "In Live, open Drift on screen, collapse and expand the device, then right-click a parameter and Map to a macro in a Rack (⌘G / Ctrl+G groups it)", min: 4, link: L(M + "instrument-drum-and-effect-racks/", "Racks") },
    { text: "In Live, save a preset with the floppy icon in the device title bar, then find it again in the Browser under User Library", min: 3, link: L(M + "managing-files-and-sets/", "Managing files") },
    { text: "In Live, draw an envelope on the clip: open the Envelopes box in the Clip View and draw filter cutoff over 2 bars", min: 4, link: L(M + "clip-envelopes/", "Clip envelopes") },
    { text: "In Live, hot-swap a device: click the swap icon on a device and audition replacements with the arrow keys", min: 3, link: L(M + "working-with-the-browser/", "The Browser") },
    { text: "In Live, switch on Automation mode (A) in Arrangement and draw a cutoff sweep with breakpoints", min: 4, link: L(M + "automation-and-editing-envelopes/", "Automation") },
  ],
  s4: [
    { text: "In Live, drag an audio loop to an empty track, open the Clip View, and try Beats, Complex and Repitch warp modes on it", min: 4, link: L(M + "audio-clips-tempo-and-warping/", "Warping") },
    { text: "In Live, double-click a warp marker to set one, drag it to line up a transient, and use ⌘E / Ctrl+E to split a clip at the cursor", min: 4, link: L(M + "audio-clips-tempo-and-warping/", "Warp markers") },
    { text: "In Live, right-click an audio clip and pick Slice to New MIDI Track, choosing 1/8 slices", min: 4, link: L(M + "converting-audio-to-midi/", "Converting audio to MIDI") },
    { text: "In Live, select a few clips and press ⌘J / Ctrl+J to consolidate them into one audio clip", min: 3, link: L("/flashcards", "Live shortcuts deck") },
    { text: "In Live, set a new audio track's input to Resampling and record 4 bars of your own output", min: 4, link: L(M + "routing-and-i-o/", "Routing") },
  ],
  s5: [
    { text: "In Live, press F9 to arm Arrangement recording, then launch scenes in Session for 16 bars and stop", min: 4, link: L(M + "recording-new-clips/", "Recording") },
    { text: "In Live, add locators with Set (Locators section) at each section start and jump between them", min: 3, link: L(M + "arrangement-view/", "Arrangement view") },
    { text: "In Live, select 8 bars in Arrangement and use Insert Silence (⌘I / Ctrl+I) and Delete Time to move a section", min: 4, link: L(M + "arrangement-view/", "Editing time") },
    { text: "In Live, show automation lanes and draw a 16-bar filter rise, then copy it to another track", min: 4, link: L(M + "automation-and-editing-envelopes/", "Automation") },
    { text: "In Live, group tracks with ⌘G / Ctrl+G and color the group, then fold and unfold it", min: 3, link: L("/flashcards", "Live shortcuts deck") },
  ],
  s6: [
    { text: "In Live, show the Mixer section in Arrangement and read peak levels on every track while the drop plays", min: 3, link: L(M + "mixing/", "Mixing") },
    { text: "In Live, open EQ Eight, turn on Adaptive Q, and solo a band with the headphone icon to hear what it's cutting", min: 4, link: L(M + "live-audio-effect-reference/", "EQ Eight") },
    { text: "In Live, set up sidechain: open Compressor's Sidechain section, choose the kick track, and watch the gain reduction", min: 4, link: L(M + "live-audio-effect-reference/", "Compressor") },
    { text: "In Live, export with ⌘⇧R / Ctrl+Shift+R: pick the Master track, WAV, 24-bit, and set the render range", min: 3, link: L(M + "managing-files-and-sets/", "Export") },
    { text: "In Live, drop your reference on a track, turn it down to match your mix, and route it straight to the master", min: 4, link: L(M + "mixing/", "Mixing") },
  ],
}

/** Live keyboard shortcuts, Mac first, then Windows. Used as a flashcard deck. */
export const LIVE_SHORTCUTS: [string, string][] = [
  ["Tab", "Switch between Session and Arrangement view"],
  ["Shift + Tab", "Switch the bottom panel between Clip View and Device View"],
  ["⌘⌥L / Ctrl+Alt+L", "Show or hide the Detail View"],
  ["⌘⌥B / Ctrl+Alt+B", "Show or hide the Browser"],
  ["⌘T / Ctrl+T", "Insert an audio track"],
  ["⌘⇧T / Ctrl+Shift+T", "Insert a MIDI track"],
  ["⌘⌥T / Ctrl+Alt+T", "Insert a return track"],
  ["⌘D / Ctrl+D", "Duplicate the selection"],
  ["⌘E / Ctrl+E", "Split a clip at the selection"],
  ["⌘J / Ctrl+J", "Consolidate the selection into one clip"],
  ["⌘L / Ctrl+L", "Loop the selection"],
  ["⌘U / Ctrl+U", "Quantize"],
  ["⌘⇧U / Ctrl+Shift+U", "Quantize settings"],
  ["⌘R / Ctrl+R", "Rename the selection"],
  ["⌘G / Ctrl+G", "Group tracks, or group devices into a Rack"],
  ["⌘1 / Ctrl+1", "Narrow the grid"],
  ["⌘2 / Ctrl+2", "Widen the grid"],
  ["⌘3 / Ctrl+3", "Triplet grid on or off"],
  ["⌘4 / Ctrl+4", "Snap to grid on or off"],
  ["B", "Draw mode on or off"],
  ["A", "Automation mode on or off (Arrangement)"],
  ["0", "Turn the selected clip, note or device off and on"],
  ["F9", "Arrangement record"],
  ["⌘M / Ctrl+M", "MIDI Map mode"],
  ["⌘K / Ctrl+K", "Key Map mode"],
  ["⌘⇧R / Ctrl+Shift+R", "Export audio or video"],
  ["⌘I / Ctrl+I", "Insert silence (Arrangement)"],
  ["Space", "Play and stop"],
  ["Shift + Space", "Continue playing from where you stopped"],
]

export interface SkillCheck { task: string; limit: number; checks: string[]; link?: DayLink }
/** A short, timed check for each skill before it's marked learned. */
export const SKILL_CHECKS: Record<string, SkillCheck> = {
  "s1-0": { task: "Starting from an empty Set, create a MIDI track, load a Drum Rack kit and swap the snare, using only Push.", limit: 3, checks: ["The kit loaded from Push's browser", "The snare pad was replaced from Push", "No mouse"] },
  "s1-1": { task: "Program a one-bar four-on-the-floor beat with offbeat hats, then lower the velocity on four hat steps.", limit: 2, checks: ["Kick on 1, 5, 9, 13", "Clap or snare on 5 and 13", "Four hats at a lower velocity"], link: L("/push", "Practice on the virtual Push") },
  "s1-2": { task: "Turn on Fixed Length (1 bar), record a hat line live with Repeat at 1/16 and keep it.", limit: 2, checks: ["Recording stopped by itself after 1 bar", "Repeat was on while recording", "The take loops cleanly"] },
  "s1-3": { task: "Take a straight beat, swing it to about 58% from Push, then quantize a sloppy recorded take.", limit: 2, checks: ["Swing is audible and not sloppy", "The recorded take sits on the grid after quantizing"] },
  "s1-4": { task: "Duplicate a clip, double its loop, delete one hit, undo it, then play something and Capture it.", limit: 2, checks: ["Each action done from Push", "Capture kept the phrase you just played"] },
  "s1-5": { task: "Make three clips on two tracks and launch them as two scenes from the pad grid.", limit: 3, checks: ["Scenes launch on the bar", "You stopped a single clip with Stop Clip"] },
  "s2-0": { task: "Set Push to F minor, In Key, and play the scale up and down two octaves.", limit: 1, checks: ["Key and scale set from Push", "No wrong notes"] },
  "s2-1": { task: "Play the i, iv and v triads of C♯ minor as hand shapes, then the III and VI.", limit: 1, checks: ["Each chord correct by ear", "You didn't look up the shapes"], link: L("/labs/theory?tab=chords&key=1&scale=minor", "Chords in C♯ minor") },
  "s2-2": { task: "Play i–VI–III–VII in A minor, F minor and C♯ minor without stopping between keys.", limit: 3, checks: ["All three keys correct", "Steady timing"], link: L("/labs/progressions", "Hear it first") },
  "s2-3": { task: "Under a 4-chord loop, play a bassline on the roots, then add two passing notes.", limit: 3, checks: ["Bass follows every chord change", "Passing notes lead into the next root"] },
  "s2-4": { task: "Record a 4-bar chord clip, overdub a bass in a new clip, and set different lengths per scene.", limit: 4, checks: ["Overdub kept the first take", "Scenes launch at the right lengths"] },
  "s3-0": { task: "Lock Push's encoders to Drift and change cutoff, envelope and LFO from Device mode.", limit: 2, checks: ["The device stayed locked while you changed tracks", "No mouse"] },
  "s3-1": { task: "From Drift's init patch, make a pluck: short decay, no sustain, filter envelope.", limit: 5, checks: ["Plucky without clicking", "Brighter at the start of each note"], link: L("/instruments?tab=modulation", "Envelope editor") },
  "s3-2": { task: "Load Wavetable and make a slow pad with movement from an LFO on wavetable position.", limit: 6, checks: ["Slow attack and release", "Audible movement over 2 bars"] },
  "s3-3": { task: "Wrap a synth in an Instrument Rack, map 4 macros with useful ranges, and save it.", limit: 6, checks: ["Every macro sweep sounds usable", "Saved to your User Library"] },
  "s3-4": { task: "Build Saturator → Auto Filter → Reverb → Delay on a sound and balance each.", limit: 4, checks: ["The sound is fuller, not just louder", "Reverb and delay don't wash it out"] },
  "s4-0": { task: "Find a vocal in Splice from Live, audition it in key and tempo, and drop it on a track.", limit: 2, checks: ["It's in your Set's key and tempo"] },
  "s4-1": { task: "Load a drum loop into Simpler, Slice mode, and play a new 1-bar rhythm from the slices.", limit: 3, checks: ["At least 8 slices", "The new rhythm is clearly different"], link: L("/labs/sampler", "Practice in the sampler") },
  "s4-2": { task: "Warp an unwarped loop to your tempo and fix one drifting beat with a warp marker.", limit: 4, checks: ["It stays in time for 8 bars"] },
  "s4-3": { task: "Resample 4 bars of your Set and play a new pattern from the result.", limit: 4, checks: ["Recorded from the Resampling input", "New pattern recorded"] },
  "s4-4": { task: "Play a phonk-style cowbell melody from one cowbell hit in Simpler, and add one reversed chop.", limit: 4, checks: ["The melody stays in key", "The reverse peaks on the beat"], link: L("/labs/sound-design#sound-phonk-cowbell", "Hear the cowbell") },
  "s5-0": { task: "Perform 4 scenes into Arrangement from Push in one take.", limit: 3, checks: ["Everything landed in Arrangement", "Scene changes are on bar lines"] },
  "s5-1": { task: "Record a filter sweep live with an encoder while Automate is on, then redo it.", limit: 3, checks: ["Automation recorded in the clip or Arrangement"] },
  "s5-2": { task: "Build an 8-bar build with a riser and a one-bar drop-out before the drop.", limit: 6, checks: ["Tension rises over 8 bars", "The drop hits harder after the gap"] },
  "s5-3": { task: "Add a new percussion element every 8 bars over 32 bars of a loop.", limit: 6, checks: ["Each addition is audible", "It never feels cluttered"] },
  "s5-4": { task: "Cut a section, extend another by 8 bars and clean up clip edges so nothing clicks.", limit: 5, checks: ["No clicks at edits", "Sections still start on phrase boundaries"] },
  "s6-0": { task: "On Push's Mix mode, set volumes, pans and two sends for 6 tracks.", limit: 4, checks: ["No mouse", "Nothing clips"] },
  "s6-1": { task: "Gain-stage a busy section so the master peaks near −6 dB with every fader under 0.", limit: 4, checks: ["Master peak between −8 and −5 dB"] },
  "s6-2": { task: "High-pass six non-bass tracks and make one cut that clears mud between 200 and 400 Hz.", limit: 5, checks: ["Lows only from kick and bass", "The mix is clearer, not thinner"], link: L("/labs/mixing", "Train the EQ ear first") },
  "s6-3": { task: "Sidechain bass and pad to the kick, and add Glue on the drum bus with 1–3 dB reduction.", limit: 5, checks: ["Ducking audible but not pumping too hard", "Drums sound glued together"] },
  "s6-4": { task: "Compare your track to a reference at matched loudness and export WAV and MP3.", limit: 5, checks: ["Loudness matched before judging", "Both files exported"] },
}

export interface Challenge { title: string; brief: string; rules: string[]; minutes: number; ref?: DayLink }
/** One small creative prompt per plan week. */
export const CHALLENGES: Challenge[] = [
  { title: "Three sounds only", brief: "Make an 8-bar beat using only three pads.", rules: ["Kick, one snare or clap, one hat", "Velocity is your only variation", "Finish on Push"], minutes: 30, ref: L("/labs/drums", "Pattern library") },
  { title: "Steal a groove", brief: "Copy the groove of a track you love, then change two things so it's yours.", rules: ["Same tempo as the reference", "Change the kick pattern and one sound"], minutes: 30, ref: L("/notebook", "Reference notebook") },
  { title: "Four chords, four feels", brief: "Play i–VI–III–VII four ways: held, pulsing 8ths, arpeggiated, stabbed.", rules: ["Same key throughout", "Record each as its own clip"], minutes: 30, ref: L("/labs/progressions", "Chord progressions") },
  { title: "Three-note hook", brief: "Write a hook with only three different notes.", rules: ["Rhythm does the work", "It must repeat at least twice"], minutes: 25, ref: L("/labs/melody", "Melody") },
  { title: "One knob", brief: "Make a sound evolve over 16 bars by moving only one macro.", rules: ["Record the movement as automation", "It should sound intentional, not random"], minutes: 30, ref: L("/instruments?tab=modulation", "Modulation") },
  { title: "Init to finished", brief: "From an init Drift, make a bass that fits your Sprint 2 sketch.", rules: ["10-minute limit for the sound", "Then 10 minutes to write the line"], minutes: 25, ref: L("/labs/sound-design", "Sound design") },
  { title: "Flip it", brief: "Turn one 2-second sample into a full 8-bar loop.", rules: ["Only slices of that sample, plus drums", "At least one reversed slice"], minutes: 35, ref: L("/labs/sampler", "Sampler") },
  { title: "Resample everything", brief: "Resample your loop three times, mangling it more each time, and build a breakdown from the result.", rules: ["Each pass gets a new effect", "Keep the best 4 bars"], minutes: 35 },
  { title: "One-take arrangement", brief: "Perform a 2-minute arrangement in one take from Session scenes.", rules: ["No editing afterwards", "At least four scene changes"], minutes: 30, ref: L("/labs/arrangement", "Arrangement map") },
  { title: "The 8-bar transition", brief: "Make the best 8 bars of build-up you can into one drop.", rules: ["Use at least two tension tools", "One beat of silence before the drop"], minutes: 30 },
  { title: "Mono mix", brief: "Mix your drop in mono until everything is clear, then switch back to stereo.", rules: ["Levels and EQ only", "No new plugins"], minutes: 30, ref: L("/labs/mixing", "Mixing") },
  { title: "Two-minute share", brief: "Export the best 2 minutes you made in these 12 weeks and send it to someone.", rules: ["WAV and MP3", "Write one sentence about it"], minutes: 30, ref: L("/exports", "Exports") },
]

/** What to listen for on each sprint's Friday reference day. */
export const LISTEN: Record<string, string[]> = {
  s1: ["Where does the kick land in a bar? Count the hits", "Is the snare on 2 and 4, or once per bar (half-time)?", "Hats: 8ths, 16ths, rolls? Do they swing?", "Any ghost notes or quiet layers?", "What changes in the last bar of a phrase (a fill)?"],
  s2: ["Hum the note the track keeps resolving to: that's the key's root", "Does it sound minor (dark) or major (bright)?", "How many chords before it repeats?", "Does the bass follow the chord roots?", "Where does the hook sit: on the beat or around it?"],
  s3: ["Is the bass bright or dark? Short or sustained?", "Does any sound move over time (filter, LFO)?", "Is the pad wide or narrow? Wet or dry?", "Which sounds have distortion or saturation?", "Could you name the oscillator shape?"],
  s4: ["What's sampled: a vocal, a loop, a single hit?", "Is the sample pitched or reversed anywhere?", "Is it chopped into a new rhythm, or played as is?", "Do you hear resampled or mangled versions?", "How are transitions made: reverses, risers, cuts?"],
  s5: ["When does each element enter? Note the bar", "How long is the intro, the build, the drop?", "What happens one bar before the drop?", "What changes between the first and second drop?", "How does the track end?"],
  s6: ["Where is the low end: kick, bass, or both?", "What's in the center, and what's wide?", "How loud are the vocals or lead compared with the drums?", "Do you hear the bass duck under the kick?", "How bright is the top end compared with your mix?"],
}

/** What usually goes wrong in each sprint, and where to get unstuck. */
export const STUCK: Record<string, { mistakes: string[]; help: DayLink[] }> = {
  s1: { mistakes: ["Programming hats before the kick and snare feel right", "Every step at full velocity, so nothing grooves", "Recording without Fixed Length and ending up with odd clip lengths"], help: [L("https://www.ableton.com/en/push/manual/", "Push 3 manual"), L("/push?tab=drums", "Drum layouts"), L("https://help.ableton.com/hc/en-us/articles/360000147624-Learn-Live-Videos-Push", "Learn Push videos")] },
  s2: { mistakes: ["Starting chords from a different root than the bass", "Leaving Push in Chromatic and hitting wrong notes", "Writing hooks that are too busy; fewer notes are stronger"], help: [L("https://learningmusic.ableton.com", "Learning Music"), L("/labs/theory?tab=chords", "Chords in a key"), L("https://www.ableton.com/en/push/manual/", "Push 3 manual")] },
  s3: { mistakes: ["Turning many knobs at once and losing track of what changed", "Too much resonance, which turns harsh", "Judging a sound alone instead of in the mix"], help: [L("https://learningsynths.ableton.com", "Learning Synths"), L("/instruments?tab=modulation", "Envelopes and LFOs"), L(M + "live-instrument-reference/", "Instrument reference")] },
  s4: { mistakes: ["The sample isn't warped, so it drifts", "Too many slices: 8 good ones beat 32 random ones", "Forgetting to set the sample's key against your Set"], help: [L(M + "audio-clips-tempo-and-warping/", "Warping in the manual"), L("/labs/sampler", "Sampler"), L("https://help.ableton.com/hc/en-us/articles/209072629-Warping-in-Simpler", "Warping in Simpler")] },
  s5: { mistakes: ["Sections that aren't multiples of 8 bars", "Adding instead of subtracting: breakdowns need contrast", "Automation everywhere instead of three strong moves"], help: [L("/labs/arrangement", "Arrangement map"), L(M + "arrangement-view/", "Arrangement view"), L(M + "automation-and-editing-envelopes/", "Automation")] },
  s6: { mistakes: ["Mixing too loud: your ears tire and everything sounds fine", "Boosting before cutting", "Comparing to a reference that's louder than your mix"], help: [L("/labs/mixing", "Mixing tools"), L(M + "mixing/", "Mixing in the manual"), L(M + "live-audio-effect-reference/", "Effect reference")] },
}

/** A smaller version of each day, for when the full plan is too much. */
export const SMALLER: Record<string, string> = {
  "s1-w1-mon": "Just load a kit from Push and program kick and clap. Everything else can wait.",
  "s1-w1-mid": "Program only the kick and snare of today's pattern, then apply today's feel.",
  "s1-w1-fri": "Copy only the kick and snare of the reference.",
  "s1-w1-wknd": "Make your loop 4 bars instead of 8, with a fill in bar 4.",
  "s1-w2-mon": "Add two ghost snares to your loop. That's it.",
  "s1-w2-mid": "Play the layer live once over your loop and keep the take.",
  "s1-w2-fri": "Copy just the rhythm of the idea onto one pad.",
  "s1-w2-wknd": "Save your current Set as the default; skip the time trial.",
  "s2-w1-mon": "Set A minor on Push and find every root.",
  "s2-w1-mid": "Play only i and VI in today's key, back and forth.",
  "s2-w1-fri": "Find only the key of the reference.",
  "s2-w1-wknd": "Build scene 1 only.",
  "s2-w2-mon": "Play the roots under your chords, one per bar.",
  "s2-w2-mid": "Write two notes of the hook and repeat them with a rhythm.",
  "s2-w2-fri": "Tap the reference hook's rhythm on one pad and record it.",
  "s2-w2-wknd": "Add scene 3, skip the export.",
  "s3-w1-mon": "Drag the envelope points in the guide and hear the difference. Nothing else.",
  "s3-w1-mid": "Change only the filter and amp envelope from Drift's init.",
  "s3-w1-fri": "Match only how the reference bass starts and stops.",
  "s3-w1-wknd": "Map four macros instead of eight.",
  "s3-w2-mon": "Build a 2-pad kit from an empty Drum Rack.",
  "s3-w2-mid": "Pick one preset close to today's target and tweak three things.",
  "s3-w2-fri": "Match the pad's attack and release only.",
  "s3-w2-wknd": "Swap in your bass preset only.",
  "s4-w1-mon": "Load one drum loop in Simpler Slice mode and play the pads.",
  "s4-w1-mid": "Slice into 8 and play one new bar.",
  "s4-w1-fri": "Name the technique the reference uses and try it once.",
  "s4-w1-wknd": "Get the sample and drums playing together in key.",
  "s4-w2-mon": "Resample 4 bars. That's the whole session.",
  "s4-w2-mid": "Make one 1-bar variation from the resample.",
  "s4-w2-fri": "Reverse one crash into your biggest change.",
  "s4-w2-wknd": "Export what you have at 40 seconds.",
  "s5-w1-mon": "Map only the first 64 bars of the reference.",
  "s5-w1-mid": "Build one scene for today's section.",
  "s5-w1-fri": "Record half of the arrangement.",
  "s5-w1-wknd": "Automate one move, not three.",
  "s5-w2-mon": "Build one transition: a drop-out before the drop.",
  "s5-w2-mid": "Fix the single biggest problem in today's section.",
  "s5-w2-fri": "Compare section lengths only.",
  "s5-w2-wknd": "Export without cleaning up.",
  "s6-w1-mon": "Balance kick and bass only.",
  "s6-w1-mid": "Do today's pass on the five loudest tracks.",
  "s6-w1-fri": "Compare the drop only.",
  "s6-w1-wknd": "Do levels and EQ; skip compression.",
  "s6-w2-mon": "Listen on your phone only and write down two things.",
  "s6-w2-mid": "Fix the problem with the smallest possible change.",
  "s6-w2-fri": "Add only a limiter with a −1 dB ceiling.",
  "s6-w2-wknd": "Export the MP3 and send it.",
}

/** The ear drill each sprint leans on. */
export const EAR_TRACK: Record<string, { quiz: string; label: string; to: string }> = {
  s1: { quiz: "rhythm", label: "Rhythm dictation", to: "/labs/ear?quiz=rhythm" },
  s2: { quiz: "progressions", label: "Chord progressions", to: "/labs/ear?quiz=progressions" },
  s3: { quiz: "chords", label: "Chord quality", to: "/labs/ear?quiz=chords" },
  s4: { quiz: "intervals", label: "Intervals", to: "/labs/ear?quiz=intervals" },
  s5: { quiz: "degrees", label: "Scale degrees", to: "/labs/ear?quiz=degrees" },
  s6: { quiz: "mix-eq", label: "Which band is boosted", to: "/labs/mixing" },
}
