import { clamp, sumBy } from 'lodash'

/**
 * PHB cumulative XP: minimum total XP required to *reach* each character level.
 * Index 0 = level 1 (0 XP), index 1 = level 2 (300 total), … index 19 = level 20.
 * Source: D&D 5e PHB character advancement table.
 */
export const CUMULATIVE_XP_FOR_LEVEL: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
] as const

/** Total character level from multiclass rows (sum of per-class levels), clamped 1–20. */
export function characterLevelFromClassLevels(
  rows: readonly { class: string; level: number }[],
): number {
  const raw = sumBy(rows, (r) =>
    typeof r.level === 'number' && Number.isFinite(r.level) ? r.level : 0,
  )
  return clamp(Math.trunc(raw) || 1, 1, 20)
}

/** First integer found in a free-text XP field (commas stripped); `null` if none. */
export function parseExperiencePointsField(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) {
    return null
  }
  const s = String(raw).replace(/,/g, '').trim()
  if (s.length === 0) {
    return null
  }
  const m = s.match(/-?\d+/)
  if (m === null) {
    return null
  }
  const n = Number(m[0])
  if (!Number.isFinite(n)) {
    return null
  }
  return Math.trunc(n)
}

/** Cumulative total XP needed to begin the next level, or `null` if already 20th. */
export function nextLevelCumulativeXp(characterLevel: number): number | null {
  const L = clamp(Math.trunc(characterLevel) || 1, 1, 20)
  if (L >= 20) {
    return null
  }
  return CUMULATIVE_XP_FOR_LEVEL[L]!
}
