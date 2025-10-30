<script setup>
import { RouterLink, RouterView } from 'vue-router'
import FooterComponent from './components/FooterComponent.vue'
</script>

<template>
  <div>
    <header style="padding: 12px; border-bottom: 1px solid #eee; background: white; margin-bottom: 16px;">
      <nav style="display: flex; align-items: center; justify-content: space-between; gap: 24px;">
        <div style="flex-shrink: 0;">
          <img src="/src/assets/Pictures/Laligalogo.png" style="width: 500px; height: auto;" alt="La Liga Logo" />
        </div>
      <div class="navbar">
        <div style="display: flex; align-items: center; gap: 24px;">
          <RouterLink to="/" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Home</RouterLink>
          <RouterLink to="/standings" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Standings</RouterLink>
          <RouterLink to="/fixtures" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Fixtures</RouterLink>
          <RouterLink to="/teams" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Teams</RouterLink>
          <RouterLink to="/news" style="font-weight: 600; white-space: nowrap; font-size: 30px;">News</RouterLink>
          <RouterLink to="/admin" style="font-weight: 600; white-space: nowrap; font-size: 30px;">Login</RouterLink>
        </div>
      </div>
      </nav>
    </header>

    <main>
      <RouterView />
      <FooterComponent />
    </main>

  </div>


</template>

<style>
/* make the wrapper fill the full viewport */
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* allow main content to grow */
.main-content {
  flex: 1;
}

/* Navbar animation */
.navbar a {
  position: relative;
  font-weight: 600;
  white-space: nowrap;
  font-size: 30px;
  color: #ff0030;
  text-decoration: none;
  transition: color 0.3s ease;
}




/* Animated underline */
.navbar a::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0%;
  height: 3px;
  background-color: #ff0030;
  transition: width 0.3s ease;
}


.navbar a:hover::after {
  width: 100%;
}
</style>

