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
      joinMessage.value = 'Your join request is pending approval from the Dungeon Master.'
      return
    }
  } catch (e) {
    joinMessage.value = e instanceof Error ? e.message : 'Could not request to join.'
  }
}
</script>

<template>
  <div class="page">
    <h1>Join session</h1>
    <p v-if="!token" class="muted">Missing join link token.</p>
    <template v-else>
      <p v-if="pageStateError" class="error">
        Could not load session. {{ pageStateError.message }}
      </p>
      <p v-else-if="pageState === undefined" class="muted">Loading session…</p>
      <p v-else-if="!session" class="muted">This join link is not valid.</p>
      <template v-else>
        <p class="lead">
          Session:
          <strong>{{ session.title }}</strong>
          <span class="muted"> ({{ session.status }})</span>
        </p>
        <Show when="signed-out">
          <p>Sign in to send a join request.</p>
          <SignInButton />
        </Show>
        <Show when="signed-in">
          <p v-if="viewer?.kind === 'member'" class="muted">Opening session…</p>
          <template v-else>
            <p v-if="session.status === 'live' && pendingJoin" class="banner">
              Join request sent. Wait for the Dungeon Master to approve.
            </p>
            <p
              v-else-if="session.status === 'live' && rejectedJoin && !pendingJoin"
              class="banner banner-warn"
            >
              The Dungeon Master did not admit you to this session. You can send another join
              request.
            </p>
            <button
              v-if="session.status === 'live' && !pendingJoin"
              type="button"
              class="btn-primary"
              @click="onRequestJoin"
            >
              Request to join
            </button>
            <p v-else-if="session.status !== 'live'" class="muted">
              This session is archived and is not accepting join requests.
            </p>
            <p v-if="joinMessage" class="banner">{{ joinMessage }}</p>
          </template>
        </Show>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
}
.lead {
  font-size: 1.05rem;
}
.muted {
  color: var(--text);
  opacity: 0.85;
}
.error {
  color: var(--text);
  font-size: 0.92rem;
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
.banner {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--text-h);
}
.banner-warn {
  border-color: color-mix(in srgb, var(--accent-border) 70%, #c9a227);
  background: color-mix(in srgb, var(--accent-bg) 85%, #2a2410);
}
</style>
