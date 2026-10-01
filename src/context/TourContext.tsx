/**
 * The tour: the main one, per role, and short ones a screen can ask for.
 *
 * `start` and `startIfNew` run the role's tour from `tour.ts`. `play` runs any
 * list of steps — today, the four-step tour after somebody switches their home
 * screen. A played tour never marks the main tour as seen: it explains one
 * change, and somebody who has watched it has still never been shown the app.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Tour } from '@/components/tour/Tour';
import { markTourSeen, tourFor, tourSeen, type TourStep } from '@/lib/tour';
import { useAuth } from '@/context/AuthContext';

interface TourApi {
  /** Run it now, whether or not this person has seen it. */
  start: () => void;
  /** Run it only if they have not seen this version. Safe to call on every visit. */
  startIfNew: () => void;
  /** Run these steps instead of the main tour. */
  play: (steps: TourStep[]) => void;
  running: boolean;
}

const TourContext = createContext<TourApi | null>(null);

export function useTour(): TourApi {
  const ctx = useContext(TourContext);
  // Never throws. A screen outside the shell asking for the tour should get a
  // tour that does nothing, not a blank page.
  return ctx ?? { start: () => {}, startIfNew: () => {}, play: () => {}, running: false };
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  /* The steps of a played tour; null while the main one runs. */
  const [played, setPlayed] = useState<TourStep[] | null>(null);

  const role = user?.role;

  const start = useCallback(() => {
    if (!role) return;
    setPlayed(null);
    setRunning(true);
  }, [role]);

  const startIfNew = useCallback(() => {
    if (!role || tourSeen(role)) return;
    setPlayed(null);
    setRunning(true);
  }, [role]);

  const play = useCallback((steps: TourStep[]) => {
    if (!steps.length) return;
    setPlayed(steps);
    setRunning(true);
  }, []);

  const close = useCallback(() => {
    setRunning(false);
    if (played) {
      setPlayed(null);
      return;
    }
    // Marked on close rather than on completion. Somebody who shuts it on step
    // two has said no; showing it to them again tomorrow is nagging.
    if (role) markTourSeen(role);
  }, [role, played]);

  const value = useMemo<TourApi>(
    () => ({ start, startIfNew, play, running }),
    [start, startIfNew, play, running],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {running && role && (
        <Tour key={played ? 'played' : 'main'} steps={played ?? tourFor(role)} onClose={close} />
      )}
    </TourContext.Provider>
  );
}
