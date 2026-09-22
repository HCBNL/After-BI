/**
 * Everything around a public page, so a page is only its own content.
 *
 *   PublicShell   header, closing band, footer, the WhatsApp button and the
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
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { getSiteHome, type SiteHome } from '@/lib/siteDoc';
import { SOCIAL } from '@/lib/site';
import { SiteFooter, SiteHeader } from './chrome';
import { BookDemo } from './BookDemo';
import { btn, container } from './tokens';

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
  const { pathname } = useLocation();

  const [cached] = useState(readCachedHome);
  const { data } = useAsync(getSiteHome, [], { handleError: true, cache: 'site-home' });
  /*
   * A saved document carries `updatedAt`; `getSiteHome` answers a failed read
   * with an empty one, which must never be allowed to replace a good cached
   * copy — otherwise one dropped request blanks the cover for a visitor who
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  const book = useCallback(() => setBooking(true), []);
  const ask = useMemo(() => ({ book, home }), [book, home]);

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
    root.dataset.surface = 'night';
    meta?.setAttribute('content', '#0a0c10');
    return () => {
      delete root.dataset.surface;
      if (meta && before) meta.setAttribute('content', before);
    };
  }, []);

  return (
    <AskContext.Provider value={ask}>
      <div className="ink flex min-h-[100dvh] flex-col">
        <SiteHeader overlay={overlay} onBook={book} />
        <main className="flex-1">{children}</main>
        {closing && <ClosingBand />}
        <SiteFooter />
      </div>

      <WhatsAppButton />
      <BookDemo open={booking} onClose={() => setBooking(false)} />
    </AskContext.Provider>
  );
}

/* ------------------------------------------------------- the closing band */

/**
 * The green band above every footer. The last thing a reader sees is the ask.
 *
 * Green here and nowhere else at this size: the band is the one place on the
 * site where the brand colour is the material rather than the mark, and it
 * works precisely because the twelve screens above it were ink and paper.
 */
export function ClosingBand() {
  const { book } = useAsk();

  return (
    <section className="relative isolate overflow-hidden bg-brand-700 text-white dark:bg-brand-800">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-28 -z-10 h-[26rem] w-[26rem] rounded-full border-[3.5rem] border-white/[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[24rem] w-[24rem] rounded-full bg-white/[0.06]"
      />

      <div className={cn(container, 'py-16 text-center sm:py-20')}>
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/60">Forty minutes, on your numbers</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-[2.1rem] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-[3.2rem]">
          Find out what your channel is actually holding.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={book} className={cn(btn.white, 'focus-visible:outline-white')}>
            Book a walkthrough
          </button>
          <a
            href={SOCIAL[2].href}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(btn.lineWhite, 'focus-visible:outline-white')}
          >
            Message us on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- the float */

/**
 * One button, bottom right, and it is WhatsApp rather than a chat widget.
 *
 * A hosted chat bubble is three hundred kilobytes of somebody else's
 * JavaScript, it is staffed between nine and five in a timezone that is not
 * this one, and the visitor has to stay on the page for the answer. In this
 * market the conversation is going to end up on WhatsApp regardless, so it may
 * as well start there and cost nothing.
 */
function WhatsAppButton() {
  return (
    <a
      href={SOCIAL[2].href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Message AfterBI on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex h-13 w-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition-transform hover:scale-105 active:scale-95 sm:bottom-7 sm:right-7 dark:bg-brand-500 dark:text-brand-950"
      style={{ bottom: 'calc(1.25rem + var(--safe-bottom))' }}
    >
      <MessageCircle size={22} aria-hidden />
    </a>
  );
}
