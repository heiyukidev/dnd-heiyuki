export type SeatIndex = 0 | 1

export type ItemEffect = 'damage' | 'heal' | 'shield'

export type ItemDefinition = {
  key: string
  name: string
  effect: ItemEffect
  potency: number
  cooldownMs: number
}

export type ItemCatalog = Readonly<Record<string, ItemDefinition>>

export type LoadoutSlot = {
  itemKey: string
  nextReadyAt: number
}

export type MatchSeatState = {
  life: number
  shield: number
  slots: LoadoutSlot[]
}

export type MatchFire = {
  seat: SeatIndex
  slotIndex: number
  itemKey: string
  effect: ItemEffect
  potency: number
}

export type AnimationHint = {
  kind: ItemEffect
  seat: SeatIndex
  slotIndex: number
}

export type MatchOutcome =
  | { type: 'winner'; seat: SeatIndex }
  | { type: 'draw' }
  | { type: 'continue' }

export type MatchUpdate = {
  atMs: number
  fires: MatchFire[]
  seats: [MatchSeatState, MatchSeatState]
  animationHints: AnimationHint[]
  outcome: MatchOutcome
  nextWakeAt?: number
}

export type ResolveMatchStepInput = {
  seats: [MatchSeatState, MatchSeatState]
  t: number
  seatResolveOrder: [SeatIndex, SeatIndex]
  catalog: ItemCatalog
  matchStartedAt: number
  timeCapMs?: number
}
