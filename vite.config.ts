import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,md,glb,gltf}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB
      },
      manifest: {
        name: 'ThermoShelter',
        short_name: 'ThermoShelter',
        description: 'Physics-grounded extreme climate shelter design.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone'
      }
    })
  ],
})
