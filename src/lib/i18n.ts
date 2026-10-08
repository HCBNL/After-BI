/**
 * Language: English (the source), Simplified Chinese and French.
 *
 * HOW IT WORKS
 *
 * The app is written in English. When another language is chosen, its
 * dictionary (`src/i18n/<lang>.json`, English text to translated text) is
 * loaded before the first render, and every piece of text the page shows is
 * swapped for its translation as it appears: text, placeholders, tooltips,
 * labels and the tab title. A MutationObserver keeps doing it as screens
 * change. Text the dictionary does not know is left in English rather than
 * guessed at, and anything typed by people (form values) is never touched.
 *
 * Interpolated text ("Day 3 of 14") is matched by templates in the dictionary
 * ("Day {0} of {1}"), and each filled-in part is translated too if it is
 * itself a known phrase.
 *
 * To add or correct a translation, edit `src/i18n/zh.json` or `src/i18n/fr.json`. To find text that
 * is new since the last translation, run `node scripts/extract-strings.mjs`.
 *
 * A part of the page that must never be translated (a customer's name, a
 * code) can be wrapped in `translate="no"` or given the class `notranslate`.
 */

export type Lang = 'en' | 'zh' | 'fr';

export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'zh', label: '简体中文', short: '中文' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

const KEY = 'ab.lang';

export function getLang(): Lang {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'zh' || stored === 'en' || stored === 'fr') return stored;
  } catch {
    /* storage blocked */
  }
  return 'en';
}

/** Change language. The page reloads so every screen starts clean in the new one. */
export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked: nothing to remember it in */
  }
  window.location.reload();
}

/* ---------------------------------------------------------------- engine */

interface Template {
  re: RegExp;
  out: string;
  weight: number;
}

let exact: Map<string, string> | null = null;
let templates: Template[] = [];

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT', 'SVG']);

/** Text nodes and attributes already translated, and what they were translated to. */
const done = new WeakMap<Node, string>();
const doneAttr = new WeakMap<Element, Map<string, string>>();

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function build(dict: Record<string, string>): void {
  exact = new Map();
  templates = [];
  for (const [source, target] of Object.entries(dict)) {
    if (!target) continue;
    if (/\{\d+\}/.test(source)) {
      const pattern = source
        .split(/(\{\d+\})/)
        .map((part) => (/^\{\d+\}$/.test(part) ? `(?<p${part.slice(1, -1)}>.+?)` : escapeRe(part)))
        .join('');
      /* Too little fixed wording ("{0}s") would match ordinary text by accident. */
      const letters = source.replace(/\{\d+\}/g, '').replace(/[^A-Za-z]/g, '').length;
      if (letters < 4) continue;
      const weight = source.replace(/\{\d+\}/g, '').length;
      try {
        templates.push({ re: new RegExp(`^${pattern}$`, 's'), out: target, weight });
      } catch {
        /* a placeholder used twice: skip this template */
      }
    } else {
      exact.set(source, target);
    }
  }
  templates.sort((a, b) => b.weight - a.weight);
}

/** The translation of one piece of text, or null if the dictionary does not know it. */
export function translateText(core: string, depth = 0): string | null {
  if (!exact) return null;
  const hit = exact.get(core);
  if (hit !== undefined) return hit;
  if (depth > 1 || core.length > 1200) return null;
  for (const t of templates) {
    const m = t.re.exec(core);
    if (!m) continue;
    const groups = m.groups ?? {};
    return t.out.replace(/\{(\d+)\}/g, (_, i: string) => {
      const value = groups[`p${i}`] ?? '';
      return translateText(value.trim(), depth + 1) ?? value;
    });
  }
  return null;
}

function translateValue(value: string): string | null {
  const core = value.replace(/\s+/g, ' ').trim();
  if (!core || !/[A-Za-z]/.test(core)) return null;
  const hit = translateText(core);
  if (hit === null) return null;
  const lead = /^\s/.test(value) ? ' ' : '';
  const trail = /\s$/.test(value) ? ' ' : '';
  return lead + hit + trail;
}

function skipped(el: Element | null): boolean {
  for (let node = el; node; node = node.parentElement) {
    if (SKIP_TAGS.has(node.tagName.toUpperCase())) return true;
    if (node.getAttribute('translate') === 'no' || node.classList.contains('notranslate')) return true;
    if ((node as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function doText(node: Text): void {
  const value = node.nodeValue ?? '';
  if (done.get(node) === value) return;
  if (skipped(node.parentElement)) return;
  const next = translateValue(value);
  if (next !== null && next !== value) {
    done.set(node, next);
    node.nodeValue = next;
  } else {
    done.set(node, value);
  }
}

function doAttrs(el: Element): void {
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    let seen = doneAttr.get(el);
    if (seen?.get(name) === value) continue;
    if (skipped(el)) return;
    const next = translateValue(value);
    if (!seen) {
      seen = new Map();
      doneAttr.set(el, seen);
    }
    if (next !== null && next !== value) {
      seen.set(name, next);
      el.setAttribute(name, next);
    } else seen.set(name, value);
  }
}

function sweep(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    doText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (SKIP_TAGS.has(el.tagName.toUpperCase())) return;
    doAttrs(el);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) doText(node as Text);
    else doAttrs(node as Element);
  }
}

function observe(target: Node): void {
  const pending = new Set<Node>();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    const nodes = [...pending];
    pending.clear();
    nodes.forEach(sweep);
  };
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') pending.add(record.target);
      else if (record.type === 'attributes') pending.add(record.target);
      else record.addedNodes.forEach((node) => pending.add(node));
    }
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  }).observe(target, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

/**
 * Called once at start-up, before React renders. In English it does nothing
 * and loads nothing.
 */
export async function startI18n(): Promise<void> {
  const lang = getLang();
  if (lang === 'en') return;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'fr';
  document.documentElement.dataset.lang = lang;
  try {
    /* Each language is its own file, fetched only by the people who choose it. */
    const dict = (lang === 'zh' ? await import('@/i18n/zh.json') : await import('@/i18n/fr.json')).default as Record<string, string>;
    build(dict);
    sweep(document.body);
    sweep(document.head);
    observe(document.body);
    observe(document.head);
  } catch {
    /* the dictionary did not load: the page stays in English */
  }
}
