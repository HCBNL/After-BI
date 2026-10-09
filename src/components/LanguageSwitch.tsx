/**
 * English / 简体中文 / Français, each with its flag. Shown on the public site, the sign-in screens and inside
 * the app. Each option is written in its own language, so a reader who knows
 * only one of them can still find it. Marked `translate="no"` so the
 * translator never rewrites the labels.
 */

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Flag } from '@/components/Flag';
import { cn } from '@/lib/cn';
import { LANGS, getLang, setLang } from '@/lib/i18n';

export function LanguageSwitch({
  className,
  onInk = false,
  full = false,
  flags = false,
  up = false,
}: {
  className?: string;
  /** White, for dark backgrounds. */
  onInk?: boolean;
  /** Both options side by side (menus, profile), instead of a dropdown. */
  full?: boolean;
  /** All three flags in a row, for the strip at the very top of the public site. */
  flags?: boolean;
  /** Open the dropdown upwards. */
  up?: boolean;
}) {
  const current = getLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (flags) {
    return (
      <div translate="no" role="group" aria-label="Language" className={cn('notranslate flex items-center gap-1', className)}>
        {LANGS.map((lang) => {
          const on = lang.code === current;
          return (
            <button
              key={lang.code}
              type="button"
              lang={lang.code === 'zh' ? 'zh-CN' : lang.code}
              aria-pressed={on}
              aria-label={lang.label}
              title={lang.label}
              onClick={() => !on && setLang(lang.code)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-full px-2.5 text-[13px] font-bold transition-colors sm:px-3',
                on ? 'bg-white text-navy-900' : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <Flag lang={lang.code} className="h-4 w-6" />
              <span>{lang.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (full) {
    return (
      <div translate="no" className={cn('notranslate inline-flex rounded-xl border border-hairline surface-sunken p-1', className)} role="group" aria-label="Language">
        {LANGS.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => lang.code !== current && setLang(lang.code)}
            aria-pressed={lang.code === current}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors',
              lang.code === current ? 'surface-card text-primary shadow-sm' : 'text-secondary hover:text-primary',
            )}
          >
            <Flag lang={lang.code} />
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={box} translate="no" className={cn('notranslate relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        className={cn(
          'tap inline-flex items-center gap-1.5 rounded-full px-2.5 text-[14px] font-bold transition-colors',
          onInk ? 'text-white hover:bg-white/10' : 'text-navy-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/10',
        )}
      >
        <Flag lang={current} />
        <span>{LANGS.find((l) => l.code === current)?.short}</span>
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-[70] min-w-[10rem] overflow-hidden rounded-xl bg-white py-1 text-[#0f1f36] shadow-[0_18px_40px_-16px_rgba(15,31,54,0.45)] ring-1 ring-black/10',
            up ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang.code === current}
              onClick={() => {
                setOpen(false);
                if (lang.code !== current) setLang(lang.code);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14.5px] font-semibold hover:bg-black/5"
            >
              <span className="flex items-center gap-2.5">
                <Flag lang={lang.code} />
                {lang.label}
              </span>
              {lang.code === current && <Check size={16} aria-hidden className="text-[#ee6a00]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
