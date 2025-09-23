<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header style="padding:12px; border-bottom:1px solid #eee">
    <nav style="display:flex; gap:12px; flex-wrap:wrap; align-items:center">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/standings">Standings</RouterLink>
      <RouterLink to="/fixtures">Fixtures</RouterLink>
      <RouterLink to="/teams">Teams</RouterLink>
      <RouterLink to="/news">News</RouterLink>
      <RouterLink to="/admin">Admin</RouterLink>
    </nav>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
/* (volitelně si nech svoje styly) */
</style>

