/**
 * What the help bubble answers before anybody has to talk to a person.
 *
 * WHY THIS IS NOT THE FAQ
 *
 * `FAQ` in `site.ts` answers the questions a reader has while they are
 * reading: what is this, how is it different from an ERP. Those are written
 * to be read in order, on a page, by somebody browsing.
 *
 * These are the questions somebody has at the moment they reach for a chat
 * button, which is a different moment entirely. They have usually hit one
 * specific wall: they cannot find the price, they do not know whether their
 * distributors have to pay, they cannot sign in. So each entry here is short
 * enough to read in the bubble, and most of them carry a `to` — the page that
 * actually finishes the job. Answering in the bubble and then leaving them to
 * hunt for the page is worse than not answering.
 *
 * ORDER IS DELIBERATE: cheapest objection first. Price, then whether the
 * partners cost money, then how long it takes. Those three are what stop a
 * distribution business from booking a demo, in that order.
 */

export interface HelpTopic {
  /** The question, in the visitor's words rather than ours. */
  q: string;
  /** Short enough to read in the bubble: two sentences at most. */
  a: string;
  /** Where the answer is finished. Internal routes only. */
  to?: string;
  /** The label on that link. Written as the action, not as the destination. */
  cta?: string;
  /** Opens the booking sheet instead of navigating. */
  book?: boolean;
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    q: 'What does it cost?',
    a: 'From ₦7,500 per user a month, billed per organisation, with two months free if you pay yearly. Three plans: Sole Trader, SME and Enterprise.',
    to: '/pricing',
    cta: 'See the plans',
  },
  {
    q: 'Do my distributors have to pay?',
    a: 'No. Partner users are free on every plan, with no cap. Each distributor gets their own portal to place orders, check statements and report what they sold.',
    to: '/features/distributor-portal',
    cta: 'See the partner portal',
  },
  {
    q: 'How quickly can we go live?',
    a: 'A single site is usually live within a week. A larger network with several depots and many partners takes about a month, onboarding included.',
    book: true,
    cta: 'Talk through your setup',
  },
  {
    q: 'Can I see it before I commit?',
    a: 'Yes. A guided walkthrough runs about 30 minutes and we load your own products, partners and price list into it first, so you are looking at your business rather than a sample one.',
    book: true,
    cta: 'Book a demo',
  },
  {
    q: 'Will it fit the way we already sell?',
    a: 'It is built for selling through other people: manufacturers, importers, distributors and modern trade suppliers each get a different starting shape.',
    to: '/solutions',
    cta: 'Find your setup',
  },
  {
    q: 'Is our data safe?',
    a: 'Every organisation is isolated by database security rules, so one customer cannot read another. Every record keeps a full audit trail of who changed what.',
    to: '/features/access',
    cta: 'See security and access',
  },
  {
    q: 'I cannot sign in',
    a: 'Most sign-in trouble is a forgotten workspace rather than a forgotten password. The sign-in help page walks through both.',
    to: '/help/sign-in',
    cta: 'Get back in',
  },
];

/**
 * The visitor's typed message, wrapped so whoever answers has the context.
 *
 * The page they were on is the single most useful thing to carry over: "I am
 * on /pricing and I have a question" is a different conversation from the
 * same words sent from the front page, and the visitor should not have to
 * explain where they were.
 */
export function helpWhatsApp(message: string, path: string): string {
  const trimmed = message.trim();
  const where = path && path !== '/' ? `\n\n(From afterbi.com${path})` : '\n\n(From afterbi.com)';
  return trimmed ? `${trimmed}${where}` : `Hello AfterBI, I have a question.${where}`;
}
