import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export type ConvexAuthState = {
  /** Clerk finished loading. */
  clerkLoaded: Ref<boolean>
  /** User is signed in to Clerk. */
  clerkSignedIn: Ref<boolean>
  /** Convex `setAuth` is configured and a non-null token was fetched at least once. */
  convexTokenReady: Ref<boolean>
}

const convexAuthKey: InjectionKey<ConvexAuthState> = Symbol('convexAuth')

const fallbackState: ConvexAuthState = {
  clerkLoaded: ref(false),
  clerkSignedIn: ref(false),
  convexTokenReady: ref(false),
}

export function provideConvexAuth(state: ConvexAuthState): void {
  provide(convexAuthKey, state)
}

export function useConvexAuth(): ConvexAuthState {
  return inject(convexAuthKey, fallbackState)
}
