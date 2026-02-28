import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts', 'd3'],
          'xlsx': ['xlsx', 'papaparse'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
