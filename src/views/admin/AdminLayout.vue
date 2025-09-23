<script setup>
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { logout } = useAuth()
const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div style="display:flex; min-height:calc(100vh - 56px)">
    <aside style="width:220px; border-right:1px solid #eee; padding:16px">
      <h3>Admin</h3>
      <nav style="display:flex; flex-direction:column; gap:8px">
        <RouterLink :to="{ name: 'admin' }">Dashboard</RouterLink>
        <RouterLink :to="{ name: 'adminSync' }">Sync</RouterLink>
        <RouterLink :to="{ name: 'adminNews' }">News</RouterLink>
      </nav>


      <button @click="handleLogout" style="margin-top:20px; color:#c00">
        Logout
      </button>
    </aside>

    <main style="flex:1; padding:24px">
      <RouterView />
    </main>
  </div>
</template>

