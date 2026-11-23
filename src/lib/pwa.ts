/**
 * The installable app: registers the service worker in production builds.
 *
 * After `load`, so registering never competes with the app's own first
 * download on a slow connection. In development any worker left over from a
 * production visit is removed, because a cached shell in front of a dev
 * server is hours of debugging a bug that is not there.
 */
/*
 * INSTALLING FROM THE PAGE.
 *
 * Chrome, Edge and Android hand the page a `beforeinstallprompt` event that
 * can be kept and fired later from a button ("Get on Android"). Safari on an
 * iPhone never does: there, installing is Share, then Add to Home Screen, so
 * the button shows those two steps instead.
 */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: InstallEvent | null = null;

/** Already running as the installed app. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** True when the browser offered an install that a button can trigger. */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Shows the browser's own install dialog. False when there is none to show. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  return choice.outcome === 'accepted';
}

export function initPwa(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferred = event as InstallEvent;
    });
    window.addEventListener('appinstalled', () => {
      deferred = null;
    });
  }
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
