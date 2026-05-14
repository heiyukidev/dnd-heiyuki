import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import JoinView from '../views/JoinView.vue'
import SessionView from '../views/SessionView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/join/:token',
      name: 'join',
      component: JoinView,
      props: true,
    },
    {
      path: '/session/:id',
      name: 'session',
      component: SessionView,
      props: true,
    },
  ],
})

export default router
