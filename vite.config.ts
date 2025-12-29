import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/r3f-demos/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'littlest-tokyo-vr': resolve(__dirname, 'littlest-tokyo-vr.html'),
        'tokyo-pedestrians': resolve(__dirname, 'tokyo-pedestrians.html'),
      },
    },
  },
})
