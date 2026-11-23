/**
 * Hide balances: one switch, remembered on this device, that turns every naira
 * figure on screen into asterisks. Shown by default; once hidden it stays
 * hidden on every page and after a reload until it is shown again.
 *
 * HOW IT WORKS WITHOUT RELOADING ANYTHING
 *
 * The money formatters wrap every figure in two invisible marks (`markMoney`).
 * A watcher on the page finds marked text as it appears and, while balances
 * are hidden, swaps the figure for `₦*****` in place. Flipping the switch walks
 * the page once and swaps every figure back or forth: no page reloads, no
 * scroll jump, no form loses what was typed, and memoised numbers are covered
 * because the masking happens on what is drawn, not on how it was worked out.
 *
 * Tooltips and screen-reader labels are masked the same way. Headline figures (big display numbers) are marked as tappable: tapping one
 * hides or shows every balance. Copying a figure never carries the marks.
 *
 * Printed documents, PDFs and exports use their own formatters (`nairaPlain`,
 * `lib/print`), so they always carry the real amounts.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'afterbi.hideMoney';

/** What a hidden figure reads as. */
export const MONEY_MASK = '₦*****';

const START = '\u2061';
const END = '\u2062';
const MARKED = /\u2061[^\u2062]*\u2062/g;
const MARKS = /[\u2061\u2062]/g;
const HAS_MARK = /[\u2061\u2062]/;

/** Wraps a formatted figure so the page can find it. Invisible on screen. */
export function markMoney(text: string): string {
  return START + text + END;
}

/** A string with the marks taken out, for anything leaving the screen. */
export function unmarkMoney(text: string): string {
  return text.replace(MARKS, '');
}

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
  apply();
  listeners.forEach((fn) => fn());
}

export function toggleMoneyHidden(): void {
  setMoneyHidden(!hidden);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && read() !== hidden) {
      hidden = read();
      apply();
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

/* ---------------------------------------------------------- the page watcher */

/** Text nodes currently showing asterisks, and what they really say. */
const masked = new Map<Text, string>();
/** Tooltips and screen-reader labels with a figure in them, masked the same way. */
const ATTRS = ['title', 'aria-label'];
const maskedAttrs = new Map<Element, Record<string, string>>();

/** Big display numbers are "figures": tappable, and not text to select. */
function markFigure(node: Text) {
  const host = node.parentElement;
  if (host && !host.hasAttribute('data-money') && host.closest('.font-display')) host.setAttribute('data-money', '');
}

function handle(node: Text) {
  const value = node.nodeValue ?? '';
  if (!value.includes(START)) return;
  markFigure(node);
  if (!hidden) return;
  masked.set(node, value);
  node.nodeValue = value.replace(MARKED, MONEY_MASK);
}

function handleAttr(el: Element, name: string) {
  const value = el.getAttribute(name);
  if (!hidden || !value || !value.includes(START)) return;
  maskedAttrs.set(el, { ...maskedAttrs.get(el), [name]: value });
  el.setAttribute(name, value.replace(MARKED, MONEY_MASK));
}

function scan(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    handle(root as Text);
    return;
  }
  if (!(root instanceof Element)) return;
  if (hidden) {
    for (const el of [root, ...root.querySelectorAll('[title], [aria-label]')]) ATTRS.forEach((name) => handleAttr(el, name));
  }
  if (!(root.textContent ?? '').includes(START)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) handle(n as Text);
}

/** Swaps every figure on the page to match the switch. */
function apply() {
  if (typeof document === 'undefined' || !document.body) return;
  if (hidden) {
    scan(document.body);
  } else {
    masked.forEach((value, node) => {
      node.nodeValue = value;
    });
    masked.clear();
    maskedAttrs.forEach((values, el) => Object.entries(values).forEach(([name, value]) => el.setAttribute(name, value)));
    maskedAttrs.clear();
  }
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') handle(record.target as Text);
      else if (record.type === 'attributes') handleAttr(record.target as Element, record.attributeName ?? '');
      else record.addedNodes.forEach(scan);
    }
    /* Forget figures that have left the page. */
    if (masked.size > 200) masked.forEach((_, node) => !node.isConnected && masked.delete(node));
    if (maskedAttrs.size > 200) maskedAttrs.forEach((_, el) => !el.isConnected && maskedAttrs.delete(el));
  });

  const start = () => {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    scan(document.body);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  /* Tapping a headline figure flips the switch, unless it sits inside a link or button. */
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const figure = target?.closest('[data-money]');
    if (!figure || figure.closest('a, button, input, select, textarea, label, [role="button"], [role="link"]')) return;
    if (window.getSelection()?.toString()) return;
    toggleMoneyHidden();
  });

  /* Copying a shown figure gives the plain number, without the invisible marks. */
  document.addEventListener('copy', (event) => {
    const text = window.getSelection()?.toString() ?? '';
    if (!HAS_MARK.test(text)) return;
    event.clipboardData?.setData('text/plain', unmarkMoney(text));
    event.preventDefault();
  });
}
