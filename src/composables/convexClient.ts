import type { App, InjectionKey } from 'vue'
import { inject } from 'vue'
import type { ConvexClient } from 'convex/browser'

const convexClientKey: InjectionKey<ConvexClient> = Symbol('convexClient')

export function provideConvexClient(app: App, client: ConvexClient) {
  app.provide(convexClientKey, client)
}

export function useConvexClient(): ConvexClient {
  const client = inject(convexClientKey)
  if (!client) {
    throw new Error('Convex client was not provided')
  }
  return client
}
