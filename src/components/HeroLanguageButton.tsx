/**
 * The language, as a flag in a round button on the coloured panel.
 *
 * Only the flag shows, centred, with no arrow. A tap opens a small pill of
 * the three flags just under it (English, 简体中文, Français); the one in use
 * is ringed, a tap on another switches the app at once. The pill is drawn
 * over everything (the panel clips what overflows it), and closes on a tap
 * outside or Escape.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from '@/components/Flag';
import { cn } from '@/lib/cn';
import { LANGS, getLang, setLang } from '@/lib/i18n';

export function HeroLanguageButton({ className }: { className?: string }) {
  const current = getLang();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const name = LANGS.find((l) => l.code === current)?.label ?? 'Language';

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = 3 * 44 + 2 * 4 + 12;
      const centre = r.left + r.width / 2;
      setPos({ top: r.bottom + 8, left: Math.min(Math.max(8, centre - width / 2), window.innerWidth - width - 8) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!pill.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        translate="no"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${name}`}
        title={name}
        className={cn(
          'notranslate relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] transition-colors hover:bg-white/20 active:bg-white/25',
          open && 'bg-white/25',
          className,
        )}
      >
        <Flag lang={current} className="h-[15px] w-[22px]" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={pill}
            role="menu"
            aria-label="Choose a language"
            translate="no"
            className="notranslate surface-card fixed z-[80] flex items-center gap-1 rounded-full border border-hairline p-1.5 shadow-pop animate-fade-in"
            style={{ top: pos.top, left: pos.left }}
          >
            {LANGS.map((lang) => {
              const on = lang.code === current;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  aria-label={lang.label}
                  title={lang.label}
                  lang={lang.code === 'zh' ? 'zh-CN' : lang.code}
                  onClick={() => {
                    setOpen(false);
                    if (!on) setLang(lang.code);
                  }}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                    on
                      ? 'bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/15'
                      : 'hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  <Flag lang={lang.code} className="h-[15px] w-[22px]" />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
