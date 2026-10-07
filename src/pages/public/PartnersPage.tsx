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
import { Reveal } from '@/components/marketing/bits';
import { Accordion, SectionHead, SiteImage } from '@/components/marketing/site-ui';
import { SceneMock } from '@/components/marketing/mocks';
import { btn, container, eyebrow } from '@/components/marketing/tokens';
import { breadcrumbJsonLd } from '@/lib/siteJsonLd';
import type { SiteImageKey } from '@/lib/site';
import { cn } from '@/lib/cn';
import { SUPPORT_EMAIL, WHATSAPP_URL } from '@/lib/siteMeta';
import { fillPerk, resolvePartners, type PartnerPackage, type ResolvedPartners } from '@/lib/programme';


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

      <section className="site-wash">
        <div className={cn(container, 'grid items-center gap-12 pb-16 pt-14 sm:pb-20 sm:pt-20 lg:grid-cols-2')}>
          <Reveal>
            <p className={eyebrow}>Partner Programme</p>
            <h1 className="mt-3 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-navy-900 sm:text-[3.5rem]">
              Introduce a business. Earn {p.rewardText}
              <span className="text-brand-500">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[18px] leading-[1.65] text-navy-700/85">
              For people the trade already trusts. You make the introduction, we do the demo, setup and training,
              and you are paid when the business subscribes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => choose('')} className={btn.green}>
                Become a partner
              </button>
              <a href="#how" className={btn.outline}>
                How it works
              </a>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <SiteImage
              slot="partners-hero"
              alt="AfterBI partners"
              eager
              className="aspect-[4/3] rounded-[2rem]"
              fallback={<SceneMock slug="distributor-portal" />}
            />
          </Reveal>
        </div>
      </section>

      <Numbers p={p} />
      <Steps />

      {p.packages.length > 0 && (
        <section className="bg-navy-50 py-16 sm:py-24">
          <div className={container}>
            <SectionHead kicker="Packages" title="Who it is for" />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <section className="py-16 sm:py-24">
          <div className={container}>
            <SectionHead kicker="In their words" title="What partners say" />
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {p.testimonies.map((t) => (
                <figure key={t.name + t.quote.slice(0, 12)} className="flex h-full flex-col rounded-2xl bg-navy-50 p-7">
                  <blockquote className="flex-1 text-[16px] leading-[1.7] text-navy-800">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">
                      {t.name.trim().charAt(0)}
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-bold text-navy-900">{t.name}</span>
                      {t.role && <span className="block text-[13.5px] text-navy-500">{t.role}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16 sm:py-24">
        <div className={cn(container, 'grid gap-10 lg:grid-cols-[0.8fr_1.2fr]')}>
          <SectionHead kicker="The terms" title="The rules, plainly" />
          <Accordion items={terms(p)} />
        </div>
      </section>

      <section ref={joinRef} id="join" className="scroll-mt-28 bg-navy-50 py-16 sm:py-24">
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
    <section className="bg-white py-12">
      <div className={cn(container, 'grid grid-cols-2 gap-4 lg:grid-cols-4')}>
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
            <p className="tabular font-display text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-brand-700">{item.value}</p>
            <p className="mt-2 text-[14px] font-semibold leading-snug text-navy-700">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- steps */

const STEPS = [
  { icon: Handshake, title: 'Apply', text: 'Send the short form below. We reply within two working days with your partner reference.' },
  { icon: Search, title: 'Introduce', text: 'Tell us about a distributor or manufacturer, or bring them to a demo with us.' },
  { icon: Users, title: 'We take it from there', text: 'Demo, proposal, setup, data loading and training are all ours.' },
  { icon: Wallet, title: 'Get paid', text: 'Once the business subscribes and pays, your reward goes to your bank account.' },
];

function Steps() {
  return (
    <section id="how" className="scroll-mt-28 bg-navy-900 py-16 text-white sm:py-24">
      <div className={container}>
        <SectionHead onDark kicker="How it works" title="Four steps, and three of them are ours" />
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-2xl bg-white/[0.06] p-7 ring-1 ring-inset ring-white/10">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="text-[12.5px] font-bold uppercase tracking-wide text-white/50">Step {index + 1}</span>
              </span>
              <h3 className="mt-5 text-[19px] font-bold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{text}</p>
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
        'flex h-full flex-col overflow-hidden rounded-2xl bg-white',
        item.featured ? 'ring-2 ring-brand-600' : 'ring-1 ring-navy-900/10',
      )}
    >
      <SiteImage
        slot={`partner-${item.id}` as SiteImageKey}
        alt={item.name}
        className="aspect-video w-full"
        fallback={
          <div aria-hidden className="relative h-full w-full overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950">
            <span className="absolute -bottom-10 -right-6 h-32 w-32 rounded-full border-[1.4rem] border-brand-500/30" />
            <span className="absolute left-5 top-5 font-display text-[2.4rem] font-extrabold leading-none text-white/20">
              {item.name.trim().charAt(0)}
            </span>
          </div>
        }
      />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[18px] font-bold text-navy-900">{item.name}</h3>
        {item.audience && <p className="mt-1 text-[13.5px] text-navy-500">{item.audience}</p>}
        {item.blurb && <p className="mt-3 text-[14.5px] leading-relaxed text-navy-700">{item.blurb}</p>}
        <ul className="mt-4 flex-1 space-y-2">
          {item.perks.filter((x) => x.trim()).map((perk) => (
            <li key={perk} className="flex gap-2 text-[14px] leading-relaxed text-navy-700">
              <Check size={15} aria-hidden className="mt-[0.2em] shrink-0 text-brand-600" />
              {fillPerk(perk, p)}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onChoose} className={cn('mt-5 w-full', item.featured ? btn.green : btn.outline)}>
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
      a: 'No. You make the introduction. Demos, proposals, setup, training and support are all done by us.',
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
    'w-full rounded-xl bg-white px-4 py-3 text-[16px] text-navy-900 ring-1 ring-inset ring-navy-900/15 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="rounded-[1.6rem] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,31,54,0.3)] ring-1 ring-navy-900/8 sm:p-10">
      <SectionHead align="center" title="Become a partner" />
      <p className="mt-3 text-center text-[15px] text-navy-500">It goes to us as a WhatsApp message or an email.</p>

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
          className={cn(btn.outline, !ready && 'pointer-events-none opacity-40')}
        >
          <Mail size={17} aria-hidden /> Send by email
        </a>
      </div>
      {!ready && <p className="mt-3 text-center text-[13px] text-navy-400">Add your name and phone number first.</p>}
    </div>
  );
}
