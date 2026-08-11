import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  preview: {
    port: 4177,
    host: "0.0.0.0",
    allowedHosts: [
      "admin.humsafarevent.com",
      "www.admin.humsafarevent.com",
    ],
  },
  // Add server configuration for development
  server: {
    port: 4177,
    host: "0.0.0.0",
    allowedHosts: [
      "admin.humsafarevent.com",
      "www.admin.humsafarevent.com",
    ],
  },
})
