import { SCALES } from "@/data/labs"
import { FXPICK, GLOSS, INSTR } from "@/data/guide"
import { REC, SHORT } from "@/data/push"
import { isoOf, todayISO, type Progress } from "./store"
import { theory } from "./theory"

export interface Card { id: string; deck: DeckId; front: string; back: string }
export type DeckId = "push" | "chords" | "scales" | "glossary" | "effects" | "instruments"
export const DECKS: [DeckId, string, string][] = [
  ["push", "Push 3 controls", "Button combos and what the main buttons do."],
  ["chords", "Chord spellings", "The notes in every major and minor triad."],
  ["scales", "Scale spellings", "Every major and natural minor scale."],
  ["glossary", "Sound design terms", "The glossary from the instrument guide."],
  ["effects", "Which effect?", "The Live effect for each job."],
  ["instruments", "Which instrument?", "The Live instrument for each kind of sound."],
]

/** Days until the next review for each Leitner box. */
const INTERVALS = [0, 1, 2, 4, 7, 14, 30, 60]
const NEW_PER_DAY = 5
const ROOT_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 5, 10, 3, 8]

let cache: Card[] | null = null
export function allCards(): Card[] {
  if (cache) return cache
  const out: Card[] = []
  for (const [combo, effect] of SHORT) out.push({ id: "push-" + combo, deck: "push", front: `On Push 3, how do you: ${effect.charAt(0).toLowerCase() + effect.slice(1)}?`, back: combo })
  for (const [btn, desc] of REC) out.push({ id: "pushbtn-" + btn, deck: "push", front: `What does the ${btn} button do?`, back: desc })
  for (const pc of ROOT_PCS)
    for (const sc of ["major", "minor"] as const) {
      const T = theory(pc, sc), ch = T.chords[0]
      out.push({ id: `chord-${pc}-${sc}`, deck: "chords", front: `Notes in a ${T.names[0]} ${sc} chord`, back: ch.notes.join(" – ") })
    }
  for (const pc of ROOT_PCS)
    for (const id of ["major", "minor"]) {
      const sc = SCALES.find((s) => s.id === id)!, T = theory(pc, id)
      out.push({ id: `scale-${pc}-${id}`, deck: "scales", front: `${T.names[0]} ${sc.name.toLowerCase()} scale`, back: T.names.join(" ") })
    }
  for (const [id, term, , def] of GLOSS) out.push({ id: "gl-" + id, deck: "glossary", front: term, back: def })
  for (const [job, fx] of FXPICK) out.push({ id: "fx-" + job, deck: "effects", front: `Effect to reach for: ${job.toLowerCase()}`, back: fx })
  for (const i of INSTR) out.push({ id: "inst-" + i.id, deck: "instruments", front: i.when, back: i.name })
  cache = out
  return out
}

/** Cards due today: reviews first, then up to 5 new cards per deck per day. */
export function dueCards(p: Progress, deck?: DeckId): Card[] {
  const today = todayISO()
  const cards = allCards().filter((c) => !deck || c.deck === deck)
  const review = cards.filter((c) => p.cards[c.id] && p.cards[c.id].due <= today)
  const fresh: Card[] = []
  for (const [d] of DECKS) {
    if (deck && d !== deck) continue
    const inDeck = cards.filter((c) => c.deck === d)
    const room = Math.max(0, NEW_PER_DAY - inDeck.filter((c) => p.cards[c.id]?.intro === today).length)
    fresh.push(...inDeck.filter((c) => !p.cards[c.id]).slice(0, room))
  }
  return [...review, ...fresh]
}

export type Grade = "again" | "good" | "easy"
/** New scheduling for a card after an answer. */
export function schedule(prev: { box: number; intro?: string } | undefined, grade: Grade) {
  const box = grade === "again" ? 0 : Math.min(INTERVALS.length - 1, (prev?.box ?? 0) + (grade === "easy" ? 2 : 1))
  const d = new Date()
  d.setDate(d.getDate() + INTERVALS[box])
  return { box, due: isoOf(d), intro: prev?.intro ?? todayISO() }
}
export const learned = (p: Progress, deck: DeckId) => allCards().filter((c) => c.deck === deck && (p.cards[c.id]?.box ?? 0) >= 3).length
export const deckSize = (deck: DeckId) => allCards().filter((c) => c.deck === deck).length
