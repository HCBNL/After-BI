/**
 * Everything the portal needs to know about *this* school, right now.
 *
 * Before this existed, twenty-one screens imported `CURRENT_TERM` straight from
 * the demo generator. That meant the term could never advance, and against a
 * real Firestore project every one of those screens queried with a made-up term
 * id. This provider loads the term, the session, the class list and the school
 * settings once when someone opens the portal, and hands them to every page.
 *
 * It is deliberately loaded once and cached for the visit. A school's term and
 * class list do not change while somebody is looking at a page, and re-reading
 * them on every screen is the single easiest way to run up a Firestore bill.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { getSchoolTenant, listClasses, listSessions, listSubjects, listTerms } from '@/lib/db';
import { deadline, retry } from '@/lib/deadline';
import { listActiveNotices, type Notice } from '@/lib/notices';
import { EMPTY_HOME, getSiteHome, type SiteHome } from '@/lib/site';
import { getActiveSchool, onActiveSchoolChange, type SchoolTenant } from '@/lib/tenant';
import { useBrand, useSchoolBrand } from '@/context/BrandContext';
import type { AcademicSession, SchoolClass, SchoolSettings, Subject, Term } from '@/types';

export interface SchoolState {
  /** Every term the school has ever run, oldest first. */
  terms: Term[];
  sessions: AcademicSession[];
  classes: SchoolClass[];
  /**
   * Every subject the school teaches.
   *
   * Here rather than fetched per screen, and that is a fix rather than a
   * tidy-up. Seven screens each called `listSubjects()` in their own
   * `useAsync`, so opening Lesson notes meant a fresh round trip before the
   * subject dropdown had anything in it — which is exactly the "the dropdown
   * takes too long" complaint, and it repeated on every navigation. One read
   * for the visit; every dropdown is populated the instant it renders.
   */
  subjects: Subject[];
  settings: SchoolSettings;

  /**
   * The platform's own record of this school: subscription, credits, and the
   * banner behind the home screen's summary cards.
   *
   * Read here, once, with the rest of the reference data. The home screen is
   * the only consumer today, and giving it its own query would have put a
   * document read on the one screen every person opens first — which is the
   * habit `v12` spent an afternoon breaking. Null when the document is missing
   * or unreadable; nothing on screen depends on it existing.
   */
  tenant: SchoolTenant | null;

  /**
   * What GetSchool itself is telling every school today.
   *
   * Read here, once, for the same reason as everything else on this object:
   * the strip that shows them sits on the home screen, which is the screen
   * every person opens first and the last one that should carry another query.
   * Empty on most visits, and the strip draws nothing at all when it is.
   */
  notices: Notice[];

  /**
   * The platform's own pictures — today, the three backgrounds behind the
   * summary cards. One document, public, read once for the visit and shared by
   * every school, which is the point: the backdrop is GetSchool's, the numbers
   * on it are the school's.
   */
  siteMedia: SiteHome;

  /**
   * The term the school is in today, or `null` when nobody has said.
   *
   * WHY IT IS NULLABLE NOW
   *
   * It used to be `Term`, "never undefined once loaded", held up by a
   * `PLACEHOLDER_TERM` that this file invented whenever a school had no terms:
   * a document with `id: ''`, `name: 'First Term'` and `isCurrent: true`. It
   * made every consumer null-check-free by giving them something to read, and
   * what they read was a lie — screens printed "First Term · week 1 of 13" for
   * a school that had never set up a calendar, and queried Firestore with
   * `termId: ''`, which returns nothing and looks exactly like a term with no
   * work in it.
   *
   * A school with no calendar is now an ordinary state — the office sets the
   * calendar up, nothing is seeded — so it has to be representable. `null`
   * makes the compiler name every screen that assumed otherwise, which is the
   * only way to find them; a placeholder object is silent.
   */
  currentTerm: Term | null;
  currentSession: AcademicSession | null;

  /**
   * Terms that have actually begun, oldest first.
   *
   * What a family may look *back* over: attendance, fees and assignments all
   * exist for a term the moment it starts. This replaced `publishedTerms`,
   * which was `terms.filter(t => t.resultsPublished)` — a flag nothing ever
   * set, which therefore hid every term from every parent, and which had no
   * business gating attendance in the first place. Report cards are gated on
   * the result document's own status; see `resultsForStudent()` in `db.ts`.
   */
  startedTerms: Term[];

  loading: boolean;
  error: Error | null;
  reload: () => void;

  /** Look-ups the screens would otherwise repeat by hand. */
  termById: (id: string) => Term | undefined;
  classById: (id: string) => SchoolClass | undefined;
}

const SchoolContext = createContext<SchoolState | null>(null);

export function useSchool(): SchoolState {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used inside <SchoolProvider>');
  return ctx;
}

/**
 * The school, or null outside one. For the few pieces the platform owner's
 * console shares with the schools (the home screen's panel): the owner belongs
 * to no school, so there is no term or class list to read.
 */
export function useOptionalSchool(): SchoolState | null {
  return useContext(SchoolContext);
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  /*
   * The settings document comes from `BrandContext`, which has already read it.
   *
   * Both providers used to call `getSettings()` on every portal load, so the
   * same document was fetched twice before the first screen painted. The brand
   * provider is above this one and owns that read; this consumes it.
   */
  const settings = useSchoolBrand();
  const { reload: reloadBrand } = useBrand();

  /*
   * THE TENANT, HELD IN STATE — NOT READ DURING RENDER.
   *
   * This used to key the load on `getActiveSchool()` called inline in the
   * dependency array. That reads a module-level variable, and React cannot
   * observe a module-level variable: when `setActiveSchool()` ran a moment
   * later — after the signed-in profile arrived, which is when the school is
   * actually known — nothing told this provider to re-render, so the
   * dependency was never re-evaluated and the failed load was never retried.
   *
   * The visible symptom was the bug somebody would describe as "it says it
   * cannot find the school record, and I have to keep refreshing until it
   * works". Exactly that: the first attempt ran before the tenant was set,
   * `requireSchool()` threw, the error screen drew, and only a full page
   * reload could get past it — because a reload is the one thing that
   * re-reads the variable at the right moment.
   *
   * `onActiveSchoolChange` already existed for precisely this; `BrandContext`
   * subscribes to it and consequently never had the problem. This provider
   * simply never did.
   */
  const [schoolId, setSchoolId] = useState<string | null>(() => getActiveSchool());
  useEffect(() => onActiveSchoolChange(setSchoolId), []);

  /*
   * Keyed on the school, so switching tenant reloads and nothing else does.
   *
   * This provider is mounted once for the whole visit now that the shell is no
   * longer torn down on every navigation, which is what makes one read for the
   * visit actually mean one read.
   */
  const { data, loading, error, reload } = useAsync(loadSchool, [schoolId], {
    handleError: true,
    /* `loadSchool` runs its own clock per read and retries the essential ones,
       so the hook's backstop only has to be longer than that. */
    timeout: 45_000,
    label: 'Your school',
  });

  /*
   * TWO TIERS, BECAUSE ONE SLOW READ SHOULD NOT CLOSE A SCHOOL.
   *
   * This was a single `Promise.all` of seven reads under one twelve-second
   * deadline. `Promise.all` rejects on the first failure, so a slow *subject*
   * list — a dropdown, on one screen — failed the whole thing, and what the
   * head teacher saw was "We could not reach the school records": the portal
   * refusing to open over something nothing on the first screen needed. That
   * is the other half of the report, the "sometimes it will not fetch the
   * school" half, and refreshing "fixed" it only because a second attempt is
   * a second roll of the dice.
   *
   * So the reads are split by whether a screen can honestly draw without
   * them. Terms and classes are load-bearing — every query underneath is keyed
   * by the current term, and a wrong or missing term reads as an empty school —
   * and they get a retry each. Everything else degrades to a sensible empty
   * value and the portal opens regardless. A missing subject list costs one
   * dropdown; a portal that will not open costs the morning.
   */
  async function loadSchool() {
    if (!schoolId) {
      throw new Error(
        'No school is selected for this account yet. Sign out and back in, and if it keeps happening your administrator needs to check the account.',
      );
    }

    const essential = Promise.all([
      retry(listTerms, { ms: 12_000, attempts: 2, what: 'The school terms' }),
      retry(listClasses, { ms: 12_000, attempts: 2, what: 'The class list' }),
    ]);

    /*
     * `allSettled`, not `all`. Each of these already swallows its own failure
     * or is wrapped to; this is the belt to that, so a shape nobody
     * anticipated — a rule refusal on a collection a new role cannot read —
     * costs the value and not the portal.
     */
    const optional = Promise.allSettled([
      deadline(listSessions(), 12_000, 'The academic sessions'),
      deadline(listSubjects(), 12_000, 'The subject list'),
      // Never fatal. A school with no tenant document still runs; it just has
      // no banner and no credit meter, and neither is worth an error screen.
      deadline(getSchoolTenant(), 10_000, 'The school record'),
      // Swallows its own failures too. See `listActiveNotices`.
      deadline(listActiveNotices(), 10_000, 'Platform notices'),
      // Public, tiny, and it swallows its own failures. See `getSiteHome`.
      deadline(getSiteHome(), 10_000, 'Site pictures'),
    ]);

    const [terms, classes] = await essential;
    const [sessionsR, subjectsR, tenantR, noticesR, siteR] = await optional;

    const settled = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
      result.status === 'fulfilled' ? result.value : fallback;

    return {
      terms,
      classes,
      sessions: settled(sessionsR, [] as AcademicSession[]),
      subjects: settled(subjectsR, [] as Subject[]),
      tenant: settled(tenantR, null as SchoolTenant | null),
      notices: settled(noticesR, [] as Notice[]),
      siteMedia: settled(siteR, EMPTY_HOME),
    };
  }

  /*
   * Try again by itself when the connection comes back.
   *
   * The error screen has a Try again button on it, which assumes somebody is
   * still looking. Often they are not: the phone was put down inside a lift or
   * a staffroom with no signal, and by the time it is picked up the network
   * has been fine for a minute and the screen still says the records could not
   * be reached. Retrying on `online` — and when the tab is brought back to the
   * front, because `online` does not fire when a laptop wakes — turns that
   * into a screen that has quietly fixed itself.
   *
   * Only ever fires when the load actually failed, so a healthy visit does not
   * re-read the school every time somebody switches tabs.
   */
  useEffect(() => {
    if (!error) return;

    const again = () => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) reload();
    };

    window.addEventListener('online', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      window.removeEventListener('online', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [error, reload]);

  const terms = useMemo(() => data?.terms ?? [], [data]);
  const classes = useMemo(() => data?.classes ?? [], [data]);
  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const tenant = useMemo(() => data?.tenant ?? null, [data]);
  const notices = useMemo(() => data?.notices ?? [], [data]);
  const siteMedia = useMemo(() => data?.siteMedia ?? EMPTY_HOME, [data]);

  /**
   * The current term is whichever one the school has flagged, and nothing
   * else invents one. See the note on `currentTerm` in `SchoolState` above.
   */
  const currentTerm = useMemo<Term | null>(() => {
    const flagged = terms.find((t) => t.isCurrent);
    if (flagged) return flagged;

    /*
     * Nobody has flagged one. Recover only if today genuinely falls inside a
     * term — that is a lost boolean, and guessing right is a kindness.
     *
     * There used to be a third step: failing that, take the LAST term by date.
     * That is where "First Term, 15 Sept to 12 Dec 2025" came from on a screen
     * opened in September 2026, wearing a green CURRENT badge. A term that
     * finished nine months ago is not the term the school is in, and saying so
     * is worse than saying nothing — every register, mark and report card
     * entered that day would have been filed against it.
     */
    const today = new Date().toISOString().slice(0, 10);
    return terms.find((t) => t.startDate && t.endDate && t.startDate <= today && today <= t.endDate) ?? null;
  }, [terms]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentTerm?.sessionId) ?? sessions.find((s) => s.isCurrent) ?? null,
    [sessions, currentTerm],
  );

  const startedTerms = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // A term with no start date recorded is treated as started rather than
    // hidden — a missing date should not make a term unreachable.
    const started = terms.filter((t) => !t.startDate || t.startDate <= today);
    return started.length ? started : terms;
  }, [terms]);

  const termById = useCallback((id: string) => terms.find((t) => t.id === id), [terms]);
  const classById = useCallback((id: string) => classes.find((c) => c.id === id), [classes]);


  /*
   * Reload means the settings too.
   *
   * `reload` used to refetch terms, classes and subjects only. The settings
   * come from `BrandContext`, which nothing told to refetch — so every save
   * on the Settings screen (the school's name, its grading policy, and now
   * its interface colour) called `reload()` and the screen went on showing
   * the old values until a full page refresh.
   */
  const reloadAll = useCallback(() => {
    reload();
    reloadBrand();
  }, [reload, reloadBrand]);

  const value = useMemo<SchoolState>(
    () => ({
      terms,
      sessions,
      classes,
      subjects,
      settings,
      tenant,
      notices,
      siteMedia,
      currentTerm,
      currentSession,
      startedTerms,
      loading,
      error,
      reload: reloadAll,
      termById,
      classById,
    }),
    [terms, sessions, classes, subjects, settings, tenant, notices, siteMedia, currentTerm, currentSession, startedTerms, loading, error, reloadAll, termById, classById],
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}
