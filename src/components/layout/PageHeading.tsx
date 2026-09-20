/**
 * Lets a page tell the shell its name (for the sticky header) and that it
 * draws its own coloured panel (so the shell hides its white header), without
 * the shell importing the page. `inShell` says whether this shell can host a
 * panel at all; one that cannot gets the plain page header.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface HeadingState {
  heading: string | null;
  setHeading: (title: string | null) => void;
  panel: boolean;
  setPanel: (on: boolean) => void;
  inShell: boolean;
}

const PageHeadingContext = createContext<HeadingState | null>(null);

export function PageHeadingProvider({ children, panels = false }: { children: ReactNode; panels?: boolean }) {
  const [heading, setHeadingState] = useState<string | null>(null);
  const [panel, setPanelState] = useState(false);

  const setHeading = useCallback((title: string | null) => {
    setHeadingState((current) => (current === title ? current : title));
  }, []);
  const setPanel = useCallback((on: boolean) => setPanelState(on), []);

  const value = useMemo(
    () => ({ heading, setHeading, panel, setPanel, inShell: panels }),
    [heading, setHeading, panel, setPanel, panels],
  );

  return <PageHeadingContext.Provider value={value}>{children}</PageHeadingContext.Provider>;
}

export function usePageHeading(): HeadingState {
  return (
    useContext(PageHeadingContext) ?? {
      heading: null,
      setHeading: () => {},
      panel: false,
      setPanel: () => {},
      inShell: false,
    }
  );
}
