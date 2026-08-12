<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Show, SignInButton } from '@clerk/vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../convex/_generated/api'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'

const props = defineProps<{
  token: string
}>()

const client = useConvexClient()
const route = useRoute()
const router = useRouter()
const joinMessage = ref('')

const token = computed(() => props.token || String(route.params.token ?? ''))

const { data: pageState, error: pageStateError } = useConvexQuery(
  client,
  api.sessions.getJoinPageState,
  () => (token.value ? { joinToken: token.value } : 'skip'),
)

const session = computed(() => pageState.value?.session ?? null)

const viewer = computed(() => pageState.value?.viewer)

const pendingJoin = computed(
  () => viewer.value?.kind === 'non-member' && viewer.value.pendingJoin === true,
)

const rejectedJoin = computed(
  () => viewer.value?.kind === 'non-member' && viewer.value.rejectedJoin === true,
)

const sessionFull = computed(() => session.value?.sessionFull === true)

watch(
  () => {
    const s = session.value
    const v = viewer.value
    if (s && v?.kind === 'member') {
      return s._id
    }
    return null
  },
  (id) => {
    if (id) {
      void router.replace({ name: 'session', params: { id } })
    }
  },
  { immediate: true },
)

async function onRequestJoin() {
  joinMessage.value = ''
  try {
    const res = await client.mutation(api.sessions.requestJoin, { joinToken: token.value })
    if (res.status === 'already_member' && session.value?._id) {
      await router.push({ name: 'session', params: { id: session.value._id } })
      return
    }
    if (res.status === 'already_pending') {
      joinMessage.value = 'Your join request is pending approval from the Host.'
      return
    }
    if (res.status === 'session_full') {
      joinMessage.value = 'Session full (2/2). No spectators in this prototype.'
      return
    }
  } catch (e) {
    joinMessage.value = e instanceof Error ? e.message : 'Could not request to join.'
  }
}
</script>

<template>
  <div class="greenroom">
    <div class="greenroom__stage">
      <h1>Join Session</h1>

      <p v-if="!token" class="muted">Missing join link token.</p>
      <template v-else>
        <p v-if="pageStateError" class="error">
          Could not load Session. {{ pageStateError.message }}
        </p>
        <p v-else-if="pageState === undefined" class="muted">Loading Session…</p>
        <p v-else-if="!session" class="muted">This join link is not valid.</p>
        <template v-else>
          <section class="broadcast-panel greenroom__panel">
            <p class="lead">
              Session:
              <strong>{{ session.title }}</strong>
              <span class="muted"> ({{ session.status }})</span>
              <span v-if="session.fightingCount !== undefined" class="muted">
                · {{ session.fightingCount }}/2 Players
              </span>
            </p>

            <Show when="signed-out">
              <p>Sign in to send a join request.</p>
              <div class="greenroom__actions">
                <SignInButton>
                  <button type="button" class="broadcast-btn broadcast-btn--cta">Sign in</button>
                </SignInButton>
              </div>
            </Show>

            <Show when="signed-in">
              <p v-if="viewer?.kind === 'member'" class="muted">Opening Session…</p>
              <template v-else>
                <p v-if="session.status === 'live' && pendingJoin" class="banner">
                  Join request sent. Wait for the Host to approve.
                </p>
                <p
                  v-else-if="session.status === 'live' && rejectedJoin && !pendingJoin"
                  class="banner banner-warn"
                >
                  The Host did not admit you to this Session. You can send another join request.
                </p>
                <p v-else-if="session.status === 'live' && sessionFull" class="banner banner-warn">
                  Session full (2/2). There are no spectators in this prototype.
                </p>
                <button
                  v-if="session.status === 'live' && !pendingJoin && !sessionFull"
                  type="button"
                  class="broadcast-btn broadcast-btn--cta"
                  @click="onRequestJoin"
                >
                  Request to join
                </button>
                <p v-else-if="session.status !== 'live'" class="muted">
                  This Session is archived and is not accepting join requests.
                </p>
                <p v-if="joinMessage" class="banner">{{ joinMessage }}</p>
              </template>
            </Show>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.greenroom {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
}

.greenroom__stage {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.greenroom__panel {
  margin-top: 16px;
}

.lead {
  font-size: 1.05rem;
  margin-bottom: 12px;
}

.lead strong {
  color: var(--ice);
}

.greenroom__actions {
  margin-top: 12px;
}
</style>
