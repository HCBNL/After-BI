/**
 * The floating button, bottom right: a "speed dial".
 *
 * One round button holding a plus, drawn as the scalloped flower in a
 * colour that drifts slowly through the palette. A tap fans the quick
 * settings out above it in a straight line, each with its name beside it:
 *
 *   Language        the three flags open in a row beside it
 *   Hide balances   the eye; lit while figures are hidden
 *   Dark / Light    the theme, in one press
 *   Home screen     tiles or cards
 *   Full screen     laptops and desktops only: the app with no window frame
 *
 * They used to sit in the coloured panel's top right corner, on every page.
 * Moving them here frees that corner, so a long name has the room it needs
 * on a phone, and the page panels can be shorter.
 *
 * On a phone it floats above the bottom bar; a tap outside or Escape folds it.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Eye, EyeOff, Maximize, Minimize, Moon, PanelsTopLeft, Plus, Sun } from 'lucide-react';
import { useFullscreen } from '@/lib/fullscreen';
import { cn } from '@/lib/cn';
import { Flag } from '@/components/Flag';
import { LANGS, getLang, setLang } from '@/lib/i18n';
import { setStoredTheme } from '@/lib/theme';
import { toggleMoneyHidden, useMoneyHidden } from '@/lib/privacy';
import { useShell } from './ShellContext';

function useDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const root = document.documentElement;
    const watch = new MutationObserver(() => setDark(root.dataset.theme === 'dark'));
    watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watch.disconnect();
  }, []);
  return dark;
}

export function QuickDial({ homeChooser = true }: { homeChooser?: boolean }) {
  const [open, setOpen] = useState(false);
  const [langs, setLangs] = useState(false);
  const dark = useDark();
  const hidden = useMoneyHidden();
  const { openHomeChooser } = useShell();
  const current = getLang();
  const full = useFullscreen();
  /* A phone is already full screen, so the option shows on wider screens only. */
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!open) {
      setLangs(false);
      return;
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  /* Top of the list first in the markup; it is drawn bottom up, nearest the button last. */
  const items: { id: string; label: string; icon: ReactNode; on?: boolean; act: () => void; keepOpen?: boolean }[] = [
    ...(wide && full.supported
      ? [
          {
            id: 'full',
            label: full.on ? 'Leave full screen' : 'Full screen',
            icon: full.on ? <Minimize size={19} aria-hidden /> : <Maximize size={19} aria-hidden />,
            on: full.on,
            act: full.toggle,
          },
        ]
      : []),
    ...(homeChooser
      ? [{ id: 'home', label: 'Home screen', icon: <PanelsTopLeft size={19} aria-hidden />, act: openHomeChooser }]
      : []),
    {
      id: 'theme',
      label: dark ? 'Light mode' : 'Dark mode',
      icon: dark ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />,
      act: () => setStoredTheme(dark ? 'light' : 'dark'),
      keepOpen: true,
    },
    {
      id: 'money',
      label: hidden ? 'Show balances' : 'Hide balances',
      icon: hidden ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />,
      on: hidden,
      act: toggleMoneyHidden,
      keepOpen: true,
    },
    {
      id: 'lang',
      label: LANGS.find((l) => l.code === current)?.label ?? 'Language',
      icon: <Flag lang={current} className="h-[14px] w-[21px]" />,
      on: langs,
      act: () => setLangs((v) => !v),
      keepOpen: true,
    },
  ];

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[44] bg-black/25 backdrop-blur-[2px] animate-fade-in"
        />
      )}

      <div
        className="fixed bottom-[calc(var(--bottom-bar-h)+var(--safe-bottom)+1rem)] right-4 z-[45] flex flex-col items-end gap-3 lg:bottom-7 lg:right-7"
        data-dial
      >
        {open && (
          <ul role="menu" aria-label="Quick settings" className="flex flex-col items-end gap-2.5">
            {items.map((item, i) => (
              <li
                key={item.id}
                className="dial-item flex items-center gap-2.5"
                style={{ animationDelay: `${(items.length - 1 - i) * 40}ms` }}
              >
                {item.id === 'lang' && langs && (
                  <span className="flex items-center gap-1 rounded-full border border-hairline surface-card p-1 shadow-pop" translate="no">
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
                          onClick={() => {
                            setOpen(false);
                            if (!on) setLang(lang.code);
                          }}
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                            on ? 'bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/15' : 'hover:bg-[var(--surface-sunken)]',
                          )}
                        >
                          <Flag lang={lang.code} className="h-[14px] w-[21px]" />
                        </button>
                      );
                    })}
                  </span>
                )}
                <span className="rounded-full surface-card px-3 py-1.5 text-label font-semibold text-primary shadow-card">
                  {item.label}
                </span>
                <button
                  type="button"
                  role="menuitem"
                  aria-label={item.label}
                  onClick={() => {
                    item.act();
                    if (!item.keepOpen) setOpen(false);
                  }}
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full shadow-pop transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95',
                    item.on
                      ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950'
                      : 'surface-card text-primary ring-1 ring-[var(--border-hairline)]',
                  )}
                >
                  {item.icon}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? 'Close quick settings' : 'Quick settings: language, balances, theme, home screen'}
          title="Quick settings"
          className="group relative flex h-[62px] w-[62px] items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
        >
          {/* The scalloped flower (the Catalogue artwork), its colour drifting. */}
          <svg
            viewBox="0 0 100 100"
            aria-hidden
            className={cn(
              'dial-petals absolute inset-0 h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out',
              open && 'rotate-45',
            )}
          >
            <circle cx="50" cy="50" r="36" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <circle key={i} cx={50 + 33 * Math.cos(a)} cy={50 + 33 * Math.sin(a)} r="15" />;
            })}
          </svg>
          <Plus
            size={26}
            strokeWidth={2.6}
            aria-hidden
            className={cn('relative text-white transition-transform duration-300 ease-out', open && 'rotate-45')}
          />
        </button>
      </div>
    </>
  );
}
