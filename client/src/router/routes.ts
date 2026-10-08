import type { RouteRecordRaw } from 'vue-router'
import SetupView from '../views/SetupView.vue'

export const routes: RouteRecordRaw[] = [{ path: '/', name: 'setup', component: SetupView }]
