/**
 * The one loading screen (the splash in index.html) and when it goes.
 *
 * It sits outside the React root, so React mounting, the shell loading, the
 * organisation loading and the page's code arriving all happen underneath it,
 * unseen. It fades only when a real page has drawn (`useBootDone` in the page
 * header, the home screens, sign in and the public site), so a refresh is two
 * steps: splash, then the page. Never splash, shell, splash, page.
 *
 * A safety timer removes it anyway after 20 seconds (a cold start on a slow connection can take most of that), so a page that forgot to
 * say it is ready can never be hidden behind it.
 */

import { useEffect } from 'react';

let done = false;

/*
 * The app's opening: the white bars sit in the middle until the PIN screen
 * (or sign in) has drawn underneath, then rush forward and fade, so the page
 * is revealed through them. The bars always get their moment: if the page is
 * ready almost at once, the zoom waits until they have been seen for
 * MIN_SHOWN. The public website keeps its quiet fade.
 */
const MIN_SHOWN = 900;
const ZOOM_MS = 800;

export function bootDone(): void {
  if (done || typeof document === 'undefined') return;
  done = true;
  const el = document.getElementById('splash');
  if (!el) return;
  const site = document.documentElement.getAttribute('data-boot') === 'site';
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const go = () =>
    /* Two frames, so the page under it has painted before it starts to leave. */
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (site || calm) {
          el.classList.add('gone');
          window.setTimeout(() => el.remove(), 320);
          return;
        }
        el.classList.add('zoom');
        window.setTimeout(() => el.remove(), ZOOM_MS + 40);
      }),
    );
  const wait = site ? 0 : Math.max(0, MIN_SHOWN - performance.now());
  if (wait > 0) window.setTimeout(go, wait);
  else go();
}

/** Call in a component that renders the real page (not a loader). */
export function useBootDone(ready = true): void {
  useEffect(() => {
    if (ready) bootDone();
  }, [ready]);
}

export function startBootTimer(): void {
  window.setTimeout(bootDone, 20000);
}
