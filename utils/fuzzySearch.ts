/**
 * Lightweight fuzzy matcher for the system search box: scores each
 * candidate by match quality (exact > prefix > substring > subsequence)
 * without pulling in a full fuzzy-search dependency for a few thousand
 * short strings.
 */
export function fuzzyScore(query: string, candidate: string): number {
  const q = query.trim().toLowerCase()
  const c = candidate.toLowerCase()
  if (!q) return 1
  if (c === q) return 1000
  if (c.startsWith(q)) return 800 - (c.length - q.length)
  const idx = c.indexOf(q)
  if (idx !== -1) return 500 - idx

  // Subsequence match: every char of q appears in order within c.
  let qi = 0
  let lastMatch = -1
  let gapPenalty = 0
  for (let ci = 0; ci < c.length && qi < q.length; ci++) {
    if (c[ci] === q[qi]) {
      if (lastMatch !== -1) gapPenalty += ci - lastMatch - 1
      lastMatch = ci
      qi++
    }
  }
  if (qi === q.length) return Math.max(1, 200 - gapPenalty)
  return 0
}

export function fuzzyFilter<T>(query: string, items: T[], getText: (item: T) => string, limit = 30): T[] {
  if (!query.trim()) return items.slice(0, limit)
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item)
}
