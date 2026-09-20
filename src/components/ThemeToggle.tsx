import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getStoredTheme, resolveTheme, setStoredTheme, type ResolvedTheme, type ThemeChoice } from '@/lib/theme';

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** What is actually painted right now, read off the root the boot script stamped. */
function currentResolved(): ResolvedTheme {
  if (typeof document !== 'undefined') {
    const stamped = document.documentElement.dataset.theme;
    if (stamped === 'light' || stamped === 'dark') return stamped;
  }
  return resolveTheme(getStoredTheme());
}

export function ThemeToggle({
  compact,
  full,
  className,
}: {
  compact?: boolean;
  /**
   * Fill the width, and keep the words.
   *
   * The three labels are hidden below 640px everywhere else, which is right in
   * the menu sheet's footer where the control shares a row with Profile and
   * Sign out. It is wrong in the More sheet, where the control has the row to
   * itself and hiding the words leaves a phone user with three unlabelled
   * glyphs and a guess.
   */
  full?: boolean;
  className?: string;
}) {
  // Initialise from what is on screen, not a placeholder. The old default of
  // 'system' meant the compact button's first press only *matched* the stored
  // choice to the visible theme and changed nothing — the notorious
  // "works on the second click".
  const [choice, setChoice] = useState<ThemeChoice>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => currentResolved());

  useEffect(() => {
    setChoice(getStoredTheme());
    setResolved(currentResolved());
  }, []);

  const apply = (next: ThemeChoice) => {
    const applied = setStoredTheme(next);
    setChoice(next);
    setResolved(applied);
  };

  if (compact) {
    const isDark = resolved === 'dark';
    return (
      <button
        type="button"
        // Flip the theme that is actually showing, in one press.
        onClick={() => apply(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
          className,
        )}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'items-center gap-0.5 rounded-xl border border-hairline surface-sunken p-1',
        full ? 'flex w-full' : 'inline-flex',
        className,
      )}
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => apply(value)}
          aria-pressed={choice === value}
          title={label}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold transition-all',
            full && 'flex-1',
            choice === value ? 'surface-card text-primary shadow-sm' : 'text-muted hover:text-primary',
          )}
        >
          <Icon size={14} />
          <span className={full ? undefined : 'hidden sm:inline'}>{label}</span>
        </button>
      ))}
    </div>
  );
}
