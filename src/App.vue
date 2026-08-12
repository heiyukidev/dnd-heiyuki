<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ClerkLoaded, ClerkLoading } from '@clerk/vue'
import ConvexClerkAuth from './components/ConvexClerkAuth.vue'

const route = useRoute()
const sessionPlayShell = computed(() => route.name === 'session')

const channelPhase = computed(() => {
  if (route.name === 'join') {
    return 'JOIN'
  }
  return 'GREENROOM'
})

const homeCrawlItems = [
  { text: 'HEIYUKI' },
  { text: 'SYSMSG' },
  { text: 'JOIN A SESSION', accent: true },
  { text: 'DRAFT WEAPON AND BOONS' },
  { text: 'WATCH THE AUTO-FIGHT' },
]

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
})

const homeCrawlTrackItems = computed(() =>
  prefersReducedMotion.value ? homeCrawlItems : [...homeCrawlItems, ...homeCrawlItems],
)
</script>

<template>
  <ClerkLoading>
    <p class="shell-msg">Loading sign-in…</p>
  </ClerkLoading>
  <ClerkLoaded>
    <ConvexClerkAuth>
      <div class="app-layout" :class="{ 'app-layout--session': sessionPlayShell }">
        <header v-if="!sessionPlayShell" class="channel-header">
          <div class="channel-header__brand">
            <RouterLink to="/" class="channel-bug">HEIYUKI</RouterLink>
            <span class="channel-header__phase">MAIN SCENARIO — {{ channelPhase }}</span>
          </div>
          <div class="channel-header__session">CHANNEL 07090E</div>
          <div class="channel-header__status">
            <span class="on-air on-air--standby">
              <span class="on-air__lamp on-air__lamp--standby" aria-hidden="true" />
              STANDBY
            </span>
          </div>
        </header>
        <main class="main" :class="{ 'main--session-play': sessionPlayShell }">
          <router-view />
        </main>
        <footer v-if="!sessionPlayShell" class="channel-crawl">
          <div
            class="channel-crawl__track"
            :class="
              prefersReducedMotion
                ? 'channel-crawl__track--static'
                : 'channel-crawl__track--marquee'
            "
            aria-hidden="true"
          >
            <template v-for="(item, idx) in homeCrawlTrackItems" :key="`${item.text}-${idx}`">
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
      </div>
    </ConvexClerkAuth>
  </ClerkLoaded>
</template>

<style>
.on-air--standby {
  color: var(--phosphor);
}

.on-air__lamp--standby {
  background: var(--phosphor);
  box-shadow: 0 0 8px color-mix(in srgb, var(--phosphor) 70%, transparent);
}
</style>
