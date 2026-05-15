import { keyBy, trim, toLower } from 'lodash'
import { v } from 'convex/values'

export const CHARACTER_CLASS_OPTIONS = [
  { key: 'barbarian', label: 'Barbarian' },
  { key: 'bard', label: 'Bard' },
  { key: 'cleric', label: 'Cleric' },
  { key: 'druid', label: 'Druid' },
  { key: 'fighter', label: 'Fighter' },
  { key: 'monk', label: 'Monk' },
  { key: 'paladin', label: 'Paladin' },
  { key: 'ranger', label: 'Ranger' },
  { key: 'rogue', label: 'Rogue' },
  { key: 'sorcerer', label: 'Sorcerer' },
  { key: 'warlock', label: 'Warlock' },
  { key: 'wizard', label: 'Wizard' },
] as const

export type PhbClassKey = (typeof CHARACTER_CLASS_OPTIONS)[number]['key']

const phbLiterals = CHARACTER_CLASS_OPTIONS.map((o) => v.literal(o.key))

/**
 * `test` is deprecated (pre-PHB placeholder). Still accepted on read so old session
 * character rows load; UI maps it to unset and the roster omits it for new picks.
 */
export const characterClassKeyValidator = v.union(...phbLiterals, v.literal('test'))

const keyedByLowerKey = keyBy(CHARACTER_CLASS_OPTIONS, (o) => toLower(o.key))
const keyedByLowerLabel = keyBy(CHARACTER_CLASS_OPTIONS, (o) => toLower(o.label))

export function resolvePhbClassKey(raw: string): PhbClassKey | null {
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
  return null
}
