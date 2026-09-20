import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * A throwaway config that renders the real screens against fixtures.
 *
 * Four aliases and nothing else — the data layer (`@/lib/db`), the Firebase
 * handles, the handful of screens that reach `firebase/firestore` directly, and
 * `AuthContext`. Every component, every other context and every route below
 * them is the real one, which is what makes this worth running: it exercises
 * the actual layout code rather than a parallel copy of it.
 */
export default defineConfig({
  root: path.resolve(rootDir, 'preview'),
  /* The .env.local with the placeholder Firebase config sits at the project
     root, not in preview/, and Vite looks in `root` unless told otherwise. */
  envDir: rootDir,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@/lib/db', replacement: path.resolve(rootDir, 'preview/mock-db.ts') },
      { find: '@/lib/firebase', replacement: path.resolve(rootDir, 'preview/mock-firebase.ts') },
      { find: 'firebase/firestore', replacement: path.resolve(rootDir, 'preview/mock-firestore.ts') },
      { find: '@/context/AuthContext', replacement: path.resolve(rootDir, 'preview/mock-auth.tsx') },
      { find: '@', replacement: path.resolve(rootDir, 'src') },
    ],
  },
  build: { outDir: path.resolve(rootDir, 'dist-preview'), emptyOutDir: true },
});
