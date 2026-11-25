# Music Lab

Live at https://music-lab-xi.vercel.app

A personal workspace for learning music theory, Ableton Live 12 and Push 3: a 12-week sprint plan with progress tracking, interactive labs you can hear, and reference guides for Live's instruments, effects and Push.

Built with React 19, TypeScript, Vite, Tailwind CSS 4 and shadcn/ui. Sound is synthesized in the browser with the Web Audio API, so there are no audio files.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the build
npm run lint
```

## What's where

| Path | What it holds |
| --- | --- |
| `src/data/` | All content as typed data: sprints, resources, patterns, scales, recipes, effects, glossary, Push guide. Add content here, not in components. |
| `src/audio/` | `engine.ts` (tone, drum, shared context), `playback.ts` (one sound at a time, `usePlayingId`), `previews.ts` (recipe sketches). |
| `src/midi/midi.ts` | Web MIDI input: connect, held notes, note listeners (`useMidi`, `onNote`). |
| `src/lib/midi-file.ts` | Writes Standard MIDI Files for the sequencer's export. |
| `src/lib/cards.ts` | Flashcard decks and spaced-repetition scheduling. |
| `src/data/patterns.ts` | The drum pattern library: 23 styles, with ghost notes and swing. |
| `src/lib/store.ts` | Progress saved to `localStorage`, with import and export. `usePref` keeps small per-browser settings like the selected key. |
| `src/lib/theory.ts` | Scale spelling, diatonic chords, progressions. |
| `src/components/` | Shared pieces: `PadGrid`, `Piano`, `PlayButton`, `Seg`, diagrams, and `ui/` for shadcn components. |
| `src/components/labs/` | Interactive labs: scales and chords, synth, slicing, drum patterns, arrangement map, mixing, ear training. |
| `src/components/guide/`, `src/components/push/` | The Live instruments guide and the Push 3 guide. |
| `src/pages/` | One file per route. |
| `src/jam/` | The recipe generator: vocabulary, theory, layer generation, the six-recipe cookbook per style, MIDI and pack export, and browser playback. |
| `recipes/` | Every style’s six recipes as Markdown, written by `npm run jam -- --write-recipes recipes`. |

## Cooking recipes into MIDI

`npm run jam` turns Markdown recipes into MIDI, inspired by jamburgr’s documented workflow (its source isn’t public, so this is our own implementation). The genre pages use the same code.

```sh
npm run jam                                            # interactive menu
npm run jam -- --list                                  # every chord colour, voicing, pattern, bass, pad, lead and arrangement
npm run jam -- --style-info liquid                     # a style’s notes, tells and recipes
npm run jam -- --style ukg --recipes                   # the style’s six recipes
npm run jam -- --style ukg --recipe starter --key "F minor" --out ./jams/ukg
npm run jam -- --style deephouse --recipe live --output-mode pack --out ./jams/deep
npm run jam -- --config recipes/chill/chill_golden_hour_chords.md --progression "i,bVII,bVI,V7" --out ./jams/chill
npm run jam -- --style all --recipe sectioned --output-mode multi --out ./jams/all
npm run jam -- --write-example-config my_song.md       # a recipe to edit
```

A recipe is readable `key: value` lines (anything else is notes): header fields (`recipe_role`, `display_title`, `summary`, `mood_tags`, `tempo_band`, `study`), then the config: `key`, `style`, `progression` (a name, `default`, or Roman numerals like `i,VI,III,VII`), `chord`, `voicing`, `pattern`, `bpm`, `bars_per_chord`, layer switches and styles (`bass_style`, `pad_style`, `lead_style`, `drum_style`, densities), `arrangement` with `arrangement_archetype` and `song_length`, and export settings (`output_mode`, `export_layout`, `sound_design_cards`). Any field can also be passed as a flag. Packs hold `full.mid`, one file per layer and per section, the recipe and `notes.md` with Live import steps and sound cards.

## Adding shadcn components

The shadcn registry wasn't reachable when this was set up, so the components in `src/components/ui` were copied from the shadcn/ui repo. On your machine the CLI works normally:

```sh
npx shadcn@latest add dialog
```

## Moving progress from the old tracker

Open the old Push Sprint Tracker, expand "Move your progress to Music Lab" at the bottom and copy the JSON. In Music Lab, go to Settings and data, paste it and choose Import.

## Deploying

It's a static single-page app. Any static host works; the build output is `dist/`.

- Cloudflare Pages or Netlify: build command `npm run build`, output `dist`. `public/_redirects` sends every path to the app.
- Vercel: import the repo; `vercel.json` handles the rewrites.

## Ideas for next

- Sync across devices (needs a backend with sign-in)
- Reference song analyzer: notes and chords from a stem in the browser with Basic Pitch

## Accounts (Supabase)

Accounts are off until a Supabase project is configured. Then the tracking pages
(dashboard, today, sprints, practice log, flashcards, exports, planner, notebook,
weekly review) need sign-in, and progress syncs to a `progress` table, one row per
user, protected by row-level security. Labs and guides stay open to everyone.

1. Create a Supabase project and run `supabase/migrations/0001_progress.sql`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) locally and in Vercel.
3. Enable the GitHub provider (callback `https://<project>.supabase.co/auth/v1/callback`) and email sign-in.
4. Set the Site URL to the Vercel domain and add `http://localhost:5173` as a redirect URL.
