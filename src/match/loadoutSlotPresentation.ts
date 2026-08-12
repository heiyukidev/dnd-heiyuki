import { get, map } from 'lodash'

import { displayNumber } from '../lib/displayNumber'
import { resolveSlotEffectiveStats } from './effectiveStats'
import type {
  God,
  ItemCatalog,
  ItemDefinition,
  ItemEffect,
  MatchSeatState,
  PassiveDefinition,
  PassiveFilter,
  PassiveSeatTarget,
  PassiveStatChange,
  SeatIndex,
  SoulStats,
  WeaponType,
} from './types'
import { isFireCapableItem } from './types'
import { formatWeaponTypeLabel } from './weaponCatalog'

export const LOADOUT_EFFECT_KIND_COLORS: Record<ItemEffect, string> = {
  damage: '#4588be',
  heal: '#3a8f5a',
  shield: '#5a9fd4',
}

export const LOADOUT_PASSIVE_ACCENT_COLOR = '#3d78a8'

const DEFAULT_UNKNOWN_COOLDOWN_MS = 2_000
const UNKNOWN_BOON_EFFECT_SENTENCE = 'Unknown boon'

const PASSIVE_FILTER_SHORT: Record<ItemEffect, string> = {
  damage: 'dmg',
  heal: 'heal',
  shield: 'shield',
}

export type LoadoutSlotFaceKind = 'fire' | 'passive'

export type LoadoutModeTag = 'Active' | 'Passive'

export type LoadoutEffectTag = 'Damage' | 'Heal' | 'Shield'

export type LoadoutSlotPresentation = {
  name: string
  faceKind: LoadoutSlotFaceKind
  kindColor: string
  modeTag: LoadoutModeTag
  effectTag?: LoadoutEffectTag
  weaponGateTag?: string
  showCooldownBar: boolean
  effect?: ItemEffect
  potency?: number
  effectSentence?: string
  cooldownLine?: string
  effectiveCooldownMs?: number
  passiveCue?: string
  passiveSentence?: string
}

export type DraftOfferChoicePresentation = LoadoutSlotPresentation & {
  key: string
}

export type DraftOfferPresentation = {
  god: God
  godLabel: string
  choices: DraftOfferChoicePresentation[]
}

export type LoadoutSlotPresentationContext = {
  itemKey: string
  catalog: ItemCatalog
  seats: [MatchSeatState, MatchSeatState]
  seat: SeatIndex
  slotIndex: number
  souls?: [SoulStats, SoulStats]
  weaponKeys?: [string, string]
}

function normalizeCooldownMs(cooldownMs: number): number {
  if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
    return 0
  }
  return cooldownMs
}

function formatCooldownSeconds(cooldownMs: number): string {
  return displayNumber(normalizeCooldownMs(cooldownMs) / 1000)
}

export function formatCooldownLine(cooldownMs: number): string {
  return `Cooldown ${formatCooldownSeconds(cooldownMs)}s`
}

export function formatEffectSentence(effect: ItemEffect, potency: number): string {
  switch (effect) {
    case 'damage':
      return `Deal ${displayNumber(potency)} damage`
    case 'heal':
      return `Heal ${displayNumber(potency)}`
    case 'shield':
      return `Gain ${displayNumber(potency)} shield`
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

export function getEffectTag(effect: ItemEffect): LoadoutEffectTag {
  switch (effect) {
    case 'damage':
      return 'Damage'
    case 'heal':
      return 'Heal'
    case 'shield':
      return 'Shield'
    default: {
      const exhaustiveCheck: never = effect
      return exhaustiveCheck
    }
  }
}

function buildPresentationTags(input: {
  faceKind: LoadoutSlotFaceKind
  effect?: ItemEffect
  requiredWeaponType?: WeaponType
}): Pick<LoadoutSlotPresentation, 'modeTag' | 'effectTag' | 'weaponGateTag'> {
  const { faceKind, effect, requiredWeaponType } = input
  return {
    modeTag: faceKind === 'fire' ? 'Active' : 'Passive',
    effectTag: faceKind === 'fire' && effect !== undefined ? getEffectTag(effect) : undefined,
    weaponGateTag:
      requiredWeaponType === undefined ? undefined : formatWeaponTypeLabel(requiredWeaponType),
  }
}

function formatPercentMagnitude(value: number): string {
  return displayNumber(Math.abs(value * 100))
}

function formatSignedPercent(value: number): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${formatPercentMagnitude(value)}%`
}

function formatSignedFlat(value: number): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${displayNumber(Math.abs(value))}`
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

function passiveFilterShortLabel(filter: PassiveFilter): string {
  if (filter === 'all') {
    return 'all'
  }
  if (typeof filter === 'string') {
    return PASSIVE_FILTER_SHORT[filter]
  }
  const parts: string[] = []
  if (filter.god !== undefined) {
    parts.push(filter.god)
  }
  if (filter.effectKind !== undefined) {
    parts.push(PASSIVE_FILTER_SHORT[filter.effectKind])
  }
  if (filter.weaponType !== undefined) {
    parts.push(formatWeaponTypeLabel(filter.weaponType))
  }
  if (parts.length === 0) {
    return 'all'
  }
  return parts.join(' ')
}

function filterPhrase(filter: PassiveFilter): string {
  if (filter === 'all') {
    return 'Boons'
  }
  if (typeof filter === 'string') {
    return `${filter} Boons`
  }
  const parts: string[] = []
  if (filter.god !== undefined) {
    parts.push(`${filter.god}`)
  }
  if (filter.effectKind !== undefined) {
    parts.push(`${filter.effectKind}`)
  }
  if (filter.weaponType !== undefined) {
    parts.push(formatWeaponTypeLabel(filter.weaponType))
  }
  if (parts.length === 0) {
    return 'Boons'
  }
  return `${parts.join(' ')} Boons`
}

function formatPassiveChangeCue(change: PassiveStatChange, filter: PassiveFilter): string {
  const filterShort = passiveFilterShortLabel(filter)
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
  return map(passive.changes, (change) => formatPassiveChangeCue(change, passive.filter)).join(', ')
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
    return `${verb} ${target} ${items} Cooldown by ${displayNumber(Math.abs(change.value))}ms`
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
  const tags = buildPresentationTags({
    faceKind: 'passive',
    requiredWeaponType: item.requiredWeaponType,
  })
  if (passive === undefined) {
    return {
      name: item.name,
      faceKind: 'passive',
      kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
      ...tags,
      showCooldownBar: false,
      passiveCue: UNKNOWN_BOON_EFFECT_SENTENCE,
      passiveSentence: UNKNOWN_BOON_EFFECT_SENTENCE,
    }
  }
  return {
    name: item.name,
    faceKind: 'passive',
    kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
    ...tags,
    showCooldownBar: false,
    passiveCue: formatPassiveCue(passive),
    passiveSentence: formatPassiveSentence(passive),
  }
}

function buildFirePresentation(
  item: FireCapableItemDefinition,
  effective: { cooldownMs?: number; potency?: number },
): LoadoutSlotPresentation {
  const { name, effect, requiredWeaponType } = item
  const potency = effective.potency ?? item.potency
  const effectiveCooldownMs = effective.cooldownMs ?? item.cooldownMs
  const effectSentence =
    requiredWeaponType === undefined
      ? formatEffectSentence(effect, potency)
      : `${formatEffectSentence(effect, potency)} (${formatWeaponTypeLabel(requiredWeaponType)})`
  const presentation: LoadoutSlotPresentation = {
    name,
    faceKind: 'fire',
    kindColor: getKindColor(effect),
    ...buildPresentationTags({ faceKind: 'fire', effect, requiredWeaponType }),
    showCooldownBar: true,
    effect,
    potency,
    effectSentence,
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
    ...buildPresentationTags({ faceKind: 'fire', effect: 'damage' }),
    showCooldownBar: true,
    effect: 'damage',
    potency: 0,
    effectSentence: UNKNOWN_BOON_EFFECT_SENTENCE,
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
  const { itemKey, catalog, seats, seat, slotIndex, souls, weaponKeys } = context
  const item = get(catalog, itemKey)
  if (item === undefined) {
    return buildUnknownPresentation(itemKey)
  }
  if (!isFireCapableItem(item)) {
    return buildPassiveOnlyPresentation(item)
  }
  const effective = resolveSlotEffectiveStats(
    seats,
    { seat, slotIndex },
    catalog,
    souls,
    weaponKeys,
  )
  return buildFirePresentation(item, effective)
}

function buildDraftPreviewSeats(
  seat: SeatIndex,
  loadoutKeys: string[],
  optionKey: string,
): [MatchSeatState, MatchSeatState] {
  const previewSlots = map([...loadoutKeys, optionKey], (itemKey) => ({ itemKey }))
  const previewSeat: MatchSeatState = { life: 100, shield: 0, slots: previewSlots }
  const emptySeat: MatchSeatState = { life: 100, shield: 0, slots: [] }
  if (seat === 0) {
    return [previewSeat, emptySeat]
  }
  return [emptySeat, previewSeat]
}

function getDraftChoicePresentation(input: {
  key: string
  catalog: ItemCatalog
  seat?: SeatIndex
  loadoutKeys?: string[]
  souls?: [SoulStats, SoulStats]
  weaponKeys?: [string, string]
}): DraftOfferChoicePresentation {
  const { key, catalog, seat, loadoutKeys, souls, weaponKeys } = input
  const item = get(catalog, key)
  if (item === undefined) {
    return { key, ...buildUnknownPresentation(key) }
  }
  if (!isFireCapableItem(item)) {
    return { key, ...buildPassiveOnlyPresentation(item) }
  }
  if (seat !== undefined && loadoutKeys !== undefined) {
    const seats = buildDraftPreviewSeats(seat, loadoutKeys, key)
    const effective = resolveSlotEffectiveStats(
      seats,
      { seat, slotIndex: loadoutKeys.length },
      catalog,
      souls,
      weaponKeys,
    )
    return { key, ...buildFirePresentation(item, effective) }
  }
  return { key, ...buildFirePresentation(item, {}) }
}

export function getDraftOfferPresentation(input: {
  god: God
  optionKeys: string[]
  catalog: ItemCatalog
  seat?: SeatIndex
  loadoutKeys?: string[]
  souls?: [SoulStats, SoulStats]
  weaponKeys?: [string, string]
}): DraftOfferPresentation {
  const { god, optionKeys, catalog, seat, loadoutKeys, souls, weaponKeys } = input
  return {
    god,
    godLabel: god,
    choices: map(optionKeys, (key) =>
      getDraftChoicePresentation({ key, catalog, seat, loadoutKeys, souls, weaponKeys }),
    ),
  }
}
