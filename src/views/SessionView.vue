<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { compact, find, get, map, max } from 'lodash'
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
  weaponTypeEmoji,
  WEAPON_CATALOG,
} from '../match/weaponCatalog'
import type { MatchSeatState, SeatIndex, SoulStats, WeaponRarity } from '../match/types'
import type { DraftOfferChoicePresentation } from '../match/loadoutSlotPresentation'

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
import {
  getDraftOfferPresentation,
  getLoadoutSlotPresentation,
} from '../match/loadoutSlotPresentation'

const FIGHT_HIT_FLASH_COLOR = '#e85d3a'

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

const isKylixPhase = computed(
  () =>
    playPhase.value === 'weapon' ||
    playPhase.value === 'draft' ||
    playPhase.value === 'match' ||
    playPhase.value === 'results',
)

const kylixPhaseTitle = computed(() => {
  if (playPhase.value === 'weapon') {
    return 'Weapon'
  }
  if (playPhase.value === 'draft') {
    return draftHeadTitle.value
  }
  if (playPhase.value === 'match') {
    return 'Match'
  }
  return 'Results'
})

const kylixPhaseSubtitle = computed(() => {
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
  return 'Match complete'
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
      kindColor: FIGHT_HIT_FLASH_COLOR,
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

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  if (flashTimer !== null) {
    clearTimeout(flashTimer)
  }
})

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

const pendingRequests = computed(() => joinRequests.value ?? [])

function lifeBarWidth(life: number, soul: SoulStats | undefined, weaponKey?: string): number {
  const maxLife = maxLifeForSeat(soul, weaponKey)
  if (maxLife <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (life / maxLife) * 100))
}

function fighterMaxLife(soul: SoulStats | undefined, weaponKey?: string): number {
  return maxLifeForSeat(soul, weaponKey)
}

function shieldBarMax(shield: number): number {
  return max([100, shield]) ?? 100
}

function shieldBarScale(shield: number): number {
  const barMax = shieldBarMax(shield)
  if (barMax <= 0) {
    return 0
  }
  return Math.max(0, Math.min(1, shield / barMax))
}

function weaponLabel(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = get(WEAPON_CATALOG, weaponKey)
  if (weaponDef === undefined) {
    return weaponKey
  }
  return `${weaponTypeEmoji(weaponDef.weaponType)} ${weaponDef.name} (${weaponDef.weaponType})`
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
  return `kylix-offer__tag--rarity-${rarity.toLowerCase()}`
}

function weaponOfferRarityClass(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = weaponDefinition(weaponKey)
  if (weaponDef === undefined) {
    return null
  }
  return `kylix-offer--rarity-${weaponDef.rarity.toLowerCase()}`
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
</script>

<template>
  <div class="page" :class="{ 'page--kylix': isKylixPhase }">
    <p v-if="!isKylixPhase" class="nav">
      <RouterLink to="/">← Home</RouterLink>
    </p>

    <p v-if="playStateError" class="error">Could not load Session. {{ playStateError.message }}</p>
    <p v-else-if="playState === undefined" class="muted">Loading Session…</p>
    <p v-else-if="playState === null" class="muted">You are not a Player in this Session.</p>

    <template v-else-if="session">
      <template v-if="playPhase === 'lobby'">
        <header class="header">
          <h1>{{ session.title }}</h1>
          <p class="muted">
            <span v-if="archived">Archived session</span>
            <span v-else>Lobby</span>
            · {{ fightingPlayers.length }}/2 Players
            <span v-if="isHost"> · Host</span>
          </p>
        </header>

        <p v-if="actionError" class="error">{{ actionError }}</p>

        <section class="panel">
          <h2>Lobby</h2>
          <ul class="seats">
            <li v-for="seat in [0, 1]" :key="seat" class="seat-row">
              <span class="seat-label">Seat {{ seat + 1 }}</span>
              <span v-if="fightingPlayers[seat]" class="seat-player">
                {{
                  fightingPlayers[seat].sessionNickname ||
                  (fightingPlayers[seat].role === 'host' ? 'Host' : 'Player')
                }}
                <span v-if="fightingPlayers[seat].isYou" class="you"> (you)</span>
                <span v-if="fightingPlayers[seat].role === 'host'" class="muted"> · Host</span>
              </span>
              <span v-else class="muted">Waiting…</span>
            </li>
          </ul>

          <div v-if="isHost && joinHref" class="join-link">
            <span class="muted">Join link</span>
            <code class="mono">{{ joinHref }}</code>
          </div>

          <div v-if="isHost" class="host-actions">
            <button
              type="button"
              class="btn-primary"
              :disabled="!playState.canStartMatch || actionBusy || archived"
              @click="onStartMatch"
            >
              Start Match
            </button>
            <button
              type="button"
              class="btn-danger"
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
                  class="btn-small"
                  :disabled="actionBusy || fightingPlayers.length >= 2"
                  @click="onApprove(req._id)"
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="btn-small"
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
      </template>

      <div v-else class="kylix-match">
        <div class="kylix-rim-shell">
          <div class="kylix-handle kylix-handle--left" aria-hidden="true" />
          <header class="kylix-rim">
            <nav class="kylix-rim__nav">
              <RouterLink to="/" class="kylix-rim__home">← Home</RouterLink>
              <span class="kylix-rim__crumb">{{ session.title }}</span>
            </nav>
            <div class="kylix-rim__center">
              <h1 class="kylix-rim__title">{{ kylixPhaseTitle }}</h1>
              <p class="kylix-rim__subtitle">{{ kylixPhaseSubtitle }}</p>
              <p class="kylix-rim__meta">
                {{ fightingPlayers.length }}/2 Players
                <span v-if="isHost"> · Host</span>
              </p>
            </div>
            <div class="kylix-rim__actions">
              <button
                v-if="
                  playState.canCancelMatch &&
                  (playPhase === 'weapon' || playPhase === 'draft' || playPhase === 'match')
                "
                type="button"
                class="kylix-btn kylix-btn--danger"
                :disabled="actionBusy"
                @click="onCancelMatch"
              >
                Cancel Match
              </button>
            </div>
          </header>
          <div class="kylix-handle kylix-handle--right" aria-hidden="true" />
        </div>

        <p v-if="actionError" class="kylix-error">{{ actionError }}</p>

        <p
          v-if="playPhase === 'weapon' && weapon?.own?.waitingForOpponent"
          class="kylix-waiting"
          role="status"
        >
          Waiting for opponent to choose a Weapon…
        </p>
        <p
          v-else-if="playPhase === 'draft' && draft?.own?.waitingReason"
          class="kylix-waiting"
          role="status"
        >
          <template v-if="draft.own.waitingReason === 'opponent_draft'">
            Waiting for opponent to finish Draft…
          </template>
          <template v-else>Waiting for opponent to confirm Soul spend…</template>
        </p>

        <div v-if="resultsBanner" class="kylix-results" role="status">
          <span class="kylix-results__verdict">{{ resultsBanner }}</span>
          <span class="kylix-results__return">Returning to Lobby…</span>
        </div>

        <div v-if="playPhase === 'weapon' || playPhase === 'draft'" class="kylix-stage">
          <div
            v-if="
              (playPhase === 'weapon' && weapon?.own?.soul) ||
              (playPhase === 'draft' && draft?.own?.soul)
            "
            class="kylix-instruments"
          >
            <aside
              v-if="playPhase === 'weapon' && weapon?.own?.soul"
              class="kylix-instrument kylix-instrument--soul"
              :class="{ 'kylix-instrument--spend': false }"
              aria-label="Your Soul"
            >
              <h3 class="kylix-instrument__label">Soul</h3>
              <ul class="kylix-soul-stats">
                <li>Strength {{ displayNumber(weapon.own.soul.strength) }}</li>
                <li>Speed {{ displayNumber(weapon.own.soul.speed) }}</li>
                <li>Vitality {{ displayNumber(weapon.own.soul.vitality) }}</li>
              </ul>
              <p v-if="weapon.own.favorLine" class="kylix-instrument__note">
                {{ weapon.own.favorLine }}
              </p>
            </aside>

            <aside
              v-if="playPhase === 'draft' && draft?.own?.soul"
              class="kylix-instrument kylix-instrument--soul"
              :class="{ 'kylix-instrument--spend': isSoulSpendStep }"
              aria-label="Your Soul"
            >
              <div class="kylix-instrument__head">
                <h3 class="kylix-instrument__label">Soul</h3>
                <span v-if="isSoulSpendStep" class="kylix-gold"
                  >Gold · {{ displayNumber(draft.own.goldRemaining) }}</span
                >
              </div>
              <ul class="kylix-soul-stats">
                <li v-for="stat in soulStatEntries" :key="stat.key" class="kylix-soul-row">
                  <span class="kylix-soul-row__label">
                    {{ stat.label }} {{ displayNumber(draft.own.soul[stat.key]) }}
                    <span v-if="draft.own.soulBumps[stat.key] > 0" class="kylix-soul-bump">
                      (+{{ displayNumber(draft.own.soulBumps[stat.key]) }})
                    </span>
                  </span>
                  <span v-if="isSoulSpendStep" class="kylix-bump-controls">
                    <button
                      type="button"
                      class="kylix-bump-btn"
                      :disabled="actionBusy || draft.own.soulBumps[stat.key] <= 0"
                      :aria-label="`Decrease ${stat.label}`"
                      @click="onAdjustSoulBump(stat.key, -1)"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      class="kylix-bump-btn"
                      :disabled="actionBusy || draft.own.goldRemaining <= 0"
                      :aria-label="`Increase ${stat.label}`"
                      @click="onAdjustSoulBump(stat.key, 1)"
                    >
                      +
                    </button>
                  </span>
                </li>
              </ul>
              <div v-if="isSoulSpendStep" class="kylix-spend-actions">
                <p class="kylix-instrument__note">Unspent Gold is lost.</p>
                <button
                  type="button"
                  class="kylix-btn kylix-btn--primary"
                  :disabled="actionBusy"
                  @click="onConfirmSoulSpend"
                >
                  Confirm
                </button>
              </div>
              <p v-if="draft.own.favorLine" class="kylix-instrument__note">
                {{ draft.own.favorLine }}
              </p>
            </aside>

            <aside
              v-if="
                (playPhase === 'weapon' && weapon?.own?.chosenWeaponKey) ||
                (playPhase === 'draft' && draft?.own?.weaponKey)
              "
              class="kylix-instrument kylix-instrument--weapon"
              aria-label="Your Weapon"
            >
              <h3 class="kylix-instrument__label">Weapon</h3>
              <p class="kylix-weapon-name">
                {{
                  weaponLabel(
                    playPhase === 'weapon' ? weapon?.own?.chosenWeaponKey : draft?.own?.weaponKey,
                  )
                }}
              </p>
              <p
                v-if="
                  weaponRarityLabel(
                    playPhase === 'weapon' ? weapon?.own?.chosenWeaponKey : draft?.own?.weaponKey,
                  )
                "
                class="kylix-weapon-rarity"
                :class="
                  weaponRarityTagClass(
                    playPhase === 'weapon' ? weapon?.own?.chosenWeaponKey : draft?.own?.weaponKey,
                  )
                "
              >
                {{
                  weaponRarityLabel(
                    playPhase === 'weapon' ? weapon?.own?.chosenWeaponKey : draft?.own?.weaponKey,
                  )
                }}
              </p>
              <p
                v-if="playPhase === 'weapon' && weapon?.own?.weaponFavorLine"
                class="kylix-instrument__note"
              >
                {{ weapon.own.weaponFavorLine }}
              </p>
              <p
                v-else-if="playPhase === 'draft' && draft?.own?.weaponFavorLine"
                class="kylix-instrument__note"
              >
                {{ draft.own.weaponFavorLine }}
              </p>
              <p
                v-if="
                  playPhase === 'weapon' &&
                  weapon?.own?.chosenWeaponKey &&
                  weaponNudgeSummary(weapon.own.chosenWeaponKey)
                "
                class="kylix-instrument__note"
              >
                {{ weaponNudgeSummary(weapon.own.chosenWeaponKey) }}
              </p>
              <p
                v-else-if="
                  playPhase === 'draft' &&
                  draft?.own?.weaponKey &&
                  weaponNudgeSummary(draft.own.weaponKey)
                "
                class="kylix-instrument__note"
              >
                {{ weaponNudgeSummary(draft.own.weaponKey) }}
              </p>
            </aside>
          </div>

          <p
            v-if="
              playPhase === 'draft' &&
              draft?.own &&
              !draft.own.isPicksComplete &&
              draft.own.godPool.length > 0
            "
            class="kylix-god-pool"
          >
            God pool: {{ draft.own.godPool.join(', ') }}
          </p>
          <p
            v-else-if="
              playPhase === 'draft' && draft?.own?.isSpendReady && !draft.own.waitingReason
            "
            class="kylix-god-pool"
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
            class="kylix-frieze kylix-frieze--weapon"
            aria-label="Weapon offers"
          >
            <h2 class="kylix-frieze__band-title">Pick 1 Weapon</h2>
            <ul class="kylix-frieze__choices">
              <li v-for="offerKey in weapon.own.weaponOffers" :key="offerKey">
                <button
                  type="button"
                  class="kylix-offer kylix-offer--frieze"
                  :class="weaponOfferRarityClass(offerKey)"
                  :aria-label="weaponOfferAriaLabel(offerKey)"
                  :disabled="actionBusy"
                  @click="onPickWeapon(offerKey)"
                >
                  <span class="kylix-offer__name">{{ weaponLabel(offerKey) }}</span>
                  <span v-if="weaponNudgeSummary(offerKey)" class="kylix-offer__detail">
                    {{ weaponNudgeSummary(offerKey) }}
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section
            v-if="
              playPhase === 'draft' &&
              draftOfferPresentation &&
              draft?.own &&
              !draft.own.isPicksComplete
            "
            class="kylix-frieze kylix-frieze--boon"
            aria-label="Boon offers"
          >
            <header class="kylix-frieze__god-head">
              <span class="god-seal god-seal--hero" aria-hidden="true">{{
                draftOfferPresentation.godLabel.charAt(0)
              }}</span>
              <div class="kylix-frieze__god-copy">
                <h2 class="kylix-frieze__god-name">{{ draftOfferPresentation.godLabel }}</h2>
              </div>
            </header>
            <ul class="kylix-frieze__choices">
              <li v-for="choice in draftOfferPresentation.choices" :key="choice.key">
                <button
                  type="button"
                  class="kylix-offer kylix-offer--frieze"
                  :style="{ '--offer-kind': choice.kindColor }"
                  :disabled="actionBusy"
                  :aria-label="draftOfferAriaLabel(choice)"
                  @click="onPickBoon(choice.key)"
                >
                  <div class="kylix-offer__head">
                    <svg
                      class="kylix-offer__icon"
                      :viewBox="draftOfferIconViewBox(choice)"
                      aria-hidden="true"
                    >
                      <path :d="draftOfferIconPath(choice)" fill="currentColor" />
                    </svg>
                    <span class="kylix-offer__name">{{ choice.name }}</span>
                  </div>
                  <div v-if="draftOfferTags(choice).length > 0" class="kylix-offer__tags">
                    <span
                      v-for="tag in draftOfferTags(choice)"
                      :key="tag"
                      class="kylix-offer__tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <span v-if="choice.effectSentence" class="kylix-offer__detail">
                    {{ choice.effectSentence }}
                  </span>
                  <span v-else-if="choice.passiveSentence" class="kylix-offer__detail">
                    {{ choice.passiveSentence }}
                  </span>
                  <span v-if="choice.cooldownLine" class="kylix-offer__cooldown">
                    {{ choice.cooldownLine }}
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section
            v-if="playPhase === 'draft' && draft?.own && draft.own.loadoutKeys.length > 0"
            class="kylix-loadout-strip"
            aria-label="Your loadout"
          >
            <h3 class="kylix-loadout-strip__title">Your loadout</h3>
            <ul class="kylix-loadout-strip__list">
              <li
                v-for="item in map(draft.own.loadoutKeys, loadoutStripItem)"
                :key="item.key"
                class="kylix-loadout-strip__item"
                :style="{ '--offer-kind': item.presentation.kindColor }"
              >
                <svg class="kylix-loadout-strip__icon" :viewBox="item.iconViewBox" aria-hidden="true">
                  <path :d="item.iconPath" fill="currentColor" />
                </svg>
                <span>{{ item.presentation.name }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div v-else class="kylix-tondo-wrap">
          <div v-if="matchSeats" class="kylix-tondo" aria-label="Fight arena">
            <div class="kylix-tondo__ring" aria-hidden="true" />
            <div class="kylix-tondo__arena">
              <article
                v-for="(fighter, seatIndex) in matchSeats"
                :key="fighter.clerkUserId"
                class="kylix-seat"
                :class="seatIndex === 0 ? 'kylix-seat--west' : 'kylix-seat--east'"
              >
                <header class="kylix-seat__head">
                  <h2 class="kylix-seat__title">Seat {{ seatIndex + 1 }}</h2>
                  <p class="kylix-seat__player">{{ seatLabelForClerk(fighter.clerkUserId) }}</p>
                </header>

                <div v-if="fighter.soul" class="kylix-seat__strip" aria-label="Soul">
                  <span class="kylix-seat__strip-label">Soul</span>
                  <span class="kylix-seat__strip-value">
                    STR {{ displayNumber(fighter.soul.strength) }} · SPD
                    {{ displayNumber(fighter.soul.speed) }} · VIT
                    {{ displayNumber(fighter.soul.vitality) }}
                  </span>
                </div>
                <div v-if="fighter.weaponKey" class="kylix-seat__strip" aria-label="Weapon">
                  <span class="kylix-seat__strip-label">Weapon</span>
                  <span class="kylix-seat__strip-value">
                    {{ weaponLabel(fighter.weaponKey) }}
                    <span
                      v-if="weaponRarityLabel(fighter.weaponKey)"
                      class="kylix-seat__rarity"
                      :class="weaponRarityTagClass(fighter.weaponKey)"
                    >
                      · {{ weaponRarityLabel(fighter.weaponKey) }}
                    </span>
                  </span>
                </div>

                <div class="kylix-rim-band kylix-rim-band--life">
                  <span class="kylix-rim-band__label">Life total</span>
                  <div
                    class="kylix-rim-band__track"
                    role="progressbar"
                    :aria-label="`Seat ${seatIndex + 1} Life total`"
                    :aria-valuenow="fighter.life"
                    :aria-valuemin="0"
                    :aria-valuemax="fighterMaxLife(fighter.soul, fighter.weaponKey)"
                  >
                    <div
                      class="kylix-rim-band__fill kylix-rim-band__fill--life"
                      :style="{
                        transform: `scaleX(${lifeBarWidth(fighter.life, fighter.soul, fighter.weaponKey) / 100})`,
                      }"
                    />
                  </div>
                  <span class="kylix-rim-band__value">{{ displayNumber(fighter.life) }}</span>
                </div>
                <div class="kylix-rim-band kylix-rim-band--shield">
                  <span class="kylix-rim-band__label">Shield</span>
                  <div
                    class="kylix-rim-band__track"
                    role="progressbar"
                    :aria-label="`Seat ${seatIndex + 1} Shield`"
                    :aria-valuenow="fighter.shield"
                    :aria-valuemin="0"
                    :aria-valuemax="shieldBarMax(fighter.shield)"
                  >
                    <div
                      class="kylix-rim-band__fill kylix-rim-band__fill--shield"
                      :style="{ transform: `scaleX(${shieldBarScale(fighter.shield)})` }"
                    />
                  </div>
                  <span class="kylix-rim-band__value">{{ displayNumber(fighter.shield) }}</span>
                </div>

                <ul class="kylix-loadout">
                  <MatchLoadoutSlot
                    v-for="(slot, slotIndex) in fighter.slots"
                    :key="`${seatIndex}-${slotIndex}-${slot.itemKey}`"
                    :item-key="slot.itemKey"
                    :seats="matchSeatStates!"
                    :seat-index="seatIndex as SeatIndex"
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
            </div>
          </div>
          <div v-else class="kylix-tondo kylix-tondo--empty" aria-label="Fight arena">
            <div class="kylix-tondo__ring" aria-hidden="true" />
            <p class="kylix-tondo__fallback" role="status">
              <template v-if="playPhase === 'results'">Loading results…</template>
              <template v-else>Loading fight…</template>
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 12px 48px;
}
.page--kylix {
  max-width: none;
  padding: 0;
  min-height: 100svh;
}
.nav {
  margin-bottom: 8px;
}
.header h1 {
  margin: 0 0 4px;
  font-size: 1.6rem;
}
.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--bg) 92%, var(--border));
}
.seats {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
.seat-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.seat-label {
  font-weight: 600;
  min-width: 4.5rem;
}
.join-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.mono {
  font-family: var(--mono);
  font-size: 0.82rem;
  word-break: break-all;
}
.host-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}
.join-requests h3 {
  margin: 8px 0;
  font-size: 1rem;
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
.btn-primary,
.btn-danger,
.btn-small {
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  padding: 10px 14px;
}
.btn-danger {
  background: color-mix(in srgb, #a33 70%, var(--bg));
  color: var(--text);
  padding: 10px 14px;
}
.btn-small {
  background: color-mix(in srgb, var(--border) 55%, var(--bg));
  color: var(--text);
  padding: 6px 10px;
}
.btn-primary:disabled,
.btn-danger:disabled,
.btn-small:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.muted {
  color: var(--text);
  opacity: 0.85;
}
.tiny {
  font-size: 0.85rem;
}
.you {
  font-weight: 600;
}
.error {
  color: var(--text);
  margin: 8px 0;
}

.kylix-match {
  --kylix-ground: #070b14;
  --kylix-ice: #c5d4e8;
  --kylix-ice-bright: #e8eef7;
  --kylix-ice-secondary: #a3b4c9;
  --kylix-rim: #7a8fa6;
  --kylix-bronze: #5a6d82;
  --kylix-god: #6b4a72;
  --kylix-coral: #e85d3a;
  --kylix-life: #3d6b8a;
  --kylix-shield: #4a6080;
  --kylix-rarity-common: #9aa3ad;
  --kylix-rarity-uncommon: #72b072;
  --kylix-rarity-rare: #6a9ec8;
  --kylix-rarity-epic: #a082c8;
  --kylix-rarity-legendary: #d8924a;
  --kylix-display: 'Cinzel', Georgia, 'Times New Roman', serif;
  --kylix-ui: 'Source Sans 3', system-ui, sans-serif;
  --bg: var(--kylix-ground);
  --text: var(--kylix-ice);
  --border: var(--kylix-rim);
  --accent: var(--kylix-ice-bright);
  min-height: 100svh;
  background: var(--kylix-ground);
  color: var(--kylix-ice);
  font-family: var(--kylix-ui);
  padding: 0 12px 48px;
  box-sizing: border-box;
}
.kylix-rim-shell {
  display: flex;
  align-items: stretch;
  padding-top: 12px;
  margin-bottom: 20px;
}
.kylix-handle {
  flex: 0 0 28px;
  margin-top: 24px;
  border: 2px solid var(--kylix-bronze);
  background: color-mix(in srgb, var(--kylix-bronze) 30%, var(--kylix-ground));
}
.kylix-handle--left {
  border-radius: 0 12px 12px 0;
  border-left: none;
}
.kylix-handle--right {
  border-radius: 12px 0 0 12px;
  border-right: none;
}
.kylix-rim {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: start;
  padding: 14px 20px 18px;
  border: 2px solid var(--kylix-rim);
  border-radius: 999px 999px 24px 24px;
  background: color-mix(in srgb, var(--kylix-ground) 88%, var(--kylix-bronze));
}
.kylix-rim__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.82rem;
}
.kylix-rim__home {
  color: var(--kylix-ice);
  text-decoration: none;
}
.kylix-rim__home:hover {
  color: var(--kylix-ice-bright);
}
.kylix-rim__home:focus-visible {
  outline: 2px solid var(--kylix-ice-bright);
  outline-offset: 2px;
  border-radius: 4px;
}
.kylix-rim__crumb {
  color: var(--kylix-ice-secondary);
  font-size: 0.78rem;
}
.kylix-rim__center {
  text-align: center;
}
.kylix-rim__title {
  margin: 0;
  font-family: var(--kylix-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--kylix-ice-bright);
  text-transform: uppercase;
}
.kylix-rim__subtitle {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--kylix-ice-secondary);
}
.kylix-rim__meta {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: var(--kylix-ice-secondary);
}
.kylix-rim__actions {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}
.kylix-btn {
  border: 1px solid var(--kylix-rim);
  border-radius: 6px;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 14px;
  background: color-mix(in srgb, var(--kylix-ground) 80%, var(--kylix-bronze));
  color: var(--kylix-ice);
  transition:
    background 120ms ease,
    border-color 120ms ease;
}
.kylix-btn:focus-visible {
  outline: 2px solid var(--kylix-ice-bright);
  outline-offset: 2px;
}
.kylix-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.kylix-btn--primary {
  border-color: var(--kylix-ice);
  background: color-mix(in srgb, var(--kylix-ice) 18%, var(--kylix-ground));
  color: var(--kylix-ice-bright);
}
.kylix-btn--danger {
  border-color: var(--kylix-god);
  background: color-mix(in srgb, var(--kylix-god) 14%, var(--kylix-ground));
  color: var(--kylix-ice-bright);
}
.kylix-error {
  margin: 0 16px 12px;
  padding: 10px 14px;
  border: 1px solid var(--kylix-god);
  border-radius: 8px;
  background: color-mix(in srgb, var(--kylix-god) 10%, var(--kylix-ground));
  color: var(--kylix-ice-bright);
}
.kylix-waiting {
  text-align: center;
  margin: 0 16px 16px;
  padding: 12px 16px;
  border: 1px solid var(--kylix-rim);
  border-radius: 8px;
  font-weight: 600;
  color: var(--kylix-ice-bright);
  background: color-mix(in srgb, var(--kylix-rim) 12%, var(--kylix-ground));
}
.kylix-results {
  text-align: center;
  margin: 0 16px 20px;
  padding: 16px 20px;
  border: 2px solid var(--kylix-rim);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kylix-bronze) 15%, var(--kylix-ground));
}
.kylix-results__verdict {
  display: block;
  font-family: var(--kylix-display);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--kylix-ice-bright);
}
.kylix-results__return {
  display: block;
  margin-top: 6px;
  font-size: 0.85rem;
  opacity: 0.7;
}
.kylix-stage {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 8px;
}
.kylix-instruments {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.kylix-instrument {
  flex: 1 1 200px;
  padding: 12px 16px;
  border: 1px solid var(--kylix-rim);
  border-radius: 10px;
  background: color-mix(in srgb, var(--kylix-ground) 92%, var(--kylix-bronze));
}
.kylix-instrument--soul {
  border-color: color-mix(in srgb, var(--kylix-rim) 70%, var(--kylix-ice));
}
.kylix-instrument--spend {
  border-color: var(--kylix-ice);
}
.kylix-instrument__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.kylix-instrument__label {
  margin: 0;
  font-family: var(--kylix-display);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kylix-ice-bright);
}
.kylix-instrument__note {
  margin: 8px 0 0;
  font-size: 0.8rem;
  opacity: 0.75;
}
.kylix-gold {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--kylix-ice-bright);
}
.kylix-soul-stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
  font-size: 0.9rem;
  font-weight: 600;
}
.kylix-soul-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kylix-soul-bump {
  font-weight: 500;
  opacity: 0.75;
  font-size: 0.82rem;
}
.kylix-bump-controls {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.kylix-bump-btn {
  min-width: 1.75rem;
  padding: 2px 6px;
  border: 1px solid var(--kylix-rim);
  border-radius: 4px;
  background: var(--kylix-ground);
  color: var(--kylix-ice-bright);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.kylix-bump-btn:focus-visible {
  outline: 2px solid var(--kylix-ice-bright);
  outline-offset: 1px;
}
.kylix-bump-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.kylix-spend-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--kylix-rim);
}
.kylix-weapon-name {
  margin: 0;
  font-weight: 600;
  color: var(--kylix-ice-bright);
}
.kylix-weapon-rarity {
  margin: 4px 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.kylix-offer__tag--rarity-common {
  color: var(--kylix-rarity-common);
}
.kylix-offer__tag--rarity-uncommon {
  color: var(--kylix-rarity-uncommon);
}
.kylix-offer__tag--rarity-rare {
  color: var(--kylix-rarity-rare);
}
.kylix-offer__tag--rarity-epic {
  color: var(--kylix-rarity-epic);
}
.kylix-offer__tag--rarity-legendary {
  color: var(--kylix-rarity-legendary);
}
.kylix-frieze--weapon .kylix-offer--rarity-common {
  --offer-rarity: var(--kylix-rarity-common);
}
.kylix-frieze--weapon .kylix-offer--rarity-uncommon {
  --offer-rarity: var(--kylix-rarity-uncommon);
}
.kylix-frieze--weapon .kylix-offer--rarity-rare {
  --offer-rarity: var(--kylix-rarity-rare);
}
.kylix-frieze--weapon .kylix-offer--rarity-epic {
  --offer-rarity: var(--kylix-rarity-epic);
}
.kylix-frieze--weapon .kylix-offer--rarity-legendary {
  --offer-rarity: var(--kylix-rarity-legendary);
}
.kylix-frieze--weapon .kylix-offer[class*='kylix-offer--rarity-'] {
  border: 2px solid color-mix(in srgb, var(--offer-rarity) 72%, var(--kylix-rim));
  border-radius: 4px;
  margin: 6px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--offer-rarity) 14%, transparent);
}
.kylix-frieze--weapon .kylix-offer[class*='kylix-offer--rarity-']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--offer-rarity) 7%, var(--kylix-ground));
}
.kylix-frieze--weapon .kylix-offer[class*='kylix-offer--rarity-']:focus-visible {
  outline-color: color-mix(in srgb, var(--offer-rarity) 55%, var(--kylix-ice-bright));
  outline-offset: 1px;
}
.kylix-seat__rarity {
  font-size: 0.82em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}
.kylix-god-pool {
  margin: 0 0 16px;
  font-size: 0.82rem;
  opacity: 0.7;
  text-align: center;
}
.kylix-frieze {
  margin-bottom: 24px;
  padding: 20px 8px 24px;
  border-top: 2px solid var(--kylix-rim);
  border-bottom: 2px solid var(--kylix-rim);
  background: color-mix(in srgb, var(--kylix-bronze) 8%, var(--kylix-ground));
}
.kylix-frieze__band-title {
  margin: 0 0 16px;
  font-family: var(--kylix-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  color: var(--kylix-ice-bright);
}
.kylix-frieze__god-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--kylix-god) 45%, var(--kylix-rim));
}
.god-seal {
  display: grid;
  place-items: center;
  border: 2px solid var(--kylix-god);
  border-radius: 50%;
  font-family: var(--kylix-display);
  font-weight: 700;
  color: var(--kylix-ice-bright);
  background: color-mix(in srgb, var(--kylix-god) 25%, var(--kylix-ground));
}
.god-seal--hero {
  width: 4.25rem;
  height: 4.25rem;
  font-size: 1.85rem;
  border-width: 3px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--kylix-god) 18%, var(--kylix-ground));
}
.kylix-frieze__god-copy {
  text-align: center;
}
.kylix-frieze__god-name {
  margin: 4px 0 0;
  font-family: var(--kylix-display);
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--kylix-ice-bright);
}
.kylix-frieze__choices {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.kylix-frieze__choices > li + li {
  border-top: 1px solid color-mix(in srgb, var(--kylix-rim) 55%, transparent);
}
@media (min-width: 600px) {
  .kylix-frieze__choices {
    flex-direction: row;
    align-items: stretch;
  }
  .kylix-frieze__choices > li {
    flex: 1 1 0;
  }
  .kylix-frieze__choices > li + li {
    border-top: none;
    border-left: 1px solid color-mix(in srgb, var(--kylix-rim) 55%, transparent);
  }
}
.kylix-frieze--weapon .kylix-frieze__choices {
  gap: 6px;
}
.kylix-frieze--weapon .kylix-frieze__choices > li + li {
  border-top: none;
}
@media (min-width: 600px) {
  .kylix-frieze--weapon .kylix-frieze__choices > li + li {
    border-left: none;
  }
}
.kylix-offer {
  width: 100%;
  min-height: 5.5rem;
  text-align: left;
  border: none;
  border-radius: 0;
  padding: 14px 16px;
  background: transparent;
  color: var(--kylix-ice);
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition:
    background 140ms ease,
    transform 100ms ease;
}
.kylix-offer--frieze:hover:not(:disabled) {
  background: color-mix(in srgb, var(--offer-kind, var(--kylix-ice)) 6%, var(--kylix-ground));
}
.kylix-offer:focus-visible {
  outline: 2px solid var(--kylix-ice-bright);
  outline-offset: 2px;
}
.kylix-offer:active:not(:disabled) {
  transform: scale(0.98);
}
.kylix-offer:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.kylix-offer__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kylix-offer__icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  color: var(--offer-kind, var(--kylix-ice));
}
.kylix-offer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.kylix-offer__tag {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--kylix-ice-secondary);
  background: color-mix(in srgb, var(--kylix-rim) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--offer-kind, var(--kylix-rim)) 45%, transparent);
}
.kylix-offer__name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--kylix-ice-bright);
}
.kylix-offer__detail {
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--kylix-ice);
}
.kylix-offer__cooldown {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--kylix-ice-secondary);
}
@media (prefers-reduced-motion: reduce) {
  .kylix-offer {
    transition: none;
  }
  .kylix-offer:active:not(:disabled) {
    transform: none;
  }
}
.kylix-loadout-strip {
  margin-bottom: 24px;
}
.kylix-loadout-strip__title {
  margin: 0 0 10px;
  font-family: var(--kylix-display);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}
.kylix-loadout-strip__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.kylix-loadout-strip__list > li + li {
  border-top: 1px solid color-mix(in srgb, var(--kylix-rim) 55%, transparent);
}
.kylix-loadout-strip__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 0.85rem;
}
.kylix-loadout-strip__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  color: var(--offer-kind, var(--kylix-ice));
}
.kylix-tondo-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 8px;
}
.kylix-tondo {
  position: relative;
  padding: 24px 16px 32px;
}
.kylix-tondo--empty {
  display: grid;
  place-items: center;
  min-height: 280px;
}
.kylix-tondo__fallback {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--kylix-display);
  font-size: 1.05rem;
  letter-spacing: 0.05em;
  color: var(--kylix-ice-secondary);
}
.kylix-tondo__ring {
  position: absolute;
  inset: 0;
  border: 3px solid var(--kylix-rim);
  border-radius: 50% / 42%;
  pointer-events: none;
  box-shadow:
    inset 0 0 40px color-mix(in srgb, var(--kylix-bronze) 20%, transparent),
    0 0 0 1px color-mix(in srgb, var(--kylix-bronze) 40%, transparent);
}
.kylix-tondo__arena {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 28px 12px 12px;
}
@media (min-width: 720px) {
  .kylix-tondo__arena {
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 32px 24px 16px;
  }
}
.kylix-seat {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--kylix-rim) 60%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kylix-ground) 90%, var(--kylix-bronze));
}
.kylix-seat__head {
  margin-bottom: 10px;
}
.kylix-seat__title {
  margin: 0;
  font-family: var(--kylix-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--kylix-ice-bright);
}
.kylix-seat__player {
  margin: 2px 0 0;
  font-size: 0.82rem;
  opacity: 0.7;
}
.kylix-seat__strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 6px;
  font-size: 0.8rem;
}
.kylix-seat__strip-label {
  font-weight: 700;
  color: var(--kylix-ice-bright);
}
.kylix-seat__strip-value {
  opacity: 0.75;
}
.kylix-rim-band {
  display: grid;
  grid-template-columns: 5.5rem 1fr 2.5rem;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.82rem;
}
.kylix-rim-band__label {
  font-weight: 600;
  color: var(--kylix-ice);
}
.kylix-rim-band__track {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--kylix-rim) 35%, var(--kylix-ground));
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--kylix-rim) 50%, transparent);
}
.kylix-rim-band__fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: inherit;
}
.kylix-rim-band__fill--life {
  background: var(--kylix-life);
}
.kylix-rim-band__fill--shield {
  background: var(--kylix-shield);
}
.kylix-rim-band__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--kylix-ice-bright);
}
.kylix-loadout {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 719px) {
  .kylix-rim-shell {
    flex-direction: column;
  }
  .kylix-handle {
    display: none;
  }
  .kylix-rim {
    grid-template-columns: 1fr;
    border-radius: 16px;
    text-align: center;
  }
  .kylix-rim__nav {
    align-items: center;
  }
  .kylix-rim__actions {
    justify-content: center;
  }
}
</style>
