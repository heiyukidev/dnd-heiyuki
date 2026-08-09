import { describe, expect, it } from 'vitest'

import { WEAPON_CATALOG, WEAPON_KEYS, WEAPON_TYPES, weaponsOfType } from './weaponCatalog'

describe('WEAPON_CATALOG', () => {
  it('has eight weapons with two per type', () => {
    expect(WEAPON_KEYS).toHaveLength(8)
    for (const weaponType of WEAPON_TYPES) {
      expect(weaponsOfType(weaponType)).toHaveLength(2)
    }
  })

  it('gives every weapon exactly one type and stable key', () => {
    for (const key of WEAPON_KEYS) {
      const weapon = WEAPON_CATALOG[key]
      expect(weapon.key).toBe(key)
      expect(WEAPON_TYPES).toContain(weapon.weaponType)
    }
  })
})
