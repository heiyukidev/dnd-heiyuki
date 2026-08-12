import { includes } from 'lodash'

import { weaponDefinition, WEAPON_TYPES } from './weaponCatalog'
import type { WeaponType } from './types'

export const WEAPON_ICON_VIEWBOX = '0 0 24 24'

const WEAPON_ICON_PATHS: Record<WeaponType, string> = {
  Sword:
    'M12 2 9 5v3l-5 11h4l1-4h6l1 4h4L15 8V5l-3-3zm-1.5 8 1.5 5h-3l1.5-5z',
  Axe: 'M8 3 5 6v4l-2 11h4l1-5 4-2V9l-3-3H8zm8 0-3 3v5l4 2 1 5h4L19 10V6l-3-3h-1z',
  Wand: 'M14 2 8 20h2l1-4h2l1 4h2L13 2h1zm-2 10 1-4 1 4h-2z',
  Bow: 'M5 4v16l2-1V5l10 7V4l-10 7V4H5zm14 0v16l-2-1V5L7 12v7l10-7V4h2z',
  Spear:
    'M12 2 10 4v6l-4 10h3l1-4h4l1 4h3l-4-10V4l-2-2zm0 8 1.5 4h-3L12 10z',
}

export function getWeaponTypeIconPath(weaponType: WeaponType): string {
  return WEAPON_ICON_PATHS[weaponType]
}

export function resolveWeaponTypeFromKey(weaponKeyOrType: string): WeaponType | undefined {
  const fromCatalog = weaponDefinition(weaponKeyOrType)?.weaponType
  if (fromCatalog !== undefined) {
    return fromCatalog
  }
  if (includes(WEAPON_TYPES, weaponKeyOrType)) {
    return weaponKeyOrType as WeaponType
  }
  return undefined
}

export function getWeaponIconPath(weaponKeyOrType: string): string | undefined {
  const weaponType = resolveWeaponTypeFromKey(weaponKeyOrType)
  if (weaponType === undefined) {
    return undefined
  }
  return getWeaponTypeIconPath(weaponType)
}
