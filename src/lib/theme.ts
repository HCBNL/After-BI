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

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemTheme() : choice;
}

/** Stamps the resolved theme on <html> so the CSS `dark` variant has one selector to match. */
function applyTheme(choice: ThemeChoice): ResolvedTheme {
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
/* The three primary colours, blue, red and green (the bright side), plus any colour from the palette. */
export type Preset = 'green' | 'blue' | 'red';

/** A preset's id, or any colour as `#rrggbb` chosen from the palette. */
export type Accent = Preset | `#${string}`;

export const ACCENTS: { id: Preset; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Blue', swatch: '#2F6BFF' },
  { id: 'red', label: 'Red', swatch: '#E5383B' },
  { id: 'green', label: 'Green', swatch: '#12BF6A' },
];

/* v2: every device starts on blue once, whatever it held under the old key; a colour picked after that sticks. */
const ACCENT_KEY = 'afterbi.accent.v2';
const HEX = /^#[0-9a-f]{6}$/i;

export function isPreset(accent: Accent): accent is Preset {
  return accent === 'green' || accent === 'blue' || accent === 'red';
}

export function getStoredAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_KEY) ?? '';
    /* Blue is the default; a device that had chosen the old orange or yellow falls back to it. */
    if (stored === 'blue' || stored === 'red' || stored === 'green') return stored;
    if (HEX.test(stored)) return stored.toLowerCase() as Accent;
  } catch {
    /* blocked storage: the default */
  }
  return 'blue';
}

/* A custom colour becomes the same five variables a preset sets in index.css. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, toward: [number, number, number], amount: number): string {
  const [r, g, b] = rgb(hex);
  const ch = (a: number, t: number) => Math.round(a + (t - a) * amount).toString(16).padStart(2, '0');
  return `#${ch(r, toward[0])}${ch(g, toward[1])}${ch(b, toward[2])}`;
}

const BLACK: [number, number, number] = [0, 0, 0];
/* Dark panels lean toward the charcoal of the dark theme, so a custom colour stays vivid at night. */
const NIGHT: [number, number, number] = [22, 22, 24];

function applyAccent(accent: Accent): void {
  const root = document.documentElement;
  const vars = ['--c-hero', '--c-hero-dark', '--c-glow', '--c-ground-a', '--c-ground-b', '--c-ground-c', '--c-swatch', '--c-swatch-ink'];
  if (isPreset(accent)) {
    vars.forEach((v) => root.style.removeProperty(v));
    if (accent === 'green') delete root.dataset.accent;
    else root.dataset.accent = accent;
    return;
  }
  const [r, g, b] = rgb(accent);
  root.dataset.accent = 'custom';
  /* Vivid and thick: the colour itself, deepened a little, never muddied. */
  root.style.setProperty('--c-hero', mix(accent, BLACK, 0.22));
  root.style.setProperty('--c-hero-dark', mix(accent, NIGHT, 0.4));
  root.style.setProperty('--c-glow', `rgba(${r}, ${g}, ${b}, 0.22)`);
  root.style.setProperty('--c-ground-a', mix(accent, BLACK, 0.2));
  root.style.setProperty('--c-ground-b', mix(accent, BLACK, 0.38));
  root.style.setProperty('--c-ground-c', mix(accent, BLACK, 0.68));
  /* The colour itself, for "done" marks on the panels, and the ink that reads on it. */
  root.style.setProperty('--c-swatch', accent);
  root.style.setProperty('--c-swatch-ink', 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#1a1a1a' : '#ffffff');
}

export function setStoredAccent(accent: Accent): void {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    /* the choice still holds for this visit */
  }
  applyAccent(accent);
}
