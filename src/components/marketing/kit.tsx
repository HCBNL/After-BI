/**
 * Everything around a public page, so a page is only its own content.
 *
 *   PublicShell   header, closing band, footer, the help bubble and the
 *                 booking sheet
 *   useAsk        opens the booking sheet from anywhere inside the shell
 *   ClosingBand   the green band above every footer
 *
 * `?demo=1` on any public address opens the booking sheet on arrival, and is
 * cleared from the address as it is read, so a refresh does not reopen a sheet
 * somebody has just closed. It is what the buttons in an email campaign point
 * at.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { getSiteHome, type SiteHome } from '@/lib/siteDoc';
import { SiteFooter, SiteHeader } from './chrome';
import { BookDemo } from './BookDemo';
import { HelpBubble } from './HelpBubble';
import { btn, container } from './tokens';
import { SiteImagesProvider } from './site-ui';
import { Art } from './art';

/* ---------------------------------------------------------------- the ask */

interface Ask {
  /** Opens the walkthrough sheet. */
  book: () => void;
  /**
   * `site/home` once it has loaded: the owner's cover slides and pictures.
   * `undefined` means it has not answered yet, which is what stops the
   * built-in cover flashing up for a moment before the owner's own.
   */
  home: SiteHome | undefined;
}

const AskContext = createContext<Ask>({ book: () => {}, home: undefined });

export function useAsk(): Ask {
  return useContext(AskContext);
}

/* ------------------------------------------------------- the owner's pictures */

const HOME_CACHE = 'ab.site-home';

/**
 * The last good copy, kept on the device.
 *
 * A returning visitor's cover image is then known on the first frame rather
 * than one network round trip later, which on a Nigerian mobile connection is
 * the difference between a front page that opens with a photograph and one
 * that opens with a dark rectangle and fills in.
 */
function readCachedHome(): SiteHome | undefined {
  try {
    const raw = localStorage.getItem(HOME_CACHE);
    return raw ? (JSON.parse(raw) as SiteHome) : undefined;
  } catch {
    return undefined;
  }
}

/* -------------------------------------------------------------- the shell */

export function PublicShell({
  overlay = false,
  closing = true,
  children,
}: {
  /** The front page: the header starts transparent over the ink hero. */
  overlay?: boolean;
  /** The green band above the footer. Off on the page that is itself an ask. */
  closing?: boolean;
  children: ReactNode;
}) {
  const [booking, setBooking] = useState(false);
  const [params, setParams] = useSearchParams();
  const { pathname, hash } = useLocation();

  const [cached] = useState(readCachedHome);
  const { data } = useAsync(getSiteHome, [], { handleError: true, cache: 'site-home' });
  /*
   * A saved document carries `updatedAt`; `getSiteHome` answers a failed read
   * with an empty one, which must never be allowed to replace a good cached
   * copy, otherwise one dropped request blanks the cover for a visitor who
   * had it a second ago.
   */
  const fresh = data ?? undefined;
  const home = fresh && (fresh.updatedAt || !cached) ? fresh : (cached ?? fresh);

  useEffect(() => {
    if (!fresh?.updatedAt) return;
    try {
      localStorage.setItem(HOME_CACHE, JSON.stringify(fresh));
    } catch {
      /* storage full or blocked: the next visit fetches, that is all */
    }
  }, [fresh]);

  useEffect(() => {
    if (params.get('demo') === null) return;
    setBooking(true);
    const next = new URLSearchParams(params);
    next.delete('demo');
    setParams(next, { replace: true });
  }, [params, setParams]);

  /*
   * A new page starts at the top of itself.
   *
   * React Router keeps the scroll position across a navigation, which is right
   * for a back button and wrong for a link: following "Pricing" from the foot
   * of the front page otherwise lands the reader two thirds of the way down a
   * page they have never seen, looking at the FAQ of something else. The app's
   * own shell scrolls its main region and never hit this; the public pages
   * scroll the document, so they do.
   */
  useEffect(() => {
    if (hash) {
      /* A link to a section: wait a frame for the page to draw, then go there. */
      const id = decodeURIComponent(hash.slice(1));
      const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  const book = useCallback(() => setBooking(true), []);
  const ask = useMemo(() => ({ book, home }), [book, home]);

  /* Every uploaded picture, slot to address. The older per module field is
     read too, so pictures published before slots existed still show. */
  const images = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [slug, url] of Object.entries(home?.moduleImages ?? {})) if (url) out[`module-${slug}`] = url;
    for (const [slot, url] of Object.entries(home?.images ?? {})) if (url) out[slot] = url;
    return out;
  }, [home]);

  /*
   * Dark past the page's edges too.
   *
   * Without it a phone's rubber-band scroll past the footer shows the
   * document's own white, which reads as the page having more below it. The
   * browser's own bar goes dark with it.
   */
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    root.dataset.surface = 'site';
    /*
     * The browser's own bar takes the structure colour, never the accent:
     * it is a frame round the page, which is the thirty per cent's job. It
     * is written out rather than read from a token because this runs before
     * paint, when `.site` has not been mounted to compute a variable from.
     */
    meta?.setAttribute('content', '#0f1f36');
    return () => {
      delete root.dataset.surface;
      if (meta && before) meta.setAttribute('content', before);
    };
  }, []);

  return (
    <AskContext.Provider value={ask}>
     <SiteImagesProvider value={images}>
      {/*
       * Everything public lives inside `.site`, the float and the sheet
       * included.
       *
       * They used to sit outside it, as siblings, and that quietly cost them
       * the palette: `.site` is where the public site's accent and structure
       * scales are declared, so a `bg-brand-600` outside it resolved to the
       * *app's* green instead of the site's orange. The old float papered
       * over it by hard-coding a hex, which is why it was the one thing on
       * the page a palette change could not reach. Both are children now, so
       * neither can drift again.
       *
       * They are fixed-position, so being inside a flex column changes
       * nothing about where they draw.
       */}
      <div className="site flex min-h-[100dvh] flex-col">
        <SiteHeader overlay={overlay} onBook={book} />
        <main className="flex-1">{children}</main>
        {closing && <ClosingBand />}
        <SiteFooter />

        <HelpBubble onBook={book} />
        <BookDemo open={booking} onClose={() => setBooking(false)} />
      </div>
     </SiteImagesProvider>
    </AskContext.Provider>
  );
}

/* ------------------------------------------------------- the closing band */

/**
 * The final call, the owner's pattern: a deep card with two of his shapes,
 * large, turning and walking through the palette at either side, the AfterBI
 * mark between them, and the ask. The button is the brightest thing in it.
 */
function ClosingBand() {
  const { book } = useAsk();

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className={container}>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-16 text-center text-white sm:rounded-[2.75rem] sm:px-12 sm:py-20">
          <Art name="bloom" speed={0.55} className="pointer-events-none absolute -left-20 top-1/2 -z-10 h-56 w-56 -translate-y-1/2 opacity-90 sm:-left-16 sm:h-80 sm:w-80" />
          <Art name="pinwheel" shift={2} speed={0.55} className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-56 w-56 -translate-y-1/2 opacity-90 sm:-right-16 sm:h-80 sm:w-80" />
          <Art name="spark" shift={1} className="pointer-events-none absolute left-[22%] top-10 -z-10 hidden h-8 w-8 sm:block" />
          <Art name="spark" shift={3} className="pointer-events-none absolute bottom-12 right-[24%] -z-10 hidden h-6 w-6 sm:block" />

          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
            <img src="/brand/afterbi-mark.png" alt="AfterBI" width={44} height={44} className="h-11 w-11 object-contain" />
          </span>
          <h2 className="mx-auto mt-7 max-w-xl font-display text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.035em] text-balance sm:text-[2.6rem]">
            Ready to see AfterBI in action?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-white/80">
            A guided demo, configured around your products, partners and price lists.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={book} className={btn.accent}>
              Book a demo
            </button>
            <Link to="/pricing" className={btn.lineWhite}>
              See plans and pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * The float that used to live here was a single orange circle straight to
 * WhatsApp. It is now `HelpBubble`, which answers the common questions in
 * place and keeps the conversation as the last resort rather than the only
 * one. The reasoning is at the top of that file.
 */
