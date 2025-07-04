import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


const VITE_ASSET_URL = process.env.VITE_ASSET_URL || '/';
console.log(`Using asset URL: ${VITE_ASSET_URL}`);


// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: `${VITE_ASSET_URL}`, // GitHub Pages base path for the app /One-Pager-Management/app/
    build: {
        outDir: '../docs/_site/app', // Build directly into docs/app folder
        emptyOutDir: true,
    },
})
