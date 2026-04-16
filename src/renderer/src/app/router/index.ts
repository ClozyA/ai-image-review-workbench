import { createRouter, createWebHashHistory } from 'vue-router'

import FilterPage from '@renderer/pages/filter/FilterPage.vue'
import HomePage from '@renderer/pages/home/HomePage.vue'
import ResultPage from '@renderer/pages/result/ResultPage.vue'
import ReviewPage from '@renderer/pages/review/ReviewPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/project/:projectId/review', name: 'review', component: ReviewPage },
    { path: '/project/:projectId/filter', name: 'filter', component: FilterPage },
    { path: '/project/:projectId/result', name: 'result', component: ResultPage }
  ]
})
