import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/standings',
    name: 'standings',
    component: () => import('../views/StandingsView.vue'),
  },
  {
    path: '/fixtures',
    name: 'fixtures',
    component: () => import('../views/FixturesView.vue'),
  },
  {
    path: '/teams',
    name: 'teams',
    component: () => import('../views/TeamsView.vue'),
  },
  {
    path: '/team/:id',
    name: 'team',
    component: () => import('../views/TeamView.vue'),
  },
  {
    path: '/players',
    name: 'players',
    component: () => import('../views/PlayersView.vue'),
  },
  {
    path: '/news',
    name: 'news',
    component: () => import('../views/NewsListView.vue'),
  },
  {
    path: '/news/:id',
    name: 'newsDetail',
    component: () => import('../views/NewsDetailView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('../views/admin/AdminDashboard.vue'),
      },
      {
        path: 'sync',
        name: 'adminSync',
        component: () => import('../views/admin/AdminSyncView.vue'),
      },
      {
        path: 'news',
        name: 'adminNews',
        component: () => import('../views/admin/AdminNewsView.vue'),
      },
    ],
    meta: { requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('../views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route Guard – jen admin může do /admin
router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true

  const user = auth.currentUser
  if (!user) return { name: 'login', query: { redirect: to.fullPath } }

  const snap = await getDoc(doc(db, 'users', user.uid))
  const role = snap.exists() ? snap.data().role : null

  if (role !== 'admin') return { name: 'home' }
  return true
})

export default router
