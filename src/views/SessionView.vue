<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { find, get, includes, map } from 'lodash'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'
import { ITEM_CATALOG } from '../match/itemCatalog'
import type { ItemKey } from '../match/itemCatalog'

const props = defineProps<{
  id: string
}>()

const client = useConvexClient()
const sessionId = computed(() => props.id as Id<'sessions'>)

const actionError = ref<string | null>(null)
const actionBusy = ref(false)
const nowMs = ref(Date.now())
const flashKeys = ref<string[]>([])
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
const matchSeats = computed(() => match.value?.seats ?? null)
const lastUpdate = computed(() => match.value?.lastUpdate ?? null)
const outcome = computed(() => match.value?.outcome ?? null)

const joinHref = computed(() => {
  const token = session.value?.joinToken
  if (!token) {
    return null
  }
  return `${window.location.origin}/join/${token}`
})

function itemName(itemKey: string): string {
  return get(ITEM_CATALOG, [itemKey as ItemKey, 'name'], itemKey)
}

function itemEffect(itemKey: string): string {
  return get(ITEM_CATALOG, [itemKey as ItemKey, 'effect'], '')
}

function cooldownFill(nextReadyAt: number, cooldownMs: number): number {
  if (cooldownMs <= 0) {
    return 1
  }
  const remaining = Math.max(0, nextReadyAt - nowMs.value)
  return Math.max(0, Math.min(1, 1 - remaining / cooldownMs))
}

function slotCooldownMs(itemKey: string): number {
  return get(ITEM_CATALOG, [itemKey as ItemKey, 'cooldownMs'], 2000)
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
    flashKeys.value = map(hints, (h) => `${h.seat}-${h.slotIndex}-${lastUpdate.value?.atMs}`)
    if (flashTimer !== null) {
      clearTimeout(flashTimer)
    }
    flashTimer = setTimeout(() => {
      flashKeys.value = []
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
              <button type="button" class="btn-small" :disabled="actionBusy" @click="onReject(req._id)">
                Reject
              </button>
            </li>
          </ul>
          <p v-if="fightingPlayers.length >= 2" class="muted tiny">Session full (2/2).</p>
        </div>
      </section>

      <section v-else class="match-panel">
        <div v-if="resultsBanner" class="results-banner" role="status">
          {{ resultsBanner }}
          <span class="muted tiny"> · Returning to Lobby…</span>
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
              <div class="bar-row">
                <span>Life total</span>
                <div class="bar-track">
                  <div
                    class="bar-fill life"
                    :style="{ width: `${Math.max(0, Math.min(100, fighter.life))}%` }"
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
              <li
                v-for="(slot, slotIndex) in fighter.slots"
                :key="`${seatIndex}-${slotIndex}-${slot.itemKey}`"
                class="slot"
                :class="{
                  flash: includes(flashKeys, `${seatIndex}-${slotIndex}-${lastUpdate?.atMs}`),
                }"
              >
                <div class="slot-meta">
                  <strong>{{ itemName(slot.itemKey) }}</strong>
                  <span class="muted tiny">{{ itemEffect(slot.itemKey) }}</span>
                </div>
                <div class="cooldown-track" aria-hidden="true">
                  <div
                    class="cooldown-fill"
                    :style="{
                      width: `${
                        cooldownFill(slot.nextReadyAt, slotCooldownMs(slot.itemKey)) * 100
                      }%`,
                    }"
                  />
                </div>
              </li>
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
  margin-bottom: 16px;
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
.bar-track,
.cooldown-track {
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 60%, var(--bg));
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 120ms linear;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.slot {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--bg) 80%, var(--border));
  transition:
    border-color 120ms ease,
    background 120ms ease;
}
.slot.flash {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 28%, var(--bg));
}
.slot-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.cooldown-fill {
  height: 100%;
  background: var(--accent);
  transition: width 80ms linear;
}
</style>
