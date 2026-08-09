<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { find, map } from 'lodash'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import MatchLoadoutSlot from '../components/MatchLoadoutSlot.vue'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'
import { ITEM_CATALOG } from '../match/itemCatalog'
import { maxLifeForSeat } from '../match/weapon'
import { WEAPON_CATALOG } from '../match/weaponCatalog'
import type { SoulStats } from '../match/types'
import {
  getDraftOfferPresentation,
  getLoadoutSlotPresentation,
  LOADOUT_EFFECT_KIND_COLORS,
} from '../match/loadoutSlotPresentation'

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

watch(
  () => lastUpdate.value?.atMs,
  () => {
    const hints = lastUpdate.value?.animationHints ?? []
    if (hints.length === 0) {
      return
    }
    flashSlots.value = map(hints, (h) => ({
      key: `${h.seat}-${h.slotIndex}-${lastUpdate.value?.atMs}`,
      kindColor: LOADOUT_EFFECT_KIND_COLORS[h.kind],
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

function weaponLabel(weaponKey: string | null | undefined): string | null {
  if (weaponKey === null || weaponKey === undefined) {
    return null
  }
  const weaponDef = WEAPON_CATALOG[weaponKey]
  if (weaponDef === undefined) {
    return weaponKey
  }
  return `${weaponDef.name} (${weaponDef.weaponType})`
}

function weaponNudgeSummary(weaponKey: string): string {
  const weaponDef = WEAPON_CATALOG[weaponKey]
  if (weaponDef?.nudges === undefined) {
    return ''
  }
  const parts: string[] = []
  const { damagePotencyPercent, cooldownPercent, lifeBonus } = weaponDef.nudges
  if (damagePotencyPercent !== undefined) {
    const pct = Math.round(damagePotencyPercent * 100)
    parts.push(`${pct > 0 ? '+' : ''}${pct}% damage`)
  }
  if (cooldownPercent !== undefined) {
    const pct = Math.round(cooldownPercent * 100)
    parts.push(`${pct > 0 ? '+' : ''}${pct}% CD`)
  }
  if (lifeBonus !== undefined) {
    parts.push(`+${lifeBonus} Life`)
  }
  return parts.join(' · ')
}
</script>

<template>
  <div class="page">
    <p class="nav">
      <RouterLink to="/">← Home</RouterLink>
    </p>

    <p v-if="playStateError" class="error">Could not load Session. {{ playStateError.message }}</p>
    <p v-else-if="playState === undefined" class="muted">Loading Session…</p>
    <p v-else-if="playState === null" class="muted">You are not a Player in this Session.</p>

    <template v-else-if="session">
      <header class="header">
        <h1>{{ session.title }}</h1>
        <p class="muted">
          <span v-if="archived">Archived session</span>
          <span v-else-if="playPhase === 'lobby'">Lobby</span>
          <span v-else-if="playPhase === 'weapon'">Weapon pick</span>
          <span v-else-if="playPhase === 'draft'">Draft</span>
          <span v-else-if="playPhase === 'match'">Match</span>
          <span v-else>Results</span>
          · {{ fightingPlayers.length }}/2 Players
          <span v-if="isHost"> · Host</span>
        </p>
      </header>

      <p v-if="actionError" class="error">{{ actionError }}</p>

      <section v-if="playPhase === 'lobby'" class="panel">
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

      <section v-else-if="playPhase === 'weapon'" class="match-panel">
        <div class="draft-head">
          <h2>Choose your Weapon</h2>
          <button
            v-if="playState.canCancelMatch"
            type="button"
            class="btn-danger"
            :disabled="actionBusy"
            @click="onCancelMatch"
          >
            Cancel Match
          </button>
        </div>

        <p v-if="weapon?.own?.waitingForOpponent" class="waiting-banner" role="status">
          Waiting for opponent to choose a Weapon…
        </p>

        <template v-if="weapon?.own">
          <aside v-if="weapon.own.soul" class="soul-panel" aria-label="Your Soul">
            <h3>Soul</h3>
            <ul class="soul-stats">
              <li>Strength {{ weapon.own.soul.strength }}</li>
              <li>Speed {{ weapon.own.soul.speed }}</li>
              <li>Vitality {{ weapon.own.soul.vitality }}</li>
            </ul>
            <p v-if="weapon.own.favorLine" class="soul-favor muted tiny">
              {{ weapon.own.favorLine }}
            </p>
          </aside>

          <div v-if="weapon.own.chosenWeaponKey" class="weapon-panel" aria-label="Your Weapon">
            <h3>Weapon</h3>
            <p class="weapon-name">{{ weaponLabel(weapon.own.chosenWeaponKey) }}</p>
            <p v-if="weapon.own.weaponFavorLine" class="soul-favor muted tiny">
              {{ weapon.own.weaponFavorLine }}
            </p>
            <p v-if="weaponNudgeSummary(weapon.own.chosenWeaponKey)" class="muted tiny">
              {{ weaponNudgeSummary(weapon.own.chosenWeaponKey) }}
            </p>
          </div>

          <div v-else-if="weapon.own.weaponOffers.length > 0" class="draft-offer">
            <h3>Pick 1 Weapon</h3>
            <ul class="offer-choices">
              <li v-for="offerKey in weapon.own.weaponOffers" :key="offerKey">
                <button
                  type="button"
                  class="offer-btn"
                  :disabled="actionBusy"
                  @click="onPickWeapon(offerKey)"
                >
                  <span class="offer-name">{{ weaponLabel(offerKey) }}</span>
                  <span v-if="weaponNudgeSummary(offerKey)" class="offer-effect muted tiny">
                    {{ weaponNudgeSummary(offerKey) }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </section>

      <section v-else-if="playPhase === 'draft'" class="match-panel">
        <div class="draft-head">
          <h2>Draft</h2>
          <button
            v-if="playState.canCancelMatch"
            type="button"
            class="btn-danger"
            :disabled="actionBusy"
            @click="onCancelMatch"
          >
            Cancel Match
          </button>
        </div>

        <p v-if="draft?.own?.waitingReason" class="waiting-banner" role="status">
          <template v-if="draft.own.waitingReason === 'opponent_draft'">
            Waiting for opponent to finish Draft…
          </template>
          <template v-else>Waiting for opponent to confirm Soul spend…</template>
        </p>

        <template v-if="draft?.own">
          <aside v-if="draft.own.soul" class="soul-panel" aria-label="Your Soul">
            <h3>Soul</h3>
            <ul class="soul-stats">
              <li class="soul-stat-row">
                <span>Strength {{ draft.own.soul.strength }}</span>
                <span
                  v-if="draft.own.isPicksComplete && !draft.own.isSpendReady"
                  class="soul-bump-controls"
                >
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.soulBumps.strength <= 0"
                    aria-label="Decrease Strength"
                    @click="onAdjustSoulBump('strength', -1)"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.goldRemaining <= 0"
                    aria-label="Increase Strength"
                    @click="onAdjustSoulBump('strength', 1)"
                  >
                    +
                  </button>
                </span>
              </li>
              <li class="soul-stat-row">
                <span>Speed {{ draft.own.soul.speed }}</span>
                <span
                  v-if="draft.own.isPicksComplete && !draft.own.isSpendReady"
                  class="soul-bump-controls"
                >
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.soulBumps.speed <= 0"
                    aria-label="Decrease Speed"
                    @click="onAdjustSoulBump('speed', -1)"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.goldRemaining <= 0"
                    aria-label="Increase Speed"
                    @click="onAdjustSoulBump('speed', 1)"
                  >
                    +
                  </button>
                </span>
              </li>
              <li class="soul-stat-row">
                <span>Vitality {{ draft.own.soul.vitality }}</span>
                <span
                  v-if="draft.own.isPicksComplete && !draft.own.isSpendReady"
                  class="soul-bump-controls"
                >
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.soulBumps.vitality <= 0"
                    aria-label="Decrease Vitality"
                    @click="onAdjustSoulBump('vitality', -1)"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    class="bump-btn"
                    :disabled="actionBusy || draft.own.goldRemaining <= 0"
                    aria-label="Increase Vitality"
                    @click="onAdjustSoulBump('vitality', 1)"
                  >
                    +
                  </button>
                </span>
              </li>
            </ul>
            <p
              v-if="draft.own.isPicksComplete && !draft.own.isSpendReady"
              class="gold-remaining muted tiny"
            >
              Gold remaining: {{ draft.own.goldRemaining }}
            </p>
            <p v-if="draft.own.favorLine" class="soul-favor muted tiny">
              {{ draft.own.favorLine }}
            </p>
          </aside>

          <aside v-if="draft.own.weaponKey" class="weapon-panel" aria-label="Your Weapon">
            <h3>Weapon</h3>
            <p class="weapon-name">{{ weaponLabel(draft.own.weaponKey) }}</p>
            <p v-if="draft.own.weaponFavorLine" class="soul-favor muted tiny">
              {{ draft.own.weaponFavorLine }}
            </p>
            <p v-if="weaponNudgeSummary(draft.own.weaponKey)" class="muted tiny">
              {{ weaponNudgeSummary(draft.own.weaponKey) }}
            </p>
          </aside>

          <p v-if="!draft.own.isPicksComplete" class="muted tiny">
            Pick {{ draft.own.picksMade }}/{{ draft.picksTotal }}
            <span v-if="draft.own.godPool.length > 0">
              · God pool: {{ draft.own.godPool.join(', ') }}
            </span>
          </p>

          <div
            v-if="draft.own.isPicksComplete && !draft.own.isSpendReady"
            class="soul-spend-actions"
          >
            <p class="muted tiny">Spend Gold on Soul stats, then confirm. Leftover Gold is lost.</p>
            <button
              type="button"
              class="btn-primary"
              :disabled="actionBusy"
              @click="onConfirmSoulSpend"
            >
              Confirm Soul spend
            </button>
          </div>

          <p v-else-if="draft.own.isSpendReady" class="muted tiny" role="status">
            Soul spend confirmed — waiting for fight start.
          </p>

          <div v-if="draftOfferPresentation && !draft.own.isPicksComplete" class="draft-offer">
            <h3>{{ draftOfferPresentation.godLabel }} offers</h3>
            <ul class="offer-choices">
              <li v-for="choice in draftOfferPresentation.choices" :key="choice.key">
                <button
                  type="button"
                  class="offer-btn"
                  :disabled="actionBusy"
                  @click="onPickBoon(choice.key)"
                >
                  <span class="offer-name">{{ choice.name }}</span>
                  <span v-if="choice.effectSentence" class="offer-effect muted tiny">
                    {{ choice.effectSentence }}
                  </span>
                  <span v-else-if="choice.passiveSentence" class="offer-effect muted tiny">
                    {{ choice.passiveSentence }}
                  </span>
                  <span v-if="choice.cooldownLine" class="offer-cooldown muted tiny">
                    {{ choice.cooldownLine }}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="draft.own.loadoutKeys.length > 0" class="draft-loadout">
            <h3>Your loadout</h3>
            <ul class="draft-loadout-list">
              <li v-for="key in draft.own.loadoutKeys" :key="key">
                {{ getLoadoutSlotPresentation(key, ITEM_CATALOG).name }}
              </li>
            </ul>
          </div>
        </template>
      </section>

      <section v-else class="match-panel">
        <div class="draft-head">
          <div v-if="resultsBanner" class="results-banner" role="status">
            {{ resultsBanner }}
            <span class="muted tiny"> · Returning to Lobby…</span>
          </div>
          <button
            v-if="playState.canCancelMatch && playPhase === 'match'"
            type="button"
            class="btn-danger"
            :disabled="actionBusy"
            @click="onCancelMatch"
          >
            Cancel Match
          </button>
        </div>

        <div v-if="matchSeats" class="fighters">
          <article
            v-for="(fighter, seatIndex) in matchSeats"
            :key="fighter.clerkUserId"
            class="fighter"
          >
            <header class="fighter-head">
              <h2>Seat {{ seatIndex + 1 }}</h2>
              <p class="muted">{{ seatLabelForClerk(fighter.clerkUserId) }}</p>
            </header>

            <div class="bars">
              <div v-if="fighter.soul" class="soul-strip" aria-label="Soul">
                <span class="soul-strip-label">Soul</span>
                <span class="soul-strip-stats muted tiny">
                  STR {{ fighter.soul.strength }} · SPD {{ fighter.soul.speed }} · VIT
                  {{ fighter.soul.vitality }}
                </span>
              </div>
              <div v-if="fighter.weaponKey" class="weapon-strip" aria-label="Weapon">
                <span class="weapon-strip-label">Weapon</span>
                <span class="weapon-strip-name muted tiny">{{
                  weaponLabel(fighter.weaponKey)
                }}</span>
              </div>
              <div class="bar-row">
                <span>Life total</span>
                <div class="bar-track">
                  <div
                    class="bar-fill life"
                    :style="{
                      width: `${lifeBarWidth(fighter.life, fighter.soul, fighter.weaponKey)}%`,
                    }"
                  />
                </div>
                <span class="bar-value">{{ fighter.life }}</span>
              </div>
              <div class="bar-row">
                <span>Shield</span>
                <div class="bar-track">
                  <div
                    class="bar-fill shield"
                    :style="{ width: `${Math.min(100, fighter.shield)}%` }"
                  />
                </div>
                <span class="bar-value">{{ fighter.shield }}</span>
              </div>
            </div>

            <ul class="loadout">
              <MatchLoadoutSlot
                v-for="(slot, slotIndex) in fighter.slots"
                :key="`${seatIndex}-${slotIndex}-${slot.itemKey}`"
                :item-key="slot.itemKey"
                :seats="matchSeats"
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
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 12px 48px;
}
.nav {
  margin-bottom: 8px;
}
.header h1 {
  margin: 0 0 4px;
  font-size: 1.6rem;
}
.panel,
.match-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--bg) 92%, var(--border));
}
.draft-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.draft-head h2 {
  margin: 0;
}
.waiting-banner {
  text-align: center;
  padding: 10px 12px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 18%, var(--bg));
  font-weight: 600;
}
.draft-offer {
  margin-bottom: 18px;
}
.soul-panel {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  background: color-mix(in srgb, var(--accent) 8%, var(--bg));
}
.soul-panel h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}
.soul-stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  font-weight: 600;
}
.soul-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.soul-bump-controls {
  display: flex;
  gap: 0.25rem;
}
.bump-btn {
  min-width: 1.75rem;
  padding: 0.1rem 0.35rem;
  font-size: 0.85rem;
  line-height: 1.2;
}
.soul-spend-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.soul-favor {
  margin: 8px 0 0;
}
.weapon-panel {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, var(--accent));
  background: color-mix(in srgb, var(--bg) 96%, var(--border));
}
.weapon-panel h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}
.weapon-name {
  margin: 0;
  font-weight: 600;
}
.weapon-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
  font-size: 0.85rem;
}
.weapon-strip-label {
  font-weight: 700;
}
.soul-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
  font-size: 0.85rem;
}
.soul-strip-label {
  font-weight: 700;
}
.draft-offer h3,
.draft-loadout h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}
.offer-choices {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.offer-btn {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--bg) 85%, var(--border));
  color: var(--text);
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.offer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.offer-name {
  font-weight: 700;
}
.draft-loadout-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.draft-loadout-list li {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 0.9rem;
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
.results-banner {
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
  padding: 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 22%, var(--bg));
}
.fighters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 720px) {
  .fighters {
    grid-template-columns: 1fr 1fr;
  }
}
.fighter {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.fighter-head h2 {
  margin: 0;
  font-size: 1.15rem;
}
.bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.bar-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr 2.5rem;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
}
.bar-track {
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 60%, var(--bg));
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: inherit;
}
.bar-fill.life {
  background: color-mix(in srgb, #3a8f5a 80%, var(--accent));
}
.bar-fill.shield {
  background: color-mix(in srgb, #4a7bbd 80%, var(--accent));
}
.bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.loadout {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
</style>
