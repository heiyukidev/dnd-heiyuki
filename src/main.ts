import './style.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import { createApp } from 'vue'
import { clerkPlugin } from '@clerk/vue'
import App from './App.vue'
import router from './router'
import { ConvexClient } from 'convex/browser'
import { provideConvexClient } from './composables/convexClient'

const url = import.meta.env.VITE_CONVEX_URL
const convexClient = new ConvexClient(url || 'https://placeholder.invalid', {
  skipConvexDeploymentUrlCheck: !url,
})

const app = createApp(App)
app.use(clerkPlugin, {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
})
app.use(router)
provideConvexClient(app, convexClient)
app.mount('#app')
