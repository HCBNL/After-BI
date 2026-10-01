/**
 * Start each page at the top.
 *
 * A browser resets the scroll position when it loads a document. A single-page
 * app never loads a second document — React swaps the contents of the one it
 * already has — so the scroll position simply stays where it was. Tap "Report
 * cards" from two thirds of the way down the home page and the feature page
 * opens two thirds of the way down, which on a shorter page is the footer. It
 * reads as a broken link rather than as a scroll position.
 *
 * THREE CASES, AND THEY ARE NOT THE SAME
 *
 *   - **A new page.** Go to the top. This is the bug above.
 *   - **A link to an anchor** (`/#about`, `/features#pricing`). Go to that
 *     element instead, because the whole point of the link was a place partway
 *     down. Jumping to the top would break it in the opposite direction.
 *   - **Back and forward.** Leave it alone. The browser restores where the
 *     reader was, which is exactly what they expect from Back, and overriding
 *     it is the other well-known version of this annoyance.
 *
 * Renders nothing. It exists for the effect.
 */

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { healClipped } from '@/lib/reveal';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Back or forward: the browser has its own memory of this entry and it is
    // better than ours.
    if (navigationType === 'POP') return;

    if (hash) {
      /*
       * Wait a frame before looking for the target. On a route change the new
       * page has not painted yet when this effect runs, so the element the
       * hash names does not exist and `getElementById` returns null — which
       * would silently do nothing and leave the reader at the old position.
       */
      const frame = requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          /*
           * `scrollIntoView` stays here, because it is the only thing that
           * honours `scroll-margin-top` — `#faq` carries `scroll-mt-24` so it
           * clears the header. What follows it is the repair: the same call
           * also scrolls any `overflow: hidden` ancestor it passes on the way
           * up, which is how the home hero came apart. See `lib/reveal.ts`.
           */
          target.scrollIntoView({ behavior: 'instant', block: 'start' });
          healClipped(target);
        } else window.scrollTo({ top: 0, behavior: 'instant' });
      });
      return () => cancelAnimationFrame(frame);
    }

    const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
    toTop();

    /*
     * And again on the next frame, for the same reason the menu sheet does it.
     *
     * Chrome's scroll anchoring keeps a reader's place when content above the
     * viewport changes height — and a whole page replacing another is the
     * largest such change there is. Without the second call the browser
     * helpfully undoes the jump a frame later and the page settles part way
     * down, which is the original complaint wearing a different hat.
     */
    const frame = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, navigationType]);

  return null;
}
