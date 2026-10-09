/**
 * The green WhatsApp button: one tap opens a chat with GetSchool.
 *
 * Used twice. On the website it sits at the foot of the floating stack, below
 * Help, and is there from the first screen because a visitor with a question
 * should not have to scroll to find a way to ask it. In the portal it is a
 * fixed button for staff, raised above the bottom bar on a phone.
 */

import { SocialIcon } from '@/components/marketing/SocialIcon';
import { SUPPORT_WHATSAPP } from '@/lib/constants';
import { whatsappDigits } from '@/lib/whatsapp';
import { cn } from '@/lib/cn';

/** Always a direct chat: https://wa.me/<number>?text=… */
export function whatsappHref(message: string, override?: string): string {
  const number = whatsappDigits(override) ?? SUPPORT_WHATSAPP;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppButton({
  message,
  href,
  className,
  size = 'md',
}: {
  message: string;
  /** A wa.me address from the site settings; GetSchool's own line otherwise. */
  href?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <a
      href={whatsappHref(message, href)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with GetSchool on WhatsApp"
      title="Chat with us on WhatsApp"
      className={cn(
        'tap inline-flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop ring-1 ring-inset ring-black/5 transition-transform hover:scale-105 active:scale-95',
        size === 'md' ? 'h-14 w-14' : 'h-12 w-12',
        className,
      )}
    >
      <SocialIcon name="whatsapp" size={size === 'md' ? 28 : 24} />
    </a>
  );
}
