import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui';
import { initTheme } from '@/lib/theme';
import { lockZoom } from '@/lib/lockZoom';
import './index.css';

/*
 * The theme is stamped BEFORE React renders.
 *
 * `initTheme` writes `data-theme` on <html> synchronously, so the first
 * frame the browser paints is already the right colour. Doing it in an effect
 * instead means a white flash on every cold load for anybody in dark mode:
 * which on a phone opened in a dim warehouse is the most visible bug the app
 * could have.
 *
 * `index.css` also declares the dark tokens under `prefers-color-scheme` as a
 * second line of defence, for the frame before this runs and for any host that
 * never runs it at all.
 */
initTheme();

/* iOS pinch-zoom and double-tap-to-zoom, off. See `lockZoom` and the
   `touch-action` rule in index.css: neither alone covers all three platforms. */
lockZoom();

/*
 * NOT WRAPPED IN try/catch, AND THAT IS NOT AN OVERSIGHT.
 *
 * The failure worth guarding against here, a missing `VITE_FIREBASE_*`
 * variable, which `lib/firebase.ts` throws on at module scope, happens while
 * this module's own imports are still being evaluated, before a single
 * statement in this file runs. A try/catch around the render cannot see it,
 * and neither can `ErrorBoundary`, because React does not exist yet.
 *
 * The guard is an inline script in `index.html` instead. It is the only thing
 * that runs before the bundle, and it is also the only thing that survives the
 * bundle failing to load at all. See the comment there.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
