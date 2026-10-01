/**
 * A notice from GetSchool, as a card that asks once.
 *
 * WHAT IT REPLACES
 *
 * A strip that scrolled the notice past, marquee style, at the top of the home
 * screen. It took a line of every screen for something most days had nothing
 * to say about, it could not be read at a glance, and it could not be marked
 * as read. This asks once a session, in the middle of the screen, and then
 * gets out of the way.
 *
 * WHAT IS LEFT BEHIND
 *
 * Nothing is lost by closing it: every notice is on the notices screen, and
 * an unread one stays on the to-do list until it has been opened. Which is
 * also why there is no bell for a school's people. The owner's console keeps
 * one, because the owner is the person notices come from.
 *
 * READ, WHERE
 *
 * On the device, per person (`gs.notices.read.<uid>`). A notice is a sentence
 * from the platform, not a record, and syncing it would mean a write to the
 * database every time somebody glances at one.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Mark } from '@/components/brand/Mark';
import type { Notice } from '@/lib/notices';

const readKey = (uid: string) => `gs.notices.read.${uid}`;
const SHOWN = 'gs.notices.shown';

function readIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(readKey(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** The notices this person has not opened yet, newest first. */
export function unreadNotices(notices: Notice[], uid: string): Notice[] {
  if (!uid) return [];
  const read = new Set(readIds(uid));
  return notices.filter((notice) => !read.has(notice.id));
}

export function markNoticeRead(id: string, uid: string): void {
  if (!uid) return;
  try {
    const next = [...new Set([...readIds(uid), id])].slice(-50);
    localStorage.setItem(readKey(uid), JSON.stringify(next));
  } catch {
    /* private mode: it asks again next time, which is the safe way round */
  }
}

const COVER: Record<Notice['tone'], string> = {
  brand: 'from-brand-700 to-brand-500',
  warning: 'from-gold-600 to-gold-400',
  info: 'from-[#1f4f8f] to-[#3f8fd0]',
};

export function NoticePop({ notices, to, uid }: { notices: Notice[]; to: string; uid: string }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!uid) return;
    /* Once a session. A notice that has been closed is still on the to-do list. */
    if (sessionStorage.getItem(SHOWN)) return;
    const next = unreadNotices(notices, uid)[0];
    if (!next) return;
    sessionStorage.setItem(SHOWN, '1');
    setNotice(next);
  }, [notices, uid]);

  useEffect(() => {
    if (!notice) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotice(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notice]);

  if (!notice) return null;

  const open = () => {
    markNoticeRead(notice.id, uid);
    setNotice(null);
    navigate(to);
  };

  /*
   * Portalled to <body>, like every other overlay in the product.
   *
   * It has to be. `<main>` is now permanently a size container so the red
   * panel can measure its column (see `AppShell`), and `container-type`
   * carries `contain: layout` with it — which makes that element the
   * containing block for `position: fixed` descendants. A dialog rendered
   * inside main would therefore stop covering the viewport and start
   * covering the scrolling column instead: offset by the rail, clipped at
   * the header, and scrolling with the page behind it.
   *
   * `Modal` and the tour already did this. These did not, which is why the
   * container could not simply be left on.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A notice from GetSchool"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-night/70 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={() => setNotice(null)}
    >
      <div
        className="surface-card w-full max-w-sm overflow-hidden rounded-2xl border border-hairline shadow-pop animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        {/* The card's face: the mark on the notice's own colour. */}
        <div className={cn('relative flex h-32 items-center justify-center bg-gradient-to-br', COVER[notice.tone])}>
          <Mark size={46} className="text-white" />
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Close"
            className="tap absolute right-1 top-1 flex items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="p-5">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            <Megaphone size={14} aria-hidden />
            From GetSchool
          </p>
          <h2 className="mt-2 font-display text-[1.25rem] font-extrabold leading-snug tracking-[-0.02em] text-primary">
            {notice.title}
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="tap inline-flex h-11 items-center justify-center rounded-xl text-[14.5px] font-bold text-secondary ring-1 ring-inset ring-[var(--border-hairline)] transition-colors hover:text-primary"
            >
              Later
            </button>
            <button
              type="button"
              onClick={open}
              className="tap inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 text-[14.5px] font-bold text-white transition-colors hover:bg-brand-700"
            >
              {notice.cta || 'Read it'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The same card, standing still: what the owner sees while writing a notice,
 * and what the console shows for the ones that are live.
 */
export function NoticeCard({ notice, className }: { notice: Notice; className?: string }) {
  return (
    <div className={cn('surface-card w-full max-w-sm overflow-hidden rounded-2xl border border-hairline', className)}>
      <div className={cn('flex h-24 items-center justify-center bg-gradient-to-br', COVER[notice.tone])}>
        <Mark size={38} className="text-white" />
      </div>
      <div className="p-4">
        <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
          <Megaphone size={13} aria-hidden />
          From GetSchool
        </p>
        <p className="mt-1.5 font-display text-[1.05rem] font-extrabold leading-snug tracking-[-0.02em] text-primary">
          {notice.title || 'Your notice'}
        </p>
        <p className="mt-3 text-[12.5px] text-muted">{notice.cta || 'Read it'} · Later</p>
      </div>
    </div>
  );
}
