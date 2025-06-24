import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/One-Pager-Management/app/', // GitHub Pages base path for the app
  build: {
    outDir: '../docs/_site/app', // Build directly into docs/app folder
    emptyOutDir: true,
  },
})
