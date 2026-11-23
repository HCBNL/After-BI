/**
 * A feature page told as a story (see `lib/featureStories.ts` for the words).
 *
 *   Question     centred heavy headline and one line, on the front page mist.
 *   Mosaic       a full width strip of tiles in two rows: the owner's
 *                illustrations, one person, a blue text tile, a figure, a
 *                cloud of words and two petal artworks. Some
 *                tiles carry one big rounded corner, so the strip reads as
 *                shapes, not a table.
 *   Trust grid   heading, line and button; then a tall card with a product
 *                panel, an artwork card, a person and a text card.
 *   Capabilities every capability as a card, its icon inside a petal.
 *
 * No back link or breadcrumb: the header is the navigation.
 */

import { translateText } from '@/lib/i18n';
import type { CSSProperties, ReactNode } from 'react';
import { Art, type ArtName } from '@/components/marketing/art';
import { Scene } from '@/components/marketing/scenes';
import { useAsk } from '@/components/marketing/kit';
import { Reveal } from '@/components/marketing/bits';
import { container } from '@/components/marketing/tokens';
import { IconArt } from '@/components/ui/IconArt';
import { cn } from '@/lib/cn';
import type { FeatureStory } from '@/lib/featureStories';

const BLUE = '#0866F5';

export function FeatureStoryBody({ story }: { story: FeatureStory }) {
  return (
    <>
      <Question story={story} />
      <Mosaic story={story} />
      <TrustGrid story={story} />
      <Capabilities story={story} />
    </>
  );
}

/* ------------------------------------------------------------------ question */

function Question({ story }: { story: FeatureStory }) {
  return (
    <section className="bg-[var(--site-top)]">
      <div className={cn(container, 'pb-14 pt-14 text-center sm:pb-16 sm:pt-20')}>
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy-500">{story.eyebrow}</p>
          <h1 className="site-heavy mx-auto mt-5 max-w-[15ch] text-[2.6rem] text-navy-900 sm:text-[3.6rem] lg:text-[4.3rem]">
            {story.question}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-[1.6] text-navy-600 sm:text-[17.5px]">{story.line}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- mosaic */

type Ground = 'cream' | 'gold' | 'stripes' | 'mist' | 'pink' | 'blue';

const GROUND: Record<Ground, CSSProperties> = {
  cream: { background: '#fff4d6' },
  gold: { background: '#ffe39a' },
  mist: { background: '#eef1f5' },
  pink: { background: '#ffe3ee' },
  blue: { background: BLUE },
  /* Fine horizontal lines, like a printed tint. */
  stripes: { background: 'repeating-linear-gradient(0deg, #d6eafb 0 3px, #f3f9ff 3px 7px)' },
};

/* One big rounded corner, the shape language of the strip. */
const ROUND = {
  tr: 'rounded-tr-[3rem] lg:rounded-tr-[5.5rem]',
  tl: 'rounded-tl-[3rem] lg:rounded-tl-[5.5rem]',
  tlbr: 'rounded-tl-[3rem] rounded-br-[3rem] lg:rounded-tl-[5.5rem] lg:rounded-br-[5.5rem]',
} as const;

interface Tile {
  kind: 'art' | 'photo' | 'text' | 'figure' | 'words';
  /** Share of the row's width on a laptop. */
  grow: number;
  ground?: Ground;
  /** A petal artwork. */
  art?: ArtName;
  /** Or one of the page's illustrations, by its place in `story.scenes`. */
  scene?: number;
  shift?: number;
  round?: keyof typeof ROUND;
  /** Two columns wide on a phone. */
  wide?: boolean;
  /** Left out on a phone, to keep the two column grid even. */
  phoneOff?: boolean;
}

const ROW_ONE: Tile[] = [
  { kind: 'art', grow: 1, ground: 'cream', scene: 0 },
  { kind: 'photo', grow: 1, ground: 'mist', scene: 1 },
  { kind: 'text', grow: 1.5, round: 'tr', wide: true },
  { kind: 'art', grow: 1, ground: 'stripes', scene: 2 },
  { kind: 'figure', grow: 1, round: 'tlbr' },
  { kind: 'art', grow: 1, ground: 'gold', art: 'bloom', shift: 3, phoneOff: true },
];

const ROW_TWO: Tile[] = [
  { kind: 'art', grow: 0.45, ground: 'cream', phoneOff: true },
  { kind: 'words', grow: 1, round: 'tl', wide: true },
  { kind: 'art', grow: 1.5, ground: 'mist', scene: 3, round: 'tr' },
  { kind: 'art', grow: 1, ground: 'pink', art: 'daisy', shift: 4 },
  { kind: 'art', grow: 1, ground: 'cream', scene: 4, phoneOff: true },
  { kind: 'art', grow: 1, ground: 'stripes', scene: 5, round: 'tl', phoneOff: true },
];

function Mosaic({ story }: { story: FeatureStory }) {
  return (
    <section aria-label={story.eyebrow} className="bg-[var(--site-top)] pb-16 sm:pb-24">
      {/* A two column grid on a phone; on a laptop, two rows that share the width by weight. */}
      <div className="grid grid-cols-2 lg:block">
        {[ROW_ONE, ROW_TWO].map((row, r) => (
          <div key={r} className="contents lg:flex">
            {row.map((tile, i) => (
              <MosaicTile key={i} tile={tile} story={story} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function MosaicTile({ tile, story }: { tile: Tile; story: FeatureStory }) {
  const blue = tile.kind === 'text' || tile.kind === 'figure' || tile.kind === 'words';

  return (
    <div
      className={cn(
        'relative h-40 overflow-hidden sm:h-48 lg:h-[clamp(11rem,14vw,14.5rem)]',
        tile.wide && 'col-span-2',
        tile.phoneOff && 'hidden lg:block',
        tile.round && ROUND[tile.round],
      )}
      style={{ flex: `${tile.grow} 1 0`, ...(blue ? GROUND.blue : tile.ground ? GROUND[tile.ground] : undefined) }}
    >
      {tile.kind === 'text' && (
        <div className="absolute inset-x-6 bottom-6 text-white sm:inset-x-7 sm:bottom-7">
          <p className="text-[14px] font-semibold text-white/85">{story.tile.label}</p>
          <p className="mt-1 font-display text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[1.85rem]">{story.tile.title}</p>
        </div>
      )}

      {tile.kind === 'figure' && (
        <div className="absolute inset-x-6 bottom-6 text-white sm:inset-x-7 sm:bottom-7">
          <p className="font-display text-[2.2rem] font-bold leading-none tracking-[-0.04em] sm:text-[2.6rem]">{story.figure.value}</p>
          <p className="mt-2 max-w-[16ch] text-[14px] font-medium leading-snug text-white/85">{story.figure.label}</p>
        </div>
      )}

      {tile.kind === 'words' && <WordCloud words={story.words} />}

      {(tile.kind === 'art' || tile.kind === 'photo') && tile.scene !== undefined && (
        <Scene
          name={story.scenes[tile.scene % story.scenes.length]}
          className="absolute bottom-[6%] left-1/2 h-[86%] w-[86%] -translate-x-1/2"
        />
      )}
      {tile.kind === 'art' && tile.art && (
        <Art
          name={tile.art}
          shift={tile.shift ?? 0}
          speed={0.5}
          className="absolute left-1/2 top-1/2 h-[64%] w-[64%] -translate-x-1/2 -translate-y-1/2"
        />
      )}
    </div>
  );
}

/* Words scattered across the tile, as pills. Positions are fixed so the cloud never jumps. */
const SPOTS = [
  { left: '6%', top: '8%' },
  { left: '9%', top: '31%' },
  { left: '52%', top: '31%' },
  { left: '4%', top: '55%' },
  { left: '44%', top: '55%' },
  { left: '10%', top: '78%' },
  { left: '48%', top: '78%' },
  { left: '60%', top: '8%' },
];

function WordCloud({ words }: { words: string[] }) {
  return (
    <ul aria-label="What it covers">
      {words.slice(0, SPOTS.length).map((word, i) => (
        <li
          key={word}
          className="absolute whitespace-nowrap rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] font-medium text-white ring-1 ring-inset ring-white/20 sm:text-[13.5px]"
          style={SPOTS[i]}
        >
          {word}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- trust grid */

function TrustGrid({ story }: { story: FeatureStory }) {
  const { book } = useAsk();
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className={container}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_auto] lg:items-start lg:gap-12">
          <Reveal>
            <h2 className="site-heavy max-w-[14ch] text-[2.3rem] text-navy-900 sm:text-[3rem]">{story.trust.title}</h2>
          </Reveal>
          <Reveal delay={60}>
            <p className="max-w-md text-[15.5px] leading-[1.65] text-navy-600">{story.trust.line}</p>
          </Reveal>
          <Reveal delay={100}>
            <button
              type="button"
              onClick={book}
              className="tap inline-flex h-12 items-center justify-center rounded-xl bg-navy-900 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800"
            >
              Create account
            </button>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <Reveal className="h-full">
            <PanelCard story={story} />
          </Reveal>

          <div className="grid gap-5">
            <Reveal delay={80}>
              <div className="flex h-full min-h-[15rem] items-stretch justify-between gap-6 rounded-[1.75rem] bg-[var(--site-top)] p-7 sm:p-9">
                <div className="flex flex-col justify-between">
                  <h3 className="max-w-[14ch] text-[1.45rem] font-bold leading-[1.15] tracking-[-0.02em] text-navy-900 sm:text-[1.6rem]">
                    {story.cardArt.title}
                  </h3>
                  <p className="mt-6 max-w-sm text-[14.5px] leading-[1.6] text-navy-600">{story.cardArt.text}</p>
                </div>
                <div className="relative aspect-square w-24 shrink-0 self-center sm:w-40 lg:w-44">
                  <Scene name={story.scenes[0]} className="absolute inset-0 h-full w-full" />
                </div>
              </div>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
              <Reveal delay={120}>
                <PersonCard story={story} />
              </Reveal>
              <Reveal delay={160}>
                <div className="flex h-full min-h-[16rem] flex-col justify-between rounded-[1.75rem] bg-[var(--site-top)] p-7">
                  <h3 className="max-w-[13ch] text-[1.25rem] font-bold leading-[1.2] tracking-[-0.02em] text-navy-900">{story.cardText.title}</h3>
                  <p className="mt-6 text-[14.5px] leading-[1.6] text-navy-600">{bolden(story.cardText.text)}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * `**word**` in the copy is set in navy, bold. The sentence is translated
 * whole first (the dictionary keeps the ** marks around the right words in
 * each language), so it is never translated piece by piece around the bold.
 */
function bolden(source: string): ReactNode[] {
  const text = source.includes('**') ? translateText(source) ?? source : source;
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} className="font-semibold text-navy-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function PersonCard({ story }: { story: FeatureStory }) {
  /* An illustration in the frame. */
  return (
    <div className="relative h-full min-h-[16rem] overflow-hidden rounded-[1.75rem]" style={GROUND.stripes}>
      <Scene name={story.scenes[3 % story.scenes.length]} className="absolute bottom-[4%] left-1/2 h-[84%] w-[84%] -translate-x-1/2" />
    </div>
  );
}

/* The tall card: a slice of the product, then three plain promises. */
function PanelCard({ story }: { story: FeatureStory }) {
  const { figures, roles, record } = story.panel;
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-[var(--site-top)] pt-10">
      {/* An artwork peeking from behind the panel. */}
      <Art name="waves" shift={2} speed={0.5} className="absolute -left-10 top-[44%] h-40 w-40 opacity-90" />

      <div className="relative ml-8 mr-[-2.5rem] rounded-2xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,31,54,0.35)] ring-1 ring-navy-900/5 sm:ml-12">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {figures.map((f) => (
            <div key={f.label}>
              <p className="text-[12px] font-medium text-navy-500">{f.label}</p>
              <p className="mt-1 text-[1.6rem] font-semibold tracking-[-0.02em] text-navy-900 sm:text-[1.9rem]">
                {f.unit && <span className="mr-1 align-top text-[0.95rem] text-navy-400">{f.unit}</span>}
                {f.value}
              </p>
            </div>
          ))}
        </div>
        <MiniChart />
        <div className="-mt-6 flex flex-wrap gap-2">
          {roles.map((role, i) => (
            <span
              key={role}
              className={cn(
                'rounded-full px-4 py-2 text-[13px] font-semibold',
                i === 0 ? 'bg-[#dceaff] text-navy-900' : 'bg-white text-navy-300 ring-1 ring-navy-900/8',
              )}
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      <div className="relative ml-12 mr-6 mt-[-0.5rem] rounded-2xl bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,31,54,0.3)] ring-1 ring-navy-900/5 sm:ml-16">
        <div className="flex items-center justify-between border-b border-navy-900/8 pb-3 text-[12.5px] text-navy-500">
          <span>{story.panel.columns[0]}</span>
          <span>{story.panel.columns[1]}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-3.5">
          <div className="flex items-center gap-3">
            <IconArt id={record.name} size={38} halo={0} icon={story.bullets[0].icon} />
            <div>
              <p className="text-[14px] font-semibold text-navy-900">{record.name}</p>
              <p className="text-[12.5px] text-navy-500">{record.sub}</p>
            </div>
          </div>
          <span className="text-[13px] font-semibold text-[#1d4ef5]">{record.when}</span>
        </div>
      </div>

      <ul className="mt-auto space-y-3.5 px-8 pb-9 pt-10 sm:px-12">
        {story.bullets.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-[15px] text-navy-700">
            <Icon size={17} strokeWidth={1.8} aria-hidden className="shrink-0 text-navy-500" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* A small rising line with its area shaded: decoration, not data. */
function MiniChart() {
  const line = 'M0 88 L22 84 L44 86 L66 74 L88 78 L110 60 L132 62 L154 40 L176 46 L198 30 L220 36 L242 24 L264 28 L300 18';
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="mt-4 h-28 w-full" aria-hidden>
      <defs>
        <linearGradient id="fs-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#12bf6a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#12bf6a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L300 100 L0 100 Z`} fill="url(#fs-area)" />
      <path d={line} fill="none" stroke="#12bf6a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* -------------------------------------------------------------- capabilities */

function Capabilities({ story }: { story: FeatureStory }) {
  return (
    <section className="bg-[var(--site-top)] py-20 sm:py-28">
      <div className={container}>
        <Reveal>
          <div className="flex items-end justify-between gap-8">
            <h2 className="site-heavy max-w-[16ch] text-[2.3rem] text-navy-900 sm:text-[3rem]">{story.capTitle}</h2>
            <Scene name={story.scenes[1]} className="hidden h-36 w-36 shrink-0 sm:block lg:h-44 lg:w-44" />
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {story.capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 60} className="h-full">
              <div
                className={cn(
                  'flex h-full flex-col rounded-[1.75rem] bg-white p-7 sm:p-8',
                  i % 3 === 1 && 'rounded-tr-[4rem]',
                  i % 3 === 2 && 'rounded-bl-[4rem]',
                )}
              >
                <IconArt id={c.title} icon={c.icon} size={52} halo={0.6} />
                <h3 className="mt-6 text-[1.15rem] font-bold tracking-[-0.015em] text-navy-900">{c.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-navy-600">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
