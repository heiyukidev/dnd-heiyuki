import { describe, expect, it } from 'vitest'
import { createDefaultSheet, hydrateSheetFromServer } from './defaults'

describe('hydrateSheetFromServer', () => {
  it('maps legacy classAndLevel to a PHB key when classLevels is empty', () => {
    const out = hydrateSheetFromServer({
      classAndLevel: '  Wizard  ',
    } as never)
    expect(out.classLevels).toEqual([{ class: 'wizard', level: 1 }])
    expect(out.abilities.int.score).toBe('15')
    expect(out.abilities.int.mod).toBe('+2')
    expect(out.abilities.str.score).toBe('8')
    expect(out.abilities.str.mod).toBe('-1')
  })

  it('drops unmappable legacy classAndLevel without blocking', () => {
    const out = hydrateSheetFromServer({
      classAndLevel: '  Wizard 5  ',
    } as never)
    expect(out.classLevels).toEqual([])
  })

  it('prefers classLevels when present', () => {
    const out = hydrateSheetFromServer({
      classAndLevel: 'ignored',
      classLevels: [{ class: 'Fighter', level: 3 }],
    } as never)
    expect(out.classLevels).toEqual([{ class: 'fighter', level: 3 }])
  })

  it('defaults classLevels to empty', () => {
    const out = hydrateSheetFromServer(undefined)
    expect(out.classLevels).toEqual(createDefaultSheet().classLevels)
  })

  it('normalizes legacy race free text to a PHB key', () => {
    const out = hydrateSheetFromServer({ race: 'Half Orc' } as never)
    expect(out.race).toBe('half_orc')
  })

  it('clears unmappable race without blocking', () => {
    const out = hydrateSheetFromServer({ race: 'Custom lineage' } as never)
    expect(out.race).toBe('')
  })

  it('migrates first weapon equipment row into equippedLoadout', () => {
    const out = hydrateSheetFromServer({
      equipmentItems: [
        {
          id: '1',
          name: 'Longsword',
          category: 'weapon',
          catalogIndex: 'longsword',
          equipped: false,
        },
        {
          id: '2',
          name: 'Dagger',
          category: 'weapon',
          catalogIndex: 'dagger',
          equipped: false,
        },
      ],
    } as never)
    expect(out.equippedLoadout.weapon).toBe('longsword')
    const dagger = out.equipmentItems.find((r) => r.id === '2')
    expect(dagger?.category).toBe('other')
  })

  it('keeps explicit equippedLoadout from server when valid', () => {
    const out = hydrateSheetFromServer({
      equippedLoadout: { weapon: 'longsword' },
      equipmentItems: [],
    } as never)
    expect(out.equippedLoadout.weapon).toBe('longsword')
  })

  it('fills standard-array abilities for a single resolved PHB class when abilities are blank', () => {
    const out = hydrateSheetFromServer({
      classLevels: [{ class: 'fighter', level: 1 }],
    } as never)
    expect(out.abilities.str.score).toBe('15')
    expect(out.abilities.str.mod).toBe('+2')
    expect(out.abilities.int.score).toBe('8')
  })

  it('does not preset abilities when more than one class row exists', () => {
    const out = hydrateSheetFromServer({
      classLevels: [
        { class: 'fighter', level: 2 },
        { class: 'wizard', level: 1 },
      ],
    } as never)
    expect(out.abilities.str.score).toBe('')
  })

  it('does not overwrite abilities when any ability cell is already set', () => {
    const base = createDefaultSheet()
    const out = hydrateSheetFromServer({
      classLevels: [{ class: 'wizard', level: 1 }],
      abilities: {
        ...base.abilities,
        int: { score: '16', mod: '+3' },
      },
    } as never)
    expect(out.abilities.int.score).toBe('16')
    expect(out.abilities.str.score).toBe('')
  })
})
