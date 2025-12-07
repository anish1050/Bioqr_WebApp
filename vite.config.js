import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/bioqr': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/access-file': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy static HTML pages to Express server
      '/login.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/register.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/dashboard.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/about.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/contact.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/viewdemo.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/status.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/help.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
