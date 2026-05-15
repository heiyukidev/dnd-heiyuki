<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ClerkLoaded, ClerkLoading } from '@clerk/vue'
import ConvexClerkAuth from './components/ConvexClerkAuth.vue'

const route = useRoute()
const sessionPlayShell = computed(() => route.name === 'session')
</script>

<template>
  <ClerkLoading>
    <p class="shell-msg">Loading sign-in…</p>
  </ClerkLoading>
  <ClerkLoaded>
    <ConvexClerkAuth />
    <div class="app-layout">
      <header class="top-nav">
        <RouterLink to="/" class="brand">Heiyuki</RouterLink>
        <nav>
          <RouterLink to="/">Home</RouterLink>
        </nav>
      </header>
      <main class="main" :class="{ 'main--session-play': sessionPlayShell }">
        <router-view />
      </main>
    </div>
  </ClerkLoaded>
</template>

<style scoped>
.shell-msg {
  padding: 24px;
}
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}
.brand {
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}
.top-nav nav a {
  margin-left: 12px;
  color: var(--accent);
}
.main {
  flex: 1;
  padding: 16px 20px 48px;
}
.main--session-play {
  padding: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.main--session-play > * {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
