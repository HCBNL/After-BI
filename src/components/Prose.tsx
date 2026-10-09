/**
 * Markdown, drawn as React elements.
 *
 * WHY NOT A LIBRARY
 *
 * The two obvious choices cost more than they are worth here. A parser plus a
 * sanitiser is about 60 KB on a page a visitor may read once, on a phone, on a
 * Nigerian mobile connection, and this app already refuses to ship the PDF
 * engine on first paint for the same reason. And `dangerouslySetInnerHTML`
 * without a sanitiser is how a blog becomes a cross-site scripting hole the
 * day somebody pastes in an embed.
 *
 * WHY IT IS SAFE
 *
 * Nothing here ever produces HTML. Every branch returns a React element with
 * text as its child, so a `<script>` typed into an article is drawn on the page
 * as the characters `<script>` and can do nothing at all. Link and image
 * addresses are the one thing that could still carry a payload, so they are
 * checked: `http`, `https` and `/` are allowed through and everything else , 
 * `javascript:` above all, is dropped.
 *
 * WHAT IT UNDERSTANDS
 *
 *   ## and ###        headings
 *   - and 1.          lists
 *   >                 a quotation
 *   ---               a rule
 *   ![alt](url)       a picture, on its own line
 *   [text](url)       a link
 *   **bold** *italic* `code`
 *
 * Anything else is a paragraph, which is the right answer for a body of text
 * somebody typed without thinking about markdown at all.
 */

import { Fragment, type ReactNode } from 'react';

/** `javascript:` and `data:` never get through. */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') || url.startsWith('#')) return url;
  return null;
}

const INLINE = /(!?\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

/** Bold, italic, code, links and inline pictures inside one line of text. */
function inline(text: string, keyed: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((piece, index) => {
    const key = `${keyed}-${index}`;

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(piece);
    if (image) {
      const src = safeHref(image[2]);
      return src ? (
        <img key={key} src={src} alt={image[1]} className="my-6 w-full rounded-2xl" loading="lazy" />
      ) : null;
    }

    const link = /^\[([^\]]*)\]\(([^)]+)\)$/.exec(piece);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a
          key={key}
          href={href}
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-400"
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {link[1]}
        </a>
      ) : (
        <Fragment key={key}>{link[1]}</Fragment>
      );
    }

    if (piece.startsWith('**') && piece.endsWith('**')) {
      return (
        <strong key={key} className="font-bold text-primary">
          {piece.slice(2, -2)}
        </strong>
      );
    }
    if (piece.startsWith('*') && piece.endsWith('*')) return <em key={key}>{piece.slice(1, -1)}</em>;
    if (piece.startsWith('`') && piece.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[0.9em]">
          {piece.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={key}>{piece}</Fragment>;
  });
}

export function Prose({ body, className }: { body: string; className?: string }) {
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let at = 0;
  while (at < lines.length) {
    const line = lines[at];
    const key = `b${at}`;

    if (!line.trim()) {
      at += 1;
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h3 key={key} className="mt-8 text-[17px] font-bold text-primary">
          {inline(line.replace(/^###\s+/, ''), key)}
        </h3>,
      );
      at += 1;
      continue;
    }

    if (/^##?\s+/.test(line)) {
      blocks.push(
        <h2 key={key} className="mt-10 font-display text-[1.45rem] font-bold leading-snug text-primary">
          {inline(line.replace(/^##?\s+/, ''), key)}
        </h2>,
      );
      at += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key} className="my-10 border-hairline" />);
      at += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (at < lines.length && /^>\s?/.test(lines[at])) {
        quote.push(lines[at].replace(/^>\s?/, ''));
        at += 1;
      }
      blocks.push(
        <blockquote
          key={key}
          className="my-6 border-l-[3px] border-brand-700 pl-5 text-[16px] italic leading-relaxed text-secondary dark:border-brand-500"
        >
          {inline(quote.join(' '), key)}
        </blockquote>,
      );
      continue;
    }

    const bulleted = /^[-*]\s+/.test(line);
    const numbered = /^\d+[.)]\s+/.test(line);
    if (bulleted || numbered) {
      const items: string[] = [];
      const same = (candidate: string) =>
        bulleted ? /^[-*]\s+/.test(candidate) : /^\d+[.)]\s+/.test(candidate);
      while (at < lines.length && same(lines[at])) {
        items.push(lines[at].replace(/^([-*]|\d+[.)])\s+/, ''));
        at += 1;
      }
      const List = bulleted ? 'ul' : 'ol';
      blocks.push(
        <List
          key={key}
          className={`my-5 space-y-2 pl-5 text-[16px] leading-relaxed text-secondary ${
            bulleted ? 'list-disc' : 'list-decimal'
          }`}
        >
          {items.map((item, index) => (
            <li key={`${key}-${index}`}>{inline(item, `${key}-${index}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    /* A picture on a line of its own is a block, not a run of text. */
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) {
      blocks.push(<Fragment key={key}>{inline(line.trim(), key)}</Fragment>);
      at += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      at < lines.length &&
      lines[at].trim() &&
      !/^(#{1,3}\s|>|[-*]\s|\d+[.)]\s|---+$)/.test(lines[at])
    ) {
      paragraph.push(lines[at]);
      at += 1;
    }
    blocks.push(
      <p key={key} className="my-5 text-[16px] leading-[1.75] text-secondary">
        {inline(paragraph.join(' '), key)}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
