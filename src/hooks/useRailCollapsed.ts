import { useCallback, useState } from 'react';

/**
 * Whether the laptop rail is folded down to its icons.
 *
 * Kept on the device, so the rail stays the way somebody left it from one
 * visit to the next. Shared by the school portal's rail and the owner's.
 */
const KEY = 'gs.rail.collapsed';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function useRailCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {
        /* private mode: it simply resets next visit */
      }
      return next;
    });
  }, []);
  return [collapsed, toggle];
}
