export {
  DEFAULT_MATCH_TIME_CAP_MS,
  MATCH_LIFE_CAP,
  earliestWakeAt,
  reEvalFireCapableSlotSchedules,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
} from '../src/match/resolveMatchStep'

export {
  MIN_EFFECTIVE_COOLDOWN_MS,
  MIN_EFFECTIVE_POTENCY,
  resolveAllFireCapableEffectiveStats,
  resolveSlotEffectiveStats,
  rewriteNextReadyAtForEffectiveCooldown,
} from '../src/match/effectiveStats'

export { ITEM_CATALOG, ITEM_KEYS } from '../src/match/itemCatalog'

export type { ItemKey } from '../src/match/itemCatalog'

export type {
  EffectiveSlotStats,
  SlotAddress,
} from '../src/match/effectiveStats'

export type {
  AnimationHint,
  FireCapableItemDefinition,
  ItemDefinition,
  LoadoutSlot,
  MatchFire,
  MatchOutcome,
  MatchSeatState,
  MatchUpdate,
  PassiveChangeMode,
  PassiveDefinition,
  PassiveFilter,
  PassiveSeatTarget,
  PassiveStat,
  PassiveStatChange,
  SeatIndex,
} from '../src/match/types'

export { isFireCapableItem } from '../src/match/types'
