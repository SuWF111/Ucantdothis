// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
// 預先引入 RoomView (我們等一下就去建這個檔案)
import RoomView from '../views/RoomView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      // :id 代表這是一個變數，可以是任何房號
      path: '/room/:id', 
      name: 'room',
      component: RoomView
    }
  ]
})

export default router