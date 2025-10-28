<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen"> <!-- Background color changed to La Liga red -->
    <header style="padding: 12px; border-bottom: 1px solid #eee; background: white;">
      <nav style="display: flex; align-items: center; justify-content: space-between; gap: 24px;">
        <div style="flex-shrink: 0;">
          <img src="/src/assets/Pictures/Laligalogo.png" style="width: 500px; height: auto;" alt="La Liga Logo" />
        </div>
        <div style="display: flex; align-items: center; gap: 24px;">
          <RouterLink to="/" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Home</RouterLink>
          <RouterLink to="/standings" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Standings</RouterLink>
          <RouterLink to="/fixtures" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Fixtures</RouterLink>
          <RouterLink to="/teams" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Teams</RouterLink>
          <RouterLink to="/news" style="font-weight: 600; white-space: nowrap; font-size: 30px;">News</RouterLink>
          <RouterLink to="/admin" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Admin</RouterLink>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* (volitelně si nech svoje styly) */
</style>

