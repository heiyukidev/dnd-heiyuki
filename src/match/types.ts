export type SeatIndex = 0 | 1

export type SoulStats = {
  strength: number
  speed: number
  vitality: number
}

export type God = 'Hermes' | 'Dynamite' | 'Hygieia' | 'Athena' | 'Zeus'

export type ItemEffect = 'damage' | 'heal' | 'shield'

export type PassiveSeatTarget = 'own' | 'enemy' | 'both'

export type PassiveFilter =
  | 'all'
  | ItemEffect
  | {
      effectKind?: ItemEffect
      god?: God
    }

export type PassiveStat = 'cooldown' | 'potency'

export type PassiveChangeMode = 'flat' | 'percent'

export type PassiveStatChange = {
  stat: PassiveStat
  mode: PassiveChangeMode
  value: number
}

export type PassiveDefinition = {
  seatTarget: PassiveSeatTarget
  filter: PassiveFilter
  changes: readonly PassiveStatChange[]
}

export type ItemDefinition = {
  key: string
  name: string
  god: God
  effect?: ItemEffect
  potency?: number
  cooldownMs?: number
  passive?: PassiveDefinition
}

export type FireCapableItemDefinition = ItemDefinition & {
  effect: ItemEffect
  potency: number
  cooldownMs: number
}

export function isFireCapableItem(
  def: ItemDefinition | undefined,
): def is FireCapableItemDefinition {
  return (
    def !== undefined &&
    def.effect !== undefined &&
    def.potency !== undefined &&
    def.cooldownMs !== undefined
  )
}

export type ItemCatalog = Readonly<Record<string, ItemDefinition>>

export type LoadoutSlot = {
  itemKey: string
  nextReadyAt?: number
  lastChargeCooldownMs?: number
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
  souls?: [SoulStats, SoulStats]
}
