import { shallowRef, watchEffect } from 'vue'
import type { ShallowRef } from 'vue'
import type { ConvexClient } from 'convex/browser'
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server'

export function useConvexQuery<Q extends FunctionReference<'query'>>(
  client: ConvexClient,
  queryRef: Q,
  args: () => FunctionArgs<Q> | 'skip',
): {
  data: ShallowRef<FunctionReturnType<Q> | undefined>
  error: ShallowRef<Error | null>
} {
  const data = shallowRef<FunctionReturnType<Q> | undefined>(undefined)
  const error = shallowRef<Error | null>(null)
  watchEffect((onCleanup) => {
    const a = args()
    if (a === 'skip') {
      data.value = undefined
      error.value = null
      return
    }
    data.value = undefined
    error.value = null
    const unsub = client.onUpdate(
      queryRef,
      a,
      (result) => {
        error.value = null
        data.value = result
      },
      (e) => {
        error.value = e
        data.value = undefined
      },
    )
    onCleanup(() => {
      unsub()
    })
  })
  return { data, error }
}
