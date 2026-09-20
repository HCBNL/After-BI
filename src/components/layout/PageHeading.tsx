/**
 * Which title the sticky bar shows.
 *
 * There used to be two. The shell printed the navigation label — "Scores" —
 * and then the page printed "Scores" again in 30px type directly underneath,
 * so a teacher opening a score sheet on a phone spent the top third of the
 * screen being told twice where they were.
 *
 * One title now, and it lives in the bar, because that is the one that survives
 * scrolling. A page whose real name differs from its menu entry — "Fumilayo Ifunanya"
 * rather than "Students" — announces it here and the bar picks it up.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface HeadingState {
  /** null means "use the navigation label". */
  heading: string | null;
  /**
   * What the page is *for* — one sentence, and it used to be printed as a
   * paragraph under the bar on every screen. It is now folded behind an (i)
   * beside the title, so a screen opens on its data rather than on prose.
   */
  note: string | null;
  setHeading: (title: string | null, note?: string | null) => void;
}

const PageHeadingContext = createContext<HeadingState | null>(null);

export function PageHeadingProvider({ children }: { children: ReactNode }) {
  const [heading, setHeadingState] = useState<string | null>(null);
  const [note, setNoteState] = useState<string | null>(null);

  // Stable identity, so a page can call this from an effect without the effect
  // re-running on every render of the shell.
  const setHeading = useCallback((title: string | null, nextNote: string | null = null) => {
    setHeadingState((current) => (current === title ? current : title));
    setNoteState((current) => (current === nextNote ? current : nextNote));
  }, []);

  const value = useMemo(() => ({ heading, note, setHeading }), [heading, note, setHeading]);

  return <PageHeadingContext.Provider value={value}>{children}</PageHeadingContext.Provider>;
}

/**
 * Deliberately forgiving. `PageHeader` is rendered in a few places outside the
 * portal shell, and a missing provider should mean "nobody is listening", not a
 * crash on a screen a parent is looking at.
 */
export function usePageHeading(): HeadingState {
  return useContext(PageHeadingContext) ?? { heading: null, note: null, setHeading: () => {} };
}
