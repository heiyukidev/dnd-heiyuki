import { filter, includes, map, uniq } from 'lodash'

import { BOON_CATALOG, BOON_KEYS, GODS, boonsForGod, type BoonKey } from './itemCatalog'
import { MATCH_GOLD_GRANT, ZERO_SOUL_BUMPS } from './soul'
import type { God, PassiveFilter, SoulStats, WeaponType } from './types'
import { weaponDefinition } from './weaponCatalog'

export const DRAFT_PICK_COUNT = 5
export const GOD_POOL_MAX = 3
export const OFFER_SIZE = 3

export type BoonOffer = {
  god: God
  options: BoonKey[]
}

export type DraftSeatSpendState = {
  soulBumps: SoulStats
  goldRemaining: number
  spendConfirmed: boolean
}

export type DraftSeatState = {
  loadoutKeys: BoonKey[]
  godPool: God[]
  currentOffer: BoonOffer | null
  soulBumps: SoulStats
  goldRemaining: number
  spendConfirmed: boolean
}

export type DraftState = {
  seats: [DraftSeatState, DraftSeatState]
}

export type DraftRng = {
  int: (max: number) => number
}

export function createEmptyDraftSpendState(): DraftSeatSpendState {
  return {
    soulBumps: { ...ZERO_SOUL_BUMPS },
    goldRemaining: MATCH_GOLD_GRANT,
    spendConfirmed: false,
  }
}

export function createEmptyDraftSeat(): DraftSeatState {
  return {
    loadoutKeys: [],
    godPool: [],
    currentOffer: null,
    ...createEmptyDraftSpendState(),
  }
}

export function createInitialDraftState(): DraftState {
  return { seats: [createEmptyDraftSeat(), createEmptyDraftSeat()] }
}

function passiveFilterWeaponType(passiveFilter: PassiveFilter): WeaponType | undefined {
  if (passiveFilter === 'all' || typeof passiveFilter === 'string') {
    return undefined
  }
  return passiveFilter.weaponType
}

function boonWeaponGateMismatch(boonKey: BoonKey, weaponKey: string): boolean {
  const requiredWeaponType = passiveFilterWeaponType(
    BOON_CATALOG[boonKey].passive?.filter ?? 'all',
  )
  if (requiredWeaponType === undefined) {
    return false
  }
  return weaponDefinition(weaponKey)?.weaponType !== requiredWeaponType
}

function unownedBoonsForGod(seat: DraftSeatState, god: God, weaponKey: string): BoonKey[] {
  return filter(
    boonsForGod(god),
    (key) => !includes(seat.loadoutKeys, key) && !boonWeaponGateMismatch(key, weaponKey),
  )
}

export function getEligibleGods(seat: DraftSeatState, weaponKey: string): God[] {
  const candidateGods = seat.godPool.length >= GOD_POOL_MAX ? seat.godPool : [...GODS]
  return filter(candidateGods, (god) => unownedBoonsForGod(seat, god, weaponKey).length >= OFFER_SIZE)
}

export function pickUniform<T>(items: readonly T[], rng: DraftRng): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list')
  }
  return items[rng.int(items.length)]!
}

export function sampleWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  rng: DraftRng,
): T[] {
  const pool = [...items]
  const picked: T[] = []
  const takeCount = Math.min(count, pool.length)
  for (let i = 0; i < takeCount; i += 1) {
    const index = rng.int(pool.length)
    picked.push(pool[index]!)
    pool.splice(index, 1)
  }
  return picked
}

export function generateOffer(
  seat: DraftSeatState,
  rng: DraftRng,
  weaponKey: string,
): BoonOffer | null {
  if (seat.loadoutKeys.length >= DRAFT_PICK_COUNT) {
    return null
  }
  const eligibleGods = getEligibleGods(seat, weaponKey)
  if (eligibleGods.length === 0) {
    throw new Error('No eligible gods remain for this seat')
  }
  const god = pickUniform(eligibleGods, rng)
  const options = sampleWithoutReplacement(
    unownedBoonsForGod(seat, god, weaponKey),
    OFFER_SIZE,
    rng,
  )
  return { god, options }
}

export function initializeDraftSeat(rng: DraftRng, weaponKey: string): DraftSeatState {
  const seat = createEmptyDraftSeat()
  return { ...seat, currentOffer: generateOffer(seat, rng, weaponKey) }
}

export function initializeDraftState(rng: DraftRng, weaponKeys: [string, string]): DraftState {
  return {
    seats: [initializeDraftSeat(rng, weaponKeys[0]), initializeDraftSeat(rng, weaponKeys[1])],
  }
}

export function applyPick(
  seat: DraftSeatState,
  pickedKey: BoonKey,
  rng: DraftRng,
  weaponKey: string,
): DraftSeatState {
  const offer = seat.currentOffer
  if (offer === null) {
    throw new Error('No current offer to pick from')
  }
  if (!includes(offer.options, pickedKey)) {
    throw new Error('Picked boon is not in the current offer')
  }
  if (includes(seat.loadoutKeys, pickedKey)) {
    throw new Error('Boon key already in loadout')
  }

  const boon = BOON_CATALOG[pickedKey]
  const loadoutKeys = [...seat.loadoutKeys, pickedKey]
  const godPool = includes(seat.godPool, boon.god)
    ? seat.godPool
    : uniq([...seat.godPool, boon.god])

  const nextSeat: DraftSeatState = {
    loadoutKeys,
    godPool,
    currentOffer: null,
    soulBumps: seat.soulBumps,
    goldRemaining: seat.goldRemaining,
    spendConfirmed: seat.spendConfirmed,
  }
  if (loadoutKeys.length >= DRAFT_PICK_COUNT) {
    return nextSeat
  }
  return { ...nextSeat, currentOffer: generateOffer(nextSeat, rng, weaponKey) }
}

export function isSeatDraftComplete(seat: DraftSeatState): boolean {
  return seat.loadoutKeys.length >= DRAFT_PICK_COUNT
}

export function isSeatSpendReady(seat: DraftSeatState): boolean {
  return seat.spendConfirmed
}

export function isBothSeatsSpendReady(state: DraftState): boolean {
  return isSeatSpendReady(state.seats[0]) && isSeatSpendReady(state.seats[1])
}

export function isDraftComplete(state: DraftState): boolean {
  return isBothSeatsSpendReady(state)
}

export function isSeatWaitingForOpponent(seatIndex: 0 | 1, state: DraftState): boolean {
  const seat = state.seats[seatIndex]
  return isSeatSpendReady(seat) && !isDraftComplete(state)
}

export function getSeatWaitingReason(
  seatIndex: 0 | 1,
  state: DraftState,
): 'opponent_draft' | 'opponent_spend' | null {
  if (!isSeatWaitingForOpponent(seatIndex, state)) {
    return null
  }
  const opponentIndex = (seatIndex === 0 ? 1 : 0) as 0 | 1
  if (!isSeatDraftComplete(state.seats[opponentIndex])) {
    return 'opponent_draft'
  }
  return 'opponent_spend'
}

export function draftLoadoutToMatchSlots(loadoutKeys: BoonKey[]) {
  return map(loadoutKeys, (itemKey) => ({ itemKey }))
}

export function createDraftRngFromRandom(random: () => number): DraftRng {
  return {
    int: (max: number) => Math.floor(random() * max),
  }
}

export function createSeededDraftRng(seed: number): DraftRng {
  let state = seed >>> 0
  return {
    int: (max: number) => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0
      return Math.floor((state / 0x1_0000_0000) * max)
    },
  }
}

export function allBoonKeysOwned(seat: DraftSeatState): BoonKey[] {
  return filter(BOON_KEYS, (key) => includes(seat.loadoutKeys, key))
}
