/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesiumPluginModule from 'vite-plugin-cesium'
import type { PluginOption } from 'vite'
import path from 'node:path'

// CJS/ESM interop: the plugin ships a default export in both module formats
const cesium = ((cesiumPluginModule as unknown as { default?: () => PluginOption }).default ?? (cesiumPluginModule as unknown as () => PluginOption))

export default defineConfig({
  plugins: [react(), tailwindcss(), cesium()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.MARSENSE_API ?? 'http://localhost:8000', changeOrigin: true } },
  },
  build: { chunkSizeWarningLimit: 4000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
