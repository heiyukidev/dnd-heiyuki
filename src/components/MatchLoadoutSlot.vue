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
    class="slot"
    :class="{
      flash: showFlash,
      passive: isPassiveFace,
      'popover-open': isOpen,
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
    <div class="slot-face">
      <div
        class="slot-kind"
        :class="{ 'passive-kind': isPassiveFace }"
        :style="{ color: presentation.kindColor }"
      >
        <svg class="effect-icon" :viewBox="iconViewBox" aria-hidden="true">
          <path :d="iconPath" fill="currentColor" />
        </svg>
        <span v-if="isPassiveFace" class="passive-cue">{{ presentation.passiveCue }}</span>
        <span v-else class="potency">{{
          presentation.potency !== undefined ? displayNumber(presentation.potency) : ''
        }}</span>
      </div>
    </div>
    <div v-if="presentation.showCooldownBar" class="cooldown-track" aria-hidden="true">
      <div class="cooldown-fill" :style="{ transform: `scaleX(${cooldownFillWidth / 100})` }" />
    </div>
    <div v-if="isOpen" class="slot-popover" role="tooltip">
      <p class="popover-title">{{ presentation.name }}</p>
      <template v-if="isPassiveFace">
        <p class="popover-effect">{{ presentation.passiveSentence }}</p>
      </template>
      <template v-else>
        <p class="popover-effect">{{ presentation.effectSentence }}</p>
        <p v-if="presentation.passiveSentence" class="popover-passive">
          {{ presentation.passiveSentence }}
        </p>
        <p class="popover-cooldown">{{ presentation.cooldownLine }}</p>
      </template>
    </div>
  </li>
</template>

<style scoped>
.slot {
  position: relative;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--kylix-rim, var(--border)) 50%, transparent);
  background: color-mix(
    in srgb,
    var(--kylix-ground, var(--bg)) 85%,
    var(--kylix-bronze, var(--border))
  );
  transition:
    border-color 120ms ease,
    background 120ms ease,
    box-shadow 120ms ease;
  cursor: default;
  outline: none;
}
.slot:focus-visible {
  border-color: color-mix(in srgb, var(--kylix-ice-bright, var(--text)) 50%, var(--border));
  outline: 2px solid var(--kylix-ice-bright, var(--text));
  outline-offset: 1px;
}
.slot.flash {
  border-color: var(--flash-color, var(--kylix-coral, #e85d3a));
  background: color-mix(
    in srgb,
    var(--flash-color, var(--kylix-coral, #e85d3a)) 28%,
    var(--kylix-ground, var(--bg))
  );
  box-shadow: 0 0 12px
    color-mix(in srgb, var(--flash-color, var(--kylix-coral, #e85d3a)) 40%, transparent);
}
.slot.passive {
  background: color-mix(in srgb, var(--kylix-ground, var(--bg)) 80%, var(--kylix-god, #6b4a72) 12%);
  border-color: color-mix(in srgb, var(--kylix-god, #6b4a72) 35%, var(--kylix-rim, var(--border)));
}
.slot.popover-open {
  z-index: 2;
}
.slot-face {
  margin-bottom: 6px;
}
.slot.passive .slot-face {
  margin-bottom: 0;
}
.slot-kind {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--kylix-ice-bright, var(--text-h, var(--text)));
}
.passive-kind {
  align-items: flex-start;
}
.effect-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.potency {
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.passive-cue {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.25;
}
.cooldown-track {
  height: 10px;
  border-radius: 999px;
  background: color-mix(
    in srgb,
    var(--kylix-rim, var(--border)) 40%,
    var(--kylix-ground, var(--bg))
  );
  overflow: hidden;
}
.cooldown-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: var(--kylix-ice, var(--accent));
  transition: transform 80ms linear;
}
@media (prefers-reduced-motion: reduce) {
  .cooldown-fill {
    transition: none;
  }
  .slot {
    transition: none;
  }
}
.slot-popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--kylix-rim, var(--border));
  background: var(--kylix-ground, var(--bg));
  color: var(--kylix-ice, var(--text));
  box-shadow: 0 4px 16px color-mix(in srgb, var(--kylix-ground, #070b14) 60%, transparent);
  pointer-events: none;
}
.popover-title {
  margin: 0 0 4px;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--kylix-ice-bright, var(--text-h, var(--text)));
}
.popover-effect,
.popover-passive,
.popover-cooldown {
  margin: 0;
  font-size: 0.85rem;
}
.popover-passive,
.popover-cooldown {
  margin-top: 4px;
}
.popover-passive {
  opacity: 0.92;
}
.popover-cooldown {
  opacity: 0.85;
}
</style>
