/**
 * The edit lock, the same one Settings wears.
 *
 * A screen that changes something everybody depends on (the company's
 * details, the banks every organisation picks from, the public website)
 * opens LOCKED: everything is readable, nothing can be changed. The small
 * Locked pill in the header opens it for editing; saving locks it again, and
 * so does leaving the screen. A stray tap can never move a bank logo or
 * publish half a website.
 */

import { useCallback, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/cn';

export function useEditLock(startLocked = true) {
  const [locked, setLocked] = useState(startLocked);
  const lock = useCallback(() => setLocked(true), []);
  const unlock = useCallback(() => setLocked(false), []);
  const toggle = useCallback(() => setLocked((l) => !l), []);
  return { locked, lock, unlock, toggle };
}

export function LockButton({ locked, onToggle, className }: { locked: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!locked}
      title={locked ? 'Locked. Tap to edit.' : 'Editing. Tap to lock again.'}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-label font-semibold transition-colors',
        locked ? 'bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/25' : 'bg-[#f5c518] text-[#141414] hover:brightness-95',
        className,
      )}
    >
      {locked ? <Lock size={14} aria-hidden /> : <LockOpen size={14} aria-hidden />}
      {locked ? 'Locked' : 'Editing'}
    </button>
  );
}
