import { describe, expect, it } from 'vitest'
import { resolvePhbClassKey } from '../../convex/characterClasses'
import { sanitizeCharacterSheetForPersist } from '../../convex/characterSheetValidators'

describe('resolvePhbClassKey', () => {
  it('resolves PHB keys case-insensitively with trim', () => {
    expect(resolvePhbClassKey('wizard')).toBe('wizard')
    expect(resolvePhbClassKey('WIZARD')).toBe('wizard')
    expect(resolvePhbClassKey('  Monk ')).toBe('monk')
  })

  it('resolves display labels case-insensitively', () => {
    expect(resolvePhbClassKey('Wizard')).toBe('wizard')
    expect(resolvePhbClassKey('bArBaRiAn')).toBe('barbarian')
  })

  it('returns null for unmappable text', () => {
    expect(resolvePhbClassKey('Artificer')).toBeNull()
    expect(resolvePhbClassKey('Wizard 5')).toBeNull()
    expect(resolvePhbClassKey('')).toBeNull()
    expect(resolvePhbClassKey('  ')).toBeNull()
  })

  it('does not map legacy session placeholder key to a PHB row', () => {
    expect(resolvePhbClassKey('test')).toBeNull()
  })
})

describe('sanitizeCharacterSheetForPersist classLevels', () => {
  it('drops invalid rows and keeps duplicate keys', () => {
    const out = sanitizeCharacterSheetForPersist({
      classLevels: [
        { class: 'Fighter', level: 2 },
        { class: 'nope', level: 5 },
        { class: 'fighter', level: 3 },
      ],
    })
    expect(out?.classLevels).toEqual([
      { class: 'fighter', level: 2 },
      { class: 'fighter', level: 3 },
    ])
  })
})
