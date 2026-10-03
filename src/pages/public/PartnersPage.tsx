/**
 * `/partners`, the AfterBI Partner Programme.
 *
 * Introduce a distribution business, earn a cash reward when it subscribes.
 *
 *   header      the offer, drawn in code (no picture to upload)
 *   numbers     reward, payment time, who qualifies
 *   how         the four steps
 *   packages    who it is for, each with an optional picture
 *   testimonies partners in their own words, only if the owner typed any
 *   terms       the rules, as questions that open
 *   join        a short form that becomes a WhatsApp message or an email
 *
 * The reward, packages and testimonies are set in Platform, Website.
 */

import { useMemo, useRef, useState } from 'react';
import { Check, Handshake, Mail, MessageCircle, Search, Users, Wallet } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PublicShell, useAsk } from '@/components/marketing/kit';
import { Headline, Questions, Reveal } from '@/components/marketing/bits';
import { btn, container } from '@/components/marketing/tokens';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import { imageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';
import { SUPPORT_EMAIL, WHATSAPP_URL } from '@/lib/siteMeta';
import { fillPerk, resolvePartners, type PartnerPackage, type ResolvedPartners } from '@/lib/programme';

const kicker = 'text-[12px] font-bold uppercase tracking-[0.12em] text-brand-400';

export default function PartnersPage() {
  return (
    <PublicShell>
      <Body />
    </PublicShell>
  );
}

function Body() {
  const { home } = useAsk();
  const p = useMemo(() => resolvePartners(home?.partners), [home?.partners]);
  const [chosen, setChosen] = useState('');
  const joinRef = useRef<HTMLElement>(null);

  const choose = (name: string) => {
    setChosen(name);
    joinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Seo
        title="Partner Programme"
        description={`Introduce distributors and manufacturers to AfterBI and earn ${p.rewardText} for every business that subscribes.`}
        path="/partners"
        jsonLd={{ '@context': 'https://schema.org', '@graph': [breadcrumbJsonLd('/partners', 'Partner Programme')] }}
      />

      {/* The header, drawn in code. */}
      <section className="relative isolate overflow-hidden pb-14 pt-28 sm:pb-20 sm:pt-32">
        <div aria-hidden className="ink-glow pointer-events-none absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-10 -z-10 h-[22rem] w-[22rem] rounded-full border-[3rem] border-brand-500/10"
        />
        <div className={container}>
          <Reveal>
            <p className={kicker}>Partner Programme</p>
            <Headline as="h1" size="lg" className="mt-3 max-w-3xl">
              Introduce a business. Earn {p.rewardText}
            </Headline>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/65">
              For people the trade already trusts. You make the introduction, we do the walkthrough, setup and training,
              and you are paid when the business subscribes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => choose('')} className={btn.green}>
                Become a partner
              </button>
              <a href="#how" className={btn.line}>
                How it works
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Numbers p={p} />
      <Steps />

      {p.packages.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className={container}>
            <Headline>Who it is for</Headline>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {p.packages.map((item, index) => (
                <Reveal key={item.id} delay={index * 60}>
                  <PackageCard item={item} p={p} onChoose={() => choose(item.name)} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {p.testimonies.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className={container}>
            <Headline>What partners say</Headline>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {p.testimonies.map((t) => (
                <figure key={t.name + t.quote.slice(0, 12)} className="flex h-full flex-col rounded-md bg-night-2 p-6 ring-1 ring-inset ring-white/[0.06]">
                  <blockquote className="flex-1 text-[15px] leading-[1.7] text-white/80">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {t.photo ? (
                      <img
                        src={imageUrl(t.photo, { width: 96, height: 96 })}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] font-bold text-white/70">
                        {t.name.trim().charAt(0)}
                      </span>
                    )}
                    <span>
                      <span className="block text-[14px] font-bold text-white">{t.name}</span>
                      {t.role && <span className="block text-[13px] text-white/50">{t.role}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          <Headline align="center">The terms</Headline>
          <Questions items={terms(p)} className="mt-8" />
        </div>
      </section>

      <section ref={joinRef} id="join" className="scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-2xl px-5 sm:px-8">
          <Join packages={p.packages} chosen={chosen} onChosen={setChosen} />
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- numbers */

function Numbers({ p }: { p: ResolvedPartners }) {
  const items = [
    { value: p.rewardText, label: 'per business that subscribes' },
    { value: 'No cap', label: 'on how many you introduce' },
    { value: `${p.payDays} days`, label: 'working days to your payment' },
    { value: '₦0', label: 'to join, nothing to sell or support' },
  ];
  return (
    <section className="pb-6">
      <div className={cn(container, 'grid grid-cols-2 gap-3 lg:grid-cols-4')}>
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-night-2 p-5 ring-1 ring-inset ring-white/[0.06]">
            <p className="tabular font-display text-[1.7rem] font-extrabold leading-none tracking-[-0.04em] text-white">{item.value}</p>
            <p className="mt-2 text-[13px] leading-snug text-white/55">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- steps */

const STEPS = [
  { icon: Handshake, title: 'Apply', text: 'Send the short form below. We reply within two working days with your partner reference.' },
  { icon: Search, title: 'Introduce', text: 'Tell us about a distributor or manufacturer, or bring them to a walkthrough with us.' },
  { icon: Users, title: 'We take it from there', text: 'Walkthrough, proposal, setup, data loading and training are all ours.' },
  { icon: Wallet, title: 'Get paid', text: 'Once the business subscribes and pays, your reward goes to your bank account.' },
];

function Steps() {
  return (
    <section id="how" className="scroll-mt-24 py-14 sm:py-20">
      <div className={container}>
        <Headline>How it works</Headline>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-md bg-night-2 p-6 ring-1 ring-inset ring-white/[0.06]">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                  <Icon size={19} aria-hidden />
                </span>
                <span className="text-[12px] font-bold text-white/40">Step {index + 1}</span>
              </span>
              <h3 className="mt-4 font-display text-[1.15rem] font-extrabold tracking-[-0.03em] text-white">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/60">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- packages */

function PackageCard({ item, p, onChoose }: { item: PartnerPackage; p: ResolvedPartners; onChoose: () => void }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md ring-1 ring-inset',
        item.featured ? 'bg-night-3 ring-brand-500' : 'bg-night-2 ring-white/[0.06]',
      )}
    >
      {item.image ? (
        <img src={imageUrl(item.image, { width: 640 })} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      ) : (
        <div aria-hidden className="relative aspect-video w-full overflow-hidden bg-night-3">
          <span className="absolute -bottom-10 -right-6 h-32 w-32 rounded-full border-[1.4rem] border-brand-500/20" />
          <span className="absolute left-5 top-5 font-display text-[2.4rem] font-extrabold leading-none text-white/10">
            {item.name.trim().charAt(0)}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[1.1rem] font-extrabold tracking-[-0.03em] text-white">{item.name}</h3>
        {item.audience && <p className="mt-1 text-[13px] text-white/50">{item.audience}</p>}
        {item.blurb && <p className="mt-3 text-[14px] leading-relaxed text-white/65">{item.blurb}</p>}
        <ul className="mt-4 flex-1 space-y-2">
          {item.perks.filter((x) => x.trim()).map((perk) => (
            <li key={perk} className="flex gap-2 text-[13.5px] leading-relaxed text-white/75">
              <Check size={15} aria-hidden className="mt-[0.2em] shrink-0 text-brand-400" />
              {fillPerk(perk, p)}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onChoose} className={cn('mt-5 w-full', item.featured ? btn.green : btn.line)}>
          Join as this
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- terms */

function terms(p: ResolvedPartners): { q: string; a: string }[] {
  return [
    {
      q: 'Who can become a partner?',
      a: 'Anyone the trade already trusts: consultants, association leaders, accountants, auditors, suppliers. You do not need to be a customer.',
    },
    {
      q: 'When is the reward earned?',
      a: `When a business you introduced subscribes to any AfterBI plan or a Custom build and makes its first payment. ${p.rewardText} per business.`,
    },
    {
      q: 'When and how am I paid?',
      a: `By bank transfer, in your name, within ${p.payDays} working days of the business's first payment.`,
    },
    {
      q: 'What if the business already knew about AfterBI?',
      a: 'A business counts as yours if we had not already been in touch with it before your introduction. We tell you straight away if we had.',
    },
    {
      q: 'Do I have to sell or support anything?',
      a: 'No. You make the introduction. Walkthroughs, proposals, setup, training and support are all done by us.',
    },
  ];
}

/* ---------------------------------------------------------------- join */

function Join({
  packages,
  chosen,
  onChosen,
}: {
  packages: PartnerPackage[];
  chosen: string;
  onChosen: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [work, setWork] = useState('');
  const [note, setNote] = useState('');

  const details = [
    `Name: ${name.trim()}`,
    `Phone: ${phone.trim()}`,
    work.trim() && `What I do: ${work.trim()}`,
    chosen && `Package: ${chosen}`,
    note.trim() && `Businesses I have in mind: ${note.trim()}`,
  ].filter(Boolean);
  const message = `Hello AfterBI, I would like to join the Partner Programme.\n\n${details.join('\n')}`;

  const ready = name.trim().length > 1 && phone.trim().length > 6;
  const field =
    'w-full rounded-lg bg-night-2 px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-brand-500';

  return (
    <div className="rounded-md bg-night-2/60 p-6 ring-1 ring-inset ring-white/[0.06] sm:p-8">
      <Headline align="center">Become a partner</Headline>
      <p className="mt-3 text-center text-[14px] text-white/55">It goes to us as a WhatsApp message or an email.</p>

      <div className="mt-7 space-y-3">
        <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input
          className={field}
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
        />
        <input className={field} placeholder="What you do (e.g. sales consultant)" value={work} onChange={(e) => setWork(e.target.value)} />
        {packages.length > 0 && (
          <select className={field} value={chosen} onChange={(e) => onChosen(e.target.value)} aria-label="Package">
            <option value="">Which fits you best? (optional)</option>
            {packages.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        <textarea
          className={field}
          rows={3}
          placeholder="Businesses you have in mind (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={ready ? `${WHATSAPP_URL}?text=${encodeURIComponent(message)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          className={cn(btn.green, !ready && 'pointer-events-none opacity-40')}
        >
          <MessageCircle size={17} aria-hidden /> Send on WhatsApp
        </a>
        <a
          href={
            ready
              ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Partner Programme application')}&body=${encodeURIComponent(message)}`
              : undefined
          }
          aria-disabled={!ready}
          className={cn(btn.line, !ready && 'pointer-events-none opacity-40')}
        >
          <Mail size={17} aria-hidden /> Send by email
        </a>
      </div>
      {!ready && <p className="mt-3 text-center text-[12.5px] text-white/40">Add your name and phone number first.</p>}
    </div>
  );
}
