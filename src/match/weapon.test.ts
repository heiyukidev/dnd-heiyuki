import { describe, expect, it } from 'vitest'

import {
  generateWeaponOffers,
  isValidWeaponPick,
  maxLifeForSeat,
  weaponFavorLine,
  WEAPON_OFFER_COUNT,
} from './weapon'
import { createDraftRngFromRandom } from './draftEngine'
import { MATCH_LIFE_CAP } from './soul'
import { WEAPON_KEYS } from './weaponCatalog'

describe('generateWeaponOffers', () => {
  it('returns three distinct catalog weapons', () => {
    let seed = 0.42
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 1
      return seed
    }
    const offers = generateWeaponOffers(createDraftRngFromRandom(random))
    expect(offers).toHaveLength(WEAPON_OFFER_COUNT)
    expect(new Set(offers).size).toBe(WEAPON_OFFER_COUNT)
    for (const key of offers) {
      expect(WEAPON_KEYS).toContain(key)
    }
  })
})

describe('isValidWeaponPick', () => {
  it('accepts only offered catalog keys', () => {
    const offers = ['steel_longsword', 'war_axe', 'elder_wand']
    expect(isValidWeaponPick(offers, 'steel_longsword')).toBe(true)
    expect(isValidWeaponPick(offers, 'knight_blade')).toBe(false)
    expect(isValidWeaponPick(offers, 'not_a_weapon')).toBe(false)
  })
})

describe('weaponFavorLine', () => {
  it('returns favor copy from weapon type', () => {
    expect(weaponFavorLine('Sword')).toBe('Favors damage kits')
    expect(weaponFavorLine('Axe')).toBe('Favors high-damage kits')
    expect(weaponFavorLine('Wand')).toBe('Favors sustain / hybrid')
    expect(weaponFavorLine('Bow')).toBe('Favors Hermes tempo')
  })

  it('resolves favor copy from catalog weapon keys', () => {
    expect(weaponFavorLine('steel_longsword')).toBe('Favors damage kits')
    expect(weaponFavorLine('war_axe')).toBe('Favors high-damage kits')
    expect(weaponFavorLine('elder_wand')).toBe('Favors sustain / hybrid')
    expect(weaponFavorLine('hunters_bow')).toBe('Favors Hermes tempo')
  })

  it('returns null for unknown keys', () => {
    expect(weaponFavorLine('not_a_weapon')).toBeNull()
  })
})

describe('maxLifeForSeat', () => {
  it('adds vitality and weapon life bonus on the shared max-life path', () => {
    expect(maxLifeForSeat({ strength: 0, speed: 0, vitality: 5 }, 'elder_wand')).toBe(
      MATCH_LIFE_CAP + 5 * 3 + 3,
    )
    expect(maxLifeForSeat({ strength: 0, speed: 0, vitality: 5 }, 'steel_longsword')).toBe(
      MATCH_LIFE_CAP + 5 * 3,
    )
    expect(maxLifeForSeat(undefined, undefined)).toBe(MATCH_LIFE_CAP)
  })
})
