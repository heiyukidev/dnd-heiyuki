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
import type { WeaponRarity } from './types'
import { WEAPON_KEYS, WEAPON_RARITIES, weaponDefinition } from './weaponCatalog'

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

  it('weights offers by rarity (Common most frequent, Legendary rarest)', () => {
    const counts: Record<WeaponRarity, number> = {
      Common: 0,
      Uncommon: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0,
    }
    const trials = 5000
    for (let trial = 0; trial < trials; trial += 1) {
      const offers = generateWeaponOffers(createDraftRngFromRandom(() => Math.random()))
      for (const key of offers) {
        const rarity = weaponDefinition(key)?.rarity
        if (rarity !== undefined) {
          counts[rarity] += 1
        }
      }
    }
    for (let i = 0; i < WEAPON_RARITIES.length - 1; i += 1) {
      const higher = WEAPON_RARITIES[i]!
      const lower = WEAPON_RARITIES[i + 1]!
      expect(counts[higher]).toBeGreaterThan(counts[lower])
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
  it('returns affiliated gods from weapon type', () => {
    expect(weaponFavorLine('Spear')).toBe('Favors Hermes, Athena')
    expect(weaponFavorLine('Sword')).toBe('Favors Hermes, Ares')
    expect(weaponFavorLine('Axe')).toBe('Favors Ares, Athena')
    expect(weaponFavorLine('Wand')).toBe('Favors Apollo, Zeus')
    expect(weaponFavorLine('Bow')).toBe('Favors Apollo, Zeus')
  })

  it('resolves favor copy from catalog weapon keys', () => {
    expect(weaponFavorLine('bronze_spear')).toBe('Favors Hermes, Athena')
    expect(weaponFavorLine('steel_longsword')).toBe('Favors Hermes, Ares')
    expect(weaponFavorLine('war_axe')).toBe('Favors Ares, Athena')
    expect(weaponFavorLine('elder_wand')).toBe('Favors Apollo, Zeus')
    expect(weaponFavorLine('hunters_bow')).toBe('Favors Apollo, Zeus')
  })

  it('returns null for unknown keys', () => {
    expect(weaponFavorLine('not_a_weapon')).toBeNull()
  })
})

describe('maxLifeForSeat', () => {
  it('adds vitality and weapon life bonus on the shared max-life path', () => {
    expect(maxLifeForSeat({ strength: 0, speed: 0, vitality: 5 }, 'elder_wand')).toBe(
      MATCH_LIFE_CAP + 5 * 3 + 4,
    )
    expect(maxLifeForSeat({ strength: 0, speed: 0, vitality: 5 }, 'steel_longsword')).toBe(
      MATCH_LIFE_CAP + 5 * 3,
    )
    expect(maxLifeForSeat(undefined, undefined)).toBe(MATCH_LIFE_CAP)
  })
})
