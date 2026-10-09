/**
 * New enquiries from the website, for the platform owner.
 *
 * Replaces the yellow bar that used to sit across the top of the owner's home
 * screen. Now:
 *
 *   · the Enquiries button carries a red, pulsing dot wherever it appears
 *     (home tiles, menu, bottom bar, side rail) while anything is unseen;
 *   · a pop-up says so once per visit, with Later and Open;
 *   · opening the Enquiries screen counts them as seen, and the dot goes.
 *
 * "Seen" is the time of the newest enquiry when the screen was last opened,
 * kept on this device. Re-checked when the tab comes back into view and every
 * few minutes while it is open, so a lead that arrives during the day shows
 * up without a reload.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Inbox, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listProductEnquiries } from '@/lib/db';
import { setPending } from '@/lib/pending';
import type { ProductEnquiry } from '@/types';
import { isPartnerEnquiry, partnerTitle } from '@/lib/partners';

const ACTION_ID = 'owner-enquiries';
const PATH = '/portal/owner/enquiries';
const EVERY_MS = 5 * 60_000;
const seenKey = (uid: string) => `gs.enquiries.seen.${uid}`;
const POPPED = 'gs.enquiries.popped';

function readSeen(uid: string): string {
  try {
    return localStorage.getItem(seenKey(uid)) ?? '';
  } catch {
    return '';
  }
}

function writeSeen(uid: string, at: string): void {
  try {
    localStorage.setItem(seenKey(uid), at);
  } catch {
    /* Private mode: the dot comes back next visit, which is the safe way round. */
  }
}

function poppedThisVisit(): boolean {
  try {
    return sessionStorage.getItem(POPPED) === '1';
  } catch {
    return false;
  }
}

function markPopped(): void {
  try {
    sessionStorage.setItem(POPPED, '1');
  } catch {
    /* ignore */
  }
}

export function EnquiryWatch() {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onEnquiries = pathname.startsWith(PATH);

  const [leads, setLeads] = useState<ProductEnquiry[]>([]);
  const [popup, setPopup] = useState<ProductEnquiry[] | null>(null);

  const check = useCallback(async () => {
    if (!uid) return;
    try {
      setLeads(await listProductEnquiries());
    } catch {
      /* Offline or refused: keep whatever was known. */
    }
  }, [uid]);

  /* Fetch now, when the tab comes back, and every few minutes while open. */
  useEffect(() => {
    void check();
    const again = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', again);
    const timer = window.setInterval(again, EVERY_MS);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.clearInterval(timer);
    };
  }, [check]);

  /* Work out what is unseen, update the dot, and pop up once per visit. */
  useEffect(() => {
    if (!uid) return;
    const fresh = leads.filter((lead) => (lead.status ?? 'new') === 'new');
    const newest = leads[0]?.createdAt ?? '';

    if (onEnquiries) {
      /* Looking at them now: everything up to the newest counts as seen. */
      if (newest && newest > readSeen(uid)) writeSeen(uid, newest);
      setPending(ACTION_ID, 0);
      setPopup(null);
      return;
    }

    const seen = readSeen(uid);
    const unseen = fresh.filter((lead) => (lead.createdAt ?? '') > seen);
    setPending(ACTION_ID, unseen.length);
    if (unseen.length && !poppedThisVisit()) {
      markPopped();
      setPopup(unseen);
    }
  }, [leads, onEnquiries, uid]);

  /* Clear the dot if the owner signs out. */
  useEffect(() => () => setPending(ACTION_ID, 0), []);

  useEffect(() => {
    if (!popup) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopup(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popup]);

  if (!popup || !popup.length) return null;

  const count = popup.length;
  const names = popup
    .slice(0, 3)
    .map((lead) =>
      isPartnerEnquiry(lead)
        ? `Partner application: ${partnerTitle(lead.schoolName) || lead.contactName}`
        : lead.schoolName || lead.contactName || 'A school',
    );
  const partners = popup.filter((lead) => isPartnerEnquiry(lead)).length;
  const more = count - names.length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New enquiries"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-night/70 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={() => setPopup(null)}
    >
      <div
        className="surface-card w-full max-w-sm overflow-hidden rounded-2xl border border-hairline shadow-pop animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
            <Inbox size={26} aria-hidden />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-brand-700">
              {count}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setPopup(null)}
            aria-label="Close"
            className="tap absolute right-1 top-1 flex items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="p-5">
          <h2 className="font-display text-[1.2rem] font-extrabold leading-snug tracking-[-0.02em] text-primary">
            {count} new {count === 1 ? 'enquiry' : 'enquiries'} from the website
          </h2>
          {partners > 0 && (
            <p className="mt-1 text-[13px] font-semibold text-gold-600 dark:text-gold-300">
              {partners === count
                ? partners === 1
                  ? 'A Partner Programme application'
                  : 'All Partner Programme applications'
                : `${partners} of them ${partners === 1 ? 'is a partner application' : 'are partner applications'}`}
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="flex items-center gap-2 text-[14px] text-secondary">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                <span className="truncate">{name}</span>
              </li>
            ))}
            {more > 0 && <li className="pl-3.5 text-[13px] text-muted">and {more} more</li>}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="tap inline-flex h-11 items-center justify-center rounded-xl text-[14.5px] font-bold text-secondary ring-1 ring-inset ring-[var(--border-hairline)] transition-colors hover:text-primary"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => {
                setPopup(null);
                navigate(PATH);
              }}
              className="tap inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 text-[14.5px] font-bold text-white transition-colors hover:bg-brand-700"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
