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
export type Preset = 'green' | 'blue' | 'orange' | 'gold';

/** A preset's id, or any colour as `#rrggbb` chosen from the palette. */
export type Accent = Preset | `#${string}`;

export const ACCENTS: { id: Preset; label: string; swatch: string }[] = [
  { id: 'green', label: 'Green', swatch: '#10B981' },
  { id: 'blue', label: 'Blue', swatch: '#29AEFF' },
  { id: 'orange', label: 'Orange', swatch: '#E8441A' },
  { id: 'gold', label: 'Gold', swatch: '#F5C518' },
];

/** The wider palette behind the rainbow swatch. Any other colour is one tap further. */
export const PALETTE: { label: string; hex: string }[] = [
  { label: 'Crimson', hex: '#c0263b' },
  { label: 'Rose', hex: '#e11d74' },
  { label: 'Plum', hex: '#8e2a7a' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Indigo', hex: '#4338ca' },
  { label: 'Navy', hex: '#1e3a8a' },
  { label: 'Teal', hex: '#0f766e' },
  { label: 'Forest', hex: '#166534' },
  { label: 'Olive', hex: '#4d7c0f' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Brown', hex: '#7c4a1e' },
  { label: 'Slate', hex: '#475569' },
  { label: 'Charcoal', hex: '#27272a' },
  { label: 'Wine', hex: '#7f1d1d' },
  { label: 'Ocean', hex: '#0369a1' },
];

const ACCENT_KEY = 'afterbi.accent';
const HEX = /^#[0-9a-f]{6}$/i;

export function isPreset(accent: Accent): accent is Preset {
  return accent === 'green' || accent === 'blue' || accent === 'orange' || accent === 'gold';
}

export function getStoredAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_KEY) ?? '';
    if (stored === 'blue' || stored === 'orange' || stored === 'gold') return stored;
    if (HEX.test(stored)) return stored.toLowerCase() as Accent;
  } catch {
    /* blocked storage: the default */
  }
  return 'green';
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
const NIGHT: [number, number, number] = [10, 12, 16];

function applyAccent(accent: Accent): void {
  const root = document.documentElement;
  const vars = ['--c-hero', '--c-hero-dark', '--c-glow', '--c-ground-a', '--c-ground-b', '--c-ground-c'];
  if (isPreset(accent)) {
    vars.forEach((v) => root.style.removeProperty(v));
    if (accent === 'green') delete root.dataset.accent;
    else root.dataset.accent = accent;
    return;
  }
  const [r, g, b] = rgb(accent);
  root.dataset.accent = 'custom';
  root.style.setProperty('--c-hero', mix(accent, BLACK, 0.45));
  root.style.setProperty('--c-hero-dark', mix(accent, NIGHT, 0.82));
  root.style.setProperty('--c-glow', `rgba(${r}, ${g}, ${b}, 0.22)`);
  root.style.setProperty('--c-ground-a', mix(accent, BLACK, 0.2));
  root.style.setProperty('--c-ground-b', mix(accent, BLACK, 0.38));
  root.style.setProperty('--c-ground-c', mix(accent, BLACK, 0.68));
}

export function setStoredAccent(accent: Accent): void {
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    /* the choice still holds for this visit */
  }
  applyAccent(accent);
}
