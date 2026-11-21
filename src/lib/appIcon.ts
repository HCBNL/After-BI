/**
 * The installed app's icon: the round AfterBI badge alone, black (the default)
 * or brand blue (#003FFA), with white bars and nothing around it. Where a phone
 * insists on filling its own shape (Android's adaptive icons, iOS), the badge
 * colour fills it edge to edge, so no second frame ever shows.
 *
 * A browser reads the icon when the app is installed, so a new choice shows
 * the next time the app is added to the home screen or desktop. index.html
 * applies the saved choice before anything else runs.
 */
export type AppIcon = 'white' | 'blue';

const KEY = 'ab.appicon';

export function getAppIcon(): AppIcon {
  try {
    return localStorage.getItem(KEY) === 'blue' ? 'blue' : 'white';
  } catch {
    return 'white';
  }
}

export function setAppIcon(icon: AppIcon): void {
  try {
    if (icon === 'blue') localStorage.setItem(KEY, 'blue');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage off: the white icon stays */
  }
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (apple) apple.href = `/appicon/${icon}-apple-180.png`;
  if (manifest) manifest.href = icon === 'blue' ? '/manifest-blue.webmanifest' : '/manifest.webmanifest';
}
