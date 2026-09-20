/**
 * Which home screen a person has chosen — Tiles or Cards — stored on the
 * device per account (a shared depot phone should not change everybody's
 * screen), and whether the chooser has ever been opened.
 */
import { useCallback, useEffect, useState } from 'react';

export type HomeLayout = 'tiles' | 'cards';

export const HOME_LAYOUTS: { id: HomeLayout; name: string; description: string }[] = [
  { id: 'tiles', name: 'Tiles', description: 'Every shortcut up front' },
  { id: 'cards', name: 'Cards', description: 'Your numbers up front' },
];

const CHANGED = 'afterbi:home-layout';
const SEEN = 'afterbi.home.chooser.seen';
const keyFor = (uid: string) => `afterbi.home.layout.${uid}`;

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

export function readHomeLayout(uid: string | undefined): HomeLayout {
  if (!uid) return 'tiles';
  try {
    return localStorage.getItem(keyFor(uid)) === 'cards' ? 'cards' : 'tiles';
  } catch {
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
