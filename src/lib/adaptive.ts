import type { Score } from "@/lib/store"

/**
 * Pick an answer index, favoring ones you miss. Unseen answers get a medium
 * weight so they still come up; well-known ones still appear now and then.
 */
export function weightedPick(detail: Record<string, Score> | undefined, keys: string[], focus = true) {
  if (!focus || !detail) return Math.floor(Math.random() * keys.length)
  const w = keys.map((k) => {
    const s = detail[k]
    if (!s || s.total === 0) return 1.5
    const acc = (s.right + 1) / (s.total + 2)
    return 0.35 + (1 - acc) * 3.5
  })
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return i
  return keys.length - 1
}

/** Answers you get right less than 75% of the time (after at least 3 tries), worst first. */
export function weakSpots(detail: Record<string, Score> | undefined, min = 3) {
  if (!detail) return []
  return Object.entries(detail)
    .filter(([, s]) => s.total >= min && s.right / s.total < 0.75)
    .map(([k, s]) => ({ key: k, acc: s.right / s.total, total: s.total }))
    .sort((a, b) => a.acc - b.acc)
}
