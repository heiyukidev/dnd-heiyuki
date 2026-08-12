import { describe, expect, it } from 'vitest'

import { getWeaponIconPath, getWeaponTypeIconPath, resolveWeaponTypeFromKey } from './weaponIcons'

describe('weaponIcons', () => {
  it('returns a path for each weapon type', () => {
    for (const weaponType of ['Sword', 'Axe', 'Wand', 'Bow', 'Spear'] as const) {
      expect(getWeaponTypeIconPath(weaponType).length).toBeGreaterThan(0)
    }
  })

  it('resolves catalog weapon keys to icon paths', () => {
    expect(getWeaponIconPath('steel_longsword')).toBeTruthy()
    expect(resolveWeaponTypeFromKey('Bow')).toBe('Bow')
  })
})
