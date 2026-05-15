import { keyBy, toLower, trim } from 'lodash'

/** PHB (2014) base playable races — same “single roster” idea as `characterClasses`. */
export const CHARACTER_RACE_OPTIONS = [
  { key: 'dragonborn', label: 'Dragonborn' },
  { key: 'dwarf', label: 'Dwarf' },
  { key: 'elf', label: 'Elf' },
  { key: 'gnome', label: 'Gnome' },
  { key: 'half_elf', label: 'Half-Elf' },
  { key: 'half_orc', label: 'Half-Orc' },
  { key: 'halfling', label: 'Halfling' },
  { key: 'human', label: 'Human' },
  { key: 'tiefling', label: 'Tiefling' },
] as const

export type PhbRaceKey = (typeof CHARACTER_RACE_OPTIONS)[number]['key']

const PHB_RACE_KEYS = new Set<string>(CHARACTER_RACE_OPTIONS.map((o) => o.key))

export function isPhbRaceKey(s: string): s is PhbRaceKey {
  return PHB_RACE_KEYS.has(s)
}

const keyedByLowerKey = keyBy(CHARACTER_RACE_OPTIONS, (o) => toLower(o.key))
const keyedByLowerLabel = keyBy(CHARACTER_RACE_OPTIONS, (o) => toLower(o.label))
const keyedByNormLabel = keyBy(CHARACTER_RACE_OPTIONS, (o) =>
  toLower(o.label).replace(/[^a-z]/g, ''),
)

/** Normalize free-text / legacy values to a roster key, or `null` if unmappable. */
export function resolvePhbRaceKey(raw: string): PhbRaceKey | null {
  const s = trim(raw)
  if (s === '') {
    return null
  }
  const lower = toLower(s)
  const hitKey = keyedByLowerKey[lower]
  if (hitKey !== undefined) {
    return hitKey.key
  }
  const hitLabel = keyedByLowerLabel[lower]
  if (hitLabel !== undefined) {
    return hitLabel.key
  }
  const norm = lower.replace(/[^a-z]/g, '')
  const hitNorm = keyedByNormLabel[norm]
  if (hitNorm !== undefined) {
    return hitNorm.key
  }
  return null
}
