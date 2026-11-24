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
| `src/lib/store.ts` | Progress saved to `localStorage`, with import and export. `usePref` keeps small per-browser settings like the selected key. |
| `src/lib/theory.ts` | Scale spelling, diatonic chords, progressions. |
| `src/components/` | Shared pieces: `PadGrid`, `Piano`, `PlayButton`, `Seg`, diagrams, and `ui/` for shadcn components. |
| `src/components/labs/` | Interactive labs: scales and chords, synth, slicing, drum patterns, arrangement map, mixing, ear training. |
| `src/components/guide/`, `src/components/push/` | The Live instruments guide and the Push 3 guide. |
| `src/pages/` | One file per route. |

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
