/**
 * Who this deployment belongs to.
 *
 * GetSchool is one product; every deployment of it is one school. This sits
 * above everything — the marketing site as well as the portal — and answers the
 * question both halves need before they can render a single header: what is
 * this school called, what is its crest, and what colour is it?
 *
 * It loads before anyone signs in, because a visitor reading the home page has
 * not signed in and still has to see the right school. `settings/school` is
 * publicly readable for exactly this reason.
 *
 * If the read fails, or the project has not been set up yet, the bundled
 * defaults render instead. A school's website must not go blank because its
 * database was slow.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getActiveSchool, onActiveSchoolChange } from '@/lib/tenant';
import { SCHOOL } from '@/lib/constants';
import type { SchoolSettings } from '@/types';

export interface BrandState {
  school: SchoolSettings;
  /** false until the real settings have arrived — the defaults are showing. */
  loaded: boolean;
  reload: () => void;
}

const BrandContext = createContext<BrandState | null>(null);

export function useBrand(): BrandState {
  const ctx = useContext(BrandContext);
  // Deliberately forgiving: a component rendered outside the provider (a test,
  // a storybook) gets the defaults rather than an exception.
  return ctx ?? { school: SCHOOL, loaded: false, reload: () => {} };
}

/** Shorthand for the common case — just the school. */
export function useSchoolBrand(): SchoolSettings {
  return useBrand().school;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [school, setSchool] = useState<SchoolSettings>(SCHOOL);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  /*
   * Which school to load, kept in step with `src/lib/tenant.ts`.
   *
   * This provider sits above `AuthProvider` because the public pages need a
   * school's name before anybody signs in, so it cannot read the tenant from a
   * context. It used to fire one read at boot — before any school was set,
   * when `requireSchool()` still throws — swallow the error and never try
   * again, which is why every deployment showed the bundled placeholder name
   * and a grey shield instead of the school's own crest.
   */
  const [schoolId, setSchoolId] = useState<string | null>(() => getActiveSchool());

  useEffect(() => onActiveSchoolChange(setSchoolId), []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // Signed out, or a public page that has not named a school: the bundled
    // defaults are the honest answer, not a stale previous school's crest.
    if (!schoolId) {
      setSchool(SCHOOL);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    /*
     * `db.ts` is fetched here rather than imported at the top of the file.
     *
     * This provider wraps the public site as well as the portal, so a static
     * import put the whole Firebase client in front of the first paint for a
     * visitor who is not signed in and has no school to load. The branch above
     * already returns before this line in exactly that case, so on the
     * marketing pages the database client is now never asked for at all.
     */
    import('@/lib/db')
      .then(({ getSettings }) => getSettings())
      .then((live) => {
        if (cancelled) return;
        setSchool({ ...SCHOOL, ...live });
        setLoaded(true);
      })
      .catch(() => {
        // Keep the bundled school. The site still works.
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, nonce]);

  /*
   * Nothing here repaints the application any more.
   *
   * `school.brandPrimary` and `school.brandAccent` are still carried — a school
   * sets them in Settings and they are real — but they now travel only as far
   * as `src/lib/brand.ts` lets them: the report card PDF, printed papers, fee
   * receipts, and the sign-in banner. The app chrome is one fixed professional
   * palette for every school, which is the only way to promise contrast in both
   * light and dark and to keep support screenshots meaning the same thing
   * everywhere. See the note at the top of `src/lib/brand.ts`.
   *
   * The favicon and theme-color stay GetSchool's red for the same reason: a
   * teacher with three schools' portals open needs the tabs to say GetSchool,
   * and a browser tab is not where a crest earns its keep.
   *
   * Titles are not set here either. They belong to the page — `@/components/Seo`
   * declares them per route. Setting `document.title` from a provider as well
   * meant whichever effect ran last won, which on a client-routed app was
   * always the provider.
   */

  const value = useMemo<BrandState>(() => ({ school, loaded, reload }), [school, loaded, reload]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
