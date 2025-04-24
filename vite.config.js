import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/sudoku/', // Add base URL for GitHub Pages
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sudoku PWA',
        short_name: 'Sudoku',
        description: 'A Sudoku game that works offline',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})