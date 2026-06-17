import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/vitalscore-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VitalScore',
        short_name: 'VitalScore',
        description: 'Seguimiento personal de ejercicio, peso y colesterol.',
        theme_color: '#b11f4b',
        background_color: '#f7f4ef',
        display: 'standalone',
        scope: '/vitalscore-app/',
        start_url: '/vitalscore-app/',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
