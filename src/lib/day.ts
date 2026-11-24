import { dayPlan, type DayLink } from "@/data/days"
import { EAR_TRACK, LIVE_DRILLS, SMALLER, STUCK } from "@/data/learning"
import { SCALES } from "@/data/labs"
import { theory } from "@/lib/theory"
import { SPRINTS } from "@/data/sprints"
import { dueCards } from "@/lib/cards"
import { currentWeek, sprintForWeek, todayISO, weekOf, type Progress } from "@/lib/store"

export const SLOT: Record<number, ["mon" | "mid" | "fri" | "wknd", string]> = { 1: ["mon", "Monday: learn"], 2: ["mid", "Practice day"], 3: ["mid", "Practice day"], 4: ["mid", "Practice day"], 5: ["fri", "Friday: reference"], 6: ["wknd", "Weekend: build"], 0: ["wknd", "Weekend: build"] }
export const PLAN_MIN: Record<string, number> = { mon: 60, mid: 60, fri: 60, wknd: 150 }

export interface PlanItem { id: string; text: string; title?: string; min: number; link?: DayLink; tag?: "For you" | "In Live" | "From your retro" }

const EAR_NAMES: Record<string, string> = { chords: "Chord quality", intervals: "Intervals", progressions: "Chord progressions", degrees: "Scale degrees", keys: "Major or minor", rhythm: "Rhythm dictation", "mix-eq": "Which band is boosted", "mix-comp": "Compressed or not", "mix-side": "Sidechained or not" }
const EAR_LINK = (quiz: string) => (quiz.startsWith("mix-") ? "/labs/mixing" : `/labs/ear?quiz=${quiz}`)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)

/**
 * Everything the Today page and practice mode show for one date: the plan for
 * that sprint day in your key, a session step in Live, warm-ups that adapt to
 * your weak spots, and help for when you're stuck. `short` trims it to about
 * 30 minutes.
 */
export function buildDay(p: Progress, sel: string, opts: { root: number; scale: string; short: boolean }) {
  const today = todayISO(), isToday = sel === today
  const week = isToday ? currentWeek(p).week : weekOf(p, sel)
  const inPlan = week >= 1 && week <= 12
  const si = sprintForWeek(week), s = SPRINTS[si]
  const date = new Date(sel + "T00:00:00"), day = date.getDay()
  const [slot, slotName] = SLOT[day]
  const weekInSprint = inPlan ? (week - 1) % 2 : 0
  const sprintDay = weekInSprint * 7 + ((day + 6) % 7) + 1
  const sc = SCALES.find((x) => x.id === opts.scale) ?? SCALES[0]
  const key = { name: `${theory(opts.root, sc.id).names[0]} ${sc.name.toLowerCase()}`, q: `key=${opts.root}&scale=${sc.id}` }
  const dayKey = `${s.id}-w${weekInSprint + 1}-${slot}`
  const plan = dayPlan(s.id, (weekInSprint + 1) as 1 | 2, slot, slot === "mid" ? day - 2 : 0, key)

  // The session: the plan's steps, then one drill in Live itself so the screen workflow keeps pace with Push.
  const drills = LIVE_DRILLS[s.id] ?? []
  const live = drills.length ? drills[(sprintDay - 1) % drills.length] : null
  let steps: PlanItem[] = (plan?.steps ?? []).map((st) => ({ id: "s-" + slug(st.title), title: st.title, text: st.detail, min: st.min, link: st.link }))
  if (live) steps.push({ id: "s-live-" + slug(live.text), title: "Now in Live", text: live.text, min: live.min, link: live.link, tag: "In Live" })

  // Warm-ups: the plan's first two, then up to two picked from what you need most.
  let warm: PlanItem[] = (plan?.warmup ?? []).slice(0, 2).map((w) => ({ id: "w-" + slug(w.text), text: w.text, min: w.min, link: w.link }))
  const extra: PlanItem[] = []
  const prev = si > 0 ? SPRINTS[si - 1] : null
  const carry = prev && p.retros?.[prev.id]?.carry
  if (carry) extra.push({ id: "w-retro-" + prev!.id, text: `From your Sprint ${prev!.n} retro: ${carry}`, min: 3, tag: "From your retro" })
  // A skill you rated low, from this sprint or earlier.
  const low = Object.entries(p.skillConf ?? {}).filter(([k, v]) => v <= 2 && !k.startsWith("s" + (si + 2))).sort((a, b) => a[1] - b[1])[0]
  if (low) {
    const [k, v] = low, sp = SPRINTS.find((x) => k.startsWith(x.id + "-"))
    if (sp) extra.push({ id: "w-conf-" + k, text: `Revisit “${sp.skills[+k.split("-")[1]]}”. You rated it ${v} of 5, so do one walkthrough step or the skill check`, min: 5, link: { to: `/sprints/${sp.n}?skill=${k}`, label: "Open the skill" }, tag: "For you" })
  }
  // Your weakest ear drill, or this sprint's ear focus.
  const ear = Object.entries(p.ear ?? {}).filter(([, x]) => x.total >= 8).map(([q, x]) => [q, x.right / x.total] as const).sort((a, b) => a[1] - b[1])[0]
  const track = EAR_TRACK[s.id]
  if (ear && ear[1] < 0.7) extra.push({ id: "w-ear-" + ear[0], text: `${EAR_NAMES[ear[0]] ?? ear[0]}: you're at ${Math.round(ear[1] * 100)}%, your weakest ear drill. Ten rounds`, min: 5, link: { to: EAR_LINK(ear[0]), label: "Ear drill" }, tag: "For you" })
  else if (track) extra.push({ id: "w-track-" + track.quiz, text: `${track.label}: this sprint's ear drill. Ten rounds`, min: 5, link: { to: track.to, label: track.label }, tag: "For you" })
  const due = dueCards(p).length
  if (due >= 5) extra.push({ id: "w-cards", text: `${due} flashcards are due. Clear them before they pile up`, min: 5, link: { to: "/flashcards", label: "Flashcards" }, tag: "For you" })
  warm = [...warm, ...extra.slice(0, carry ? 3 : 2)]

  // About 30 minutes: one warm-up, then steps in order until ~25 minutes, always keeping a closing save or export step.
  if (opts.short && steps.length) {
    warm = warm.slice(0, 1)
    const keep: PlanItem[] = []
    let t = warm[0]?.min ?? 0
    for (const st of steps) {
      if (st.tag === "In Live") continue
      if (t + st.min > 30 && keep.length) break
      keep.push({ ...st, min: Math.min(st.min, 30 - t) })
      t += Math.min(st.min, 30 - t)
    }
    steps = keep
  }

  return {
    s, si, week, inPlan, slot, slotName, day, date, weekInSprint, sprintDay, dayKey, key,
    plan, steps, warm, live,
    smaller: SMALLER[dayKey], stuck: STUCK[s.id],
    planMin: opts.short ? 30 : PLAN_MIN[slot],
  }
}
export type Day = ReturnType<typeof buildDay>
