/**
 * The school's notice board, and what this person has not read yet.
 *
 * WHY IT IS A HOOK AND NOT PART OF `SchoolContext`
 *
 * That provider loads once per visit and never again, which is exactly right
 * for the term, the class list and the subject list — a school does not add a
 * year group while somebody is looking at a page. A notice board is the
 * opposite: the most likely moment for it to change is the moment right after
 * an administrator posts to it, and a board that could not show the notice its
 * own author had just written would be the first thing anybody complained
 * about.
 *
 * So it reads through the shared query cache instead. Navigating between
 * screens costs nothing — the bell in the header and the notices screen share
 * one entry — and `invalidateQuery(qk.announcements())` after a post makes the
 * next render fetch again. One read per visit in the ordinary case, one more
 * per post.
 */

import { useCallback, useMemo } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { invalidateQuery, qk } from '@/lib/queryCache';
import { useAuth } from '@/context/AuthContext';
import {
  boardOrder,
  listAnnouncements,
  visibleTo,
  type Announcement,
} from '@/lib/announcements';

/**
 * WHAT COUNTS AS READ, AND WHERE THAT IS KEPT.
 *
 * On the device, per person, in `localStorage` — the same shape
 * `NoticePop.tsx` already uses for platform notices, and for the same reason:
 * the unread dot has to be answerable in the header of every screen, at zero
 * cost, before anything has loaded.
 *
 * The server-side record is the read receipt written by `markRead`, and the
 * two are not redundant. This one drives the dot on this phone; that one is
 * the school's evidence that a notice was opened, and it is the one the office
 * sees. Losing this — a cleared browser, a new device — costs a dot showing
 * again, which is the safe direction to fail in. Losing the receipt would cost
 * the record, so that one is written to Firestore.
 */
const readKey = (uid: string) => `gs.school-notices.read.${uid}`;

function readIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(readKey(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markSeenLocally(id: string, uid: string): void {
  if (!uid) return;
  try {
    /* Capped, because this list only has to answer "is this one new" for the
       notices still on the board, and the board itself is capped. */
    const next = [...new Set([...readIds(uid), id])].slice(-120);
    localStorage.setItem(readKey(uid), JSON.stringify(next));
  } catch {
    /* Private mode. The dot shows again, which is the harmless way round. */
  }
}

export interface BoardState {
  /** Everything this person is allowed to see, pinned first then newest. */
  notices: Announcement[];
  /** Of those, the ones they have not opened on this device. */
  unread: Announcement[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
  /** Mark one read here and now, without waiting for a refetch. */
  markRead: (id: string) => void;
}

/**
 * `skip` is for the platform owner, and it is not an optimisation.
 *
 * The owner belongs to no school by design, so `listAnnouncements()` resolves
 * its path through `requireSchool()` and throws before it reaches Firestore.
 * Caught rather than crashing — the read is `handleError` — but a thrown error
 * on every render of the owner's header is noise in the console that somebody
 * will one day spend an afternoon on. Not asking is clearer than catching.
 */
export function useAnnouncements(skip = false): BoardState {
  const { user } = useAuth();
  const off = skip || !user?.schoolId;

  const { data, loading, error, reload } = useAsync(
    async () => (off ? [] : listAnnouncements()),
    [user?.schoolId ?? '', off],
    {
      cache: off ? undefined : qk.announcements(),
      /* Handled, not thrown. The bell lives in the shell, on every screen in
         the app — a board that could not be fetched must never be able to take
         down the screen somebody is actually working on. */
      handleError: true,
      label: 'School notices',
    },
  );

  const notices = useMemo(() => boardOrder(visibleTo(data ?? [], user)), [data, user]);

  const unread = useMemo(() => {
    if (!user) return [];
    const seen = new Set(readIds(user.id));
    return notices.filter((n) => !seen.has(n.id));
  }, [notices, user]);

  const markRead = useCallback(
    (id: string) => {
      if (!user) return;
      markSeenLocally(id, user.id);
      /* Nothing to refetch — the board did not change, only what this device
         thinks about it. The re-render comes from the caller's own state. */
    },
    [user],
  );

  return { notices, unread, loading, error, reload, markRead };
}

/** Called after posting or removing, so the next read is a fresh one. */
export function invalidateAnnouncements(): void {
  invalidateQuery(qk.announcements());
}
