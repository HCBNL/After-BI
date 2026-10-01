/**
 * Which home screen a person has chosen — Tiles or Cards — and whether they
 * have ever opened the chooser.
 *
 * ON THE DEVICE, PER PERSON
 *
 * Stored in localStorage under the account's uid rather than on the profile
 * document. It is a preference about a phone, like the theme, and a school
 * office phone is shared: the bursar who likes Cards should not change the
 * head teacher's screen. It also costs no write and needs no security rule.
 *
 * Every change is announced on `window`, so the home screen, the chooser and
 * the profile page stay in step without another provider around the app.
 */

import { useCallback, useEffect, useState } from 'react';

export type HomeLayout = 'tiles' | 'cards';

export const HOME_LAYOUTS: { id: HomeLayout; name: string; description: string }[] = [
  { id: 'tiles', name: 'Tiles', description: 'Every shortcut up front' },
  { id: 'cards', name: 'Cards', description: 'Your numbers up front' },
];

const CHANGED = 'getschool:home-layout';
const SEEN = 'getschool.home.chooser.seen';
const keyFor = (uid: string) => `getschool.home.layout.${uid}`;

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

export function readHomeLayout(uid: string | undefined): HomeLayout {
  if (!uid) return 'tiles';
  try {
    return localStorage.getItem(keyFor(uid)) === 'cards' ? 'cards' : 'tiles';
  } catch {
    // Storage blocked. Tiles is the screen everybody already knows.
    return 'tiles';
  }
}

export function saveHomeLayout(uid: string, layout: HomeLayout): void {
  try {
    localStorage.setItem(keyFor(uid), layout);
  } catch {
    /* Private mode. The choice still holds for this visit. */
  }
  announce();
}

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    // If we cannot remember, do not badge the button for ever.
    return true;
  }
}

export function markChooserSeen(): void {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    /* nothing to do */
  }
  announce();
}

export function useHomeLayout(uid: string | undefined): [HomeLayout, (next: HomeLayout) => void] {
  const [layout, setLayout] = useState<HomeLayout>(() => readHomeLayout(uid));

  useEffect(() => {
    const sync = () => setLayout(readHomeLayout(uid));
    sync();
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, [uid]);

  const choose = useCallback(
    (next: HomeLayout) => {
      if (uid) saveHomeLayout(uid, next);
      setLayout(next);
    },
    [uid],
  );

  return [layout, choose];
}

/** False until the chooser has been opened once. The button wears a dot until then. */
export function useChooserSeen(): boolean {
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const sync = () => setSeen(readSeen());
    window.addEventListener(CHANGED, sync);
    return () => window.removeEventListener(CHANGED, sync);
  }, []);
  return seen;
}

/* ------------------------------------------------------- the layout tour */

/**
 * A switch asks for a short tour of the screen it switched to.
 *
 * Held in memory, not storage: it belongs to this visit. The home screen takes
 * it — plays it once — the next time it is on screen with that layout and has
 * finished loading, whether the switch was made on the home screen itself or
 * on the profile page.
 */
let pendingTour: HomeLayout | null = null;

export function requestLayoutTour(layout: HomeLayout): void {
  pendingTour = layout;
}

/** Is a tour waiting for this layout? Does not take it. */
export function layoutTourWaiting(layout: HomeLayout): boolean {
  return pendingTour === layout;
}

/** Take the waiting tour, once. True if there was one for this layout. */
export function takeLayoutTour(layout: HomeLayout): boolean {
  if (pendingTour !== layout) return false;
  pendingTour = null;
  return true;
}
