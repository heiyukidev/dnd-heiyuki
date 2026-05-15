import { describe, expect, it } from 'vitest'
import { searchSrdCatalog, SRD_CATALOG } from './srdCatalog'

describe('srdCatalog', () => {
  it('lists entries sorted by name', () => {
    expect(SRD_CATALOG.length).toBeGreaterThan(100)
    const names = SRD_CATALOG.map((e) => e.name.toLowerCase())
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(names).toEqual(sorted)
  })

  it('maps mundane shield to shield category', () => {
    const shield = SRD_CATALOG.find((e) => e.index === 'shield')
    expect(shield?.kind).toBe('equipment')
    expect(shield?.sheetCategory).toBe('shield')
  })

  it('maps animated shield magic item to shield category', () => {
    const animated = SRD_CATALOG.find((e) => e.index === 'animated-shield')
    expect(animated?.kind).toBe('magic-item')
    expect(animated?.sheetCategory).toBe('shield')
  })

  it('searchSrdCatalog matches name substring case-insensitively', () => {
    const hits = searchSrdCatalog('LoNgSwOrD', 5)
    expect(hits.some((h) => h.index === 'longsword')).toBe(true)
  })

  it('searchSrdCatalog matches index substring', () => {
    const hits = searchSrdCatalog('ammunition-1', 5)
    expect(hits.some((h) => h.index === 'ammunition-1')).toBe(true)
  })

  it('searchSrdCatalog returns empty for blank query', () => {
    expect(searchSrdCatalog('   ', 10)).toEqual([])
  })
})
