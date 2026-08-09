import { includes } from 'lodash'
import { describe, expect, it } from 'vitest'

import {
  applyPick,
  createSeededDraftRng,
  DRAFT_PICK_COUNT,
  generateOffer,
  getEligibleGods,
  getSeatWaitingReason,
  GOD_POOL_MAX,
  initializeDraftSeat,
  initializeDraftState,
  isDraftComplete,
  isSeatDraftComplete,
  isSeatWaitingForOpponent,
  OFFER_SIZE,
  type DraftRng,
  type DraftSeatState,
} from './draftEngine'
import { BOON_CATALOG, BOON_KEYS, GODS, type BoonKey } from './itemCatalog'

const DEFAULT_WEAPON_KEY = 'steel_longsword'
const BOW_WEAPON_KEY = 'hunters_bow'
const WAND_WEAPON_KEY = 'elder_wand'
const SWORD_WEAPON_KEY = 'steel_longsword'
const AXE_WEAPON_KEY = 'war_axe'

const BOW_MISMATCH_GATES = [
  'hygieia_overflow',
  'dynamite_scorched_earth',
  'hermes_fleet_foot',
] as const satisfies readonly BoonKey[]

const WAND_MISMATCH_GATES = [
  'hermes_stolen_seconds',
  'hermes_fleet_foot',
  'dynamite_scorched_earth',
] as const satisfies readonly BoonKey[]

function collectDraftOfferOptions(weaponKey: string, startSeed: number, seedCount: number): BoonKey[] {
  const seen: BoonKey[] = []
  for (let seed = startSeed; seed < startSeed + seedCount; seed += 1) {
    let seat = initializeDraftSeat(createSeededDraftRng(seed), weaponKey)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      const offer = seat.currentOffer
      if (offer === null) {
        break
      }
      for (const key of offer.options) {
        if (!includes(seen, key)) {
          seen.push(key)
        }
      }
      seat = applyPick(seat, offer.options[0], createSeededDraftRng(seed * 100 + pick), weaponKey)
    }
  }
  return seen
}

function rngFromRolls(rolls: number[]): DraftRng {
  let index = 0
  return {
    int: (max: number) => {
      const roll = rolls[index] ?? 0
      index += 1
      return roll % max
    },
  }
}

describe('draftEngine', () => {
  it('starts each seat with an offer of three unowned boons from one eligible god', () => {
    const seat = initializeDraftSeat(rngFromRolls([0, 0, 1, 2]), DEFAULT_WEAPON_KEY)
    expect(seat.loadoutKeys).toEqual([])
    expect(seat.godPool).toEqual([])
    expect(seat.currentOffer?.god).toBe(GODS[0])
    expect(seat.currentOffer?.options).toHaveLength(OFFER_SIZE)
  })

  it('chooses uniformly among all gods while under the god pool cap', () => {
    const seat: DraftSeatState = { loadoutKeys: [], godPool: [], currentOffer: null }
    expect(getEligibleGods(seat, DEFAULT_WEAPON_KEY)).toEqual([...GODS])
  })

  it('restricts offers to the god pool once three gods are committed', () => {
    const seat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle', 'dynamite_fuse_bomb', 'hygieia_soft_bandage'],
      godPool: ['Hermes', 'Dynamite', 'Hygieia'],
      currentOffer: null,
    }
    expect(getEligibleGods(seat, DEFAULT_WEAPON_KEY)).toEqual(['Hermes', 'Dynamite', 'Hygieia'])
  })

  it('excludes owned keys from later offers', () => {
    const seat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle'],
      godPool: ['Hermes'],
      currentOffer: null,
    }
    const offer = generateOffer(seat, rngFromRolls([0, 0, 1, 2]), DEFAULT_WEAPON_KEY)
    expect(offer?.god).toBe('Hermes')
    expect(offer?.options).not.toContain('hermes_winged_needle')
    expect(offer?.options).toHaveLength(OFFER_SIZE)
  })

  it('adds a god to the pool on first accepted boon from that god', () => {
    const seat = initializeDraftSeat(createSeededDraftRng(42), DEFAULT_WEAPON_KEY)
    const picked = seat.currentOffer!.options[0]
    const next = applyPick(seat, picked, createSeededDraftRng(99), DEFAULT_WEAPON_KEY)
    expect(next.godPool).toEqual([BOON_CATALOG[picked].god])
    expect(next.loadoutKeys).toEqual([picked])
  })

  it('rejects duplicate keys and invalid offer picks', () => {
    const seat = initializeDraftSeat(createSeededDraftRng(7), DEFAULT_WEAPON_KEY)
    const duplicateSeat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle'],
      godPool: ['Hermes'],
      currentOffer: {
        god: 'Hermes',
        options: ['hermes_winged_needle', 'hermes_dash_cut', 'hermes_quicksilver_jab'],
      },
    }
    expect(() =>
      applyPick(duplicateSeat, 'hermes_winged_needle', createSeededDraftRng(9), DEFAULT_WEAPON_KEY),
    ).toThrow(/already in loadout/)
    const invalidKey = BOON_KEYS.find((key) => !includes(seat.currentOffer!.options, key))!
    expect(() => applyPick(seat, invalidKey, createSeededDraftRng(9), DEFAULT_WEAPON_KEY)).toThrow(
      /not in the current offer/,
    )
  })

  it('completes a seat after five unique picks', () => {
    let seat = initializeDraftSeat(createSeededDraftRng(1), DEFAULT_WEAPON_KEY)
    const rng = createSeededDraftRng(2)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      const key = seat.currentOffer!.options[0]
      seat = applyPick(seat, key, rng, DEFAULT_WEAPON_KEY)
    }
    expect(seat.loadoutKeys).toHaveLength(DRAFT_PICK_COUNT)
    expect(new Set(seat.loadoutKeys).size).toBe(DRAFT_PICK_COUNT)
    expect(isSeatDraftComplete(seat)).toBe(true)
    expect(seat.currentOffer).toBeNull()
  })

  it('requires both seats to confirm spend before draft fight is ready', () => {
    const state = initializeDraftState(createSeededDraftRng(5), [
      DEFAULT_WEAPON_KEY,
      DEFAULT_WEAPON_KEY,
    ])
    expect(isDraftComplete(state)).toBe(false)

    let seat0 = state.seats[0]
    let seat1 = state.seats[1]
    const rng = createSeededDraftRng(6)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      seat0 = applyPick(seat0, seat0.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
      seat1 = applyPick(seat1, seat1.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
    }
    const picksCompleteState = { seats: [seat0, seat1] as [typeof seat0, typeof seat1] }
    expect(isSeatDraftComplete(seat0)).toBe(true)
    expect(isSeatDraftComplete(seat1)).toBe(true)
    expect(isDraftComplete(picksCompleteState)).toBe(false)
    expect(isSeatWaitingForOpponent(0, picksCompleteState)).toBe(false)

    const seat0Ready = { ...seat0, spendConfirmed: true, goldRemaining: 0 }
    const midSpendState = { seats: [seat0Ready, seat1] as [typeof seat0Ready, typeof seat1] }
    expect(isDraftComplete(midSpendState)).toBe(false)
    expect(isSeatWaitingForOpponent(0, midSpendState)).toBe(true)
    expect(getSeatWaitingReason(0, midSpendState)).toBe('opponent_spend')

    const bothReady = {
      seats: [
        seat0Ready,
        { ...seat1, spendConfirmed: true, goldRemaining: 0 },
      ] as [typeof seat0Ready, typeof seat1],
    }
    expect(isDraftComplete(bothReady)).toBe(true)
    expect(isSeatWaitingForOpponent(0, bothReady)).toBe(false)
  })

  it('waits on opponent draft when confirming spend early', () => {
    let seat0 = initializeDraftSeat(createSeededDraftRng(40), DEFAULT_WEAPON_KEY)
    const seat1 = initializeDraftSeat(createSeededDraftRng(41), DEFAULT_WEAPON_KEY)
    const rng = createSeededDraftRng(42)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      seat0 = applyPick(seat0, seat0.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
    }
    const seat0Ready = { ...seat0, spendConfirmed: true, goldRemaining: 0 }
    const state = { seats: [seat0Ready, seat1] as [typeof seat0Ready, typeof seat1] }
    expect(isSeatWaitingForOpponent(0, state)).toBe(true)
    expect(getSeatWaitingReason(0, state)).toBe('opponent_draft')
  })

  it('does not show waiting while own spend is unconfirmed', () => {
    const initial = initializeDraftState(createSeededDraftRng(20), [
      DEFAULT_WEAPON_KEY,
      DEFAULT_WEAPON_KEY,
    ])
    let seat0 = initial.seats[0]
    const seat1 = initial.seats[1]
    const rng = createSeededDraftRng(21)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      seat0 = applyPick(seat0, seat0.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
    }
    const state = { seats: [seat0, seat1] as [typeof seat0, typeof seat1] }
    expect(isSeatWaitingForOpponent(0, state)).toBe(false)
    expect(getSeatWaitingReason(0, state)).toBeNull()
  })

  it('reports opponent spend wait when both finished picking', () => {
    let seat0 = initializeDraftSeat(createSeededDraftRng(30), DEFAULT_WEAPON_KEY)
    let seat1 = initializeDraftSeat(createSeededDraftRng(31), DEFAULT_WEAPON_KEY)
    const rng = createSeededDraftRng(32)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      seat0 = applyPick(seat0, seat0.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
      seat1 = applyPick(seat1, seat1.currentOffer!.options[0], rng, DEFAULT_WEAPON_KEY)
    }
    const seat0Ready = { ...seat0, spendConfirmed: true, goldRemaining: 0 }
    const state = { seats: [seat0Ready, seat1] as [typeof seat0Ready, typeof seat1] }
    expect(getSeatWaitingReason(0, state)).toBe('opponent_spend')
  })

  it('never exceeds the god pool cap of three', () => {
    let seat = initializeDraftSeat(createSeededDraftRng(11), DEFAULT_WEAPON_KEY)
    const rng = createSeededDraftRng(12)
    const picks: BoonKey[] = []
    for (let i = 0; i < DRAFT_PICK_COUNT; i += 1) {
      const key = seat.currentOffer!.options.find((option) => !picks.includes(option))!
      picks.push(key)
      seat = applyPick(seat, key, rng, DEFAULT_WEAPON_KEY)
    }
    expect(seat.godPool.length).toBeLessThanOrEqual(GOD_POOL_MAX)
  })

  it('omits weapon-gated boons that do not match a Bow', () => {
    const offered = collectDraftOfferOptions(BOW_WEAPON_KEY, 0, 50)
    for (const key of BOW_MISMATCH_GATES) {
      expect(offered).not.toContain(key)
    }
    expect(offered).toContain('hermes_stolen_seconds')
  })

  it('omits weapon-gated boons that do not match a Wand', () => {
    const offered = collectDraftOfferOptions(WAND_WEAPON_KEY, 100, 50)
    for (const key of WAND_MISMATCH_GATES) {
      expect(offered).not.toContain(key)
    }
    expect(offered).toContain('hygieia_overflow')
  })

  it('keeps weapon-gated boons when the equipped type matches', () => {
    const swordOffered = collectDraftOfferOptions(SWORD_WEAPON_KEY, 200, 50)
    expect(swordOffered).toContain('hermes_fleet_foot')

    const axeOffered = collectDraftOfferOptions(AXE_WEAPON_KEY, 300, 50)
    expect(axeOffered).toContain('dynamite_scorched_earth')
  })

  it('still requires at least three filtered boons per eligible god', () => {
    const seat: DraftSeatState = { loadoutKeys: [], godPool: [], currentOffer: null }
    expect(getEligibleGods(seat, BOW_WEAPON_KEY)).toEqual([...GODS])
    expect(getEligibleGods(seat, WAND_WEAPON_KEY)).toEqual([...GODS])
  })
})
