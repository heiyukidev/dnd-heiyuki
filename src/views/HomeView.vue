<script setup lang="ts">
import { computed, ref } from 'vue'
import { Show, SignInButton, useAuth } from '@clerk/vue'
import { useRouter } from 'vue-router'
import { api } from '../../convex/_generated/api'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'
import { sortSessionsForHome } from '../lib/sessionSort'

const client = useConvexClient()
const router = useRouter()
const { userId, isSignedIn } = useAuth()
const title = ref('New session')
const createSessionError = ref<string | null>(null)

const { data: mySessionsRaw, error: mySessionsError } = useConvexQuery(
  client,
  api.sessions.listMySessions,
  () => (isSignedIn.value ? {} : 'skip'),
)

const mySessionsLoading = computed(
  () => mySessionsRaw.value === undefined && !mySessionsError.value,
)

const mySessions = computed(() =>
  mySessionsRaw.value === undefined ? undefined : sortSessionsForHome(mySessionsRaw.value),
)

async function onCreateSession() {
  createSessionError.value = null
  try {
    const { sessionId } = await client.mutation(api.sessions.createSession, {
      title: title.value.trim() || 'Untitled session',
    })
    await router.push({ name: 'session', params: { id: sessionId } })
  } catch {
    createSessionError.value = 'Could not create session. Try again.'
  }
}

function joinHref(token: string) {
  return `${window.location.origin}/join/${token}`
}
</script>

<template>
  <div class="page">
    <h1>Heiyuki</h1>
    <Show when="signed-out">
      <p>Sign in to create a session or join with a join link.</p>
      <SignInButton />
    </Show>
    <Show when="signed-in">
      <p v-if="userId" class="muted">You are signed in.</p>
      <section class="card">
        <h2>Create session</h2>
        <label class="field">
          <span>Title</span>
          <input v-model="title" type="text" autocomplete="off" />
        </label>
        <button type="button" class="btn-primary" @click="onCreateSession">Create session</button>
        <p v-if="createSessionError" class="error">{{ createSessionError }}</p>
      </section>
      <section class="card">
        <h2>My sessions</h2>
        <p v-if="mySessionsError" class="error">
          Could not load sessions. {{ mySessionsError.message }}
        </p>
        <p v-else-if="mySessionsLoading" class="muted">Loading…</p>
        <p v-else-if="mySessions && !mySessions.length" class="muted">No sessions yet.</p>
        <ul v-else-if="mySessions && mySessions.length" class="session-list">
          <li v-for="row in mySessions" :key="row.membership._id">
            <RouterLink :to="{ name: 'session', params: { id: row.session._id } }">
              {{ row.session.title }}
            </RouterLink>
            <span class="muted"> · {{ row.membership.role }}</span>
            <div v-if="row.session.joinToken" class="join-hint">
              <span class="mono">{{ joinHref(row.session.joinToken) }}</span>
            </div>
          </li>
        </ul>
      </section>
    </Show>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--bg) 92%, var(--border));
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.field input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font: inherit;
}
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  cursor: pointer;
}
.session-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.session-list li {
  margin-bottom: 12px;
}
.muted {
  color: var(--text);
  opacity: 0.85;
  font-size: 0.92rem;
}
.mono {
  font-family: var(--mono);
  font-size: 0.82rem;
  word-break: break-all;
}
.join-hint {
  margin-top: 4px;
}
.error {
  color: var(--text);
  margin-top: 10px;
  font-size: 0.92rem;
}
</style>
