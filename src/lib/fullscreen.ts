import { useCallback, useEffect, useState } from 'react';

/**
 * Full screen on a laptop: the whole app with no browser or window frame.
 * It sits in the quick settings (the plus, bottom right) and beside the menu
 * collapse button. Ctrl Shift F (Cmd Shift F on a Mac) does the same from
 * anywhere, and Esc leaves it as usual.
 */
export function canFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
}

export function toggleFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
  } catch {
    /* the browser said no: nothing to do */
  }
}

/* One keyboard listener for the whole app, however many buttons there are. */
let keyBound = false;
function bindKey() {
  if (keyBound || typeof window === 'undefined') return;
  keyBound = true;
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        toggleFullscreen();
      }
    },
    true,
  );
}

export function useFullscreen(): { on: boolean; toggle: () => void; supported: boolean } {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    bindKey();
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggle = useCallback(() => toggleFullscreen(), []);
  return { on, toggle, supported: canFullscreen() };
}
