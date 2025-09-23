import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/sm': {
        target: 'https://api.sportmonks.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sm/, ''), // /sm/v3/... -> /v3/...
      },
    },
  },
})

