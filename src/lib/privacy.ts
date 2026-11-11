/**
 * Hide balances: one switch, remembered on this device, that turns every naira
 * figure on screen into dots. Shown by default; once hidden it stays hidden on
 * every page and after a reload until it is shown again.
 *
 * The money formatters read the flag directly, so nothing has to pass it
 * down. The shell remounts the open page when it flips (see Chrome), which
 * re-runs every formatter on it, memoised ones included. A page somebody is
 * in the middle of typing on is not remounted (see `draftOnPage`): their words
 * are worth more than an instant mask, and it switches when they leave.
 * Printed documents and exports use their own formatters and are never masked.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'afterbi.hideMoney';

/** What a hidden figure reads as. */
export const MONEY_MASK = '₦ •••••';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let hidden = read();
const listeners = new Set<() => void>();

export function moneyHidden(): boolean {
  return hidden;
}

export function setMoneyHidden(next: boolean): void {
  if (next === hidden) return;
  hidden = next;
  try {
    if (next) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* Private mode: holds for this visit. */
  }
  listeners.forEach((fn) => fn());
}

export function toggleMoneyHidden(): void {
  setMoneyHidden(!hidden);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      hidden = read();
      fn();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function useMoneyHidden(): boolean {
  return useSyncExternalStore(subscribe, moneyHidden, moneyHidden);
}

/*
 * Has somebody typed into a form on this page, and is what they typed still on
 * screen? Search boxes do not count, and neither does a form that has since
 * closed. Tracked from the document, so no page has to report it.
 */
const TYPED = 'input:not([type=search]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=date]):not([type=month]), textarea';
let typed = false;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'input',
    (event) => {
      if (event.target instanceof Element && event.target.matches(TYPED)) typed = true;
    },
    true,
  );
}

/** Call when the route changes: a new page starts with nothing typed. */
export function clearDraft(): void {
  typed = false;
}

export function draftOnPage(): boolean {
  if (!typed) return false;
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TYPED)).some((el) => el.value.trim() !== '');
}
