<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { displayNumber } from '../lib/displayNumber'
import { ITEM_CATALOG } from '../match/itemCatalog'
import {
  getEffectIconPath,
  EFFECT_ICON_VIEWBOX,
  PASSIVE_ICON_PATH,
  PASSIVE_ICON_VIEWBOX,
} from '../match/effectIcons'
import { getLoadoutSlotPresentationForMatch } from '../match/loadoutSlotPresentation'
import type { MatchSeatState, SeatIndex, SoulStats } from '../match/types'

const props = defineProps<{
  itemKey: string
  seats: [MatchSeatState, MatchSeatState]
  seatIndex: SeatIndex
  slotIndex: number
  souls?: [SoulStats, SoulStats]
  weaponKeys?: [string, string]
  nextReadyAt?: number
  nowMs: number
  isFlashing: boolean
  flashColor: string | null
}>()

const slotRoot = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const openedByTap = ref(false)
const isPointerOver = ref(false)
const suppressHoverUntilLeave = ref(false)

const presentation = computed(() =>
  getLoadoutSlotPresentationForMatch({
    itemKey: props.itemKey,
    catalog: ITEM_CATALOG,
    seats: props.seats,
    seat: props.seatIndex,
    slotIndex: props.slotIndex,
    souls: props.souls,
    weaponKeys: props.weaponKeys,
  }),
)

const isPassiveFace = computed(() => presentation.value.faceKind === 'passive')
const iconPath = computed(() =>
  isPassiveFace.value
    ? PASSIVE_ICON_PATH
    : getEffectIconPath(presentation.value.effect ?? 'damage'),
)
const iconViewBox = computed(() =>
  isPassiveFace.value ? PASSIVE_ICON_VIEWBOX : EFFECT_ICON_VIEWBOX,
)

const cooldownFillWidth = computed(() => {
  if (!presentation.value.showCooldownBar || props.nextReadyAt === undefined) {
    return 0
  }
  const ms = presentation.value.effectiveCooldownMs ?? 0
  if (ms <= 0) {
    return 100
  }
  const remaining = Math.max(0, props.nextReadyAt - props.nowMs)
  const fill = Math.max(0, Math.min(1, 1 - remaining / ms))
  return fill * 100
})

const showFlash = computed(
  () => !isPassiveFace.value && props.isFlashing && props.flashColor !== null,
)

const flashStyle = computed(() => {
  if (!showFlash.value) {
    return undefined
  }
  return { '--flash-color': props.flashColor ?? undefined }
})

const slotLabel = computed(() => {
  if (isPassiveFace.value) {
    return `${presentation.value.name}, ${presentation.value.passiveCue ?? ''}`
  }
  return `${presentation.value.name}, ${presentation.value.effectSentence ?? ''}`
})

function showPopover() {
  isOpen.value = true
}

function dismissPopover(options?: { suppressHoverIfPointerOver?: boolean }) {
  openedByTap.value = false
  isOpen.value = false
  if (options?.suppressHoverIfPointerOver && isPointerOver.value) {
    suppressHoverUntilLeave.value = true
  }
}

function onMouseEnter() {
  isPointerOver.value = true
  if (!suppressHoverUntilLeave.value) {
    showPopover()
  }
}

function onMouseLeave() {
  isPointerOver.value = false
  suppressHoverUntilLeave.value = false
  if (!openedByTap.value) {
    isOpen.value = false
  }
}

function onFocus() {
  suppressHoverUntilLeave.value = false
  showPopover()
}

function onBlur(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement | null
  const relatedTarget = event.relatedTarget as Node | null
  if (currentTarget !== null && relatedTarget !== null && currentTarget.contains(relatedTarget)) {
    return
  }
  dismissPopover({ suppressHoverIfPointerOver: isPointerOver.value })
}

function onSlotClick(event: MouseEvent) {
  event.stopPropagation()
  if (openedByTap.value) {
    dismissPopover({ suppressHoverIfPointerOver: isPointerOver.value })
    return
  }
  openedByTap.value = true
  isOpen.value = true
}

function onDocumentClick(event: MouseEvent) {
  if (!openedByTap.value) {
    return
  }
  const root = slotRoot.value
  if (root !== null && event.target instanceof Node && root.contains(event.target)) {
    return
  }
  dismissPopover({ suppressHoverIfPointerOver: isPointerOver.value })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (openedByTap.value) {
      dismissPopover({ suppressHoverIfPointerOver: isPointerOver.value })
    } else {
      openedByTap.value = true
      isOpen.value = true
    }
  }
  if (event.key === 'Escape' && isOpen.value) {
    dismissPopover({ suppressHoverIfPointerOver: isPointerOver.value })
  }
}

watch(openedByTap, (locked) => {
  if (locked) {
    document.addEventListener('click', onDocumentClick, true)
  } else {
    document.removeEventListener('click', onDocumentClick, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<template>
  <li
    ref="slotRoot"
    class="loadout-slot"
    :class="{
      'loadout-slot--flash': showFlash,
      'loadout-slot--passive': isPassiveFace,
      'loadout-slot--open': isOpen,
    }"
    :style="flashStyle"
    tabindex="0"
    role="button"
    :aria-label="slotLabel"
    :aria-expanded="isOpen"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focus="onFocus"
    @blur="onBlur"
    @click="onSlotClick"
    @keydown="onKeydown"
  >
    <span class="loadout-slot__index" aria-hidden="true">{{ slotIndex + 1 }}</span>
    <div class="loadout-slot__face">
      <div
        class="loadout-slot__kind"
        :class="{ 'loadout-slot__kind--passive': isPassiveFace }"
        :style="{ color: presentation.kindColor }"
      >
        <svg class="loadout-slot__icon" :viewBox="iconViewBox" aria-hidden="true">
          <path :d="iconPath" fill="currentColor" />
        </svg>
        <span v-if="isPassiveFace" class="loadout-slot__cue">{{ presentation.passiveCue }}</span>
        <span v-else class="loadout-slot__potency">{{
          presentation.potency !== undefined ? displayNumber(presentation.potency) : ''
        }}</span>
      </div>
    </div>
    <div v-if="presentation.showCooldownBar" class="loadout-slot__cooldown" aria-hidden="true">
      <div
        class="loadout-slot__cooldown-fill"
        :style="{ transform: `scaleX(${cooldownFillWidth / 100})` }"
      />
    </div>
    <div v-if="isOpen" class="loadout-slot__popover" role="tooltip">
      <p class="loadout-slot__popover-title">{{ presentation.name }}</p>
      <template v-if="isPassiveFace">
        <p class="loadout-slot__popover-text">{{ presentation.passiveSentence }}</p>
      </template>
      <template v-else>
        <p class="loadout-slot__popover-text">{{ presentation.effectSentence }}</p>
        <p v-if="presentation.passiveSentence" class="loadout-slot__popover-text loadout-slot__popover-text--dim">
          {{ presentation.passiveSentence }}
        </p>
        <p class="loadout-slot__popover-text loadout-slot__popover-text--dim">
          {{ presentation.cooldownLine }}
        </p>
      </template>
    </div>
  </li>
</template>

<style scoped>
.loadout-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--border-strong);
  background: var(--panel-lift);
  transition:
    border-color 120ms ease,
    background 120ms ease,
    box-shadow 120ms ease;
  cursor: default;
  outline: none;
}

.loadout-slot:focus-visible {
  border-color: var(--phosphor);
  outline: 2px solid var(--phosphor);
  outline-offset: 1px;
}

.loadout-slot--flash {
  border-color: var(--flash-color, var(--coral));
  background: color-mix(in srgb, var(--flash-color, var(--coral)) 28%, var(--panel));
  box-shadow: 0 0 12px color-mix(in srgb, var(--flash-color, var(--coral)) 40%, transparent);
}

.loadout-slot--passive {
  background: color-mix(in srgb, var(--panel-lift) 85%, var(--phosphor) 8%);
}

.loadout-slot--open {
  z-index: 2;
}

.loadout-slot__index {
  position: absolute;
  top: 2px;
  left: 4px;
  font-family: var(--display);
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ice-dim);
  opacity: 0.7;
}

.loadout-slot__face {
  padding-top: 4px;
}

.loadout-slot--passive .loadout-slot__face {
  padding-top: 2px;
}

.loadout-slot__kind {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--ice);
}

.loadout-slot__kind--passive {
  flex-direction: column;
  align-items: center;
}

.loadout-slot__icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

.loadout-slot__potency {
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.loadout-slot__cue {
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.loadout-slot__cooldown {
  height: 4px;
  background: color-mix(in srgb, var(--phosphor) 12%, var(--panel));
  overflow: hidden;
}

.loadout-slot__cooldown-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: var(--phosphor);
  transition: transform 80ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .loadout-slot__cooldown-fill,
  .loadout-slot {
    transition: none;
  }
}

.loadout-slot__popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  padding: 8px 10px;
  border: 1px solid var(--border-strong);
  background: var(--panel);
  color: var(--ice-dim);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ground) 60%, transparent);
  pointer-events: none;
}

.loadout-slot__popover-title {
  margin: 0 0 4px;
  font-family: var(--display);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ice);
}

.loadout-slot__popover-text {
  margin: 0;
  font-size: 0.78rem;
}

.loadout-slot__popover-text--dim {
  margin-top: 4px;
  opacity: 0.85;
}
</style>
