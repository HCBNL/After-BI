import { useEffect, useState } from 'react';
import { useAsync } from './useAsync';
import { listMyChildren } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import type { Student } from '@/types';

const STORAGE_KEY = 'sss.selectedChild';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage blocked — the choice just lives for this page view */
  }
}

/**
 * The children a parent may view, plus which one is currently selected.
 * The selection is remembered per browser so switching pages keeps the
 * same child in view.
 */
export function useChildren() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(() => readStored());

  /*
   * One document read per child, never a query over the roll.
   *
   * The student branch used to read every active pupil in the school and keep
   * the one whose id matched. The security rules refuse that outright — only
   * staff may enumerate `students` — and even where they did not, it is a few
   * thousand reads to find one name. See `listMyChildren()` in `db.ts`.
   */
  const { data: children, loading, error } = useAsync(
    () => listMyChildren(user),
    [user?.id, user?.role, (user?.childIds ?? []).join('|'), user?.studentId],
    // This hook returns `error` to its callers, which render it themselves.
    { handleError: true },
  );

  useEffect(() => {
    if (!children?.length) return;
    if (selectedId && children.some((c) => c.id === selectedId)) return;
    setSelectedId(children[0].id);
  }, [children, selectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    writeStored(id);
  };

  const selected: Student | null = children?.find((c) => c.id === selectedId) ?? children?.[0] ?? null;

  return { children: children ?? [], selected, selectedId: selected?.id ?? null, select, loading, error };
}
