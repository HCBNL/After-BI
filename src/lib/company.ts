/**
 * The company behind AfterBI, as it signs documents.
 *
 * CONTORIC LTD is the parent company; AfterBI is the product. The logo on
 * every page and document is AfterBI's; the legal name is Contoric's.
 * Fill `rc` when the registration number is to hand; an empty value is simply
 * left off every document.
 */

import { SALES_PHONE, SITE_URL, SUPPORT_EMAIL } from './siteMeta';

export const COMPANY = {
  /** Legal name, as registered. */
  name: 'CONTORIC LTD',
  /** e.g. 'RC 1234567'. Empty until provided. */
  rc: '',
  product: 'AfterBI',
  /** Office address for the back of staff ID cards. Empty hides the line. */
  address: '',
  phone: SALES_PHONE,
  email: SUPPORT_EMAIL,
  website: SITE_URL.replace(/^https?:\/\//, '').replace(/^/, 'www.').replace(/^www\.www\./, 'www.'),
  ceo: 'Collins C. Nwobodo',
  ceoTitle: 'CEO & Founder',
  tagline: 'Sales and distribution platform',
  url: 'www.contoric.com',
  /** One line for document footers. */
  footer: 'AfterBI is a product of CONTORIC LTD',
};

/** Public files, as absolute addresses so they also resolve inside print windows. */
export function brandAsset(path: 'mark' | 'signature'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${origin}/brand/${path === 'mark' ? 'afterbi-mark.png' : 'signature.png'}`;
}
