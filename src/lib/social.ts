/**
 * AfterBI's own channels: the "follow us" rows on the blog and the footer.
 *
 * The owner sets them in Platform, Website. This file is now only the order
 * they appear in and their labels: the built-in defaults went with
 * `socialLinks`, which nothing had called since the footer began reading the
 * saved document directly.
 */
import type { SiteSocial } from './siteDoc';

const ORDER: { key: keyof SiteSocial; label: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

export const SOCIAL_FIELDS = ORDER;

