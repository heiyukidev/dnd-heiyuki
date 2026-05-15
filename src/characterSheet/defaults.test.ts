import { describe, expect, it } from 'vitest'
import { createDefaultSheet, hydrateSheetFromServer } from './defaults'

describe('hydrateSheetFromServer', () => {
  it('maps legacy classAndLevel to a PHB key when classLevels is empty', () => {
    const out = hydrateSheetFromServer({
      classAndLevel: '  Wizard  ',
    } as never)
    expect(out.classLevels).toEqual([{ class: 'wizard', level: 1 }])
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
})
