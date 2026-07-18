import { get, map } from 'lodash'

import { resolveSlotEffectiveStats } from './effectiveStats'
import type {
  ItemCatalog,
  ItemDefinition,
  ItemEffect,
  MatchSeatState,
  PassiveDefinition,
  PassiveFilter,
  PassiveSeatTarget,
  PassiveStatChange,
  SeatIndex,
} from './types'
import { isFireCapableItem } from './types'

export const LOADOUT_EFFECT_KIND_COLORS: Record<ItemEffect, string> = {
  damage: '#c45a3a',
  heal: '#3a8f5a',
  shield: '#4a7bbd',
}

export const LOADOUT_PASSIVE_ACCENT_COLOR = '#a07850'

const DEFAULT_UNKNOWN_COOLDOWN_MS = 2_000
const UNKNOWN_ITEM_EFFECT_SENTENCE = 'Unknown item'

const PASSIVE_FILTER_SHORT: Record<PassiveFilter, string> = {
  all: 'all',
  damage: 'dmg',
  heal: 'heal',
  shield: 'shield',
}

export type LoadoutSlotFaceKind = 'fire' | 'passive'

export type LoadoutSlotPresentation = {
  name: string
  faceKind: LoadoutSlotFaceKind
  kindColor: string
  showCooldownBar: boolean
  effect?: ItemEffect
  potency?: number
  effectSentence?: string
  cooldownLine?: string
  effectiveCooldownMs?: number
  passiveCue?: string
  passiveSentence?: string
}

export type LoadoutSlotPresentationContext = {
  itemKey: string
  catalog: ItemCatalog
  seats: [MatchSeatState, MatchSeatState]
  seat: SeatIndex
  slotIndex: number
}

function normalizeCooldownMs(cooldownMs: number): number {
  if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
    return 0
  }
  return cooldownMs
}

function formatCooldownSeconds(cooldownMs: number): string {
  const seconds = normalizeCooldownMs(cooldownMs) / 1000
  if (Number.isInteger(seconds)) {
    return String(seconds)
  }
  return String(parseFloat(seconds.toFixed(3)))
}

export function formatCooldownLine(cooldownMs: number): string {
  return `Cooldown ${formatCooldownSeconds(cooldownMs)}s`
}

export function formatEffectSentence(effect: ItemEffect, potency: number): string {
  switch (effect) {
    case 'damage':
      return `Deal ${potency} damage`
    case 'heal':
      return `Heal ${potency}`
    case 'shield':
      return `Gain ${potency} shield`
    default: {
      const exhaustiveCheck: never = effect
      return exhaustiveCheck
    }
  }
}

export function getKindColor(effect: ItemEffect): string {
  switch (effect) {
    case 'damage':
      return LOADOUT_EFFECT_KIND_COLORS.damage
    case 'heal':
      return LOADOUT_EFFECT_KIND_COLORS.heal
    case 'shield':
      return LOADOUT_EFFECT_KIND_COLORS.shield
    default: {
      const exhaustiveCheck: never = effect
      return exhaustiveCheck
    }
  }
}

function formatPercentMagnitude(value: number): string {
  const percent = Math.abs(value * 100)
  if (Number.isInteger(percent)) {
    return String(percent)
  }
  return String(parseFloat(percent.toFixed(1)))
}

function formatSignedPercent(value: number): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${formatPercentMagnitude(value)}%`
}

function formatSignedFlat(value: number): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${Math.abs(value)}`
}

function seatTargetPhrase(seatTarget: PassiveSeatTarget): string {
  switch (seatTarget) {
    case 'own':
      return 'your'
    case 'enemy':
      return 'enemy'
    case 'both':
      return 'all'
    default: {
      const exhaustiveCheck: never = seatTarget
      return exhaustiveCheck
    }
  }
}

function filterPhrase(filter: PassiveFilter): string {
  if (filter === 'all') {
    return 'Items'
  }
  return `${filter} Items`
}

function formatPassiveChangeCue(change: PassiveStatChange, filter: PassiveFilter): string {
  const filterShort = PASSIVE_FILTER_SHORT[filter]
  if (change.stat === 'cooldown') {
    if (change.mode === 'percent') {
      return `${formatSignedPercent(change.value)} ${filterShort} CD`
    }
    return `${formatSignedFlat(change.value)}ms ${filterShort} CD`
  }
  if (change.mode === 'flat') {
    return `${formatSignedFlat(change.value)} ${filterShort}`
  }
  return `${formatSignedPercent(change.value)} ${filterShort}`
}

export function formatPassiveCue(passive: PassiveDefinition): string {
  return map(passive.changes, (change) => formatPassiveChangeCue(change, passive.filter)).join(
    ', ',
  )
}

function formatPassiveChangeSentence(
  change: PassiveStatChange,
  seatTarget: PassiveSeatTarget,
  filter: PassiveFilter,
): string {
  const target = seatTargetPhrase(seatTarget)
  const items = filterPhrase(filter)
  if (change.stat === 'cooldown') {
    if (change.mode === 'percent') {
      const verb = change.value < 0 ? 'Reduce' : 'Increase'
      return `${verb} ${target} ${items} Cooldown by ${formatPercentMagnitude(change.value)}%`
    }
    const verb = change.value < 0 ? 'Reduce' : 'Increase'
    return `${verb} ${target} ${items} Cooldown by ${Math.abs(change.value)}ms`
  }
  if (change.mode === 'flat') {
    return `Grant ${formatSignedFlat(change.value)} potency to ${target} ${items}`
  }
  const verb = change.value < 0 ? 'Reduce' : 'Increase'
  return `${verb} ${target} ${items} potency by ${formatPercentMagnitude(change.value)}%`
}

export function formatPassiveSentence(passive: PassiveDefinition): string {
  return map(passive.changes, (change) =>
    formatPassiveChangeSentence(change, passive.seatTarget, passive.filter),
  ).join('; ')
}

function buildPassiveOnlyPresentation(item: ItemDefinition): LoadoutSlotPresentation {
  const passive = item.passive
  if (passive === undefined) {
    return {
      name: item.name,
      faceKind: 'passive',
      kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
      showCooldownBar: false,
      passiveCue: UNKNOWN_ITEM_EFFECT_SENTENCE,
      passiveSentence: UNKNOWN_ITEM_EFFECT_SENTENCE,
    }
  }
  return {
    name: item.name,
    faceKind: 'passive',
    kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
    showCooldownBar: false,
    passiveCue: formatPassiveCue(passive),
    passiveSentence: formatPassiveSentence(passive),
  }
}

function buildFirePresentation(
  item: FireCapableItemDefinition,
  effective: { cooldownMs?: number; potency?: number },
): LoadoutSlotPresentation {
  const { name, effect } = item
  const potency = effective.potency ?? item.potency
  const effectiveCooldownMs = effective.cooldownMs ?? item.cooldownMs
  const presentation: LoadoutSlotPresentation = {
    name,
    faceKind: 'fire',
    kindColor: getKindColor(effect),
    showCooldownBar: true,
    effect,
    potency,
    effectSentence: formatEffectSentence(effect, potency),
    cooldownLine: formatCooldownLine(effectiveCooldownMs),
    effectiveCooldownMs,
  }
  if (item.passive !== undefined) {
    presentation.passiveSentence = formatPassiveSentence(item.passive)
  }
  return presentation
}

type FireCapableItemDefinition = ItemDefinition & {
  effect: ItemEffect
  potency: number
  cooldownMs: number
}

function buildUnknownPresentation(itemKey: string): LoadoutSlotPresentation {
  return {
    name: itemKey,
    faceKind: 'fire',
    kindColor: getKindColor('damage'),
    showCooldownBar: true,
    effect: 'damage',
    potency: 0,
    effectSentence: UNKNOWN_ITEM_EFFECT_SENTENCE,
    cooldownLine: formatCooldownLine(DEFAULT_UNKNOWN_COOLDOWN_MS),
    effectiveCooldownMs: DEFAULT_UNKNOWN_COOLDOWN_MS,
  }
}

export function getLoadoutSlotPresentationFromItem(item: ItemDefinition): LoadoutSlotPresentation {
  if (!isFireCapableItem(item)) {
    return buildPassiveOnlyPresentation(item)
  }
  return buildFirePresentation(item, {})
}

export function getLoadoutSlotPresentation(
  itemKey: string,
  catalog: ItemCatalog,
): LoadoutSlotPresentation {
  const item = get(catalog, itemKey)
  if (item === undefined) {
    return buildUnknownPresentation(itemKey)
  }
  return getLoadoutSlotPresentationFromItem(item)
}

export function getLoadoutSlotPresentationForMatch(
  context: LoadoutSlotPresentationContext,
): LoadoutSlotPresentation {
  const { itemKey, catalog, seats, seat, slotIndex } = context
  const item = get(catalog, itemKey)
  if (item === undefined) {
    return buildUnknownPresentation(itemKey)
  }
  if (!isFireCapableItem(item)) {
    return buildPassiveOnlyPresentation(item)
  }
  const effective = resolveSlotEffectiveStats(seats, { seat, slotIndex }, catalog)
  return buildFirePresentation(item, effective)
}
