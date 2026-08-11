import { describe, expect, it } from 'vitest'

import {
  formatWeaponRarityLabel,
  formatWeaponTypeLabel,
  resolveWeaponNudges,
  WEAPON_CATALOG,
  WEAPON_KEYS,
  WEAPON_RARITIES,
  WEAPON_RARITY_STRENGTH,
  WEAPON_TYPE_EMOJI,
  WEAPON_TYPES,
  weaponEmojiForKey,
  weaponTypeEmoji,
  weaponsOfRarity,
  weaponsOfType,
} from './weaponCatalog'

describe('WEAPON_CATALOG', () => {
  it('has ten weapons with two per type', () => {
    expect(WEAPON_KEYS).toHaveLength(10)
    for (const weaponType of WEAPON_TYPES) {
      expect(weaponsOfType(weaponType)).toHaveLength(2)
    }
  })

  it('has two weapons per rarity', () => {
    expect(WEAPON_RARITIES).toHaveLength(5)
    for (const rarity of WEAPON_RARITIES) {
      expect(weaponsOfRarity(rarity)).toHaveLength(2)
    }
  })

  it('gives every weapon exactly one type, one rarity, and stable key', () => {
    for (const key of WEAPON_KEYS) {
      const weapon = WEAPON_CATALOG[key]
      expect(weapon.key).toBe(key)
      expect(WEAPON_TYPES).toContain(weapon.weaponType)
      expect(WEAPON_RARITIES).toContain(weapon.rarity)
    }
  })

  it('maps every weapon type to a non-empty emoji', () => {
    for (const weaponType of WEAPON_TYPES) {
      expect(WEAPON_TYPE_EMOJI[weaponType].length).toBeGreaterThan(0)
      expect(weaponTypeEmoji(weaponType)).toBe(WEAPON_TYPE_EMOJI[weaponType])
      expect(formatWeaponTypeLabel(weaponType)).toBe(`${WEAPON_TYPE_EMOJI[weaponType]} ${weaponType}`)
    }
  })

  it('formats rarity labels as the rarity name', () => {
    for (const rarity of WEAPON_RARITIES) {
      expect(formatWeaponRarityLabel(rarity)).toBe(rarity)
    }
  })

  it('resolves an emoji for every catalog weapon', () => {
    for (const key of WEAPON_KEYS) {
      expect(weaponEmojiForKey(key)).toBe(WEAPON_TYPE_EMOJI[WEAPON_CATALOG[key].weaponType])
    }
  })

  it('scales catalog nudges linearly by rarity strength', () => {
    expect(resolveWeaponNudges('steel_longsword')).toEqual({ damagePotencyPercent: 0.04 })
    expect(resolveWeaponNudges('hoplite_lance')).toEqual({
      cooldownPercent: -0.08,
      damagePotencyPercent: 0.06,
    })
    expect(resolveWeaponNudges('elder_wand')).toEqual({
      cooldownPercent: -0.08,
      lifeBonus: 4,
    })
    for (const rarity of WEAPON_RARITIES) {
      expect(WEAPON_RARITY_STRENGTH[rarity]).toBeGreaterThan(0)
    }
    expect(WEAPON_RARITY_STRENGTH.Legendary).toBe(WEAPON_RARITY_STRENGTH.Common * 2)
  })
})
