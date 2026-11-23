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
  /** Too little fixed wording to trust with words: its slots may only hold numbers. */
  numbersOnly: boolean;
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
      /*
       * Too little fixed wording would match ordinary text by accident:
       * "{0} of {1}" also fits "Bank of Industry". Such an entry used to be
       * dropped, which meant every counter ("3 of 5", "Day 6 of 30") stayed in
       * English. Now it is kept, but only allowed to fire when every slot
       * holds a number, which is the only thing a counter ever holds.
       */
      const letters = source.replace(/\{\d+\}/g, '').replace(/[^A-Za-z]/g, '').length;
      if (letters < 1) continue;
      const weight = source.replace(/\{\d+\}/g, '').length;
      try {
        templates.push({ re: new RegExp(`^${pattern}$`, 's'), out: target, weight, numbersOnly: letters < 4 });
      } catch {
        /* a placeholder used twice: skip this template */
      }
    } else {
      exact.set(source, target);
    }
  }
  templates.sort((a, b) => b.weight - a.weight);
}

/** A count, an amount or a percentage: "3", "1,204", "₦4.9m", "45%", "99+". */
const NUMBER = /^[-−]?[₦$€£#+~]?\s?\d[\d,.\s]*(%|[kmbKMB]|Md|万|亿|\+)?\s?₦?$/;

/**
 * True when a slot has caught more than one sentence.
 *
 * A slot is for a figure, a name, a code or one phrase. When a page puts
 * several sentences in one piece of text, a loose entry such as
 * "{0} on your own list {1} due." will happily match the lot, with {0} holding
 * every sentence before the last, and the page shows the last few words in
 * Chinese glued to a paragraph of English. Refusing the match leaves the text
 * in English, which is honest, instead of half translated, which is not.
 *
 * "Ltd. Lagos" has a full stop in it too, so it is not enough to look for one:
 * it takes a sentence break followed by at least three more words.
 */
function spansSentences(value: string): boolean {
  const brk = /[.!?。！？]\s+(?=\S)/.exec(value);
  if (!brk) return false;
  return value.slice(brk.index + brk[0].length).split(/\s+/).filter(Boolean).length >= 3;
}

/*
 * Chinese sets Latin words and figures apart from the characters around them
 * with a space: "由 Ada Obi 于 11月6日 创建", not "由Ada Obi于11月6日创建". A
 * slot filled with a name or a number gets that space; one filled with a
 * phrase the dictionary turned into Chinese does not, and neither does a
 * figure that runs into a date character (6日, 2026年).
 */
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const LATIN_START = /^[A-Za-z0-9₦$€£#(]/;
const LATIN_END = /[A-Za-z0-9%)]$/;
const DATE_UNIT = /^[年月日号]/;
let spacedLang = false;

function spaced(text: string, before: string | undefined, after: string | undefined): string {
  if (!spacedLang || !text) return text;
  let out = text;
  if (before && HAN.test(before) && LATIN_START.test(out)) out = ' ' + out;
  if (after && HAN.test(after) && LATIN_END.test(out) && !(DATE_UNIT.test(after) && /\d$/.test(out))) out += ' ';
  return out;
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
    if (Object.values(groups).some((value) => value !== undefined && spansSentences(value))) continue;
    if (t.numbersOnly && !Object.values(groups).every((value) => value !== undefined && NUMBER.test(value.trim()))) continue;
    return t.out.replace(/\{(\d+)\}/g, (slot: string, i: string, at: number, whole: string) => {
      const value = groups[`p${i}`] ?? '';
      const text = translateText(value.trim(), depth + 1) ?? value;
      return spaced(text, whole[at - 1], whole[at + slot.length]);
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
    /* A text box's own contents are the person's, but its placeholder and label are ours. */
    if (skipped(el.tagName === 'TEXTAREA' ? el.parentElement : el)) return;
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
    spacedLang = lang === 'zh';
    build(dict);
    sweep(document.body);
    sweep(document.head);
    observe(document.body);
    observe(document.head);
  } catch {
    /* the dictionary did not load: the page stays in English */
  }
}
