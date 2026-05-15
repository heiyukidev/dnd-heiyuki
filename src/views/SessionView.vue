<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { capitalize, filter, find, includes, map, size, trim } from 'lodash'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import BattleMapBoard from '../components/BattleMapBoard.vue'
import CharacterSheetPanel from '../components/CharacterSheetPanel.vue'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'

const props = defineProps<{
  id: string
}>()

type SidebarTabId = 'map' | 'players' | 'figures' | 'join'

const TAB_DEFS: ReadonlyArray<{
  id: SidebarTabId
  label: string
  short: string
  dmOnly: boolean
}> = [
  { id: 'map', label: 'Map', short: 'M', dmOnly: true },
  { id: 'players', label: 'Players', short: 'P', dmOnly: true },
  { id: 'figures', label: 'Figures', short: 'F', dmOnly: true },
  { id: 'join', label: 'Join', short: 'J', dmOnly: true },
]

/** **Dungeon Master** leading toolbox overlay expanded (same key as legacy sidebar). */
const STORAGE_DM = 'heiyuki.sessionSidebar.open.dm'
const STORAGE_TURN_DM = 'heiyuki.sessionOverlay.turnOpen.dm'
const STORAGE_TURN_PLAYER = 'heiyuki.sessionOverlay.turnOpen.player'

const client = useConvexClient()

const rawSessionParam = computed(() => (props.id || '').trim())

function parseSessionsRouteId(raw: string): Id<'sessions'> | null {
  if (!raw || raw.length > 128) {
    return null
  }
  if (!/^[a-z0-9]+$/i.test(raw)) {
    return null
  }
  return raw as Id<'sessions'>
}

const sessionId = computed(() => parseSessionsRouteId(rawSessionParam.value))

const invalidSessionRoute = computed(() => parseSessionsRouteId(rawSessionParam.value) === null)

const { data: bundle, error: bundleError } = useConvexQuery(
  client,
  api.sessions.getMyMembership,
  () => (sessionId.value !== null ? { sessionId: sessionId.value } : 'skip'),
)

const { data: joinRequests, error: joinRequestsError } = useConvexQuery(
  client,
  api.sessions.listJoinRequests,
  () =>
    bundle.value?.membership?.role === 'dm' && sessionId.value !== null
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: players, error: playersError } = useConvexQuery(
  client,
  api.sessions.listSessionPlayersForDm,
  () =>
    bundle.value?.membership?.role === 'dm' && sessionId.value !== null
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: characters, error: charactersError } = useConvexQuery(
  client,
  api.sessions.listSessionCharactersForDm,
  () =>
    bundle.value?.membership?.role === 'dm' && sessionId.value !== null
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: battleMap, error: battleMapError } = useConvexQuery(
  client,
  api.sessions.getSessionBattleMap,
  () =>
    sessionId.value !== null && bundle.value?.membership !== undefined
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: turnOrderData, error: turnOrderQueryError } = useConvexQuery(
  client,
  api.sessions.getSessionTurnOrder,
  () =>
    sessionId.value !== null && bundle.value?.membership !== undefined
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: playerSheetPreview } = useConvexQuery(
  client,
  api.sessions.getPlayerBoundCharacterPreview,
  () =>
    bundle.value?.membership?.role === 'player' && sessionId.value !== null
      ? { sessionId: sessionId.value }
      : 'skip',
)

const { data: classOptions } = useConvexQuery(client, api.sessions.listCharacterClassOptions, () =>
  sessionId.value !== null ? {} : 'skip',
)

const joinRequestsList = computed(() => joinRequests.value ?? [])
const playersList = computed(() => players.value ?? [])
const charactersList = computed(() => characters.value ?? [])
const classOptionsList = computed(() => classOptions.value ?? [])

const sidebarTabs = computed(() =>
  filter(TAB_DEFS, (t) => !t.dmOnly || bundle.value?.membership?.role === 'dm'),
)

const joinRequestsLoading = computed(
  () => joinRequests.value === undefined && !joinRequestsError.value,
)

const approveError = ref<string | null>(null)
const rosterError = ref<string | null>(null)
const mapError = ref<string | null>(null)
const figuresPanelError = ref<string | null>(null)
const newFigureName = ref('')
const newFigureIsNpc = ref(false)

const footprintCols = ref(8)
const footprintRows = ref(6)
const selectedMapCharacterId = ref<Id<'sessionCharacters'> | null>(null)

const dmToolboxOpen = ref(true)
const turnRailOpen = ref(true)
const sheetPanelOpen = ref(false)
const activeTab = ref<SidebarTabId>('map')
const turnOrderDragFrom = ref<number | null>(null)
const turnOrderActionError = ref<string | null>(null)

const canEditBattleMap = computed(
  () => bundle.value?.membership?.role === 'dm' && bundle.value?.session?.status === 'live',
)

const canEditSessionRoster = computed(
  () => bundle.value?.membership?.role === 'dm' && bundle.value?.session?.status === 'live',
)

watch(
  () => bundle.value?.membership?.role,
  (role) => {
    if (typeof localStorage === 'undefined') {
      return
    }
    if (role === 'dm') {
      const dmStored = localStorage.getItem(STORAGE_DM)
      dmToolboxOpen.value = dmStored === null ? true : dmStored === '1'
      const turnDm = localStorage.getItem(STORAGE_TURN_DM)
      turnRailOpen.value = turnDm === null ? true : turnDm === '1'
      return
    }
    if (role === 'player') {
      const turnPl = localStorage.getItem(STORAGE_TURN_PLAYER)
      turnRailOpen.value = turnPl === null ? true : turnPl === '1'
    }
  },
  { immediate: true },
)

watch(
  sidebarTabs,
  (tabs) => {
    const ids = map(tabs, (t) => t.id)
    if (!includes(ids, activeTab.value)) {
      activeTab.value = 'map'
    }
  },
  { immediate: true },
)

watch(
  () => battleMap.value,
  (m) => {
    if (m) {
      footprintCols.value = m.mapCols
      footprintRows.value = m.mapRows
    }
  },
  { immediate: true },
)

/** Placed + unplaced counts from the battle map query (DM has unplaced list; total distinguishes “no figures” from “all placed”). */
const battleMapFigureCounts = computed(() => {
  const m = battleMap.value
  if (m === undefined || m === null || m.unplaced === null) {
    return null
  }
  const placed = size(m.tokens)
  const unplaced = size(m.unplaced)
  return { placed, unplaced, total: placed + unplaced }
})

const sessionStatusLabel = computed(() =>
  bundle.value?.session?.status !== undefined ? capitalize(bundle.value.session.status) : '',
)

const sessionArchivedHint = computed(() => bundle.value?.session?.status !== 'live')

const turnOrderEntries = computed(() => turnOrderData.value?.entries ?? [])

const isDm = computed(() => bundle.value?.membership?.role === 'dm')

const sheetCharacterId = ref<Id<'sessionCharacters'> | null>(null)
const sheetSaveError = ref<string | null>(null)

const sheetCharacterIdSelect = computed({
  get: () => (sheetCharacterId.value !== null ? String(sheetCharacterId.value) : ''),
  set: (v: string) => {
    sheetCharacterId.value = v === '' ? null : (v as Id<'sessionCharacters'>)
  },
})

watch(
  () => [sheetPanelOpen.value, isDm.value, charactersList.value, playerSheetPreview.value] as const,
  () => {
    if (!sheetPanelOpen.value) {
      return
    }
    sheetSaveError.value = null
    if (isDm.value) {
      const ids = map(charactersList.value, (c) => c._id)
      if (sheetCharacterId.value === null || !includes(ids, sheetCharacterId.value)) {
        sheetCharacterId.value = ids[0] ?? null
      }
      return
    }
    const prev = playerSheetPreview.value
    if (prev?.kind === 'bound') {
      sheetCharacterId.value = prev.characterId
    } else {
      sheetCharacterId.value = null
    }
  },
  { immediate: true },
)

function openCharacterSheetPanel() {
  sheetSaveError.value = null
  sheetPanelOpen.value = true
}

function openCharacterSheetFor(id: Id<'sessionCharacters'>) {
  sheetCharacterId.value = id
  sheetSaveError.value = null
  sheetPanelOpen.value = true
}

const playerRecenterCharacterId = computed(() => {
  const p = playerSheetPreview.value
  if (p === undefined || p === null || p.kind !== 'bound') {
    return null
  }
  return p.characterId
})

function persistDmToolbox() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_DM, dmToolboxOpen.value ? '1' : '0')
  }
}

function persistTurnRail() {
  const role = bundle.value?.membership?.role
  if (role !== 'dm' && role !== 'player') {
    return
  }
  if (typeof localStorage === 'undefined') {
    return
  }
  const key = role === 'dm' ? STORAGE_TURN_DM : STORAGE_TURN_PLAYER
  localStorage.setItem(key, turnRailOpen.value ? '1' : '0')
}

function openDmToolbox() {
  dmToolboxOpen.value = true
  persistDmToolbox()
}

function openTurnRail() {
  turnRailOpen.value = true
  persistTurnRail()
}

function toggleDmToolbox() {
  dmToolboxOpen.value = !dmToolboxOpen.value
  persistDmToolbox()
}

function closeDmToolboxOnBackdrop() {
  dmToolboxOpen.value = false
  persistDmToolbox()
}

function toggleTurnRail() {
  turnRailOpen.value = !turnRailOpen.value
  persistTurnRail()
}

function selectTab(tab: SidebarTabId) {
  activeTab.value = tab
  if (!dmToolboxOpen.value) {
    dmToolboxOpen.value = true
    persistDmToolbox()
  }
}

const joinToken = computed(() => {
  const s = bundle.value?.session
  if (!s || !('joinToken' in s)) {
    return undefined
  }
  return (s as { joinToken?: string }).joinToken
})

function joinHref(token: string) {
  return `${window.location.origin}/join/${token}`
}

async function approve(requestId: Id<'joinRequests'>) {
  approveError.value = null
  try {
    await client.mutation(api.sessions.approveJoinRequest, { requestId })
  } catch {
    approveError.value = 'Could not approve request. Try again.'
  }
}

async function rejectRequest(requestId: Id<'joinRequests'>) {
  approveError.value = null
  try {
    await client.mutation(api.sessions.rejectJoinRequest, { requestId })
  } catch {
    approveError.value = 'Could not reject request. Try again.'
  }
}

const nicknameDraft = ref<Record<string, string>>({})
const characterPick = ref<Record<string, string>>({})
const figureClassPick = ref<Record<string, string>>({})

watch(
  () => playersList.value,
  (list) => {
    nicknameDraft.value = Object.fromEntries(
      map(list, (p) => [p.clerkUserId, p.sessionNickname ?? '']),
    )
    characterPick.value = Object.fromEntries(
      map(list, (p) => [p.clerkUserId, p.boundCharacterId ?? '']),
    )
  },
  { immediate: true },
)

watch(
  () => charactersList.value,
  (list) => {
    figureClassPick.value = Object.fromEntries(
      map(list, (c) => [String(c._id), c.characterClassKey ?? '']),
    )
  },
  { immediate: true },
)

function displayPlayerLabel(clerkUserId: string) {
  const row = find(playersList.value, (x) => x.clerkUserId === clerkUserId)
  const nick = row?.sessionNickname?.trim()
  if (nick) {
    return nick
  }
  return clerkUserId
}

function characterOptionLabel(
  c: {
    _id: Id<'sessionCharacters'>
    name: string
    isNpc: boolean
    boundClerkUserId?: string
    characterClassKey?: 'test'
  },
  playerClerkUserId: string,
) {
  let s = `${c.name}${c.isNpc ? ' (NPC)' : ''}`
  if (c.characterClassKey === 'test') {
    s += ' · Test class'
  }
  if (c.boundClerkUserId !== undefined && c.boundClerkUserId !== playerClerkUserId) {
    s += ' — bound elsewhere'
  }
  return s
}

async function saveNickname(clerkUserId: string) {
  if (sessionId.value === null) {
    return
  }
  rosterError.value = null
  const raw = nicknameDraft.value[clerkUserId] ?? ''
  const trimmed = raw.trim()
  try {
    await client.mutation(api.sessions.setPlayerSessionNickname, {
      sessionId: sessionId.value,
      playerClerkUserId: clerkUserId,
      sessionNickname: trimmed === '' ? null : trimmed,
    })
  } catch {
    rosterError.value = 'Could not save nickname.'
  }
}

async function applyBattleFootprint() {
  if (sessionId.value === null || !canEditBattleMap.value) {
    return
  }
  mapError.value = null
  try {
    await client.mutation(api.sessions.setBattleMapFootprint, {
      sessionId: sessionId.value,
      mapCols: footprintCols.value,
      mapRows: footprintRows.value,
    })
  } catch {
    mapError.value = 'Could not update map size.'
  }
}

function selectMapCharacter(id: Id<'sessionCharacters'>) {
  selectedMapCharacterId.value = id
}

function onTurnRowClickSelect(characterId: Id<'sessionCharacters'>) {
  if (!canEditBattleMap.value) {
    return
  }
  selectMapCharacter(characterId)
}

function onTurnDragStart(index: number, e: DragEvent) {
  if (!canEditBattleMap.value) {
    return
  }
  turnOrderDragFrom.value = index
  e.dataTransfer?.setData('text/plain', String(index))
}

function onTurnDragOver(e: DragEvent) {
  if (!canEditBattleMap.value) {
    return
  }
  e.preventDefault()
}

async function onTurnDrop(toIndex: number, e: DragEvent) {
  e.preventDefault()
  if (!canEditBattleMap.value || sessionId.value === null) {
    return
  }
  const fromStr = e.dataTransfer?.getData('text/plain') ?? ''
  const fromParsed = Number.parseInt(fromStr, 10)
  const from = Number.isFinite(fromParsed) ? fromParsed : turnOrderDragFrom.value
  turnOrderDragFrom.value = null
  if (from === null || from === undefined || Number.isNaN(from)) {
    return
  }
  if (from === toIndex) {
    return
  }
  const ids = map(turnOrderEntries.value, (row) => row.characterId)
  if (from < 0 || from >= ids.length || toIndex < 0 || toIndex >= ids.length) {
    return
  }
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(toIndex, 0, moved)
  turnOrderActionError.value = null
  try {
    await client.mutation(api.sessions.setSessionTurnOrder, {
      sessionId: sessionId.value,
      characterIds: next,
    })
  } catch {
    turnOrderActionError.value = 'Could not reorder turn order.'
  }
}

async function appendCharacterToTurnOrder(characterId: Id<'sessionCharacters'>) {
  if (sessionId.value === null || !canEditSessionRoster.value) {
    return
  }
  const ids = map(turnOrderEntries.value, (row) => row.characterId)
  if (includes(ids, characterId)) {
    return
  }
  turnOrderActionError.value = null
  try {
    await client.mutation(api.sessions.setSessionTurnOrder, {
      sessionId: sessionId.value,
      characterIds: [...ids, characterId],
    })
  } catch {
    turnOrderActionError.value = 'Could not add to turn order.'
  }
}

async function removeCharacterFromTurnOrder(characterId: Id<'sessionCharacters'>) {
  if (sessionId.value === null || !canEditSessionRoster.value) {
    return
  }
  const ids = filter(
    map(turnOrderEntries.value, (row) => row.characterId),
    (id) => id !== characterId,
  )
  turnOrderActionError.value = null
  try {
    await client.mutation(api.sessions.setSessionTurnOrder, {
      sessionId: sessionId.value,
      characterIds: ids,
    })
  } catch {
    turnOrderActionError.value = 'Could not update turn order.'
  }
}

async function onBattleHexClick(col: number, row: number) {
  if (
    sessionId.value === null ||
    selectedMapCharacterId.value === null ||
    !canEditBattleMap.value
  ) {
    return
  }
  mapError.value = null
  try {
    await client.mutation(api.sessions.setSessionCharacterMapPlacement, {
      sessionId: sessionId.value,
      characterId: selectedMapCharacterId.value,
      placement: { kind: 'hex', col, row },
    })
  } catch {
    mapError.value = 'Could not place there (occupied or invalid).'
  }
}

async function unplaceSelectedMapCharacter() {
  if (
    sessionId.value === null ||
    selectedMapCharacterId.value === null ||
    !canEditBattleMap.value
  ) {
    return
  }
  mapError.value = null
  try {
    await client.mutation(api.sessions.setSessionCharacterMapPlacement, {
      sessionId: sessionId.value,
      characterId: selectedMapCharacterId.value,
      placement: { kind: 'clear' },
    })
    selectedMapCharacterId.value = null
  } catch {
    mapError.value = 'Could not remove from map.'
  }
}

async function applyCharacter(clerkUserId: string) {
  if (sessionId.value === null) {
    return
  }
  rosterError.value = null
  const pick = characterPick.value[clerkUserId] ?? ''
  try {
    await client.mutation(api.sessions.assignPlayerCharacter, {
      sessionId: sessionId.value,
      playerClerkUserId: clerkUserId,
      characterId: pick === '' ? null : (pick as Id<'sessionCharacters'>),
    })
  } catch {
    rosterError.value = 'Could not update character assignment.'
  }
}

async function addSessionFigure() {
  if (sessionId.value === null || !canEditSessionRoster.value) {
    return
  }
  const name = trim(newFigureName.value)
  if (name.length === 0) {
    figuresPanelError.value = 'Enter a figure name.'
    return
  }
  figuresPanelError.value = null
  try {
    await client.mutation(api.sessions.createSessionCharacter, {
      sessionId: sessionId.value,
      name,
      isNpc: newFigureIsNpc.value,
    })
    newFigureName.value = ''
    newFigureIsNpc.value = false
  } catch {
    figuresPanelError.value = 'Could not add figure.'
  }
}

async function removeSessionFigure(characterId: Id<'sessionCharacters'>) {
  if (sessionId.value === null || !canEditSessionRoster.value) {
    return
  }
  figuresPanelError.value = null
  try {
    await client.mutation(api.sessions.removeSessionCharacter, {
      sessionId: sessionId.value,
      characterId,
    })
    if (selectedMapCharacterId.value === characterId) {
      selectedMapCharacterId.value = null
    }
  } catch {
    figuresPanelError.value = 'Could not remove figure.'
  }
}

async function saveFigureClass(characterId: Id<'sessionCharacters'>) {
  if (sessionId.value === null || !canEditSessionRoster.value) {
    return
  }
  rosterError.value = null
  const raw = figureClassPick.value[String(characterId)] ?? ''
  let characterClassKey: 'test' | null
  if (raw === '') {
    characterClassKey = null
  } else {
    const matched = find(classOptionsList.value, (opt) => opt.key === raw)
    if (matched === undefined) {
      rosterError.value = 'That character class is not available.'
      return
    }
    characterClassKey = matched.key as 'test'
  }
  try {
    await client.mutation(api.sessions.setSessionCharacterClassKey, {
      sessionId: sessionId.value,
      characterId,
      characterClassKey,
    })
  } catch {
    rosterError.value = 'Could not save figure class.'
  }
}
</script>

<template>
  <div class="session-root">
    <p v-if="invalidSessionRoute" class="muted session-fallback">
      This session link is not valid. Check the URL or open the session from your home page.
    </p>
    <p v-else-if="bundleError" class="error session-fallback">
      Could not load this session. {{ bundleError.message }}
    </p>
    <p v-else-if="bundle === undefined" class="muted session-fallback">Loading…</p>
    <p v-else-if="!bundle.session" class="muted session-fallback">
      You do not have access to this session, or it does not exist.
    </p>
    <template v-else>
      <div class="session-shell">
        <header class="session-topbar">
          <div class="session-topbar-lead">
            <span class="session-title">{{ bundle.session.title }}</span>
            <span class="session-topbar-meta">
              <span class="status-soft">{{ sessionStatusLabel }}</span>
              <span v-if="sessionArchivedHint" class="read-only-soft">Read-only table</span>
            </span>
          </div>
          <div class="session-topbar-trail">
            <button
              v-if="bundle.membership?.role === 'player'"
              type="button"
              class="sheet-entry-btn"
              @click="openCharacterSheetPanel"
            >
              Character sheet
            </button>
            <button
              v-else-if="isDm"
              type="button"
              class="sheet-entry-btn"
              @click="openCharacterSheetPanel"
            >
              Character sheet
            </button>
            <RouterLink class="home-link" to="/">Home</RouterLink>
          </div>
        </header>

        <div class="session-body">
          <div class="session-map-shell">
            <div
              v-if="isDm && dmToolboxOpen"
              class="session-dm-backdrop"
              aria-hidden="true"
              @click="closeDmToolboxOnBackdrop"
            />
            <div class="session-map-fill">
              <div class="session-stage">
                <p v-if="battleMapError" class="stage-message error">
                  Could not load battle map. {{ battleMapError.message }}
                </p>
                <p v-else-if="battleMap === undefined" class="stage-message muted">
                  Loading battle map…
                </p>
                <BattleMapBoard
                  v-else-if="battleMap"
                  :map-cols="battleMap.mapCols"
                  :map-rows="battleMap.mapRows"
                  :tokens="battleMap.tokens"
                  :selected-character-id="selectedMapCharacterId"
                  :can-interact="canEditBattleMap"
                  :session-role="bundle.membership?.role"
                  :player-recenter-character-id="playerRecenterCharacterId"
                  class="stage-map"
                  @hex-click="onBattleHexClick"
                  @token-click="selectMapCharacter"
                />
              </div>
              <p v-if="battleMap" class="battle-map-legend muted tiny" role="note">
                <span class="battle-map-legend__label">Battle map</span>
                <span class="battle-map-legend__sep" aria-hidden="true">·</span>
                <span
                  ><kbd class="kbd-hint">Alt</kbd>/<kbd class="kbd-hint">⌥</kbd> + drag to pan</span
                >
                <template v-if="!isDm">
                  <span class="battle-map-legend__sep" aria-hidden="true">·</span>
                  <span
                    ><kbd class="kbd-hint">Space</kbd> to center on your character when placed</span
                  >
                </template>
              </p>
            </div>

            <div v-if="isDm" class="session-float session-float--leading">
              <button
                v-if="!dmToolboxOpen"
                type="button"
                class="float-handle float-handle--leading"
                aria-label="Open Dungeon Master tools"
                @click="openDmToolbox()"
              >
                ⟩
              </button>
              <div v-else class="float-panel float-panel--leading">
                <div class="float-panel-head">
                  <button
                    type="button"
                    class="float-collapse"
                    aria-label="Close tools"
                    @click="toggleDmToolbox()"
                  >
                    ⟨
                  </button>
                  <span class="float-panel-title">Dungeon Master tools</span>
                </div>
                <div class="float-tab-strip" role="tablist">
                  <button
                    v-for="t in sidebarTabs"
                    :key="t.id"
                    type="button"
                    role="tab"
                    :aria-selected="activeTab === t.id"
                    class="float-tab-btn"
                    :class="{ 'float-tab-btn--active': activeTab === t.id }"
                    @click="selectTab(t.id)"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <div class="float-panel-body thin-scroll">
                  <div v-show="activeTab === 'map'" class="sidebar-section">
                    <h3 class="panel-heading">Map size (hexes)</h3>
                    <p class="muted tiny">
                      Trailing columns and bottom rows are added or removed; origin stays fixed.
                    </p>
                    <div class="field-row">
                      <label class="field">
                        <span class="field-label">Columns</span>
                        <input
                          v-model.number="footprintCols"
                          type="number"
                          min="1"
                          max="24"
                          class="input input-narrow"
                          :disabled="!canEditBattleMap"
                        />
                      </label>
                      <label class="field">
                        <span class="field-label">Rows</span>
                        <input
                          v-model.number="footprintRows"
                          type="number"
                          min="1"
                          max="24"
                          class="input input-narrow"
                          :disabled="!canEditBattleMap"
                        />
                      </label>
                      <button
                        type="button"
                        class="btn-small"
                        :disabled="!canEditBattleMap"
                        @click="applyBattleFootprint"
                      >
                        Apply size
                      </button>
                    </div>
                    <h3 class="panel-heading spaced">Unplaced figures</h3>
                    <p v-if="!canEditBattleMap" class="muted tiny">
                      Read-only while session is not live.
                    </p>
                    <p v-else-if="battleMap === undefined" class="muted tiny">
                      Loading battle map…
                    </p>
                    <p
                      v-else-if="battleMapFigureCounts && battleMapFigureCounts.total === 0"
                      class="muted tiny"
                    >
                      No session figures yet. Add party or NPC figures in the Figures tab, then pick
                      one here and click a hex.
                    </p>
                    <p v-else-if="battleMapFigureCounts?.unplaced === 0" class="muted tiny">
                      Everyone is on the map.
                    </p>
                    <ul v-else-if="battleMap" class="unplaced-list">
                      <li v-for="u in battleMap.unplaced" :key="String(u.characterId)">
                        <button
                          type="button"
                          class="linkish"
                          :class="{ active: selectedMapCharacterId === u.characterId }"
                          :disabled="!canEditBattleMap"
                          @click="selectMapCharacter(u.characterId)"
                        >
                          {{ u.name }}{{ u.isNpc ? ' (NPC)' : '' }}
                        </button>
                      </li>
                    </ul>
                    <p class="muted tiny">
                      Select a figure, then click a hex to place or move. Drag the map background to
                      pan; wheel to zoom.
                    </p>
                    <div class="field-row">
                      <button
                        type="button"
                        class="btn-small"
                        :disabled="!canEditBattleMap || selectedMapCharacterId === null"
                        @click="unplaceSelectedMapCharacter"
                      >
                        Remove selected from map
                      </button>
                      <button
                        type="button"
                        class="btn-small"
                        :disabled="!canEditBattleMap"
                        @click="selectedMapCharacterId = null"
                      >
                        Clear selection
                      </button>
                    </div>
                    <p v-if="mapError" class="error">{{ mapError }}</p>
                  </div>
                  <div
                    v-show="bundle.membership?.role === 'dm' && activeTab === 'players'"
                    class="sidebar-section"
                  >
                    <h3 class="panel-heading">Players in session</h3>
                    <p v-if="playersError" class="error">
                      Could not load players. {{ playersError.message }}
                    </p>
                    <p v-else-if="charactersError" class="error">
                      Could not load characters. {{ charactersError.message }}
                    </p>
                    <p v-else-if="players === undefined || characters === undefined" class="muted">
                      Loading…
                    </p>
                    <p v-else-if="!playersList.length" class="muted">
                      No players yet. Approve join requests in the Join tab.
                    </p>
                    <ul v-else class="roster">
                      <li v-for="p in playersList" :key="p.memberId" class="roster-row">
                        <div class="roster-main">
                          <div class="label">
                            <strong>{{ displayPlayerLabel(p.clerkUserId) }}</strong>
                            <span class="mono sub">{{ p.clerkUserId }}</span>
                          </div>
                          <div class="field-row">
                            <label class="field">
                              <span class="field-label">Session nickname</span>
                              <input
                                v-model="nicknameDraft[p.clerkUserId]"
                                type="text"
                                maxlength="48"
                                class="input"
                                placeholder="Table name (optional)"
                                :disabled="!canEditSessionRoster"
                              />
                            </label>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="saveNickname(p.clerkUserId)"
                            >
                              Save name
                            </button>
                          </div>
                          <div class="field-row">
                            <label class="field grow">
                              <span class="field-label">Session character</span>
                              <select
                                v-model="characterPick[p.clerkUserId]"
                                class="select"
                                :disabled="!canEditSessionRoster"
                              >
                                <option value="">Unassigned</option>
                                <option v-for="c in charactersList" :key="c._id" :value="c._id">
                                  {{ characterOptionLabel(c, p.clerkUserId) }}
                                </option>
                              </select>
                            </label>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="applyCharacter(p.clerkUserId)"
                            >
                              Apply
                            </button>
                          </div>
                          <p v-if="p.characterName" class="muted tiny">
                            Assigned sheet: {{ p.characterName }}
                          </p>
                        </div>
                      </li>
                    </ul>
                    <p v-if="rosterError" class="error">{{ rosterError }}</p>
                  </div>
                  <div
                    v-show="bundle.membership?.role === 'dm' && activeTab === 'figures'"
                    class="sidebar-section"
                  >
                    <h3 class="panel-heading">Session figures</h3>
                    <p v-if="charactersError" class="error">
                      Could not load figures. {{ charactersError.message }}
                    </p>
                    <template v-else>
                      <div class="figure-add-card">
                        <p class="muted tiny">Create a party member or NPC for this session.</p>
                        <div class="field-row field-row--wrap">
                          <label class="field grow">
                            <span class="field-label">Name</span>
                            <input
                              v-model="newFigureName"
                              type="text"
                              maxlength="64"
                              class="input"
                              placeholder="Figure name"
                              :disabled="!canEditSessionRoster || characters === undefined"
                            />
                          </label>
                          <label class="field field--checkbox">
                            <input
                              v-model="newFigureIsNpc"
                              type="checkbox"
                              :disabled="!canEditSessionRoster || characters === undefined"
                            />
                            <span class="field-label">NPC</span>
                          </label>
                          <button
                            type="button"
                            class="btn-small"
                            :disabled="
                              !canEditSessionRoster ||
                              characters === undefined ||
                              trim(newFigureName).length === 0
                            "
                            @click="addSessionFigure"
                          >
                            Add figure
                          </button>
                        </div>
                      </div>
                      <p v-if="characters === undefined" class="muted">Loading…</p>
                      <p v-else-if="!charactersList.length" class="muted">
                        No figures in this session yet. Add one above, then place them on the Map
                        tab.
                      </p>
                      <ul v-else class="figure-list">
                        <li v-for="c in charactersList" :key="c._id" class="figure-row">
                          <div class="figure-info">
                            <strong>{{ c.name }}</strong
                            >{{ c.isNpc ? ' (NPC)' : '' }}
                            <span v-if="c.characterClassKey === 'test'" class="muted tiny">
                              · Test class</span
                            >
                          </div>
                          <div class="field-row">
                            <label class="field grow">
                              <span class="field-label">Character class</span>
                              <select
                                v-model="figureClassPick[String(c._id)]"
                                class="select"
                                :disabled="!canEditSessionRoster"
                              >
                                <option value="">None</option>
                                <option
                                  v-for="opt in classOptionsList"
                                  :key="opt.key"
                                  :value="opt.key"
                                >
                                  {{ opt.label }}
                                </option>
                              </select>
                            </label>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="saveFigureClass(c._id)"
                            >
                              Apply class
                            </button>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="openCharacterSheetFor(c._id)"
                            >
                              Sheet
                            </button>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="removeSessionFigure(c._id)"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              class="btn-small"
                              :disabled="!canEditSessionRoster"
                              @click="appendCharacterToTurnOrder(c._id)"
                            >
                              Turn order
                            </button>
                          </div>
                        </li>
                      </ul>
                      <p v-if="figuresPanelError" class="error">{{ figuresPanelError }}</p>
                    </template>
                  </div>
                  <div
                    v-show="bundle.membership?.role === 'dm' && activeTab === 'join'"
                    class="sidebar-section"
                  >
                    <template v-if="joinToken">
                      <h3 class="panel-heading">Join link</h3>
                      <p class="mono join-url">{{ joinHref(joinToken) }}</p>
                    </template>
                    <h3 class="panel-heading spaced">Pending join requests</h3>
                    <p v-if="joinRequestsError" class="error">
                      Could not load join requests. {{ joinRequestsError.message }}
                    </p>
                    <p v-else-if="joinRequestsLoading" class="muted">Loading…</p>
                    <p v-else-if="joinRequests && !joinRequestsList.length" class="muted">
                      No pending requests.
                    </p>
                    <ul v-else-if="joinRequestsList.length" class="list">
                      <li v-for="req in joinRequestsList" :key="req._id">
                        <span class="mono">{{ req.clerkUserId }}</span>
                        <button
                          type="button"
                          class="btn-small btn-approve"
                          :disabled="!canEditSessionRoster"
                          @click="approve(req._id)"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          class="btn-small"
                          :disabled="!canEditSessionRoster"
                          @click="rejectRequest(req._id)"
                        >
                          Reject
                        </button>
                      </li>
                    </ul>
                    <p v-if="approveError" class="error">{{ approveError }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="session-float session-float--trailing">
              <button
                v-if="!turnRailOpen"
                type="button"
                class="float-handle float-handle--trailing"
                aria-label="Open turn order"
                @click="openTurnRail()"
              >
                ⟨
              </button>
              <div v-else class="float-panel float-panel--trailing">
                <div class="float-panel-head float-panel-head--trailing">
                  <h3 class="panel-heading turn-heading">Turn order</h3>
                  <button
                    type="button"
                    class="float-collapse"
                    aria-label="Collapse turn order"
                    @click="toggleTurnRail()"
                  >
                    ⟩
                  </button>
                </div>
                <div class="float-panel-body thin-scroll">
                  <p v-if="turnOrderQueryError" class="error">
                    Could not load turn order. {{ turnOrderQueryError.message }}
                  </p>
                  <p v-else-if="turnOrderData === undefined" class="muted">Loading turn order…</p>
                  <p v-else-if="!turnOrderEntries.length" class="muted tiny">
                    No figures in turn order yet. Dungeon Master: use <strong>Figures</strong> and
                    <strong>Turn order</strong> on each row to add entries, then drag the grip to
                    reorder.
                  </p>
                  <ul v-else class="turn-order-list">
                    <li
                      v-for="(entry, idx) in turnOrderEntries"
                      :key="String(entry.characterId)"
                      class="turn-order-row"
                      @dragover="onTurnDragOver"
                      @drop="onTurnDrop(idx, $event)"
                    >
                      <span
                        v-if="canEditBattleMap"
                        class="turn-grip"
                        draggable="true"
                        aria-label="Drag to reorder"
                        @dragstart="onTurnDragStart(idx, $event)"
                        >⋮⋮</span
                      >
                      <button
                        v-if="canEditBattleMap"
                        type="button"
                        class="turn-name-btn"
                        :class="{ active: selectedMapCharacterId === entry.characterId }"
                        @click="onTurnRowClickSelect(entry.characterId)"
                      >
                        {{ entry.name }}{{ entry.isNpc ? ' (NPC)' : '' }}
                      </button>
                      <span v-else class="turn-name-readonly">
                        {{ entry.name }}{{ entry.isNpc ? ' (NPC)' : '' }}
                      </span>
                      <button
                        v-if="canEditSessionRoster"
                        type="button"
                        class="btn-small turn-remove"
                        :disabled="!canEditSessionRoster"
                        @click="removeCharacterFromTurnOrder(entry.characterId)"
                      >
                        ×
                      </button>
                    </li>
                  </ul>
                  <p v-if="turnOrderActionError" class="error">{{ turnOrderActionError }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="sheetPanelOpen"
          class="sheet-modal-backdrop"
          @click.self="sheetPanelOpen = false"
        >
          <div
            class="sheet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-modal-title"
            @click.stop
          >
            <div class="sheet-modal-header">
              <h2 id="sheet-modal-title" class="sheet-modal-title">Character sheet</h2>
              <div v-if="isDm && charactersList.length" class="sheet-modal-pick">
                <label class="sheet-pick-label muted tiny" for="sheet-character-select"
                  >Figure</label
                >
                <select
                  id="sheet-character-select"
                  v-model="sheetCharacterIdSelect"
                  class="select sheet-character-select"
                >
                  <option v-for="c in charactersList" :key="c._id" :value="String(c._id)">
                    {{ c.name }}{{ c.isNpc ? ' (NPC)' : '' }}
                  </option>
                </select>
              </div>
              <button type="button" class="sheet-modal-close" @click="sheetPanelOpen = false">
                Close
              </button>
            </div>
            <div class="sheet-modal-body">
              <p v-if="sheetSaveError" class="error tiny">{{ sheetSaveError }}</p>
              <template v-if="bundle.membership?.role === 'player'">
                <template v-if="playerSheetPreview === undefined">
                  <p class="muted">Loading…</p>
                </template>
                <template v-else-if="playerSheetPreview?.kind === 'unbound'">
                  <p class="muted">
                    You are not bound to a session character yet. The Dungeon Master can assign one
                    from the Players tab.
                  </p>
                </template>
                <CharacterSheetPanel
                  v-else-if="sessionId && sheetCharacterId"
                  :session-id="sessionId"
                  :character-id="sheetCharacterId"
                  @save-error="sheetSaveError = $event"
                />
              </template>
              <template v-else-if="isDm">
                <p v-if="characters === undefined" class="muted">Loading figures…</p>
                <p v-else-if="!charactersList.length" class="muted">
                  No session figures yet. Add figures in Dungeon Master tools (Figures tab), then
                  open this sheet again.
                </p>
                <CharacterSheetPanel
                  v-else-if="sessionId && sheetCharacterId"
                  :session-id="sessionId"
                  :character-id="sheetCharacterId"
                  @save-error="sheetSaveError = $event"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.session-root {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.session-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.session-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 97%, var(--border));
}
.session-topbar-lead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  min-width: 0;
}
.session-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(560px, 70vw);
}
.session-topbar-meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
}
.status-soft {
  color: var(--text);
  opacity: 0.65;
}
.read-only-soft {
  color: var(--text);
  opacity: 0.72;
}
.home-link {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--accent);
  text-decoration: none;
  opacity: 0.9;
}
.home-link:hover {
  text-decoration: underline;
}
.session-topbar-trail {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.sheet-entry-btn {
  font: inherit;
  font-size: 0.8rem;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--accent);
  cursor: pointer;
}
.sheet-entry-btn:hover {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg));
}
.session-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}
.session-map-shell {
  flex: 1;
  min-height: 0;
  position: relative;
}
.session-dm-backdrop {
  position: absolute;
  inset: 0;
  z-index: 15;
  background: color-mix(in srgb, var(--bg) 55%, #000 45%);
  opacity: 0.35;
  pointer-events: auto;
}
.session-map-fill {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 1;
}
.session-float {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  pointer-events: none;
}
.session-float > * {
  pointer-events: auto;
}
.session-float--leading {
  left: 0;
}
.session-float--trailing {
  right: 0;
  flex-direction: row-reverse;
}
.float-handle {
  width: 36px;
  min-width: 36px;
  border: none;
  border-radius: 0 10px 10px 0;
  background: color-mix(in srgb, var(--bg) 92%, var(--border));
  color: var(--text);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 2px 0 10px color-mix(in srgb, #000 12%, transparent);
}
.float-handle--trailing {
  border-radius: 10px 0 0 10px;
  box-shadow: -2px 0 10px color-mix(in srgb, #000 12%, transparent);
}
.float-panel {
  width: min(300px, calc(100vw - 48px));
  max-width: 300px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: color-mix(in srgb, var(--bg) 94%, var(--border));
  border: 1px solid var(--border);
  border-left: none;
  box-shadow: 4px 0 18px color-mix(in srgb, #000 14%, transparent);
}
.float-panel--trailing {
  border-left: 1px solid var(--border);
  border-right: none;
  box-shadow: -4px 0 18px color-mix(in srgb, #000 14%, transparent);
}
.float-panel-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.float-panel-head--trailing {
  justify-content: space-between;
}
.turn-heading {
  margin: 0;
  flex: 1;
}
.float-panel-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-h);
}
.float-collapse {
  width: 32px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.float-tab-strip {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 97%, var(--border));
}
.float-tab-btn {
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  color: var(--text);
  cursor: pointer;
}
.float-tab-btn:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.float-tab-btn--active {
  border-color: var(--border);
  background: color-mix(in srgb, var(--bg) 88%, var(--accent));
}
.float-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}
.turn-order-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.turn-order-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--border);
}
.turn-grip {
  cursor: grab;
  user-select: none;
  opacity: 0.55;
  font-size: 0.75rem;
  padding: 2px;
}
.turn-name-btn {
  flex: 1;
  text-align: left;
  font: inherit;
  background: none;
  border: none;
  padding: 2px 0;
  color: var(--accent);
  cursor: pointer;
}
.turn-name-btn.active {
  font-weight: 600;
  text-decoration: underline;
}
.turn-name-readonly {
  flex: 1;
  font-size: 0.86rem;
}
.turn-remove {
  padding: 2px 8px;
  min-width: 0;
}
.sheet-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, #000 45%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px 16px;
}
.sheet-modal {
  width: min(960px, 100%);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: 0 12px 40px color-mix(in srgb, #000 25%, transparent);
}
.sheet-modal-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.sheet-modal-pick {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 160px;
  max-width: 320px;
}
.sheet-character-select {
  width: 100%;
}
.sheet-modal-title {
  margin: 0;
  font-size: 1rem;
  flex-shrink: 0;
}
.sheet-modal-close {
  font: inherit;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 4px 10px;
  flex-shrink: 0;
}
.sheet-modal-body {
  padding: 14px 16px 18px;
  font-size: 0.92rem;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.sidebar-section .panel-heading {
  font-size: 0.9rem;
  margin: 0 0 8px;
  color: var(--text-h);
}
.panel-heading.spaced {
  margin-top: 14px;
}
.placeholder-copy {
  font-size: 0.82rem;
  line-height: 1.35;
}
.thin-scroll {
  scrollbar-width: thin;
}
.session-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--bg);
}
.stage-message {
  padding: 12px 14px;
  margin: 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.86rem;
}
.stage-map {
  flex: 1;
  min-height: 0;
}
.battle-map-legend {
  flex-shrink: 0;
  margin: 0;
  padding: 6px 12px 8px;
  text-align: center;
  line-height: 1.45;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 94%, var(--border));
}
.battle-map-legend__label {
  font-weight: 600;
  color: var(--text);
  opacity: 0.72;
}
.battle-map-legend__sep {
  margin: 0 0.35em;
  opacity: 0.45;
}
.kbd-hint {
  display: inline-block;
  padding: 0.08em 0.38em;
  margin: 0 0.05em;
  font: inherit;
  font-size: 0.88em;
  font-weight: 600;
  line-height: 1.2;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, var(--text));
  background: color-mix(in srgb, var(--bg) 88%, var(--border));
  color: var(--text);
  box-shadow: 0 1px 0 color-mix(in srgb, #000 6%, transparent);
}
.session-fallback {
  padding: 16px 20px;
}
.unplaced-list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
}
.unplaced-list li {
  margin-bottom: 6px;
}
.linkish {
  font: inherit;
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  cursor: pointer;
  text-align: left;
}
.linkish:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.linkish.active {
  text-decoration: underline;
  font-weight: 600;
}
.input-narrow {
  width: 5rem;
}
.muted {
  color: var(--text);
  opacity: 0.85;
}
.error {
  color: var(--text);
  font-size: 0.92rem;
}
.mono {
  font-family: var(--mono);
  font-size: 0.85rem;
  word-break: break-all;
}
.join-url {
  margin: 0 0 14px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg) 94%, var(--border));
}
.sub {
  display: block;
  opacity: 0.75;
  font-size: 0.78rem;
  margin-top: 2px;
}
.tiny {
  font-size: 0.82rem;
  margin-top: 6px;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.roster {
  list-style: none;
  padding: 0;
  margin: 0;
}
.roster-row {
  border-top: 1px solid var(--border);
  padding: 14px 0;
}
.roster-row:first-child {
  border-top: none;
  padding-top: 4px;
}
.roster-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.field-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}
.field.grow {
  flex: 1 1 220px;
}
.field-label {
  font-size: 0.78rem;
  opacity: 0.85;
}
.input,
.select {
  font: inherit;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}
.select {
  width: 100%;
}
.btn-small {
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 6px 10px;
  font: inherit;
  cursor: pointer;
}
.btn-small:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}
.btn-approve {
  border-color: color-mix(in srgb, var(--border) 60%, var(--accent));
}
.figure-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.figure-row {
  border-top: 1px solid var(--border);
  padding: 14px 0;
}
.figure-row:first-child {
  border-top: none;
  padding-top: 4px;
}
.figure-info {
  margin-bottom: 8px;
}
</style>
