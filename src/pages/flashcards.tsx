import { useEffect, useState } from "react"
import { Block, Caption, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Piano } from "@/components/piano"
import { cn } from "@/lib/utils"
import { allCards, DECKS, deckSize, dueCards, learned, schedule, type Card as FlashCard, type DeckId, type Grade } from "@/lib/cards"
import { update, useProgress } from "@/lib/store"

function Review({ queue: initial, onDone }: { queue: FlashCard[]; onDone: () => void }) {
  const [queue, setQueue] = useState(initial)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(0)
  const card = queue[0]

  const grade = (g: Grade) => {
    if (!card) return
    update((d) => { d.cards[card.id] = schedule(d.cards[card.id], g) })
    setQueue((q) => (g === "again" ? [...q.slice(1), q[0]] : q.slice(1)))
    if (g !== "again") setDone((n) => n + 1)
    setShown(false)
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return
      if (!shown && (e.code === "Space" || e.key === "Enter")) { e.preventDefault(); setShown(true) }
      else if (shown && e.key === "1") grade("again")
      else if (shown && (e.key === "2" || e.code === "Space")) { e.preventDefault(); grade("good") }
      else if (shown && e.key === "3") grade("easy")
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  })

  if (!card)
    return (
      <Card className="max-w-2xl"><CardContent className="space-y-3">
        <p className="text-headline font-medium">Done for now</p>
        <p className="text-muted-foreground">You reviewed {done} card{done === 1 ? "" : "s"}. Cards you knew come back in a few days; the ones you missed come back sooner.</p>
        <Button onClick={onDone}>Back to decks</Button>
      </CardContent></Card>
    )
  const total = done + queue.length
  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <div className="text-muted-foreground flex justify-between text-sm"><span>{DECKS.find((d) => d[0] === card.deck)![1]}</span><span className="tabular-nums">{done} of {total}</span></div>
        <Progress value={(done / total) * 100} aria-label="Session progress" />
      </div>
      <div className="[perspective:1400px]">
        <button type="button" onClick={() => setShown((x) => !x)} aria-label={shown ? "Show the question" : "Flip to the answer"}
          className={cn("grid w-full text-left transition-[rotate] duration-500 ease-[cubic-bezier(0.2,0,0,1)] [transform-style:preserve-3d] motion-reduce:transition-none", shown && "[rotate:y_180deg]")}>
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 border bg-card p-8 text-center [backface-visibility:hidden] [grid-area:1/1]" aria-hidden={shown}>
            <span className="text-muted-foreground text-xs">{DECKS.find((d) => d[0] === card.deck)![1]}</span>
            <p className="font-display text-2xl font-medium text-balance">{card.front}</p>
            <span className="text-muted-foreground text-xs">Click or press Space to flip</span>
          </div>
          <div className="flex min-h-72 flex-col items-center justify-center gap-5 border border-foreground bg-card p-8 text-center [backface-visibility:hidden] [grid-area:1/1] [rotate:y_180deg]" aria-hidden={!shown}>
            <p className="text-muted-foreground text-sm text-balance">{card.front}</p>
            <p className="text-2xl font-medium text-pretty" aria-live="polite">{shown ? card.back : ""}</p>
            {card.keys && (
              <div className="w-full max-w-md" style={{ ["--c" as string]: "var(--s5)" }}>
                <Piano scale={card.keys.pcs} names={card.keys.names} root={card.keys.root} chord={card.keys.chord ? card.keys.pcs : []} label={`${card.back} on a keyboard`} />
              </div>
            )}
            {card.buttons && card.deck === "push" && card.buttons.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
                {card.buttons.map((b, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-muted-foreground">+</span>}
                    <kbd className="inline-flex h-10 min-w-10 items-center justify-center border-2 border-foreground bg-background px-3 font-sans text-sm font-medium">{b.replace(/^Hold\s+/i, "")}</kbd>
                    {/^Hold\s/i.test(b) && <span className="text-muted-foreground text-xs">hold</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
      </div>
      {shown ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => grade("again")}>Missed it <span className="text-muted-foreground text-xs">1</span></Button>
          <Button onClick={() => grade("good")}>Knew it <span className="text-xs opacity-70">2</span></Button>
          <Button variant="outline" onClick={() => grade("easy")}>Easy <span className="text-muted-foreground text-xs">3</span></Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setShown(true)}>Show answer <span className="text-xs opacity-70">Space</span></Button>
      )}
      <Caption>Say the answer out loud before you flip, then be honest. "Missed it" puts the card back in this session.</Caption>
    </div>
  )
}

export function FlashcardsPage() {
  const p = useProgress()
  const [session, setSession] = useState<FlashCard[] | null>(null)
  const due = dueCards(p)
  const start = (deck?: DeckId) => setSession(dueCards(p, deck).sort(() => Math.random() - 0.5))
  const seen = allCards().filter((c) => p.cards[c.id]).length

  return (
    <div className="space-y-10">
      <PageHeader title="Flashcards">A few minutes a day on Push controls, chord and scale spellings, and sound design terms. Cards you know come back less often.</PageHeader>
      {session ? (
        <Review queue={session} onDone={() => setSession(null)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" disabled={!due.length} onClick={() => start()}>{due.length ? `Review ${due.length} due today` : "Nothing due today"}</Button>
            <span className="text-muted-foreground text-sm">{seen} of {allCards().length} cards started. Up to 5 new cards per deck each day.</span>
          </div>
          <Block title="Decks">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DECKS.map(([id, name, desc]) => {
                const n = dueCards(p, id).length, size = deckSize(id), l = learned(p, id)
                return (
                  <Card key={id}>
                    <CardContent className="flex h-full flex-col gap-3">
                      <div><h3 className="font-semibold">{name}</h3><p className="text-muted-foreground text-sm">{desc}</p></div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span>Learned</span><span className="tabular-nums">{l} of {size}</span></div>
                        <Progress value={(l / size) * 100} aria-label={`${name} learned`} />
                      </div>
                      <Button variant="outline" size="sm" className="mt-auto self-start" disabled={!n} onClick={() => start(id)}>{n ? `Study ${n}` : "All caught up"}</Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Caption>A card counts as learned after you've known it three times in a row, spaced out over a week or so.</Caption>
          </Block>
        </>
      )}
    </div>
  )
}
