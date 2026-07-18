import type { ItemEffect } from './types'

export const EFFECT_ICON_VIEWBOX = '0 0 24 24'

const EFFECT_ICON_PATHS: Record<ItemEffect, string> = {
  damage:
    'M13 2 3 14h8l-1 8 10-12h-8l1-8z',
  heal: 'M11 5v6H5v2h6v6h2v-6h6v-2h-6V5h-2z',
  shield:
    'M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z',
}

export function getEffectIconPath(effect: ItemEffect): string {
  return EFFECT_ICON_PATHS[effect]
}

export const PASSIVE_ICON_VIEWBOX = EFFECT_ICON_VIEWBOX

export const PASSIVE_ICON_PATH =
  'M12 2a7 7 0 0 0-4 12.8V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.2A7 7 0 0 0 12 2Zm0 3a4 4 0 0 1 2.5 7.1 1 1 0 0 0-.5.9V17h-4v-4a1 1 0 0 0-.5-.9A4 4 0 0 1 12 5Z'
