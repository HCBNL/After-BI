/**
 * An AfterBI staff member's digital business card, carried entirely in its link.
 *
 * `/card#<data>`: the details are base64url JSON after the hash, so nothing is
 * stored anywhere and the hash never reaches a server log. The staff member
 * shares the link; whoever opens it sees the card and can call, WhatsApp,
 * email or save the contact.
 */

export interface BusinessCard {
  name: string;
  position: string;
  location: string;
  phone: string;
  email: string;
  staffNo: string;
}

const KEYS: (keyof BusinessCard)[] = ['name', 'position', 'location', 'phone', 'email', 'staffNo'];

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function cardLink(card: BusinessCard, origin = window.location.origin): string {
  /* A short array rather than an object, so the link stays short. */
  return `${origin}/card#${toBase64Url(JSON.stringify(KEYS.map((k) => card[k].trim().slice(0, 80))))}`;
}

export function readCardHash(hash: string): BusinessCard | null {
  try {
    const values = JSON.parse(fromBase64Url(hash.replace(/^#/, ''))) as unknown;
    if (!Array.isArray(values)) return null;
    const card = Object.fromEntries(KEYS.map((k, i) => [k, String(values[i] ?? '').slice(0, 80)])) as unknown as BusinessCard;
    return card.name ? card : null;
  } catch {
    return null;
  }
}

/** A vCard, so "Save contact" puts them straight into the phone's contacts. */
export function vcard(card: BusinessCard): string {
  const [first, ...rest] = card.name.split(/\s+/);
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${rest.join(' ')};${first};;;`,
    `FN:${card.name}`,
    'ORG:AfterBI (CONTORIC LTD)',
    card.position && `TITLE:${card.position}`,
    card.phone && `TEL;TYPE=CELL:${card.phone}`,
    card.email && `EMAIL:${card.email}`,
    card.location && `ADR;TYPE=WORK:;;${card.location};;;;`,
    'URL:https://afterbi.com',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** A phone number as wa.me wants it: international, digits only. */
export function whatsappNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('234')) {
    if (digits[3] === '0') digits = `234${digits.slice(4)}`;
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = `234${digits}`;
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function whatsappLink(phone: string | null, message: string): string {
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
