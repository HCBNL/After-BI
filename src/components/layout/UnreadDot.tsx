/**
 * The dot that says there is something waiting.
 *
 * WHAT WAS WRONG WITHOUT IT
 *
 * The school's notice board had exactly one indicator: a bell with a count, in
 * the app header. That header is hidden on the home screen — the panel draws
 * the top of that screen itself — which is to say the one signal that a notice
 * had arrived was missing from the one screen everybody opens first. A parent
 * could go a week without learning that the school had posted anything.
 *
 * WHY A DOT AND NOT A COUNT
 *
 * The bell carries a number because it is the thing you press to read them and
 * the number tells you whether it is worth it. Everywhere else — on the Menu
 * button, on a tile inside the menu — the question is not "how many" but "is
 * there anything", and a numeral on a 21px icon is a smudge. A dot answers the
 * only question being asked at that size.
 *
 * THE RING IS NOT DECORATION
 *
 * The dot lands on icons of every colour, over surfaces of every colour. A
 * two-pixel ring in the surface's own colour is what keeps it legible as a
 * separate mark rather than reading as part of the glyph underneath.
 */

import { cn } from '@/lib/cn';

/**
 * Two dresses, because the dot lands on two kinds of ground.
 *
 * `brand` is the ordinary one: red, on the white and near-black surfaces the
 * app is mostly made of. `hero` is for the red panel, where a red dot is a red
 * dot on red and says nothing at all — there it goes white, which is also the
 * colour of the icon it is sitting on, so it reads as part of the same mark.
 */
const TONE = {
  brand: 'bg-brand-600 dark:bg-brand-500',
  hero: 'bg-white',
} as const;

export function UnreadDot({
  className,
  tone = 'brand',
  /** The colour to ring it with. The surface it is sitting on, whatever that is. */
  ring = 'ring-[var(--surface-card)]',
}: {
  className?: string;
  tone?: keyof typeof TONE;
  ring?: string;
}) {
  return (
    <span aria-hidden className={cn('block h-2.5 w-2.5 rounded-full ring-2', TONE[tone], ring, className)} />
  );
}
