import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        /*
         * Only React gets a hand-placed chunk. Everything else is left to the
         * bundler, and that is a fix rather than a simplification.
         *
         * The version this replaces shipped exceljs, chart.js, recharts,
         * d3-geo and topojson-client in one graph, so a distributor opening one
         * invoice downloaded a spreadsheet engine and two charting libraries
         * first. None of them is reached before a click. Left alone, the
         * bundler makes each one an async chunk fetched the first time somebody
         * actually opens the screen that needs it.
         *
         * React is different: it is genuinely needed by the first byte of every
         * page, and giving it a stable name means it stays in the browser cache
         * across deploys instead of being re-downloaded whenever app code
         * changes.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react';
          // Firebase is on the critical path (auth resolves before anything
          // renders) and it changes only when the SDK is upgraded, so a stable
          // name keeps it in the browser cache across app deploys.
          if (/[\\/]node_modules[\\/]@?firebase/.test(id)) return 'firebase';
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icons';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
