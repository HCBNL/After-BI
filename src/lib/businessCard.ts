import { publicOrigin } from './hosts';

/**
 * A digital business card, carried entirely in its link: for AfterBI's own
 * staff, and for the staff of every organisation on AfterBI (then `company`,
 * `website` and `logo` carry that organisation's name, site and logo).
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
  /** The organisation's name. Empty: an AfterBI staff card. */
  company?: string;
  website?: string;
  /** The organisation's logo URL. */
  logo?: string;
  /**
   * The holder's photograph: their profile picture's delivery URL.
   *
   * Only ever an https URL to an uploaded image, never the image itself. A
   * card's whole state travels in its link, and a photograph inlined as data
   * would run to tens of thousands of characters, which is past what some
   * chat apps will carry and far past what a QR code can hold.
   */
  photo?: string;
}

/* New keys go on the END, so links already shared keep reading correctly. */
const KEYS: (keyof BusinessCard)[] = ['name', 'position', 'location', 'phone', 'email', 'staffNo', 'company', 'website', 'logo', 'photo'];
const MAX: Partial<Record<keyof BusinessCard, number>> = { logo: 400, photo: 400 };

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

export function cardLink(card: BusinessCard, origin = publicOrigin()): string {
  /* A short array rather than an object, so the link stays short. */
  const values = KEYS.map((k) => (card[k] ?? '').trim().slice(0, MAX[k] ?? 80));
  while (values.length > 6 && !values[values.length - 1]) values.pop();
  return `${origin}/card#${toBase64Url(JSON.stringify(values))}`;
}

export function readCardHash(hash: string): BusinessCard | null {
  try {
    const values = JSON.parse(fromBase64Url(hash.replace(/^#/, ''))) as unknown;
    if (!Array.isArray(values)) return null;
    const card = Object.fromEntries(KEYS.map((k, i) => [k, String(values[i] ?? '').slice(0, MAX[k] ?? 80)])) as unknown as BusinessCard;
    /* Only https images are drawn: anything else in a link is ignored. A
       link is attacker-controlled, so this is the gate that stops one
       pointing the card's <img> at something it should not. */
    if (card.logo && !/^https:\/\//.test(card.logo)) card.logo = '';
    if (card.photo && !/^https:\/\//.test(card.photo)) card.photo = '';
    return card.name ? card : null;
  } catch {
    return null;
  }
}

/** A vCard, so "Save contact" puts them straight into the phone's contacts. */
export function vcard(card: BusinessCard, photoBase64 = ''): string {
  const [first, ...rest] = card.name.split(/\s+/);
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${rest.join(' ')};${first};;;`,
    `FN:${card.name}`,
    `ORG:${card.company || 'AfterBI (CONTORIC LTD)'}`,
    card.position && `TITLE:${card.position}`,
    card.phone && `TEL;TYPE=CELL:${card.phone}`,
    card.email && `EMAIL:${card.email}`,
    card.location && `ADR;TYPE=WORK:;;${card.location};;;;`,
    card.company ? card.website && `URL:https://${card.website.replace(/^https?:\/\//, '')}` : 'URL:https://afterbi.com',
    photoBase64 && fold(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`),
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



/* A vCard line may be no longer than 75 characters; longer ones carry on after a space. */
function fold(line: string): string {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 74) out.push((i ? ' ' : '') + line.slice(i, i + 74));
  return out.join('\r\n');
}

/**
 * The holder's picture as a small square JPEG, base64, for the vCard, so the
 * contact lands in the phone with their face. Cloudinary crops it on the face;
 * anything else is redrawn on a canvas. Empty when it cannot be had.
 */
export async function photoForVcard(url?: string): Promise<string> {
  if (!url || !/^https:\/\//.test(url)) return '';
  try {
    const src = url.includes('/upload/') ? url.replace('/upload/', '/upload/f_jpg,q_82,w_400,h_400,c_fill,g_face/') : url;
    const blob = await (await fetch(src, { mode: 'cors' })).blob();
    let jpeg = blob;
    if (blob.type !== 'image/jpeg') {
      const bitmap = await createImageBitmap(blob);
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(400, side);
      canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('photo'))), 'image/jpeg', 0.85));
    }
    const data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('photo'));
      reader.readAsDataURL(jpeg);
    });
    return data.split(',')[1] ?? '';
  } catch {
    return '';
  }
}

/** Saves the contact, with the picture when there is one. */
export async function saveContact(card: BusinessCard): Promise<void> {
  const photo = await photoForVcard(card.photo);
  const blob = new Blob([vcard(card, photo)], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${card.name.replace(/[^a-z0-9]+/gi, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
