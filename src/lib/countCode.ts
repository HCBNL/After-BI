/**
 * The stock count code on a carton sticker.
 *
 * WHAT IT LOOKS LIKE
 *
 *   AB K7M2QX 4
 *   │  │      └ check character, worked out from the code AND the organisation
 *   │  └ six characters, random, unique inside the organisation
 *   └ AfterBI
 *
 * Printed as a Code 128 barcode with the same nine characters under it, so a
 * torn sticker can still be typed in.
 *
 * WHY IT ONLY WORKS INSIDE AFTERBI
 *
 * There is no web address and no product name in it. A shop's till or a
 * phone's barcode app that reads it gets nine letters and digits that mean
 * nothing. AfterBI reads it against the signed-in organisation's catalogue,
 * and the check character is worked out from that organisation's id: a
 * sticker printed by another company on AfterBI fails the check before the
 * catalogue is even looked at.
 *
 * The alphabet leaves out I, L, O and U, so a code typed by hand cannot be
 * misread; anything typed as O or I is read as 0 or 1.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'AB';
const BODY = 6;

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  /* FNV alone leaves its low bits depending only on the low bits of the input
     (so "0" and "P" would weigh the same); this finaliser mixes every bit in. */
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function checkChar(orgId: string, body: string): string {
  return ALPHABET[fnv1a(`${orgId}:${PREFIX}${body}`) % ALPHABET.length];
}

function randomBody(): string {
  const bytes = new Uint8Array(BODY);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** A new code for this organisation, never one already in `taken`. */
export function newCountCode(orgId: string, taken: Iterable<string> = []): string {
  const used = new Set([...taken].map((c) => c.toUpperCase()));
  for (let i = 0; i < 50; i += 1) {
    const body = randomBody();
    const code = `${PREFIX}${body}${checkChar(orgId, body)}`;
    if (!used.has(code)) return code;
  }
  throw new Error('Could not make a new sticker code. Try again.');
}

/** "AB K7M2QX 4": the code as printed under the bars and shown on screen. */
export function displayCode(code?: string | null): string {
  const c = (code ?? '').toUpperCase();
  if (c.length !== PREFIX.length + BODY + 1) return c;
  return `${c.slice(0, 2)} ${c.slice(2, 2 + BODY)} ${c.slice(2 + BODY)}`;
}

export type CodeReading =
  | { ok: true; code: string }
  | { ok: false; reason: 'not-afterbi' | 'other-company'; text: string };

/**
 * Whatever the camera or a person produced, read as a code of this
 * organisation. Spaces and case are ignored; O and I are read as 0 and 1.
 */
export function readCountCode(raw: string, orgId: string): CodeReading {
  const text = (raw ?? '').trim();
  const clean = text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  /* The prefix itself contains no O, I or L, so the swaps above cannot break it. */
  const shape = new RegExp(`^${PREFIX}[${ALPHABET}]{${BODY + 1}}$`);
  if (!shape.test(clean)) return { ok: false, reason: 'not-afterbi', text };
  const body = clean.slice(PREFIX.length, PREFIX.length + BODY);
  if (clean.slice(-1) !== checkChar(orgId, body)) return { ok: false, reason: 'other-company', text };
  return { ok: true, code: clean };
}

/** True when `code` is a well formed code of this organisation. */
export function isOwnCode(code: string | undefined, orgId: string): boolean {
  return Boolean(code) && readCountCode(code!, orgId).ok;
}
