import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'

  return {
    envDir: '..',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
