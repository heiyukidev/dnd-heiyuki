<script setup lang="ts">
import { computed, ref } from 'vue'
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

const { data: sessionPreview, error: sessionPreviewError } = useConvexQuery(
  client,
  api.sessions.getSessionByJoinToken,
  () => (token.value ? { token: token.value } : 'skip'),
)

async function onRequestJoin() {
  joinMessage.value = ''
  try {
    const res = await client.mutation(api.sessions.requestJoin, { joinToken: token.value })
    if (res.status === 'already_member' && sessionPreview.value?._id) {
      await router.push({ name: 'session', params: { id: sessionPreview.value._id } })
      return
    }
    if (res.status === 'already_pending') {
      joinMessage.value = 'Your join request is pending approval from the Dungeon Master.'
      return
    }
    if (res.status === 'created') {
      joinMessage.value = 'Join request sent. Wait for the Dungeon Master to approve.'
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
      <p v-if="sessionPreviewError" class="error">
        Could not load session. {{ sessionPreviewError.message }}
      </p>
      <p v-else-if="sessionPreview === undefined" class="muted">Loading session…</p>
      <p v-else-if="!sessionPreview" class="muted">This join link is not valid.</p>
      <template v-else>
        <p class="lead">
          Session:
          <strong>{{ sessionPreview.title }}</strong>
          <span class="muted"> ({{ sessionPreview.status }})</span>
        </p>
        <Show when="signed-out">
          <p>Sign in to send a join request.</p>
          <SignInButton />
        </Show>
        <Show when="signed-in">
          <button
            v-if="sessionPreview.status === 'live'"
            type="button"
            class="btn-primary"
            @click="onRequestJoin"
          >
            Request to join
          </button>
          <p v-else class="muted">This session is archived and is not accepting join requests.</p>
          <p v-if="joinMessage" class="banner">{{ joinMessage }}</p>
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
</style>
