import './style.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/500.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
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
