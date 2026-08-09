import { includes } from 'lodash'
import { describe, expect, it } from 'vitest'

import {
  applyPick,
  createSeededDraftRng,
  DRAFT_PICK_COUNT,
  generateOffer,
  getEligibleGods,
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
    const seat = initializeDraftSeat(rngFromRolls([0, 0, 1, 2]))
    expect(seat.loadoutKeys).toEqual([])
    expect(seat.godPool).toEqual([])
    expect(seat.currentOffer?.god).toBe(GODS[0])
    expect(seat.currentOffer?.options).toHaveLength(OFFER_SIZE)
  })

  it('chooses uniformly among all gods while under the god pool cap', () => {
    const seat: DraftSeatState = { loadoutKeys: [], godPool: [], currentOffer: null }
    expect(getEligibleGods(seat)).toEqual([...GODS])
  })

  it('restricts offers to the god pool once three gods are committed', () => {
    const seat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle', 'dynamite_fuse_bomb', 'hygieia_soft_bandage'],
      godPool: ['Hermes', 'Dynamite', 'Hygieia'],
      currentOffer: null,
    }
    expect(getEligibleGods(seat)).toEqual(['Hermes', 'Dynamite', 'Hygieia'])
  })

  it('excludes owned keys from later offers', () => {
    const seat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle'],
      godPool: ['Hermes'],
      currentOffer: null,
    }
    const offer = generateOffer(seat, rngFromRolls([0, 0, 1, 2]))
    expect(offer?.god).toBe('Hermes')
    expect(offer?.options).not.toContain('hermes_winged_needle')
    expect(offer?.options).toHaveLength(OFFER_SIZE)
  })

  it('adds a god to the pool on first accepted boon from that god', () => {
    const seat = initializeDraftSeat(createSeededDraftRng(42))
    const picked = seat.currentOffer!.options[0]
    const next = applyPick(seat, picked, createSeededDraftRng(99))
    expect(next.godPool).toEqual([BOON_CATALOG[picked].god])
    expect(next.loadoutKeys).toEqual([picked])
  })

  it('rejects duplicate keys and invalid offer picks', () => {
    const seat = initializeDraftSeat(createSeededDraftRng(7))
    const duplicateSeat: DraftSeatState = {
      loadoutKeys: ['hermes_winged_needle'],
      godPool: ['Hermes'],
      currentOffer: {
        god: 'Hermes',
        options: ['hermes_winged_needle', 'hermes_dash_cut', 'hermes_quicksilver_jab'],
      },
    }
    expect(() => applyPick(duplicateSeat, 'hermes_winged_needle', createSeededDraftRng(9))).toThrow(
      /already in loadout/,
    )
    const invalidKey = BOON_KEYS.find((key) => !includes(seat.currentOffer!.options, key))!
    expect(() => applyPick(seat, invalidKey, createSeededDraftRng(9))).toThrow(
      /not in the current offer/,
    )
  })

  it('completes a seat after five unique picks', () => {
    let seat = initializeDraftSeat(createSeededDraftRng(1))
    const rng = createSeededDraftRng(2)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      const key = seat.currentOffer!.options[0]
      seat = applyPick(seat, key, rng)
    }
    expect(seat.loadoutKeys).toHaveLength(DRAFT_PICK_COUNT)
    expect(new Set(seat.loadoutKeys).size).toBe(DRAFT_PICK_COUNT)
    expect(isSeatDraftComplete(seat)).toBe(true)
    expect(seat.currentOffer).toBeNull()
  })

  it('requires both seats to finish before draft is complete', () => {
    const state = initializeDraftState(createSeededDraftRng(5))
    expect(isDraftComplete(state)).toBe(false)

    let seat0 = state.seats[0]
    const rng = createSeededDraftRng(6)
    for (let pick = 0; pick < DRAFT_PICK_COUNT; pick += 1) {
      seat0 = applyPick(seat0, seat0.currentOffer!.options[0], rng)
    }
    const midState = { seats: [seat0, state.seats[1]] as const }
    expect(isSeatDraftComplete(seat0)).toBe(true)
    expect(isDraftComplete(midState)).toBe(false)
    expect(isSeatWaitingForOpponent(seat0, midState)).toBe(true)
  })

  it('never exceeds the god pool cap of three', () => {
    let seat = initializeDraftSeat(createSeededDraftRng(11))
    const rng = createSeededDraftRng(12)
    const picks: BoonKey[] = []
    for (let i = 0; i < DRAFT_PICK_COUNT; i += 1) {
      const key = seat.currentOffer!.options.find((option) => !picks.includes(option))!
      picks.push(key)
      seat = applyPick(seat, key, rng)
    }
    expect(seat.godPool.length).toBeLessThanOrEqual(GOD_POOL_MAX)
  })
})
