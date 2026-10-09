/**
 * Lets a page tell the shell three things without the shell importing the page:
 *
 *   • its name, for the sticky header (`heading`);
 *   • that it draws its own red panel at the top (`panel`), in which case the
 *     shell hides its white header on that page, as it already does on home.
 *     See `PagePanel.tsx`;
 *   • and, the other way round, whether this shell can host such a panel at
 *     all (`inShell`). The school shell can; a shell that does not say so gets
 *     the plain page header, so no screen is ever drawn for a shell it was not
 *     designed for.
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

  // Stable identities, so a page can call these from an effect without the
  // effect re-running on every render of the shell.
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
