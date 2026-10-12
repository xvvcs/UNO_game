import type { RouteRecordRaw } from 'vue-router'
import SetupView from '../views/SetupView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'setup', component: SetupView },
  { path: '/game', name: 'game', component: () => import('../views/GameView.vue') },
]
