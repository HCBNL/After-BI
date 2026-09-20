/**
 * Paint the browser's own bar (status bar, Safari's address bar, Chrome's
 * toolbar) in the panel colour while a panel is on screen, so the colour runs
 * to the top of the glass with no white seam. Put back when the screen goes.
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
      const hero = getComputedStyle(root).getPropertyValue('--hero').trim() || '#064e3b';
      tag.setAttribute('content', hero);
      root.style.backgroundColor = phone.matches ? hero : before.root;
      body.style.backgroundColor = phone.matches ? hero : before.body;
    };

    apply();
    const watcher = new MutationObserver(apply);
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    phone.addEventListener('change', apply);
    os.addEventListener('change', apply);

    return () => {
      watcher.disconnect();
      phone.removeEventListener('change', apply);
      os.removeEventListener('change', apply);
      tag.setAttribute('content', before.meta);
      root.style.backgroundColor = before.root;
      body.style.backgroundColor = before.body;
      if (created) tag.remove();
    };
  }, [enabled]);
}
