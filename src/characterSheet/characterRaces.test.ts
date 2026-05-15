import { describe, expect, it } from 'vitest'
import { resolvePhbRaceKey } from '../../convex/characterRaces'
import { sanitizeCharacterSheetForPersist } from '../../convex/characterSheetValidators'

describe('resolvePhbRaceKey', () => {
  it('resolves exact keys case-insensitively', () => {
    expect(resolvePhbRaceKey('HALF_ELF')).toBe('half_elf')
    expect(resolvePhbRaceKey('  dwarf  ')).toBe('dwarf')
  })

  it('resolves PHB labels', () => {
    expect(resolvePhbRaceKey('Half-Elf')).toBe('half_elf')
    expect(resolvePhbRaceKey('Tiefling')).toBe('tiefling')
  })

  it('resolves labels with punctuation/spacing normalized', () => {
    expect(resolvePhbRaceKey('half elf')).toBe('half_elf')
    expect(resolvePhbRaceKey('HALFELF')).toBe('half_elf')
  })

  it('returns null for empty or unknown', () => {
    expect(resolvePhbRaceKey('')).toBeNull()
    expect(resolvePhbRaceKey('Aasimar')).toBeNull()
  })
})

describe('sanitizeCharacterSheetForPersist race', () => {
  it('normalizes race to a stable key', () => {
    const out = sanitizeCharacterSheetForPersist({ race: '  Dwarf  ' })
    expect(out?.race).toBe('dwarf')
  })

  it('drops unmappable race', () => {
    const out = sanitizeCharacterSheetForPersist({ race: 'Lizardfolk' })
    expect(out?.race).toBeUndefined()
  })
})
