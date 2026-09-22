export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sss.theme';

function safeRead(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* private mode / blocked storage: fall through to system */
  }
  return 'system';
}

function safeWrite(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* nothing we can do, the in-memory choice still applies for this visit */
  }
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemTheme() : choice;
}

/** Stamps the resolved theme on <html> so the CSS `dark` variant has one selector to match. */
export function applyTheme(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function getStoredTheme(): ThemeChoice {
  return safeRead();
}

export function setStoredTheme(choice: ThemeChoice): ResolvedTheme {
  safeWrite(choice);
  return applyTheme(choice);
}

/**
 * Call once at boot, before React renders, to avoid a flash of the wrong theme.
 *
 * If the visitor has not chosen a theme in the app but the host page has
 * already stamped one on <html>, which an embedding viewer does, we honour
 * that rather than overriding it with the OS preference.
 */
export function initTheme(): ResolvedTheme {
  applyAccent(getStoredAccent());
  const choice = safeRead();
  const stamped = document.documentElement.dataset.theme;
  const hostChose = choice === 'system' && (stamped === 'light' || stamped === 'dark');

  const resolved: ResolvedTheme = hostChose ? (stamped as ResolvedTheme) : applyTheme(choice);
  if (hostChose) document.documentElement.style.colorScheme = resolved;

  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      // Only follow the OS once the visitor is genuinely on "system" and no
      // host stamp is in play.
      if (safeRead() === 'system' && !hostChose) applyTheme('system');
    });
  }

  return resolved;
}

/* colour */

/**
 * The logo's four colours. Green is the default and stays the primary colour
 * everywhere (buttons, links, highlights); choosing another changes the
 * coloured panels and the first banner, in light and dark alike. See the
 * `[data-accent]` blocks at the end of index.css.
 */
export type Accent = 'green' | 'blue' | 'orange' | 'gold';

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'green', label: 'Green', swatch: '#10B981' },
  { id: 'blue', label: 'Blue', swatch: '#29AEFF' },
  { id: 'orange', label: 'Orange', swatch: '#E8441A' },
  { id: 'gold', label: 'Gold', swatch: '#F5C518' },
];

const ACCENT_KEY = 'afterbi.accent';

export function getStoredAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored === 'blue' || stored === 'orange' || stored === 'gold') return stored;
  } catch {
    /* blocked storage: the default */
  }
  return 'green';
}

export function applyAccent(accent: Accent): void {
  const root = document.documentElement;
  if (accent === 'green') delete root.dataset.accent;
  else root.dataset.accent = accent;
}

export function setStoredAccent(accent: Accent): void {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    /* the choice still holds for this visit */
  }
  applyAccent(accent);
}
