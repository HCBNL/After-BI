/**
 * The installable app: registers the service worker in production builds.
 *
 * After `load`, so registering never competes with the app's own first
 * download on a slow connection. In development any worker left over from a
 * production visit is removed, because a cached shell in front of a dev
 * server is hours of debugging a bug that is not there.
 */
export function initPwa(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) {
    void navigator.serviceWorker.getRegistrations?.().then((all) => all.forEach((r) => void r.unregister()));
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* Not installable on this browser; the site works exactly the same. */
    });
  });
}
