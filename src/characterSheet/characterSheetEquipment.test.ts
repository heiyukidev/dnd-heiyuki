import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_ITEMS_MAX,
  EQUIPMENT_ITEM_CATALOG_INDEX_MAX,
  EQUIPMENT_ITEM_NAME_MAX,
  sanitizeCharacterSheetForPersist,
  validateCharacterSheetForPersist,
} from '../../convex/characterSheetValidators'

describe('sanitizeCharacterSheetForPersist equipmentItems', () => {
  it('drops rows with empty or missing name', () => {
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [
        { id: 'a', name: '  Rapier  ' },
        { id: 'b', name: '' },
        { id: 'c', name: '   ' },
      ],
    })
    expect(out?.equipmentItems).toEqual([{ id: 'a', name: 'Rapier', equipped: false }])
  })

  it('drops rows with missing id', () => {
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [
        { id: '', name: 'Shield' },
        { id: 'x', name: 'Bow' },
      ],
    })
    expect(out?.equipmentItems).toEqual([{ id: 'x', name: 'Bow', equipped: false }])
  })

  it('drops invalid categories and coerces equipped', () => {
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [
        {
          id: '1',
          name: 'Sword',
          equipped: true,
          category: 'weapon',
        },
        {
          id: '2',
          name: 'Hat',
          equipped: 'yes' as unknown as boolean,
          category: 'hat',
        },
      ],
    })
    expect(out?.equipmentItems).toEqual([
      { id: '1', name: 'Sword', equipped: true, category: 'weapon' },
      { id: '2', name: 'Hat', equipped: false },
    ])
  })

  it('trims quantity and weight and truncates name', () => {
    const longName = 'x'.repeat(EQUIPMENT_ITEM_NAME_MAX + 40)
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [
        {
          id: '1',
          name: longName,
          quantity: '  2  ',
          weightLb: ' 15 ',
        },
      ],
    })
    expect(out?.equipmentItems?.[0]?.name.length).toBe(EQUIPMENT_ITEM_NAME_MAX)
    expect(out?.equipmentItems?.[0]?.quantity).toBe('2')
    expect(out?.equipmentItems?.[0]?.weightLb).toBe('15')
  })

  it('caps array length', () => {
    const many = Array.from({ length: EQUIPMENT_ITEMS_MAX + 50 }, (_, i) => ({
      id: `id-${i}`,
      name: `item-${i}`,
    }))
    const out = sanitizeCharacterSheetForPersist({ equipmentItems: many })
    expect(out?.equipmentItems?.length).toBe(EQUIPMENT_ITEMS_MAX)
  })

  it('strips invalid or empty catalogIndex slugs', () => {
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [
        {
          id: '1',
          name: 'A',
          catalogIndex: 'valid-slug-12',
        },
        {
          id: '2',
          name: 'B',
          catalogIndex: 'BAD',
        },
        {
          id: '3',
          name: 'C',
          catalogIndex: ' ',
        },
      ],
    })
    expect(out?.equipmentItems).toEqual([
      { id: '1', name: 'A', equipped: false, catalogIndex: 'valid-slug-12' },
      { id: '2', name: 'B', equipped: false },
      { id: '3', name: 'C', equipped: false },
    ])
  })

  it('truncates catalogIndex before validating slug', () => {
    const slug = `${'a'.repeat(EQUIPMENT_ITEM_CATALOG_INDEX_MAX - 2)}-z`
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: [{ id: '1', name: 'X', catalogIndex: `${slug}extra` }],
    })
    expect(out?.equipmentItems?.[0]?.catalogIndex).toBe(slug)
  })

  it('removes non-array equipmentItems', () => {
    const out = sanitizeCharacterSheetForPersist({
      equipmentItems: 'garbage' as unknown as [],
    })
    expect(out?.equipmentItems).toBeUndefined()
  })
})

describe('sanitizeCharacterSheetForPersist equippedLoadout', () => {
  it('keeps valid slot catalog slugs', () => {
    const out = sanitizeCharacterSheetForPersist({
      equippedLoadout: {
        weapon: 'longsword',
        armor: 'not-a-real-armor-slug-but-format',
      },
    })
    expect(out?.equippedLoadout).toEqual({
      weapon: 'longsword',
      armor: 'not-a-real-armor-slug-but-format',
    })
  })

  it('drops invalid slugs and unknown keys', () => {
    const out = sanitizeCharacterSheetForPersist({
      equippedLoadout: {
        weapon: 'BAD',
        shield: 'shield',
        extra: 'nope',
      } as Record<string, unknown>,
    })
    expect(out?.equippedLoadout).toEqual({ shield: 'shield' })
  })

  it('removes equippedLoadout when empty after sanitize', () => {
    const out = sanitizeCharacterSheetForPersist({
      equippedLoadout: { weapon: '  ' },
    })
    expect(out?.equippedLoadout).toBeUndefined()
  })

  it('removes non-object equippedLoadout', () => {
    const out = sanitizeCharacterSheetForPersist({
      equippedLoadout: [] as unknown as Record<string, string>,
    })
    expect(out?.equippedLoadout).toBeUndefined()
  })
})

describe('validateCharacterSheetForPersist equippedLoadout', () => {
  it('accepts valid loadout', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equippedLoadout: { weapon: 'longsword', gear: 'backpack' },
      }),
    ).not.toThrow()
  })

  it('rejects invalid slug', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equippedLoadout: { weapon: 'BAD_SLUG' },
      }),
    ).toThrow('Invalid character sheet')
  })

  it('rejects unknown slot keys', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equippedLoadout: { foo: 'longsword' } as Record<string, unknown>,
      }),
    ).toThrow('Invalid character sheet')
  })
})

describe('validateCharacterSheetForPersist equipmentItems', () => {
  it('accepts valid sanitized rows', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equipmentItems: [{ id: 'a', name: 'Rope', equipped: false }],
      }),
    ).not.toThrow()
  })

  it('rejects non-array', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equipmentItems: {} as unknown as [],
      }),
    ).toThrow('Invalid character sheet')
  })

  it('rejects nested object field values', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equipmentItems: [{ id: 'a', name: 'x', rogue: { a: 1 } } as Record<string, unknown>],
      }),
    ).toThrow('Invalid character sheet')
  })

  it('rejects invalid catalogIndex', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equipmentItems: [{ id: 'a', name: 'Rope', equipped: false, catalogIndex: 'NO' }],
      }),
    ).toThrow('Invalid character sheet')
  })

  it('rejects wrong quantity type after sanitize skipped', () => {
    expect(() =>
      validateCharacterSheetForPersist({
        equipmentItems: [{ id: 'a', name: 'x', quantity: 3 as unknown as string }],
      }),
    ).toThrow('Invalid character sheet')
  })
})
