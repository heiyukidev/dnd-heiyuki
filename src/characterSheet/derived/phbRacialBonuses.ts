import { assign } from 'lodash'

import type { PhbRaceKey } from '../../../convex/characterRaces'

import type { AbilityKey, AbilityScoresMap } from './types'
import { ABILITY_KEYS } from './types'

/** PHB 2014 racial ability score increases (v1). Half-Elf: +2 Cha, +1 Dex (default flexible pick). */
export function phbRacialBonusesForRace(race: PhbRaceKey | ''): AbilityScoresMap {
  const out: AbilityScoresMap = {}
  switch (race) {
    case 'dwarf':
      assign(out, { con: 2 })
      break
    case 'elf':
      assign(out, { dex: 2 })
      break
    case 'halfling':
      assign(out, { dex: 2 })
      break
    case 'human':
      for (const k of ABILITY_KEYS) {
        out[k as AbilityKey] = 1
      }
      break
    case 'dragonborn':
      assign(out, { str: 2, cha: 1 })
      break
    case 'gnome':
      assign(out, { int: 2 })
      break
    case 'half_elf':
      assign(out, { cha: 2, dex: 1 })
      break
    case 'half_orc':
      assign(out, { str: 2, con: 1 })
      break
    case 'tiefling':
      assign(out, { cha: 2, int: 1 })
      break
    default:
      break
  }
  return out
}
