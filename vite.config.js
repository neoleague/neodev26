import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /*
     * Two documents, not one app with a router. The sponsor page shares the
     * palette, the masthead and the background canvas, but none of the title
     * screen's machinery — no wave transition, no virtual scroll axis — so it
     * is cheaper and simpler as its own entry than as a route inside App.
     */
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        sponsor: resolve(import.meta.dirname, 'sponsor.html'),
      },
    },
  },
})
