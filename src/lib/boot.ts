/**
 * The one loading screen (the splash in index.html) and when it goes.
 *
 * It sits outside the React root, so React mounting, the shell loading, the
 * organisation loading and the page's code arriving all happen underneath it,
 * unseen. It fades only when a real page has drawn (`useBootDone` in the page
 * header, the home screens, sign in and the public site), so a refresh is two
 * steps: splash, then the page. Never splash, shell, splash, page.
 *
 * A safety timer removes it anyway after 9 seconds, so a page that forgot to
 * say it is ready can never be hidden behind it.
 */

import { useEffect } from 'react';

let done = false;

export function bootDone(): void {
  if (done || typeof document === 'undefined') return;
  done = true;
  const el = document.getElementById('splash');
  if (!el) return;
  /* Two frames, so the page under it has painted before it starts fading. */
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.classList.add('gone');
      window.setTimeout(() => el.remove(), 320);
    }),
  );
}

/** Call in a component that renders the real page (not a loader). */
export function useBootDone(ready = true): void {
  useEffect(() => {
    if (ready) bootDone();
  }, [ready]);
}

export function startBootTimer(): void {
  window.setTimeout(bootDone, 9000);
}
