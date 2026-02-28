import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') ||
              id.includes('node_modules/victory-vendor') || id.includes('node_modules/@reduxjs') ||
              id.includes('node_modules/react-redux') || id.includes('node_modules/reselect') ||
              id.includes('node_modules/immer') || id.includes('node_modules/decimal.js-light') ||
              id.includes('node_modules/es-toolkit') || id.includes('node_modules/eventemitter3') ||
              id.includes('node_modules/tiny-invariant') || id.includes('node_modules/use-sync-external-store') ||
              id.includes('node_modules/clsx')) {
            return 'charts';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-is/') || id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/papaparse')) {
            return 'xlsx';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
