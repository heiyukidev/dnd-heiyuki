<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { compact, find, map, max, range } from 'lodash'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import MatchLoadoutSlot from '../components/MatchLoadoutSlot.vue'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'
import { displayNumber } from '../lib/displayNumber'
import { ITEM_CATALOG } from '../match/itemCatalog'
import {
  getEffectIconPath,
  EFFECT_ICON_VIEWBOX,
  PASSIVE_ICON_PATH,
  PASSIVE_ICON_VIEWBOX,
} from '../match/effectIcons'
import { maxLifeForSeat } from '../match/weapon'
import {
  formatWeaponRarityLabel,
  resolveWeaponNudges,
  weaponDefinition,
} from '../match/weaponCatalog'
import type { MatchSeatState, SeatIndex, SoulStats, WeaponRarity } from '../match/types'
import type { DraftOfferChoicePresentation } from '../match/loadoutSlotPresentation'
import {
  getDraftOfferPresentation,
  getLoadoutSlotPresentation,
} from '../match/loadoutSlotPresentation'
import { getWeaponIconPath, WEAPON_ICON_VIEWBOX } from '../match/weaponIcons'
import { CORAL_HIT_COLOR } from '../theme/tokens'

type SoulStatKey = keyof SoulStats

const SOUL_STAT_LABELS: Record<SoulStatKey, string> = {
  strength: 'Strength',
  speed: 'Speed',
  vitality: 'Vitality',
}

const soulStatEntries = map(['strength', 'speed', 'vitality'] as SoulStatKey[], (key) => ({
  key,
  label: SOUL_STAT_LABELS[key],
}))

const SEGMENT_COUNT = 20
const LOADOUT_SLOT_COUNT = 5

const props = defineProps<{
  id: string
}>()

const client = useConvexClient()
const sessionId = computed(() => props.id as Id<'sessions'>)

const actionError = ref<string | null>(null)
const actionBusy = ref(false)
const nowMs = ref(Date.now())
type SlotFlash = { key: string; kindColor: string }
const flashSlots = ref<SlotFlash[]>([])
let flashTimer: ReturnType<typeof setTimeout> | null = null
let rafId = 0

const { data: playState, error: playStateError } = useConvexQuery(
  client,
  api.match.getSessionPlayState,
  () => ({ sessionId: sessionId.value }),
)

const { data: joinRequests, error: joinRequestsError } = useConvexQuery(
  client,
  api.sessions.listJoinRequests,
  () => (playState.value?.isHost ? { sessionId: sessionId.value } : 'skip'),
)

const session = computed(() => playState.value?.session ?? null)
const isHost = computed(() => playState.value?.isHost === true)
const playPhase = computed(() => session.value?.playPhase ?? 'lobby')
const archived = computed(() => session.value?.status === 'archived')
const fightingPlayers = computed(() => playState.value?.fightingPlayers ?? [])
const match = computed(() => playState.value?.match ?? null)
const draft = computed(() => playState.value?.draft ?? null)
const weapon = computed(() => playState.value?.weapon ?? null)
const matchSeats = computed(() => match.value?.seats ?? null)
const matchSeatStates = computed((): [MatchSeatState, MatchSeatState] | null => {
  const seats = matchSeats.value
  if (seats === null) {
    return null
  }
  return map(seats, (seat) => ({
    life: seat.life,
    shield: seat.shield,
    slots: seat.slots,
  })) as [MatchSeatState, MatchSeatState]
})
const matchSouls = computed((): [SoulStats, SoulStats] | undefined => {
  const seats = matchSeats.value
  if (seats === null || seats[0].soul === undefined || seats[1].soul === undefined) {
    return undefined
  }
  return [seats[0].soul, seats[1].soul]
})
const matchWeaponKeys = computed((): [string, string] | undefined => {
  const seats = matchSeats.value
  if (seats === null || seats[0].weaponKey === undefined || seats[1].weaponKey === undefined) {
    return undefined
  }
  return [seats[0].weaponKey, seats[1].weaponKey]
})
const lastUpdate = computed(() => match.value?.lastUpdate ?? null)
const outcome = computed(() => match.value?.outcome ?? null)

const yourSeatIndex = computed((): SeatIndex | null => {
  if (playPhase.value === 'weapon') {
    return weapon.value?.yourSeatIndex ?? null
  }
  if (playPhase.value === 'draft') {
    return draft.value?.yourSeatIndex ?? null
  }
  const you = find(fightingPlayers.value, (p) => p.isYou)
  return you?.seat ?? null
})

const isSoulSpendStep = computed(() => {
  const own = draft.value?.own
  return own?.isPicksComplete === true && own.isSpendReady !== true
})

const draftHeadTitle = computed(() => {
  const own = draft.value?.own
  if (!own) {
    return 'Draft'
  }
  if (own.isSpendReady) {
    return 'Ready'
  }
  if (own.isPicksComplete) {
    return 'Spend Gold'
  }
  return 'Draft'
})

const draftOfferPresentation = computed(() => {
  const own = draft.value?.own
  const seatIndex = draft.value?.yourSeatIndex
  if (own?.currentOffer === null || own?.currentOffer === undefined) {
    return null
  }
  const weaponKeys: [string, string] | undefined =
    own.weaponKey !== null &&
    own.weaponKey !== undefined &&
    seatIndex !== null &&
    seatIndex !== undefined
      ? seatIndex === 0
        ? [own.weaponKey, '']
        : ['', own.weaponKey]
      : undefined
  const souls: [SoulStats, SoulStats] | undefined =
    own.soul !== null && own.soul !== undefined && seatIndex !== null && seatIndex !== undefined
      ? seatIndex === 0
        ? [own.soul, { strength: 0, speed: 0, vitality: 0 }]
        : [{ strength: 0, speed: 0, vitality: 0 }, own.soul]
      : undefined
  return getDraftOfferPresentation({
    god: own.currentOffer.god,
    optionKeys: own.currentOffer.options,
    catalog: ITEM_CATALOG,
    seat: seatIndex ?? undefined,
    loadoutKeys: own.loadoutKeys,
    souls,
    weaponKeys,
  })
})

function draftOfferIconPath(choice: DraftOfferChoicePresentation): string {
  return choice.faceKind === 'passive'
    ? PASSIVE_ICON_PATH
    : getEffectIconPath(choice.effect ?? 'damage')
}

function draftOfferIconViewBox(choice: DraftOfferChoicePresentation): string {
  return choice.faceKind === 'passive' ? PASSIVE_ICON_VIEWBOX : EFFECT_ICON_VIEWBOX
}

function draftOfferTags(choice: DraftOfferChoicePresentation): string[] {
  return compact([choice.modeTag, choice.effectTag, choice.weaponGateTag])
}

function draftOfferAriaLabel(choice: DraftOfferChoicePresentation): string {
  const parts = [choice.name, ...draftOfferTags(choice)]
  if (choice.effectSentence !== undefined) {
    parts.push(choice.effectSentence)
  } else if (choice.passiveSentence !== undefined) {
    parts.push(choice.passiveSentence)
  }
  if (choice.cooldownLine !== undefined) {
    parts.push(choice.cooldownLine)
  }
  return parts.join(', ')
}

function loadoutStripItem(key: string) {
  const presentation = getLoadoutSlotPresentation(key, ITEM_CATALOG)
  const isPassive = presentation.faceKind === 'passive'
  return {
    key,
    presentation,
    iconPath: isPassive ? PASSIVE_ICON_PATH : getEffectIconPath(presentation.effect ?? 'damage'),
    iconViewBox: isPassive ? PASSIVE_ICON_VIEWBOX : EFFECT_ICON_VIEWBOX,
  }
}

const joinHref = computed(() => {
  const token = session.value?.joinToken
  if (!token) {
    return null
  }
  return `${window.location.origin}/join/${token}`
})

function slotFlashKey(seatIndex: number, slotIndex: number): string {
  return `${seatIndex}-${slotIndex}-${lastUpdate.value?.atMs ?? ''}`
}

function slotFlashColor(seatIndex: number, slotIndex: number): string | null {
  const key = slotFlashKey(seatIndex, slotIndex)
  const entry = find(flashSlots.value, (flash) => flash.key === key)
  return entry?.kindColor ?? null
}

function slotIsFlashing(seatIndex: number, slotIndex: number): boolean {
  return slotFlashColor(seatIndex, slotIndex) !== null
}

const resultsBanner = computed(() => {
  if (playPhase.value !== 'results' || outcome.value === null) {
    return null
  }
  if (outcome.value.type === 'draw') {
    return 'Draw'
  }
  return `Seat ${outcome.value.seat + 1} wins`
})

const showOnAir = computed(
  () =>
    playPhase.value === 'weapon' ||
    playPhase.value === 'draft' ||
    playPhase.value === 'match' ||
    playPhase.value === 'results',
)

const channelPhaseLabel = computed(() => {
  if (playPhase.value === 'lobby') {
    return 'LOBBY'
  }
  if (playPhase.value === 'weapon') {
    return 'WEAPON'
  }
  if (playPhase.value === 'draft') {
    return draftHeadTitle.value.toUpperCase()
  }
  if (playPhase.value === 'match') {
    return 'FIGHT'
  }
  return 'RESULTS'
})

const phaseSubtitle = computed(() => {
  if (playPhase.value === 'weapon') {
    return 'Choose your Weapon'
  }
  if (playPhase.value === 'draft') {
    const own = draft.value?.own
    const picksTotal = draft.value?.picksTotal
    if (own && !own.isPicksComplete && picksTotal !== undefined) {
      return `Pick ${own.picksMade}/${picksTotal}`
    }
    if (isSoulSpendStep.value) {
      return 'Spend Gold on Soul stats'
    }
    return 'Draft Boons'
  }
  if (playPhase.value === 'match') {
    return 'Live fight'
  }
  if (playPhase.value === 'results') {
    return 'Match complete'
  }
  return 'Waiting for Host'
})

const crawlItems = computed(() => {
  const items: { text: string; accent?: boolean }[] = [
    { text: 'HEIYUKI' },
    { text: 'SYSMSG' },
    { text: phaseSubtitle.value, accent: true },
  ]
  if (playPhase.value === 'weapon' && weapon.value?.own?.waitingForOpponent) {
    items.push({ text: 'WAITING FOR OPPONENT WEAPON' })
  }
  if (playPhase.value === 'draft' && draft.value?.own?.waitingReason) {
    items.push({ text: 'WAITING FOR OPPONENT' })
  }
  if (playPhase.value === 'match') {
    items.push({ text: 'AUTO-FIGHT IN PROGRESS' })
  }
  if (resultsBanner.value) {
    items.push({ text: resultsBanner.value, accent: true })
  }
  if (playPhase.value === 'lobby') {
    items.push({ text: `${fightingPlayers.value.length}/2 PLAYERS READY` })
  }
  items.push({ text: session.value?.title ?? 'SESSION' })
  return items
})

const crawlTrackItems = computed(() =>
  prefersReducedMotion.value ? crawlItems.value : [...crawlItems.value, ...crawlItems.value],
)

const statusAnnouncement = computed(() => {
  const parts = [channelPhaseLabel.value, phaseSubtitle.value]
  if (playPhase.value === 'weapon' && weapon.value?.own?.waitingForOpponent) {
    parts.push('Waiting for opponent to choose a Weapon')
  } else if (playPhase.value === 'draft' && draft.value?.own?.waitingReason === 'opponent_draft') {
    parts.push('Waiting for opponent to finish Draft')
  } else if (playPhase.value === 'draft' && draft.value?.own?.waitingReason === 'opponent_spend') {
    parts.push('Waiting for opponent to confirm Soul spend')
  } else if (resultsBanner.value) {
    parts.push(resultsBanner.value)
  }
  return parts.join('. ')
})

const segmentIndices = range(1, SEGMENT_COUNT + 1)
const loadoutSlotIndices = range(1, LOADOUT_SLOT_COUNT + 1)

const prefersReducedMotion = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
)
let motionMediaQuery: MediaQueryList | null = null

function syncReducedMotionPreference(): void {
  prefersReducedMotion.value = motionMediaQuery?.matches ?? false
}

onMounted(() => {
  motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReducedMotionPreference()
  motionMediaQuery.addEventListener('change', syncReducedMotionPreference)
})

onUnmounted(() => {
  motionMediaQuery?.removeEventListener('change', syncReducedMotionPreference)
  cancelAnimationFrame(rafId)
  if (flashTimer !== null) {
    clearTimeout(flashTimer)
  }
})

watch(
  () => lastUpdate.value?.atMs,
  () => {
    const hints = lastUpdate.value?.animationHints ?? []
    if (hints.length === 0) {
      return
    }
    flashSlots.value = map(hints, (h) => ({
      key: `${h.seat}-${h.slotIndex}-${lastUpdate.value?.atMs}`,
      kindColor: CORAL_HIT_COLOR,
    }))
    if (flashTimer !== null) {
      clearTimeout(flashTimer)
    }
    flashTimer = setTimeout(() => {
      flashSlots.value = []
    }, 420)
  },
)

watch(
  playPhase,
  (phase) => {
    cancelAnimationFrame(rafId)
    if (phase === 'match') {
      const tick = () => {
        nowMs.value = Date.now()
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }
  },
  { immediate: true },
)

async function onApprove(requestId: Id<'joinRequests'>) {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.sessions.approveJoinRequest, { requestId })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not approve join request.'
  } finally {
    actionBusy.value = false
  }
}

async function onReject(requestId: Id<'joinRequests'>) {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.sessions.rejectJoinRequest, { requestId })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not reject join request.'
  } finally {
    actionBusy.value = false
  }
}

async function onStartMatch() {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.startMatch, { sessionId: sessionId.value })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not start Match.'
  } finally {
    actionBusy.value = false
  }
}

async function onPickWeapon(weaponKey: string) {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.pickWeapon, { sessionId: sessionId.value, weaponKey })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not pick Weapon.'
  } finally {
    actionBusy.value = false
  }
}

async function onPickBoon(boonKey: string) {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.pickBoon, { sessionId: sessionId.value, boonKey })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not pick Boon.'
  } finally {
    actionBusy.value = false
  }
}

async function onAdjustSoulBump(stat: 'strength' | 'speed' | 'vitality', delta: 1 | -1) {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.adjustSoulBump, {
      sessionId: sessionId.value,
      stat,
      delta,
    })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not adjust Soul stat.'
  } finally {
    actionBusy.value = false
  }
}

async function onConfirmSoulSpend() {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.confirmSoulSpend, { sessionId: sessionId.value })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not confirm Soul spend.'
  } finally {
    actionBusy.value = false
  }
}

async function onCancelMatch() {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.cancelMatch, { sessionId: sessionId.value })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not cancel Match.'
  } finally {
    actionBusy.value = false
  }
}

async function onEndSession() {
  actionError.value = null
  actionBusy.value = true
  try {
    await client.mutation(api.match.endSession, { sessionId: sessionId.value })
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not end Session.'
  } finally {
    actionBusy.value = false
  }
}

function seatLabelForClerk(clerkUserId: string): string {
  const row = find(fightingPlayers.value, (p) => p.clerkUserId === clerkUserId)
  if (row === undefined) {
    return 'Player'
  }
  if (row.sessionNickname) {
    return row.sessionNickname
  }
  return row.role === 'host' ? 'Host' : `Seat ${row.seatLabel}`
}

function seatPlayerLabel(seatIndex: SeatIndex): string {
  const row = fightingPlayers.value[seatIndex]
  if (row === undefined) {
    return 'Waiting…'
  }
  return seatLabelForClerk(row.clerkUserId)
}

function isOwnSeat(seatIndex: SeatIndex): boolean {
  return yourSeatIndex.value === seatIndex
}

const pendingRequests = computed(() => joinRequests.value ?? [])

function filledSegments(current: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0
  }
  return Math.max(0, Math.min(SEGMENT_COUNT, Math.ceil((current / maxValue) * SEGMENT_COUNT)))
}

function fighterMaxLife(soul: SoulStats | undefined, weaponKey?: string): number {
  return maxLifeForSeat(soul, weaponKey)
}

function shieldBarMax(shield: number): number {
  return max([100, shield]) ?? 100
}

function weaponLabel(weaponKey: string | null | undefined): string | null {
  return weaponDisplayName(weaponKey)
}

function weaponDisplayName(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return weaponKey
  }
  return `${weaponDef.name} (${weaponDef.weaponType})`
}

function weaponIconPath(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  return getWeaponIconPath(weaponKey) ?? null
}

function weaponNameOnly(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return weaponKey
  }
  return weaponDef.name
}

function weaponTypeName(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  return weaponDef?.weaponType ?? null
}

function weaponRarityLabel(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return null
  }
  return formatWeaponRarityLabel(weaponDef.rarity)
}

function weaponRarityTagClass(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return null
  }
  return weaponRarityClass(weaponDef.rarity)
}

function weaponRarityClass(rarity: WeaponRarity): string {
  return `broadcast-tag--rarity-${rarity.toLowerCase()}`
}

function weaponOfferRarityClass(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return null
  }
  return `broadcast-offer--rarity-${weaponDef.rarity.toLowerCase()}`
}

function weaponOfferAriaLabel(weaponKey: string): string {
  const parts = [weaponLabel(weaponKey)]
  const rarity = weaponRarityLabel(weaponKey)
  if (rarity !== null) {
    parts.push(rarity)
  }
  const nudge = weaponNudgeSummary(weaponKey)
  if (nudge !== '') {
    parts.push(nudge)
  }
  return parts.join(', ')
}

function weaponNudgeSummary(weaponKey: string): string {
  const nudges = resolveWeaponNudges(weaponKey)
  if (nudges === undefined) {
    return ''
  }
  const parts: string[] = []
  const { damagePotencyPercent, cooldownPercent, lifeBonus } = nudges
  if (damagePotencyPercent !== undefined) {
    const pct = damagePotencyPercent * 100
    parts.push(`${pct > 0 ? '+' : ''}${displayNumber(pct)}% damage`)
  }
  if (cooldownPercent !== undefined) {
    const pct = cooldownPercent * 100
    parts.push(`${pct > 0 ? '+' : ''}${displayNumber(pct)}% CD`)
  }
  if (lifeBonus !== undefined) {
    parts.push(`+${displayNumber(lifeBonus)} Life`)
  }
  return parts.join(' · ')
}

function seatSoulStats(seatIndex: SeatIndex): SoulStats | null {
  const fighter = matchSeats.value?.[seatIndex]
  if (fighter?.soul) {
    return fighter.soul
  }
  if (playPhase.value === 'weapon' && isOwnSeat(seatIndex) && weapon.value?.own?.soul) {
    return weapon.value.own.soul
  }
  if (playPhase.value === 'draft' && isOwnSeat(seatIndex) && draft.value?.own?.soul) {
    return draft.value.own.soul
  }
  return null
}

function seatWeaponKey(seatIndex: SeatIndex): string | null {
  const fighter = matchSeats.value?.[seatIndex]
  if (fighter?.weaponKey) {
    return fighter.weaponKey
  }
  if (playPhase.value === 'weapon' && isOwnSeat(seatIndex) && weapon.value?.own?.chosenWeaponKey) {
    return weapon.value.own.chosenWeaponKey
  }
  if (playPhase.value === 'draft' && isOwnSeat(seatIndex) && draft.value?.own?.weaponKey) {
    return draft.value.own.weaponKey
  }
  return null
}

function seatLife(seatIndex: SeatIndex): number | null {
  const fighter = matchSeats.value?.[seatIndex]
  return fighter?.life ?? null
}

function seatShield(seatIndex: SeatIndex): number | null {
  const fighter = matchSeats.value?.[seatIndex]
  return fighter?.shield ?? null
}

function seatLoadoutKeys(seatIndex: SeatIndex): string[] {
  if (playPhase.value === 'draft' && isOwnSeat(seatIndex) && draft.value?.own) {
    return draft.value.own.loadoutKeys
  }
  return []
}

function isPreFightPhase(): boolean {
  return playPhase.value === 'weapon' || playPhase.value === 'draft'
}

function seatInfoFogged(seatIndex: SeatIndex): boolean {
  return isPreFightPhase() && !isOwnSeat(seatIndex)
}

function showPreFightMeterPlaceholders(seatIndex: SeatIndex): boolean {
  return isPreFightPhase() && seatLife(seatIndex) === null
}

function showSoulBlock(seatIndex: SeatIndex): boolean {
  if (seatSoulStats(seatIndex) !== null) {
    return true
  }
  return seatInfoFogged(seatIndex)
}

function showWeaponBlock(seatIndex: SeatIndex): boolean {
  if (playPhase.value === 'weapon' || playPhase.value === 'draft') {
    return true
  }
  return seatWeaponKey(seatIndex) !== null
}

function showLoadoutBlock(seatIndex: SeatIndex): boolean {
  if (playPhase.value === 'match') {
    return false
  }
  if (playPhase.value === 'draft') {
    return true
  }
  if (seatLoadoutKeys(seatIndex).length > 0) {
    return true
  }
  return false
}

function seatStatusLine(seatIndex: SeatIndex): string | null {
  if (playPhase.value === 'weapon') {
    if (isOwnSeat(seatIndex)) {
      if (weapon.value?.own?.chosenWeaponKey) {
        return 'Weapon locked'
      }
      return 'Choosing Weapon'
    }
    if (weapon.value?.own?.waitingForOpponent) {
      return 'Choosing Weapon'
    }
    return 'On channel'
  }
  if (playPhase.value === 'draft') {
    if (isOwnSeat(seatIndex)) {
      if (draft.value?.own?.waitingReason === 'opponent_draft') {
        return 'Waiting for opponent'
      }
      if (draft.value?.own?.waitingReason === 'opponent_spend') {
        return 'Waiting for opponent'
      }
      if (isSoulSpendStep.value) {
        return 'Spending Gold'
      }
      if (draft.value?.own?.isSpendReady) {
        return 'Spend confirmed'
      }
      return 'Drafting'
    }
    if (draft.value?.own?.waitingReason === 'opponent_spend') {
      return 'Confirming Soul'
    }
    return 'Drafting'
  }
  return null
}
</script>

<template>
  <div class="broadcast-app session-view">
    <p v-if="playStateError" class="error session-view__alert">
      Could not load Session. {{ playStateError.message }}
    </p>
    <p v-else-if="playState === undefined" class="muted session-view__alert">Loading Session…</p>
    <p v-else-if="playState === null" class="muted session-view__alert">
      You are not a Player in this Session.
    </p>

    <template v-else-if="session">
      <header class="channel-header">
        <div class="channel-header__brand">
          <RouterLink to="/" class="channel-bug">HEIYUKI</RouterLink>
          <span class="channel-header__phase">MAIN SCENARIO — {{ channelPhaseLabel }}</span>
        </div>
        <div class="channel-header__session">{{ session.title }}</div>
        <div class="channel-header__status">
          <span v-if="showOnAir" class="on-air">
            <span class="on-air__lamp" aria-hidden="true" />
            ON AIR
          </span>
          <button
            v-if="
              playState.canCancelMatch &&
              (playPhase === 'weapon' || playPhase === 'draft' || playPhase === 'match')
            "
            type="button"
            class="broadcast-btn broadcast-btn--danger broadcast-btn--compact"
            :disabled="actionBusy"
            @click="onCancelMatch"
          >
            Cancel Match
          </button>
        </div>
      </header>

      <p v-if="actionError" class="error session-view__alert">{{ actionError }}</p>

      <p
        v-if="playPhase !== 'lobby'"
        class="visually-hidden"
        role="status"
      >
        {{ statusAnnouncement }}
      </p>

      <template v-if="playPhase === 'lobby'">
        <div class="session-view__body">
          <section class="broadcast-panel lobby-panel">
            <div class="lobby-panel__head">
              <h1>{{ session.title }}</h1>
              <p class="muted">
                <span v-if="archived">Archived session</span>
                <span v-else>Lobby</span>
                · {{ fightingPlayers.length }}/2 Players
                <span v-if="isHost"> · Host</span>
              </p>
            </div>

            <h2>Seats</h2>
            <ul class="lobby-seats">
              <li v-for="seat in [0, 1] as const" :key="seat" class="lobby-seat">
                <span class="lobby-seat__label">{{ seat === 0 ? 'West' : 'East' }} Seat</span>
                <span v-if="fightingPlayers[seat]" class="lobby-seat__player">
                  {{
                    fightingPlayers[seat].sessionNickname ||
                    (fightingPlayers[seat].role === 'host' ? 'Host' : 'Player')
                  }}
                  <span v-if="fightingPlayers[seat].isYou" class="you"> (you)</span>
                </span>
                <span v-else class="muted">Waiting…</span>
              </li>
            </ul>

            <div v-if="isHost && joinHref" class="join-link">
              <span class="muted tiny">Join link</span>
              <code class="mono">{{ joinHref }}</code>
            </div>

            <div v-if="isHost" class="lobby-actions">
              <button
                type="button"
                class="broadcast-btn broadcast-btn--cta"
                :disabled="!playState.canStartMatch || actionBusy || archived"
                @click="onStartMatch"
              >
                Start Match
              </button>
              <button
                type="button"
                class="broadcast-btn broadcast-btn--danger"
                :disabled="!playState.canEndSession || actionBusy || archived"
                @click="onEndSession"
              >
                End Session
              </button>
              <p v-if="!archived && fightingPlayers.length < 2" class="muted tiny">
                Start Match needs exactly two fighting Players.
              </p>
            </div>
            <p v-else-if="!archived" class="muted">
              Waiting for the Host to start the Match. Only the Host can start.
            </p>
            <p v-else class="muted">This Session is archived.</p>

            <div v-if="isHost && !archived" class="join-requests">
              <h3>Join requests</h3>
              <p v-if="joinRequestsError" class="error">{{ joinRequestsError.message }}</p>
              <p v-else-if="joinRequests === undefined" class="muted">Loading…</p>
              <p v-else-if="pendingRequests.length === 0" class="muted">No pending join requests.</p>
              <ul v-else class="request-list">
                <li v-for="req in pendingRequests" :key="req._id">
                  <span class="mono tiny">{{ req.clerkUserId }}</span>
                  <button
                    type="button"
                    class="broadcast-btn broadcast-btn--compact"
                    :disabled="actionBusy || fightingPlayers.length >= 2"
                    @click="onApprove(req._id)"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    class="broadcast-btn broadcast-btn--ghost broadcast-btn--compact"
                    :disabled="actionBusy"
                    @click="onReject(req._id)"
                  >
                    Reject
                  </button>
                </li>
              </ul>
              <p v-if="fightingPlayers.length >= 2" class="muted tiny">Session full (2/2).</p>
            </div>
          </section>
        </div>
      </template>

      <template v-else>
        <p
          v-if="playPhase === 'weapon' && weapon?.own?.waitingForOpponent"
          class="broadcast-status"
          role="status"
        >
          Waiting for opponent to choose a Weapon…
        </p>
        <p
          v-else-if="playPhase === 'draft' && draft?.own?.waitingReason"
          class="broadcast-status"
          role="status"
        >
          <template v-if="draft.own.waitingReason === 'opponent_draft'">
            Waiting for opponent to finish Draft…
          </template>
          <template v-else>Waiting for opponent to confirm Soul spend…</template>
        </p>

        <div v-if="resultsBanner" class="broadcast-results" role="status">
          <span class="broadcast-results__verdict">{{ resultsBanner }}</span>
          <span class="broadcast-results__return">Returning to Lobby…</span>
        </div>

        <div class="broadcast-stage">
          <article
            v-for="seatIndex in [0, 1] as const"
            :key="seatIndex"
            class="broadcast-seat broadcast-panel"
            :class="seatIndex === 0 ? 'broadcast-seat--west' : 'broadcast-seat--east'"
            :aria-label="`${seatIndex === 0 ? 'West' : 'East'} seat`"
          >
            <header class="broadcast-seat__head">
              <h2 class="broadcast-seat__label">
                {{ seatIndex === 0 ? 'West' : 'East' }} Seat
              </h2>
              <p class="broadcast-seat__player">
                {{ seatPlayerLabel(seatIndex) }}
                <span v-if="isOwnSeat(seatIndex)" class="you">· you</span>
                <span v-if="playPhase === 'match'" class="broadcast-seat__on-air">
                  ON AIR
                </span>
              </p>
            </header>

            <p v-if="seatStatusLine(seatIndex)" class="broadcast-seat__status muted tiny">
              {{ seatStatusLine(seatIndex) }}
            </p>

            <div
              v-if="showSoulBlock(seatIndex)"
              class="broadcast-seat__block"
              :class="{ 'broadcast-seat__block--fogged': seatInfoFogged(seatIndex) }"
              aria-label="Soul"
            >
              <h3 class="broadcast-seat__block-label">Soul</h3>
              <p v-if="seatSoulStats(seatIndex)" class="broadcast-seat__soul-line">
                STR {{ displayNumber(seatSoulStats(seatIndex)!.strength) }} · SPD
                {{ displayNumber(seatSoulStats(seatIndex)!.speed) }} · VIT
                {{ displayNumber(seatSoulStats(seatIndex)!.vitality) }}
              </p>
              <p v-else class="broadcast-seat__fog-line muted tiny">Hidden until fight</p>
            </div>

            <template v-if="seatLife(seatIndex) !== null">
              <div class="segmented-meter">
                <span class="segmented-meter__label">Life</span>
                <div
                  class="segmented-meter__track"
                  role="progressbar"
                  :aria-label="`${seatIndex === 0 ? 'West' : 'East'} seat Life`"
                  :aria-valuenow="seatLife(seatIndex)!"
                  :aria-valuemin="0"
                  :aria-valuemax="
                    fighterMaxLife(seatSoulStats(seatIndex) ?? undefined, seatWeaponKey(seatIndex) ?? undefined)
                  "
                >
                  <span
                    v-for="seg in segmentIndices"
                    :key="`life-${seatIndex}-${seg}`"
                    class="segmented-meter__seg"
                    :class="{
                      'segmented-meter__seg--filled': seg <= filledSegments(
                        seatLife(seatIndex)!,
                        fighterMaxLife(seatSoulStats(seatIndex) ?? undefined, seatWeaponKey(seatIndex) ?? undefined),
                      ),
                    }"
                  />
                </div>
                <span class="segmented-meter__value">
                  {{ displayNumber(seatLife(seatIndex)!) }} /
                  {{
                    displayNumber(
                      fighterMaxLife(seatSoulStats(seatIndex) ?? undefined, seatWeaponKey(seatIndex) ?? undefined),
                    )
                  }}
                </span>
              </div>

              <div class="segmented-meter">
                <span class="segmented-meter__label">Shield</span>
                <div
                  class="segmented-meter__track"
                  role="progressbar"
                  :aria-label="`${seatIndex === 0 ? 'West' : 'East'} seat Shield`"
                  :aria-valuenow="seatShield(seatIndex)!"
                  :aria-valuemin="0"
                  :aria-valuemax="shieldBarMax(seatShield(seatIndex)!)"
                >
                  <span
                    v-for="seg in segmentIndices"
                    :key="`shield-${seatIndex}-${seg}`"
                    class="segmented-meter__seg"
                    :class="{
                      'segmented-meter__seg--filled segmented-meter__seg--shield': seg <= filledSegments(
                        seatShield(seatIndex)!,
                        shieldBarMax(seatShield(seatIndex)!),
                      ),
                    }"
                  />
                </div>
                <span class="segmented-meter__value">
                  {{ displayNumber(seatShield(seatIndex)!) }} /
                  {{ displayNumber(shieldBarMax(seatShield(seatIndex)!)) }}
                </span>
              </div>
            </template>

            <template v-else-if="showPreFightMeterPlaceholders(seatIndex)">
              <div class="segmented-meter segmented-meter--placeholder" aria-hidden="true">
                <span class="segmented-meter__label">Life</span>
                <div class="segmented-meter__track">
                  <span
                    v-for="seg in segmentIndices"
                    :key="`life-ph-${seatIndex}-${seg}`"
                    class="segmented-meter__seg"
                  />
                </div>
                <span class="segmented-meter__value">—</span>
              </div>
              <div class="segmented-meter segmented-meter--placeholder" aria-hidden="true">
                <span class="segmented-meter__label">Shield</span>
                <div class="segmented-meter__track">
                  <span
                    v-for="seg in segmentIndices"
                    :key="`shield-ph-${seatIndex}-${seg}`"
                    class="segmented-meter__seg"
                  />
                </div>
                <span class="segmented-meter__value">—</span>
              </div>
            </template>

            <div
              v-if="showWeaponBlock(seatIndex)"
              class="broadcast-seat__block"
              :class="{ 'broadcast-seat__block--fogged': seatInfoFogged(seatIndex) && !seatWeaponKey(seatIndex) }"
              aria-label="Weapon"
            >
              <h3 class="broadcast-seat__block-label">Weapon</h3>
              <div v-if="seatWeaponKey(seatIndex)" class="broadcast-seat__weapon-row">
                <svg
                  v-if="weaponIconPath(seatWeaponKey(seatIndex))"
                  class="broadcast-seat__weapon-icon"
                  :viewBox="WEAPON_ICON_VIEWBOX"
                  aria-hidden="true"
                >
                  <path :d="weaponIconPath(seatWeaponKey(seatIndex))!" fill="currentColor" />
                </svg>
                <p class="broadcast-seat__weapon">
                  {{ weaponDisplayName(seatWeaponKey(seatIndex)) }}
                  <span
                    v-if="weaponRarityLabel(seatWeaponKey(seatIndex))"
                    class="broadcast-seat__rarity"
                    :class="weaponRarityTagClass(seatWeaponKey(seatIndex))"
                  >
                    · {{ weaponRarityLabel(seatWeaponKey(seatIndex)) }}
                  </span>
                </p>
              </div>
              <p v-else-if="seatInfoFogged(seatIndex)" class="broadcast-seat__fog-line muted tiny">
                Hidden until fight
              </p>
              <p v-else class="broadcast-seat__fog-line muted tiny">Not chosen yet</p>
            </div>

            <div
              v-if="showLoadoutBlock(seatIndex)"
              class="broadcast-seat__block"
              :class="{ 'broadcast-seat__block--fogged': seatInfoFogged(seatIndex) }"
              aria-label="Loadout"
            >
              <h3 class="broadcast-seat__block-label">Loadout</h3>
              <ul
                v-if="seatLoadoutKeys(seatIndex).length > 0"
                class="broadcast-loadout-preview"
              >
                <li
                  v-for="(item, idx) in map(seatLoadoutKeys(seatIndex), loadoutStripItem)"
                  :key="item.key"
                  class="broadcast-loadout-preview__item"
                  :style="{ '--offer-kind': item.presentation.kindColor }"
                >
                  <span class="broadcast-loadout-preview__num" aria-hidden="true">{{ idx + 1 }}</span>
                  <svg class="broadcast-loadout-preview__icon" :viewBox="item.iconViewBox" aria-hidden="true">
                    <path :d="item.iconPath" fill="currentColor" />
                  </svg>
                </li>
              </ul>
              <ul v-else class="broadcast-loadout-preview">
                <li
                  v-for="slotNum in loadoutSlotIndices"
                  :key="`empty-${seatIndex}-${slotNum}`"
                  class="broadcast-loadout-preview__item"
                  :class="{ 'broadcast-loadout-preview__item--fogged': seatInfoFogged(seatIndex) }"
                  :aria-hidden="seatInfoFogged(seatIndex) ? true : undefined"
                >
                  <span class="broadcast-loadout-preview__num">{{ slotNum }}</span>
                </li>
              </ul>
              <p v-if="seatInfoFogged(seatIndex)" class="broadcast-seat__fog-line muted tiny">
                Hidden until fight
              </p>
            </div>

            <ul
              v-if="matchSeats && matchSeatStates"
              class="broadcast-loadout"
              :aria-label="`${seatIndex === 0 ? 'West' : 'East'} loadout`"
            >
              <MatchLoadoutSlot
                v-for="(slot, slotIndex) in matchSeats[seatIndex].slots"
                :key="`${seatIndex}-${slotIndex}-${slot.itemKey}`"
                :item-key="slot.itemKey"
                :seats="matchSeatStates"
                :seat-index="seatIndex"
                :slot-index="slotIndex"
                :souls="matchSouls"
                :weapon-keys="matchWeaponKeys"
                :next-ready-at="slot.nextReadyAt"
                :now-ms="nowMs"
                :is-flashing="slotIsFlashing(seatIndex, slotIndex)"
                :flash-color="slotFlashColor(seatIndex, slotIndex)"
              />
            </ul>
          </article>

          <div class="broadcast-center broadcast-panel">
            <template v-if="playPhase === 'weapon' || playPhase === 'draft'">
              <header class="broadcast-center__head">
                <h2 class="broadcast-center__title">Select</h2>
                <p class="broadcast-center__subtitle muted">
                  <template v-if="playPhase === 'weapon'">Choose a Weapon</template>
                  <template v-else-if="isSoulSpendStep">Spend Gold on Soul</template>
                  <template v-else>Choose a Boon</template>
                </p>
              </header>

              <p
                v-if="
                  playPhase === 'draft' &&
                  draft?.own &&
                  !draft.own.isPicksComplete &&
                  draft.own.godPool.length > 0
                "
                class="broadcast-meta muted tiny"
              >
                God pool: {{ draft.own.godPool.join(', ') }}
              </p>
              <p
                v-else-if="
                  playPhase === 'draft' && draft?.own?.isSpendReady && !draft.own.waitingReason
                "
                class="broadcast-meta muted tiny"
                role="status"
              >
                Spend confirmed.
              </p>

              <section
                v-if="
                  playPhase === 'weapon' &&
                  weapon?.own &&
                  !weapon.own.chosenWeaponKey &&
                  weapon.own.weaponOffers.length > 0
                "
                class="broadcast-offers"
                aria-label="Weapon offers"
              >
                <ol class="broadcast-offers__list">
                  <li
                    v-for="(offerKey, offerIndex) in weapon.own.weaponOffers"
                    :key="offerKey"
                    class="broadcast-offers__row"
                  >
                    <button
                      type="button"
                      class="broadcast-offer"
                      :class="weaponOfferRarityClass(offerKey)"
                      :aria-label="weaponOfferAriaLabel(offerKey)"
                      :disabled="actionBusy"
                      @click="onPickWeapon(offerKey)"
                    >
                      <span class="broadcast-offer__num" aria-hidden="true">{{ offerIndex + 1 }}</span>
                      <span v-if="weaponIconPath(offerKey)" class="broadcast-offer__icon-wrap" aria-hidden="true">
                        <svg class="broadcast-offer__icon" :viewBox="WEAPON_ICON_VIEWBOX">
                          <path :d="weaponIconPath(offerKey)!" fill="currentColor" />
                        </svg>
                      </span>
                      <span class="broadcast-offer__body">
                        <span v-if="weaponTypeName(offerKey)" class="broadcast-offer__god">
                          {{ weaponTypeName(offerKey) }}
                        </span>
                        <span class="broadcast-offer__name">{{ weaponNameOnly(offerKey) }}</span>
                        <span
                          v-if="weaponRarityLabel(offerKey)"
                          class="broadcast-offer__tags"
                        >
                          <span
                            class="broadcast-tag"
                            :class="weaponRarityTagClass(offerKey)"
                          >
                            {{ weaponRarityLabel(offerKey) }}
                          </span>
                        </span>
                        <span v-if="weaponNudgeSummary(offerKey)" class="broadcast-offer__detail">
                          {{ weaponNudgeSummary(offerKey) }}
                        </span>
                      </span>
                    </button>
                  </li>
                </ol>
              </section>

              <section
                v-else-if="
                  playPhase === 'draft' &&
                  draftOfferPresentation &&
                  draft?.own &&
                  !draft.own.isPicksComplete
                "
                class="broadcast-offers"
                aria-label="Boon offers"
              >
                <p class="broadcast-offers__god">{{ draftOfferPresentation.godLabel }}</p>
                <ol class="broadcast-offers__list">
                  <li
                    v-for="(choice, offerIndex) in draftOfferPresentation.choices"
                    :key="choice.key"
                    class="broadcast-offers__row"
                  >
                    <button
                      type="button"
                      class="broadcast-offer"
                      :style="{ '--offer-kind': choice.kindColor }"
                      :disabled="actionBusy"
                      :aria-label="draftOfferAriaLabel(choice)"
                      @click="onPickBoon(choice.key)"
                    >
                      <span class="broadcast-offer__num" aria-hidden="true">{{ offerIndex + 1 }}</span>
                      <span class="broadcast-offer__icon-wrap" aria-hidden="true">
                        <svg class="broadcast-offer__icon" :viewBox="draftOfferIconViewBox(choice)">
                          <path :d="draftOfferIconPath(choice)" fill="currentColor" />
                        </svg>
                      </span>
                      <span class="broadcast-offer__body">
                        <span class="broadcast-offer__god">{{ draftOfferPresentation.godLabel }}</span>
                        <span class="broadcast-offer__name">{{ choice.name }}</span>
                        <span v-if="draftOfferTags(choice).length > 0" class="broadcast-offer__tags">
                          <span
                            v-for="tag in draftOfferTags(choice)"
                            :key="tag"
                            class="broadcast-tag"
                          >
                            {{ tag }}
                          </span>
                        </span>
                        <span v-if="choice.effectSentence" class="broadcast-offer__detail">
                          {{ choice.effectSentence }}
                        </span>
                        <span v-else-if="choice.passiveSentence" class="broadcast-offer__detail">
                          {{ choice.passiveSentence }}
                        </span>
                        <span v-if="choice.cooldownLine" class="broadcast-offer__cooldown">
                          {{ choice.cooldownLine }}
                        </span>
                      </span>
                    </button>
                  </li>
                </ol>
              </section>

              <section
                v-else-if="playPhase === 'draft' && isSoulSpendStep && draft?.own?.soul"
                class="broadcast-spend"
                aria-label="Soul spend"
              >
                <div class="broadcast-spend__head">
                  <span class="broadcast-spend__gold"
                    >Gold · {{ displayNumber(draft.own.goldRemaining) }}</span
                  >
                </div>
                <ul class="broadcast-spend__stats">
                  <li v-for="stat in soulStatEntries" :key="stat.key" class="broadcast-spend__row">
                    <span class="broadcast-spend__label">
                      {{ stat.label }} {{ displayNumber(draft.own.soul[stat.key]) }}
                      <span v-if="draft.own.soulBumps[stat.key] > 0" class="broadcast-spend__bump">
                        (+{{ displayNumber(draft.own.soulBumps[stat.key]) }})
                      </span>
                    </span>
                    <span class="broadcast-spend__controls">
                      <button
                        type="button"
                        class="broadcast-btn broadcast-btn--compact"
                        :disabled="actionBusy || draft.own.soulBumps[stat.key] <= 0"
                        :aria-label="`Decrease ${stat.label}`"
                        @click="onAdjustSoulBump(stat.key, -1)"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        class="broadcast-btn broadcast-btn--compact"
                        :disabled="actionBusy || draft.own.goldRemaining <= 0"
                        :aria-label="`Increase ${stat.label}`"
                        @click="onAdjustSoulBump(stat.key, 1)"
                      >
                        +
                      </button>
                    </span>
                  </li>
                </ul>
                <p class="muted tiny">Unspent Gold is lost.</p>
                <button
                  type="button"
                  class="broadcast-btn broadcast-btn--cta"
                  :disabled="actionBusy"
                  @click="onConfirmSoulSpend"
                >
                  Confirm
                </button>
                <p v-if="draft.own.favorLine" class="muted tiny">{{ draft.own.favorLine }}</p>
              </section>

              <template v-else-if="playPhase === 'weapon' && weapon?.own?.chosenWeaponKey">
                <p class="broadcast-center__note">
                  Weapon locked:
                  <strong>{{ weaponNameOnly(weapon.own.chosenWeaponKey) }}</strong>
                </p>
                <p v-if="weapon.own.weaponFavorLine" class="muted tiny">{{ weapon.own.weaponFavorLine }}</p>
                <p
                  v-if="weaponNudgeSummary(weapon.own.chosenWeaponKey)"
                  class="muted tiny"
                >
                  {{ weaponNudgeSummary(weapon.own.chosenWeaponKey) }}
                </p>
              </template>
            </template>

            <template v-else-if="playPhase === 'match'">
              <header class="broadcast-center__head">
                <h2 class="broadcast-center__title">Fight</h2>
                <p class="broadcast-center__subtitle muted">Authoritative auto-fight</p>
              </header>
              <p v-if="!matchSeats" class="muted" role="status">Loading fight…</p>
            </template>

            <template v-else-if="playPhase === 'results'">
              <header class="broadcast-center__head">
                <h2 class="broadcast-center__title">Results</h2>
                <p v-if="resultsBanner" class="broadcast-center__subtitle broadcast-results__verdict">
                  {{ resultsBanner }}
                </p>
                <p v-else class="broadcast-center__subtitle muted" role="status">Loading results…</p>
              </header>
            </template>
          </div>
        </div>
      </template>

      <footer class="channel-crawl">
        <div
          class="channel-crawl__track"
          :class="
            prefersReducedMotion
              ? 'channel-crawl__track--static'
              : 'channel-crawl__track--marquee'
          "
          aria-hidden="true"
        >
          <template v-for="(item, idx) in crawlTrackItems" :key="`${item.text}-${idx}`">
            <span
              class="channel-crawl__item"
              :class="{ 'channel-crawl__item--accent': item.accent }"
            >
              {{ item.text }}
            </span>
            <span class="channel-crawl__divider">|</span>
          </template>
        </div>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.session-view {
  flex: 1;
  min-height: 0;
}

.session-view__alert {
  margin: 12px 16px 0;
}

.session-view__body {
  flex: 1;
  padding: 16px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.lobby-panel h1 {
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.lobby-panel__head {
  margin-bottom: 16px;
}

.lobby-seats {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.lobby-seat {
  display: grid;
  grid-template-columns: 6rem 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.lobby-seat__label {
  font-family: var(--display);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--phosphor);
}

.lobby-seat__player {
  color: var(--ice);
}

.join-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.lobby-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.join-requests h3 {
  margin: 12px 0 8px;
}

.request-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.request-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.you {
  font-weight: 600;
  color: var(--amber);
}

.broadcast-btn--compact {
  padding: 4px 10px;
  font-size: 0.72rem;
}

.broadcast-status {
  text-align: center;
  margin: 0 16px 12px;
  padding: 10px 14px;
  border: 1px solid var(--border-strong);
  font-weight: 600;
  color: var(--ice);
  background: color-mix(in srgb, var(--phosphor) 8%, var(--panel));
}

.broadcast-results {
  text-align: center;
  margin: 0 16px 12px;
  padding: 14px 18px;
  border: 1px solid var(--border-strong);
  background: var(--panel);
}

.broadcast-results__verdict {
  display: block;
  font-family: var(--display);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--amber);
}

.broadcast-results__return {
  display: block;
  margin-top: 6px;
  font-size: 0.82rem;
  color: var(--ice-dim);
}

.broadcast-stage {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 12px 16px;
  min-height: 0;
}

.broadcast-seat--west {
  order: 1;
}

.broadcast-center {
  order: 2;
}

.broadcast-seat--east {
  order: 3;
}

@media (min-width: 900px) {
  .broadcast-stage {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 1.1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.broadcast-seat__head {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.broadcast-seat__label {
  margin: 0;
  font-size: 0.85rem;
}

.broadcast-seat__player {
  margin: 4px 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ice);
}

.broadcast-seat__on-air {
  margin-left: 6px;
  font-family: var(--display);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--amber);
}

.broadcast-seat__status {
  margin-bottom: 8px;
}

.broadcast-seat__block {
  margin-bottom: 12px;
}

.broadcast-seat__block-label {
  margin-bottom: 4px;
  font-size: 0.72rem;
  color: var(--phosphor);
}

.broadcast-seat__soul-line,
.broadcast-seat__weapon {
  font-size: 0.82rem;
  color: var(--ice-dim);
  margin: 0;
}

.broadcast-seat__weapon-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.broadcast-seat__weapon-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  color: var(--phosphor);
}

.broadcast-seat__block--fogged {
  opacity: 0.82;
}

.broadcast-seat__fog-line {
  margin: 0;
  font-style: italic;
}

.segmented-meter--placeholder {
  opacity: 0.55;
}

.broadcast-loadout-preview__item--fogged {
  opacity: 0.35;
  border-style: dashed;
}

.broadcast-seat__rarity {
  font-size: 0.75em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.broadcast-loadout-preview {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 6px;
}

.broadcast-loadout-preview__item {
  position: relative;
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  border: 1px solid var(--border-strong);
  background: var(--panel-lift);
  color: var(--offer-kind, var(--phosphor));
}

.broadcast-loadout-preview__num {
  position: absolute;
  top: 2px;
  left: 4px;
  font-family: var(--display);
  font-size: 0.55rem;
  color: var(--ice-dim);
}

.broadcast-loadout-preview__icon {
  width: 1rem;
  height: 1rem;
}

.broadcast-loadout {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.broadcast-center__head {
  margin-bottom: 16px;
  text-align: center;
}

.broadcast-center__title {
  font-size: 1.6rem;
  margin: 0;
  color: var(--ice);
}

.broadcast-center__subtitle {
  margin-top: 4px;
  font-size: 0.85rem;
}

.broadcast-center__note {
  text-align: center;
  color: var(--ice-dim);
}

.broadcast-center__note strong {
  color: var(--ice);
}

.broadcast-meta {
  text-align: center;
  margin-bottom: 12px;
}

.broadcast-offers__god {
  margin: 0 0 12px;
  font-family: var(--display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
  color: var(--phosphor);
}

.broadcast-offers__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.broadcast-offer {
  width: 100%;
  display: grid;
  grid-template-columns: 2rem auto 1fr;
  gap: 10px;
  align-items: start;
  text-align: left;
  border: 1px solid var(--border-strong);
  padding: 12px 14px;
  background: var(--panel-lift);
  color: var(--ice-dim);
  font: inherit;
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease;
}

.broadcast-offer:hover:not(:disabled) {
  background: color-mix(in srgb, var(--offer-kind, var(--phosphor)) 8%, var(--panel-lift));
  border-color: color-mix(in srgb, var(--offer-kind, var(--phosphor)) 40%, var(--border-strong));
}

.broadcast-offer:focus-visible {
  outline: 2px solid var(--phosphor);
  outline-offset: 2px;
}

.broadcast-offer:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.broadcast-offer--rarity-common {
  border-color: color-mix(in srgb, var(--rarity-common) 50%, var(--border-strong));
}

.broadcast-offer--rarity-uncommon {
  border-color: color-mix(in srgb, var(--rarity-uncommon) 50%, var(--border-strong));
}

.broadcast-offer--rarity-rare {
  border-color: color-mix(in srgb, var(--rarity-rare) 50%, var(--border-strong));
}

.broadcast-offer--rarity-epic {
  border-color: color-mix(in srgb, var(--rarity-epic) 50%, var(--border-strong));
}

.broadcast-offer--rarity-legendary {
  border-color: color-mix(in srgb, var(--rarity-legendary) 50%, var(--border-strong));
}

.broadcast-offer__num {
  font-family: var(--display);
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  color: var(--phosphor);
}

.broadcast-offer__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--offer-kind, var(--phosphor));
}

.broadcast-offer__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.broadcast-offer__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.broadcast-offer__god {
  font-family: var(--display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--phosphor);
}

.broadcast-offer__name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ice);
}

.broadcast-offer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.broadcast-tag {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--offer-kind, var(--border)) 45%, transparent);
  color: var(--ice-dim);
}

.broadcast-tag--rarity-common {
  color: var(--rarity-common);
}

.broadcast-tag--rarity-uncommon {
  color: var(--rarity-uncommon);
}

.broadcast-tag--rarity-rare {
  color: var(--rarity-rare);
}

.broadcast-tag--rarity-epic {
  color: var(--rarity-epic);
}

.broadcast-tag--rarity-legendary {
  color: var(--rarity-legendary);
}

.broadcast-offer__detail {
  font-size: 0.82rem;
  line-height: 1.4;
}

.broadcast-offer__cooldown {
  font-size: 0.78rem;
  color: var(--ice-dim);
}

.broadcast-spend {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.broadcast-spend__gold {
  font-weight: 700;
  color: var(--amber);
}

.broadcast-spend__stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.broadcast-spend__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.broadcast-spend__bump {
  font-weight: 500;
  opacity: 0.75;
  font-size: 0.82rem;
}

.broadcast-spend__controls {
  display: flex;
  gap: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .broadcast-offer {
    transition: none;
  }
}
</style>
