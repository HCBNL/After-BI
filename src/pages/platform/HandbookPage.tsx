/**
 * Platform → Handbook (and the same page for AfterBI's own staff).
 *
 * The AfterBI Handbook, shown as a book you can leaf through, and downloaded
 * as an A4 PDF to hand to a company that is coming on board. Nothing is
 * written per company: the content and prices are fixed in the system. The
 * edition is the year it is downloaded in, and the only thing to type, if
 * wanted, is the name of the company it is for, printed on the cover and on
 * the commitment page.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Field, Input, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fileName, handbookYear } from '@/lib/handbook';
import { handbookPdf } from '@/lib/handbookPdf';
import { DEFAULT_CUSTOM, resolveCustom, type CustomBuild } from '@/lib/programme';
import { getSiteHome } from '@/lib/siteDoc';
import { handbookPages } from './handbook/pages';

const W = 794;
const H = 1123;
const COMPANY_KEY = 'ab.handbook.company';

function readCompany(): string {
  try {
    return localStorage.getItem(COMPANY_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function HandbookPage() {
  const toast = useToast();
  const year = handbookYear();
  const [company, setCompany] = useState(readCompany);
  const [custom, setCustom] = useState<CustomBuild>(DEFAULT_CUSTOM);
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const stack = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    getSiteHome().then((home) => live && setCustom(resolveCustom(home.customBuild)));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COMPANY_KEY, company);
    } catch {
      /* private mode: it simply is not remembered */
    }
  }, [company]);

  const pages = useMemo(() => handbookPages({ year, company: company.trim(), custom }), [year, company, custom]);

  /* Download: draw every page at full size off screen, capture, save. */
  const download = async () => {
    setExporting(true);
    setBusy('Preparing');
    try {
      await new Promise((r) => setTimeout(r, 120));
      const nodes = Array.from(stack.current?.querySelectorAll<HTMLElement>('.hb-page') ?? []);
      await handbookPdf(nodes, fileName(company, year), (done, total) => setBusy(`Page ${done} of ${total}`));
      toast.success('Handbook downloaded', 'Ready to send.');
    } catch (err) {
      toast.error('Could not make the PDF', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setExporting(false);
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Handbook ${year}`}
        description="Our brand card for companies coming on board: the product, the prices and how we start. Download it as a PDF and send it."
        actions={
          <Button size="sm" icon={<Download size={15} />} loading={Boolean(busy)} onClick={() => void download()}>
            {busy ?? 'Download PDF'}
          </Button>
        }
      />

      <div className="mb-5 max-w-md">
        <Field label="Prepared for" hint="Optional. Printed on the cover and the commitment page. Leave it empty for a general copy.">
          <Input value={company} onChange={(e) => setCompany(e.target.value.slice(0, 80))} placeholder="Company name" />
        </Field>
      </div>

      <Book pages={pages} />

      {exporting &&
        createPortal(
          <div ref={stack} aria-hidden style={{ position: 'fixed', left: -20000, top: 0, display: 'flex', flexDirection: 'column', gap: 0, pointerEvents: 'none' }}>
            {pages}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* --------------------------------------------------------------- the book */

function Book({ pages }: { pages: ReactNode[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* Two pages side by side on a wide screen, as an open book: the cover alone, then spreads, then the back alone. */
  const spreads = width >= 920;
  const views = useMemo(() => {
    const n = pages.length;
    if (!spreads) return pages.map((_, i) => [i]);
    const out: number[][] = [[0]];
    for (let i = 1; i < n - 1; i += 2) out.push(i + 1 < n - 1 ? [i, i + 1] : [i]);
    out.push([n - 1]);
    return out;
  }, [pages, spreads]);

  const view = Math.min(at, views.length - 1);
  const shown = views[view];
  const go = useCallback(
    (step: number) => {
      setDir(step > 0 ? 'next' : 'prev');
      setAt((v) => Math.max(0, Math.min(views.length - 1, v + step)));
    },
    [views.length],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go]);

  /* Swipe on a phone. */
  const touch = useRef<number | null>(null);

  const across = spreads ? 2 : 1;
  /* Fit the width, and on a computer the height too, so a whole spread is in view. */
  const tall = typeof window === 'undefined' ? 900 : window.innerHeight;
  const byHeight = spreads ? Math.max(420, tall - 230) / H : 1;
  const scale = width ? Math.min(1, (width - (spreads ? 32 : 0)) / (W * across), byHeight) : 0.4;
  const label = shown.length === 2 ? `Pages ${shown[0] + 1} and ${shown[1] + 1} of ${pages.length}` : `Page ${shown[0] + 1} of ${pages.length}`;

  return (
    <div className="rounded-[22px] bg-[#0b0f1a] p-4 sm:p-8">
      <div
        ref={box}
        className="hb-stage relative flex justify-center"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <div
          key={`${view}-${spreads}`}
          className={cn('hb-sheet flex', dir === 'next' ? 'hb-turn-next' : 'hb-turn-prev')}
          style={{ width: W * shown.length * scale, height: H * scale }}
        >
          <div className="flex origin-top-left" style={{ transform: `scale(${scale})`, width: W * shown.length, height: H }}>
            {shown.map((i) => (
              <div key={i} style={{ width: W, height: H }}>
                {pages[i]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 text-white">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={view === 0}
          aria-label="Previous page"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="min-w-[10rem] text-center text-label font-semibold text-white/80">{label}</p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={view === views.length - 1}
          aria-label="Next page"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
