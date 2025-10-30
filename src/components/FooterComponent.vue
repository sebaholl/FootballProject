<template>
  <footer>
    <div class="footer-container">
      <!-- Left: Logo -->
      <div class="footer-logo">
        <img
          src="/src/assets/Pictures/Laligalogo.png"
          alt="La Liga Logo"
        />
      </div>

      <!-- Middle: Navigation -->
      <nav class="footer-nav">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/standings">Standings</RouterLink>
        <RouterLink to="/fixtures">Fixtures</RouterLink>
        <RouterLink to="/teams">Teams</RouterLink>
        <RouterLink to="/news">News</RouterLink>
        <RouterLink to="/admin">Login</RouterLink>
      </nav>

      <!-- Right: Copyright -->
      <p class="footer-copy">
        © {{ new Date().getFullYear() }} LaLiga | All rights reserved.
      </p>
    </div>
  </footer>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
footer {
  border-top: 1px solid #d1d5db; /* light gray border */
  background-color: #ffffff;
  color: #d90429; /* LaLiga red */
  margin-top: 3rem;
  padding-top: 20px;
}

/* container layout */
.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

/* logo section */
.footer-logo {
  margin-top: 10px;
}

.footer-logo img {
  width: 200px;
  height: auto;
  object-fit: contain;
}

/* navigation */
.footer-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 32px;
  font-size: 1.125rem; /* ~large text */
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 10px;
}

.footer-nav a {
  color: #d90429;
  text-decoration: none;
  position: relative;
  transition: color 0.3s ease;
}

/* hover effects */
.footer-nav a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 0;
  height: 2px;
  background-color: #d90429;
  transition: width 0.3s ease;
}

.footer-nav a:hover::after {
  width: 100%;
}

/* copyright */
.footer-copy {
  font-size: 0.75rem;
  color: #6b7280; /* gray-500 */
  text-align: center;
  margin-top: 12px;
}

/* responsive layout */
@media (min-width: 768px) {
  .footer-container {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 3rem;
  }
}
</style>

