/**
 * Paint the browser's own chrome in the colour at the top of the home screen.
 *
 * THE WHITE LINE
 *
 * The red panel is drawn by the page, but the strip above it — the status bar,
 * Safari's address bar, Chrome's toolbar — is drawn by the browser, and each
 * browser takes that colour from a different place. Chrome on Android, desktop
 * Safari's tab bar and an installed app read `<meta name="theme-color">`.
 * Safari on a recent iPhone ignores that tag and samples the page: the root
 * background and whatever is painted at the top edge. None of them matched the
 * panel, so the phone drew its own grey or white band across the top of the
 * one screen that was meant to be red to the glass.
 *
 * So, while the home screen is up:
 *
 *   • the meta tag takes the panel's colour at every width, because the laptop
 *     home has the panel across its top now too (`DeskHero`);
 *   • <html> and <body> take it on a phone only. They only ever show above and
 *     below the page — the shell paints its own surface over everything in
 *     between — and on a laptop that would be a red flash under a white rail
 *     whenever the page bounced.
 *
 * Everything is put back when the screen goes. The colour is read from
 * `--hero`, so dark mode gets the dark panel's colour, and a theme switch
 * while the screen is up is followed at once.
 */

import { useEffect } from 'react';

const PHONE = '(max-width: 1023.98px)';

export function useBrowserChrome(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.matchMedia) return;

    const root = document.documentElement;
    const body = document.body;
    const phone = window.matchMedia(PHONE);
    const os = window.matchMedia('(prefers-color-scheme: dark)');

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const tag = meta;
    const before = {
      meta: tag.getAttribute('content') ?? '',
      root: root.style.backgroundColor,
      body: body.style.backgroundColor,
    };

    const apply = () => {
      const hero = getComputedStyle(root).getPropertyValue('--hero').trim() || '#7f151a';
      tag.setAttribute('content', hero);
      root.style.backgroundColor = phone.matches ? hero : before.root;
      body.style.backgroundColor = phone.matches ? hero : before.body;
    };

    apply();
    const watcher = new MutationObserver(apply);
    // `data-accent` too: a new interface colour changes `--hero`, and the browser bar should follow.
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
    window.addEventListener('gs:accent', apply);
    phone.addEventListener('change', apply);
    os.addEventListener('change', apply);

    return () => {
      watcher.disconnect();
      window.removeEventListener('gs:accent', apply);
      phone.removeEventListener('change', apply);
      os.removeEventListener('change', apply);
      tag.setAttribute('content', before.meta);
      root.style.backgroundColor = before.root;
      body.style.backgroundColor = before.body;
      if (created) tag.remove();
    };
  }, [enabled]);
}
