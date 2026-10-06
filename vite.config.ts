import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      allowedHosts: true as const,
      proxy: {
        '/api': {
          target: 'https://lumiere-production-f6a1.up.railway.app',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
