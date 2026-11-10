import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Relative base + hash routing lets the build run from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
})
