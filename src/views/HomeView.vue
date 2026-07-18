<script setup lang="ts">
import { computed, ref } from 'vue'
import { Show, SignInButton, useAuth } from '@clerk/vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '../../convex/_generated/api'
import { useConvexClient } from '../composables/convexClient'
import { useConvexAuth } from '../composables/convexAuth'
import { useConvexQuery } from '../composables/useConvexQuery'
import { sortSessionsForHome } from '../lib/sessionSort'

const client = useConvexClient()
const router = useRouter()
const { userId, isSignedIn, isLoaded } = useAuth()
const { convexTokenReady } = useConvexAuth()
const clerkLoaded = isLoaded
const clerkSignedIn = isSignedIn
const title = ref('New session')
const createSessionError = ref<string | null>(null)
const createSessionBusy = ref(false)

const { data: mySessionsRaw, error: mySessionsError } = useConvexQuery(
  client,
  api.sessions.listMySessions,
  () => (clerkSignedIn.value && clerkLoaded.value ? {} : 'skip'),
)

/** Sessions loaded ⇒ Convex accepted our JWT even if the prime probe lagged. */
const convexReachable = computed(
  () =>
    convexTokenReady.value || (mySessionsRaw.value !== undefined && mySessionsError.value === null),
)

const canCreateSession = computed(
  () =>
    clerkLoaded.value && clerkSignedIn.value && convexReachable.value && !createSessionBusy.value,
)

const mySessionsLoading = computed(
  () => mySessionsRaw.value === undefined && !mySessionsError.value,
)

const mySessions = computed(() =>
  mySessionsRaw.value === undefined ? undefined : sortSessionsForHome(mySessionsRaw.value),
)

async function onCreateSession() {
  createSessionError.value = null
  if (!convexReachable.value) {
    createSessionError.value =
      'Still connecting to the server. If this persists, configure the Clerk JWT template named "convex" (see Convex + Clerk docs).'
    return
  }
  createSessionBusy.value = true
  try {
    const { sessionId } = await client.mutation(api.sessions.createSession, {
      title: title.value.trim() || 'Untitled session',
    })
    await router.push({ name: 'session', params: { id: sessionId } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    createSessionError.value =
      msg.includes('Unauthorized') || msg.includes('Not authenticated')
        ? 'Not authenticated with the game server. Check Clerk sign-in and the "convex" JWT template in Clerk.'
        : `Could not create session. ${msg || 'Try again.'}`
  } finally {
    createSessionBusy.value = false
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
      <p>Sign in to create a Session or join with a join link.</p>
      <SignInButton />
    </Show>
    <Show when="signed-in">
      <p v-if="userId" class="muted">You are signed in.</p>
      <section class="card">
        <h2>Create Session</h2>
        <label class="field">
          <span>Title</span>
          <input v-model="title" type="text" autocomplete="off" />
        </label>
        <button
          type="button"
          class="btn-primary"
          :disabled="!canCreateSession"
          @click="onCreateSession"
        >
          {{
            !clerkLoaded
              ? 'Loading sign-in…'
              : !clerkSignedIn
                ? 'Sign in to create'
                : !convexReachable
                  ? 'Connecting…'
                  : createSessionBusy
                    ? 'Creating…'
                    : 'Create Session'
          }}
        </button>
        <p v-if="clerkSignedIn && clerkLoaded && !convexReachable" class="muted tiny">
          Waiting for Convex auth. Add a Clerk JWT template named
          <span class="mono">convex</span> if this does not clear.
        </p>
        <p v-if="createSessionError" class="error">{{ createSessionError }}</p>
      </section>
      <section class="card">
        <h2>My Sessions</h2>
        <p v-if="mySessionsError" class="error">
          Could not load sessions. {{ mySessionsError.message }}
        </p>
        <p v-else-if="mySessionsLoading" class="muted">Loading…</p>
        <p v-else-if="mySessions && !mySessions.length" class="muted">No Sessions yet.</p>
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
