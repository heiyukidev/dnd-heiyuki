<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { filter, find, flatten, map, range } from 'lodash'
import type { Id } from '../../convex/_generated/dataModel'
import { hexCenterPx, hexLayoutBounds, hexPolygonPoints } from '../lib/hexLayout'

const HEX_SIZE = 18
const PAD = 14

const props = defineProps<{
  mapCols: number
  mapRows: number
  tokens: Array<{ characterId: Id<'sessionCharacters'>; name: string; col: number; row: number }>
  selectedCharacterId: Id<'sessionCharacters'> | null
  canInteract: boolean
  sessionRole?: 'dm' | 'player'
  playerRecenterCharacterId?: Id<'sessionCharacters'> | null
}>()

const emit = defineEmits<{
  hexClick: [col: number, row: number]
  tokenClick: [characterId: Id<'sessionCharacters'>]
}>()

const viewBox = computed(() => hexLayoutBounds(props.mapCols, props.mapRows, HEX_SIZE, PAD))

const cells = computed(() =>
  flatten(map(range(props.mapRows), (row) => map(range(props.mapCols), (col) => ({ col, row })))),
)

const occupiedCells = computed(() => new Set(map(props.tokens, (t) => `${t.col},${t.row}`)))

function isOccupied(col: number, row: number) {
  return occupiedCells.value.has(`${col},${row}`)
}

function hexPoints(col: number, row: number) {
  const { x, y } = hexCenterPx(col, row, HEX_SIZE)
  return hexPolygonPoints(x, y, HEX_SIZE * 0.98)
}

function tokenCenter(col: number, row: number) {
  return hexCenterPx(col, row, HEX_SIZE)
}

function onHexClick(col: number, row: number) {
  if (!props.canInteract) {
    return
  }
  emit('hexClick', col, row)
}

function onTokenClick(characterId: Id<'sessionCharacters'>, e: MouseEvent) {
  e.stopPropagation()
  if (!props.canInteract) {
    return
  }
  emit('tokenClick', characterId)
}

const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0

const stageStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: 'center center',
}))

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.06 : 0.06
  scale.value = Math.min(2.2, Math.max(0.55, scale.value + delta))
}

function isHexOrTokenTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.hex') || target.closest('.token'))
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) {
    return
  }
  if (isHexOrTokenTarget(e.target) && !e.altKey) {
    return
  }
  dragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  panStartX = panX.value
  panStartY = panY.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) {
    return
  }
  panX.value = panStartX + (e.clientX - dragStartX)
  panY.value = panStartY + (e.clientY - dragStartY)
}

function onPointerUp(e: PointerEvent) {
  dragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

const highlightedCells = computed(() => {
  const id = props.selectedCharacterId
  if (id === null) {
    return new Set<string>()
  }
  return new Set(
    map(
      filter(props.tokens, (t) => t.characterId === id),
      (t) => `${t.col},${t.row}`,
    ),
  )
})

function cellHighlightClass(col: number, row: number) {
  return highlightedCells.value.has(`${col},${row}`) ? 'hex-selected' : ''
}

function tokenShortLabel(name: string) {
  const t = name.trim()
  if (t.length <= 10) {
    return t
  }
  return `${t.slice(0, 9)}…`
}

const viewportRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

function recenterPlayerToken() {
  const id = props.playerRecenterCharacterId ?? null
  if (props.sessionRole !== 'player' || id === null) {
    return
  }
  const token = find(props.tokens, (t) => t.characterId === id)
  if (token === undefined) {
    return
  }
  const svg = svgRef.value
  const vp = viewportRef.value
  if (svg === null || vp === null) {
    return
  }
  const { x, y } = hexCenterPx(token.col, token.row, HEX_SIZE)
  for (let i = 0; i < 2; i += 1) {
    const ctm = svg.getScreenCTM()
    if (ctm === null) {
      return
    }
    const pt = new DOMPoint(x, y).matrixTransform(ctm)
    const r = vp.getBoundingClientRect()
    const dx = r.left + r.width / 2 - pt.x
    const dy = r.top + r.height / 2 - pt.y
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      break
    }
    panX.value += dx
    panY.value += dy
  }
}

function spaceRecenterBlockedByFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  if (target.closest('[role="dialog"]')) {
    return true
  }
  if (target.closest('[contenteditable="true"]')) {
    return true
  }
  if (target.closest('textarea, select')) {
    return true
  }
  const input = target.closest('input')
  if (input instanceof HTMLInputElement) {
    const t = input.type
    if (t !== 'button' && t !== 'submit' && t !== 'reset' && t !== 'checkbox' && t !== 'radio') {
      return true
    }
  }
  return Boolean(target.closest('button, a[href]'))
}

function onPlayerRecenterKeydown(e: KeyboardEvent) {
  if (e.code !== 'Space' || e.repeat) {
    return
  }
  if (spaceRecenterBlockedByFocusTarget(e.target)) {
    return
  }
  if (props.sessionRole !== 'player') {
    return
  }
  const id = props.playerRecenterCharacterId ?? null
  if (id === null) {
    return
  }
  const token = find(props.tokens, (t) => t.characterId === id)
  if (token === undefined) {
    return
  }
  e.preventDefault()
  recenterPlayerToken()
}

let removePlayerKeydown: (() => void) | null = null

function syncPlayerKeydownListener() {
  removePlayerKeydown?.()
  removePlayerKeydown = null
  if (props.sessionRole !== 'player') {
    return
  }
  window.addEventListener('keydown', onPlayerRecenterKeydown, { capture: true, passive: false })
  removePlayerKeydown = () =>
    window.removeEventListener('keydown', onPlayerRecenterKeydown, { capture: true })
}

watch(() => props.sessionRole, syncPlayerKeydownListener)

onMounted(() => {
  syncPlayerKeydownListener()
})

onUnmounted(() => {
  removePlayerKeydown?.()
})
</script>

<template>
  <div
    ref="viewportRef"
    class="viewport"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <div class="stage" :style="stageStyle">
      <svg
        ref="svgRef"
        class="hex-svg"
        xmlns="http://www.w3.org/2000/svg"
        :viewBox="`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`"
        :class="{ interactive: canInteract }"
      >
        <g class="hex-layer">
          <polygon
            v-for="cell in cells"
            :key="`${cell.col}-${cell.row}`"
            :points="hexPoints(cell.col, cell.row)"
            class="hex"
            :class="[
              cellHighlightClass(cell.col, cell.row),
              { muted: isOccupied(cell.col, cell.row) },
            ]"
            @click="onHexClick(cell.col, cell.row)"
          />
        </g>
        <g class="token-layer">
          <g v-for="t in tokens" :key="String(t.characterId)">
            <circle
              :cx="tokenCenter(t.col, t.row).x"
              :cy="tokenCenter(t.col, t.row).y"
              :r="HEX_SIZE * 0.55"
              class="token"
              :class="{ 'token-selected': selectedCharacterId === t.characterId }"
              @click="onTokenClick(t.characterId, $event)"
            />
            <title>{{ t.name }}</title>
            <text
              :x="tokenCenter(t.col, t.row).x"
              :y="tokenCenter(t.col, t.row).y + 4"
              text-anchor="middle"
              class="token-label"
              @click="onTokenClick(t.characterId, $event)"
            >
              {{ tokenShortLabel(t.name) }}
            </text>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 0;
  border: none;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 88%, var(--border));
  cursor: grab;
  touch-action: none;
}
.viewport:active {
  cursor: grabbing;
}
.stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}
.hex-svg {
  max-width: 100%;
  width: 100%;
  height: auto;
  max-height: 100%;
}
.hex-svg.interactive .hex {
  cursor: pointer;
}
.hex {
  fill: color-mix(in srgb, var(--bg) 70%, var(--border));
  stroke: color-mix(in srgb, var(--border) 70%, var(--text));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.hex:hover {
  fill: color-mix(in srgb, var(--accent) 18%, var(--bg));
}
.hex.muted {
  fill: color-mix(in srgb, var(--bg) 55%, var(--border));
}
.hex-selected {
  stroke: var(--accent);
  stroke-width: 2;
}
.token {
  fill: color-mix(in srgb, var(--accent) 35%, var(--bg));
  stroke: var(--border);
  stroke-width: 1;
  cursor: pointer;
}
.token-selected {
  stroke: var(--accent);
  stroke-width: 2;
}
.token-label {
  font-size: 9px;
  font-weight: 600;
  fill: var(--text);
  pointer-events: none;
  paint-order: stroke fill;
  stroke: color-mix(in srgb, var(--bg) 92%, transparent);
  stroke-width: 3px;
}
</style>
