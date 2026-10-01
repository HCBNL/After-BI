/**
 * The parts every public page is now assembled from.
 *
 * THE IDEA BEHIND THE REBRAND
 *
 * Every school runs on a teacher's red pen: the tick, the circle, the line
 * under the thing that matters. GetSchool's red is that pen, and it is used
 * the way a teacher uses one, sparingly and by hand: the full stop after the
 * name and after a headline, a handwritten note on a photograph, one stroke
 * under it. Everything else stays in white and the navy of a school blazer,
 * so the red keeps meaning something.
 *
 * WHAT LIVES HERE
 *
 *   PublicShell  header, closing band, footer, help button and the two sheets
 *                (the wizard and the booking calendar), so a page is only its
 *                own content
 *   useAsk       opens either sheet from anywhere inside the shell
 *   Scribble     the handwritten note and its red underline
 *   Stop         the red full stop
 *   Row          a horizontal shelf with its own arrows
 *   PhotoSlot    an uploaded picture, or a designed stand-in until there is one
 *   FeaturePoster a feature's picture, when the owner has uploaded one
 *   QuestionList questions that open one at a time, all closed at first
 */

import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { imageUrl } from '@/lib/cloudinary';
import { useAsync } from '@/hooks/useAsync';
import { getSiteHomeFast, listPublishedPosts, rememberPosts, socialLinks, type SiteHome } from '@/lib/site';
import { SiteFooter, SiteHeader } from './chrome';
import { FloatingActions } from './FloatingActions';

/*
 * The two sheets behind the "Create your school" and "Book a walkthrough"
 * buttons: about 900 lines between them, and most visitors press neither. They
 * are fetched when the page goes idle (see `warm` below) or on the first press,
 * rather than being part of the first download of every public page.
 */
const loadWizard = () => import('./CreateSchoolWizard');
const loadBooking = () => import('./BookDemo');
const CreateSchoolWizard = lazy(() => loadWizard().then((m) => ({ default: m.CreateSchoolWizard })));
const BookDemo = lazy(() => loadBooking().then((m) => ({ default: m.BookDemo })));
import { btn, container } from './tokens';

/* --------------------------------------------------------------- the asks */

interface Ask {
  /** Opens the create-a-school wizard. */
  create: () => void;
  /** Opens the walkthrough calendar. */
  book: () => void;
  /** `site/home` once it has loaded: the socials and the walkthrough video. */
  home: SiteHome | undefined;
}

const AskContext = createContext<Ask>({ create: () => {}, book: () => {}, home: undefined });

export function useAsk(): Ask {
  return useContext(AskContext);
}

/* ------------------------------------------------------- opening a page */

const HOME_CACHE = 'gs.site-home';

function readCachedHome(): SiteHome | undefined {
  try {
    const raw = localStorage.getItem(HOME_CACHE);
    return raw ? (JSON.parse(raw) as SiteHome) : undefined;
  } catch {
    return undefined;
  }
}

/*
 * NOTHING HOLDS A PUBLIC PAGE OPEN ANY MORE.
 *
 * There used to be a gate here. It kept the navy wordmark over the page until
 * `site/home` had answered and every picture on the first screen had loaded,
 * capped at five seconds, and `index.html` held its own boot screen up for the
 * same reason. The intention was that a visitor never watched the front page
 * assemble itself.
 *
 * What it produced was worse than the thing it prevented. A first-time visitor
 * on a slow connection got a still, silent, navy screen with a logo on it for
 * several seconds, which is indistinguishable from a site that has hung, and
 * they leave before the page they were waiting for ever arrives. A page that
 * is visibly filling in is read as fast; a page that is perfect in five
 * seconds is read as broken.
 *
 * So the page now paints as soon as React has it: header, headline, shelves,
 * footer, all of it, and the pictures arrive into it as they load. The banner
 * draws its built-in slide immediately rather than waiting on Firestore (see
 * `HomePage`), and every image on the page keeps its own box, so nothing
 * jumps as they land.
 */

/* -------------------------------------------------------------- the shell */

/**
 * Everything around a public page.
 *
 * The wizard and the calendar are the same two components they always were;
 * the shell only owns whether they are open. `?create=1` and `?demo=1` open
 * them on arrival on any public page, and are cleared as they are read so a
 * refresh does not reopen a sheet somebody closed.
 */
export function PublicShell({
  overlay = false,
  closing = true,
  children,
}: {
  /** The front page: the header starts transparent over the banner. */
  overlay?: boolean;
  /** The red band above the footer. */
  closing?: boolean;
  children: ReactNode;
}) {
  const [creating, setCreating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [params, setParams] = useSearchParams();
  const [cached] = useState(readCachedHome);
  const { data } = useAsync(getSiteHomeFast, [], { handleError: true, cache: 'site-home' });
  /*
   * The last good copy of `site/home` is kept on the device, so a returning
   * visitor's banner and pictures are known on the first frame. A saved
   * document carries `updatedAt`; `getSiteHome` answers a failed read with an
   * empty one, which must never replace a good copy.
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
    if (params.get('create') !== null) setCreating(true);
    else if (params.get('demo') !== null) setBooking(true);
    else return;

    const next = new URLSearchParams(params);
    next.delete('create');
    next.delete('demo');
    setParams(next, { replace: true });
  }, [params, setParams]);

  /*
   * Navy past the page's edges too. Without it a phone's rubber-band scroll
   * past the footer showed the document's white, which reads as the page
   * having more below it. The browser's own bar goes navy with it.
   */
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    root.dataset.surface = 'night';
    meta?.setAttribute('content', '#0a0f1e');
    return () => {
      delete root.dataset.surface;
      if (meta && before) meta.setAttribute('content', before);
    };
  }, []);

  /*
   * Once this page has opened, fetch the rest of the site quietly: the code
   * for the other public pages and the blog's list of articles. A tap on Blog
   * then draws on the first frame, from the list kept on the device, instead
   * of showing a loader while Firestore answers.
   */
  useEffect(() => {
    const warm = () => {
      void loadWizard();
      void loadBooking();
      void import('@/pages/public/BlogIndex');
      void import('@/pages/public/AboutPage');
      void import('@/pages/public/FeaturePage');
      void import('@/pages/public/PricingPage');
      void listPublishedPosts()
        .then(rememberPosts)
        .catch(() => {
          /* offline, or the rules say no: the blog fetches again when opened */
        });
    };
    const idle = typeof window.requestIdleCallback === 'function';
    const id = idle ? window.requestIdleCallback(warm) : window.setTimeout(warm, 1500);
    return () => {
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  /* Mounted from the first press on, so closing still animates. */
  const [wizardUsed, setWizardUsed] = useState(false);
  const [bookingUsed, setBookingUsed] = useState(false);
  useEffect(() => {
    if (creating) setWizardUsed(true);
    if (booking) setBookingUsed(true);
  }, [creating, booking]);
  const create = useCallback(() => setCreating(true), []);
  const book = useCallback(() => setBooking(true), []);
  const ask = useMemo(() => ({ create, book, home }), [create, book, home]);

  return (
    <AskContext.Provider value={ask}>
      <div className="night flex min-h-[100dvh] flex-col">
        <SiteHeader overlay={overlay} onCreate={create} onBook={book} />
        <main className="flex-1">{children}</main>
        {closing && <ClosingBand />}
        <SiteFooter social={socialLinks(home?.social)} />
      </div>

      <FloatingActions onCreate={create} onBook={book} />
      <Suspense fallback={null}>
        {(wizardUsed || creating) && <CreateSchoolWizard open={creating} onClose={() => setCreating(false)} />}
        {(bookingUsed || booking) && <BookDemo open={booking} onClose={() => setBooking(false)} />}
      </Suspense>
    </AskContext.Provider>
  );
}

/* ------------------------------------------------------ the closing band */

/** The red band above every footer. The last thing a reader sees is the ask. */
export function ClosingBand() {
  const { create, book } = useAsk();

  return (
    <section className="relative isolate overflow-hidden bg-brand-600 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-28 -z-10 h-[26rem] w-[26rem] rounded-full border-[3.5rem] border-white/[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[24rem] w-[24rem] rounded-full bg-white/[0.06]"
      />

      <div className={cn(container, 'py-16 text-center sm:py-20')}>
        <p className="inline-block -rotate-3 font-script text-[1.75rem] font-bold leading-none text-white/90 sm:text-[2.1rem]">
          Be part of the change
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-[2.2rem] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[3.4rem]">
          Let’s build smarter schools.
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={create}
            className={cn(btn.white, 'focus-visible:outline-white')}
          >
            Create your school
          </button>
          <button
            type="button"
            onClick={book}
            className={cn(btn.lineWhite, 'focus-visible:outline-white')}
          >
            Book a walkthrough
          </button>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- the red pen */

/** The full stop, in the pen's red. */
export function Stop() {
  return <span className="text-brand-500">.</span>;
}

/* --------------------------------------------------------------- the shelf */

/**
 * A row that scrolls sideways, with arrows that know where its ends are.
 *
 * Swiped on a phone, arrowed on a laptop. The row runs to the right-hand edge
 * of the screen while its first card lines up with the page's text column, so
 * the card cut off at the edge says "there is more" without a word.
 */
export function Row({
  title,
  action,
  id,
  lead,
  children,
}: {
  title: string;
  action?: ReactNode;
  id?: string;
  /**
   * A row of its own, above the main one, under the same heading.
   *
   * For the home page's updates shelf, where a walkthrough video and a set of
   * written articles were sharing one horizontal track — so the video sat in
   * the first slot and pushed every article off the right-hand edge, and a
   * reader had to scroll past a film to discover the blog existed. They are
   * different kinds of thing and they are read differently: you watch one and
   * you skim several. One track each.
   *
   * Scrolls independently and without arrows, because there will be two or
   * three videos here at most and a control for a row that rarely overflows is
   * a control that is usually disabled.
   */
  lead?: ReactNode;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const start = node.scrollLeft <= 4;
    const end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 4;
    setEdge((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    if (track.current) observer?.observe(track.current);
    return () => {
      node.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const node = scroller.current;
    if (!node) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  const scrollable = !(edge.start && edge.end);

  return (
    <section id={id} className="scroll-mt-24 py-6 sm:py-8">
      <div className={cn(container, 'flex items-center justify-between gap-4')}>
        <div className="flex min-w-0 items-baseline gap-4">
          <h2 className="font-display text-[1.3rem] font-bold tracking-[-0.025em] text-primary sm:text-[1.6rem]">
            {title}
          </h2>
          {action}
        </div>
        {scrollable && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <ArrowButton direction="back" disabled={edge.start} onClick={() => move(-1)} />
            <ArrowButton direction="next" disabled={edge.end} onClick={() => move(1)} />
          </div>
        )}
      </div>

      {lead && (
        <div className="row-scroll row-gutter mt-4 pb-1">
          <div className="row-track flex w-max shrink-0 gap-3 sm:gap-4">{lead}</div>
        </div>
      )}

      <div ref={scroller} className={cn('row-scroll row-gutter pb-3', lead ? 'mt-5' : 'mt-4')}>
        <div ref={track} className="row-track flex w-max shrink-0 gap-3 sm:gap-4">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Drawn with two borders rather than an icon. */
function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'back' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'back' ? 'Scroll back' : 'Scroll forward'}
      className="tap inline-flex items-center justify-center rounded-full bg-[var(--surface-sunken)] text-primary ring-1 ring-inset ring-[var(--border-hairline)] transition-colors hover:ring-[var(--border-strong)] disabled:cursor-default disabled:opacity-30"
    >
      <span
        aria-hidden
        className={cn(
          'block h-2.5 w-2.5 rotate-45 border-current',
          direction === 'back' ? 'ml-1 border-b-2 border-l-2' : 'mr-1 border-r-2 border-t-2',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------ the photo */

/**
 * A picture the owner uploaded, or the designed stand-in until there is one.
 *
 * Every picture on the public pages is now the owner's to publish, from
 * Owner → Website, so `src` is whatever `site/home` holds: empty draws
 * `fallback`. `pending` means `site/home` has not arrived yet, and draws
 * nothing rather than flashing the stand-in before the picture replaces it.
 *
 * The container needs its own size (an aspect ratio, usually).
 */
export function PhotoSlot({
  src,
  alt,
  fallback,
  className,
  imageClassName,
  width = 900,
  priority,
  pending,
}: {
  src?: string;
  alt: string;
  fallback?: ReactNode;
  className?: string;
  imageClassName?: string;
  /** The widest it is drawn, in CSS pixels. Cloudinary is asked for twice that. */
  width?: number;
  priority?: boolean;
  pending?: boolean;
}) {
  const url = src?.trim() ? imageUrl(src, { width }) : '';
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const broken = Boolean(url) && failed === url;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!pending && (!url || broken) && fallback}
      {url && !broken && (
        <img
          key={url}
          src={url}
          alt={alt}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            loaded === url ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
        />
      )}
    </div>
  );
}

/**
 * A feature's picture at 16:9, when the owner has uploaded one.
 *
 * Nothing at all when they have not. The public pages show only pictures the
 * owner published in Owner → Website; a feature without one is laid out as
 * words, never as a stand-in panel pretending to be a picture.
 */
export function FeaturePoster({
  image,
  className,
  imageClassName,
  width = 720,
  priority,
  alt = '',
}: {
  image?: string;
  className?: string;
  imageClassName?: string;
  width?: number;
  priority?: boolean;
  alt?: string;
}) {
  const url = image?.trim() ? imageUrl(image, { width }) : '';
  const [loaded, setLoaded] = useState('');
  if (!url) return null;

  return (
    <div className={cn('relative aspect-video overflow-hidden bg-night-2', className)}>
      <img
        src={url}
        alt={alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setLoaded(url)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
          loaded === url ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------- the questions */

/**
 * Questions and answers, every one closed until it is pressed.
 *
 * The answers stay in the page while closed (squeezed to no height, and inert
 * so they are skipped by the keyboard and screen readers), which is what lets
 * a feature page mark them up as an FAQ: the text a search engine is told
 * about is text that is on the page.
 */
export function QuestionList({
  items,
  size = 'md',
  className,
}: {
  items: { q: string; a: string }[];
  size?: 'md' | 'lg';
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  const big = size === 'lg';

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => {
        const expanded = open === index;
        const panel = `${base}-${index}`;
        return (
          <li key={item.q} className="bg-night-2">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              aria-controls={panel}
              className={cn(
                'flex w-full items-center justify-between gap-6 text-left transition-colors hover:bg-night-3',
                big ? 'px-5 py-5 sm:px-7 sm:py-6' : 'px-5 py-4 sm:px-6',
              )}
            >
              <span
                className={cn(
                  'font-semibold leading-snug text-white',
                  big ? 'text-[17px] sm:text-[21px]' : 'text-[16px] sm:text-[17.5px]',
                )}
              >
                {item.q}
              </span>
              <span
                aria-hidden
                className={cn(
                  'relative block shrink-0 transition-transform duration-300',
                  big ? 'h-6 w-6' : 'h-5 w-5',
                  expanded && 'rotate-45',
                )}
              >
                <span className="absolute left-0 top-1/2 h-[2.5px] w-full -translate-y-1/2 rounded-full bg-white" />
                <span className="absolute left-1/2 top-0 h-full w-[2.5px] -translate-x-1/2 rounded-full bg-white" />
              </span>
            </button>
            <div
              id={panel}
              inert={!expanded}
              className="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p
                  className={cn(
                    'border-t border-night leading-[1.7] text-white/78',
                    big ? 'px-5 py-5 text-[15.5px] sm:px-7 sm:py-6 sm:text-[17.5px]' : 'px-5 py-4 text-[15px] sm:px-6',
                  )}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
