/**
 * AfterBI's own channels: the "follow us" rows on the blog and the footer.
 *
 * The owner sets them in Platform, Website. Until a channel is set there the
 * defaults below are used, and a channel cleared on purpose is dropped, so a
 * row is only ever as long as what is actually kept up.
 */
import type { SiteSocial } from './siteDoc';
import { WHATSAPP_URL } from './siteMeta';

export interface SocialLink {
  key: keyof SiteSocial;
  label: string;
  href: string;
}

const DEFAULT_SOCIAL: SiteSocial = {
  whatsapp: WHATSAPP_URL,
  linkedin: 'https://www.linkedin.com/company/afterbi',
  x: 'https://x.com/afterbi',
};

const ORDER: { key: keyof SiteSocial; label: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

export const SOCIAL_FIELDS = ORDER;

export function socialLinks(social: SiteSocial | undefined): SocialLink[] {
  return ORDER.map(({ key, label }) => {
    const set = social?.[key];
    /* An explicitly blank value means "we do not have one" and beats the default. */
    const href = (typeof set === 'string' ? set : (DEFAULT_SOCIAL[key] ?? '')).trim();
    return { key, label, href };
  }).filter((link) => /^https?:\/\//i.test(link.href));
}
