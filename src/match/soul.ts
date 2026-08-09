import { filter, max } from 'lodash'

import type { SoulStats } from './types'

export const SOUL_STAT_TOTAL = 15
export const SOUL_STAT_MAX = 10

export function rollSoulStats(random: () => number): SoulStats {
  let remaining = SOUL_STAT_TOTAL

  const minStrength = Math.max(0, remaining - SOUL_STAT_MAX * 2)
  const maxStrength = Math.min(SOUL_STAT_MAX, remaining)
  const strength =
    minStrength + Math.floor(random() * (maxStrength - minStrength + 1))
  remaining -= strength

  const minSpeed = Math.max(0, remaining - SOUL_STAT_MAX)
  const maxSpeed = Math.min(SOUL_STAT_MAX, remaining)
  const speed = minSpeed + Math.floor(random() * (maxSpeed - minSpeed + 1))
  remaining -= speed

  return { strength, speed, vitality: remaining }
}

const FAVOR_BALANCED_THRESHOLD = 6

export function soulFavorLine(stats: SoulStats): string {
  const top = max([stats.strength, stats.speed, stats.vitality]) ?? 0
  if (top < FAVOR_BALANCED_THRESHOLD) {
    return 'Balanced'
  }

  const tiedAtTop = filter(
    [
      { stat: 'strength' as const, value: stats.strength },
      { stat: 'speed' as const, value: stats.speed },
      { stat: 'vitality' as const, value: stats.vitality },
    ],
    (entry) => entry.value === top,
  )

  if (tiedAtTop.length > 1) {
    return 'Balanced'
  }

  switch (tiedAtTop[0]?.stat) {
    case 'strength':
      return 'Favors damage kits'
    case 'speed':
      return 'Favors Hermes tempo'
    case 'vitality':
      return 'Favors sustain'
    default:
      return 'Balanced'
  }
}

export function startingLifeFromVitality(vitality: number, baseLife = 100): number {
  return baseLife + vitality
}

export function maxLifeFromSoul(soul: SoulStats, baseLife = 100): number {
  return startingLifeFromVitality(soul.vitality, baseLife)
}
