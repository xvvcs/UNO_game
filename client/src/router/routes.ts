import type { RouteRecordRaw } from 'vue-router'
import SetupView from '../views/SetupView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'setup', component: SetupView },
  { path: '/lobby', name: 'lobby', component: () => import('../views/LobbyView.vue') },
  { path: '/game', name: 'game', component: () => import('../views/GameView.vue') },
  { path: '/game/:gameId', name: 'onlineGame', component: () => import('../views/GameView.vue') },
]
