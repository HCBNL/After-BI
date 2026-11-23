/**
 * /reports/sme-2026: The SME Report 2026.
 *
 * Built on the report kit (components/report): the opening film, the cover
 * collage, chapters on navy and on torn paper sheets, and charts that keep
 * reading their numbers out. Every figure comes from sme2026.ts, which keeps
 * the source of each one.
 */
import { useBootDone } from '@/lib/boot';
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/cn";
import { Art } from "@/components/marketing/art";
import { SiteEnd } from "@/components/marketing/kit";
import { appUrl } from "@/lib/hosts";
import {
  Asked,
  BigStat,
  ChapterHead,
  Cutout,
  Finding,
  Lead,
  SourceLine,
  TornEdge,
  millions,
  nairaWhole,
  useCycle,
  type Fmt,
} from "@/components/report/kit";
import {
  BubbleRow,
  Columns,
  ColumnsOnPhoto,
  HalfDonut,
  LineChart,
  PALETTES,
  Pictogram,
  RankedBars,
  Rings,
  Seesaw,
  SplitBar,
  VsArt,
  VsPairs,
} from "@/components/report/charts";
import {
  ChapterTab,
  Cover,
  Film,
  ReportBar,
  ReportTile,
} from "@/components/report/shell";
import {
  BAND_A,
  CHALLENGES,
  DEMAND,
  DEMAND_REASONS,
  ENGAGEMENT_TREND,
  FUEL,
  FUNDING,
  INFLATION_LINE,
  INFLATION_PARTS,
  LOAN_BARRIERS,
  MPR,
  MSME_COUNTS,
  MSME_SHARE,
  MSME_SPLIT,
  NAIRA,
  PETROL_2026,
  REPORT,
  SOLAR_AFRICA,
  SOLAR_TOP,
  SOURCES,
  WELLBEING,
  sourceOf as S,
} from "./sme2026";

const IMG = "/reports/sme-2026";
const wrap = "mx-auto w-full max-w-[880px] px-5 sm:px-8";

const CHAPTERS = [
  { id: "engine", title: "The engine", n: "One", color: "var(--rp-blue)" },
  { id: "prices", title: "Prices", n: "Two", color: "var(--rp-pink)" },
  { id: "money", title: "Money", n: "Three", color: "var(--rp-lime)" },
  { id: "energy", title: "Energy", n: "Four", color: "var(--rp-lime)" },
  { id: "losses", title: "Losses", n: "Five", color: "var(--rp-purple)" },
  { id: "people", title: "People", n: "Six", color: "var(--rp-blue)" },
  { id: "growth", title: "Growth", n: "Seven", color: "var(--rp-pink)" },
  { id: "conclusion", title: "Conclusion", n: "", color: "var(--rp-lime)" },
];

const INTRO = [
  "In 2020, Nigeria counted 39.65 million micro, small and medium businesses. Together they produced almost half of everything the country makes.",
  "Since then the naira has lost about two thirds of its value against the dollar, inflation touched 34.8%, diesel almost doubled in a single year and the cost of borrowing climbed to 27.5%.",
  "So we went through the official numbers, from the statistics bureau, the central bank, the power regulator and independent researchers, to see what it now takes to run, move and grow a small business here.",
  "The results are in.",
];

const usd: Fmt = (v) => `$${v}bn`;
const kwh: Fmt = (v) =>
  `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const mwFmt: Fmt = (v) => Math.round(v).toLocaleString("en-NG");

export default function SmeReport2026() {
  /* The page draws from what ships with it, so the loading screen goes at once. */
  useBootDone();
  const [film, setFilm] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.location.hash,
  );

  /* The full screen cover opens the page only when the film plays before it. */
  const [opening] = useState(film);

  useEffect(() => {
    document.documentElement.classList.add("rp-page");
    return () => document.documentElement.classList.remove("rp-page");
  }, []);

  return (
    <div className="rp min-h-dvh">
      <Seo
        title={REPORT.title}
        description="Inflation, the naira, interest rates, diesel, power, losses and people: what it now costs to run a small business in Nigeria, from official data."
        path={`/reports/${REPORT.slug}`}
        image={`${IMG}/cover.webp`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Report",
          name: REPORT.title,
          about: "Small and medium enterprises in Nigeria",
          datePublished: REPORT.published,
          author: { "@type": "Organization", name: "AfterBI" },
          publisher: { "@type": "Organization", name: "AfterBI" },
        }}
      />
      {film && <Film paragraphs={INTRO} onDone={() => setFilm(false)} />}
      <ReportBar title={REPORT.title} />
      <ChapterTab chapters={CHAPTERS.map(({ id, title }) => ({ id, title }))} />

      {/* ---------------------------------------------------------- cover */}
      <section className="relative pb-16 sm:pb-24">
        <Cover
          src={`${IMG}/cover.webp`}
          alt="A business owner holds his head among damaged cartons, with the central bank, a container port, a cargo plane and naira notes around him."
          reveal={opening}
          play={!film}
          headClassName={wrap}
          head={
            <>
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/60">
                AfterBI research · {REPORT.publishedLabel}
              </p>
              <h1 className="rp-display mt-3 text-[clamp(2.8rem,7.6vw,5.8rem)]">
                The SME Report <span className="text-[var(--rp-yellow)]">2026</span>
              </h1>
              <p className="mt-5 max-w-[36rem] text-[clamp(1.05rem,2vw,1.3rem)] leading-snug text-white/80">
                {REPORT.subtitle}
              </p>
            </>
          }
        />
      </section>

      {/* ---------------------------------------------------------- foreword */}
      <section className="rp-chapter pb-20">
        <div className={wrap}>
          <h2 className="rp-display flex items-center gap-3 text-[clamp(2.2rem,6vw,3.8rem)]">
            <Art name="daisy" className="h-[0.8em] w-[0.8em]" /> Foreword
          </h2>
        </div>
        <div className="mx-auto mt-8 w-full max-w-[1080px] px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[22px] bg-[var(--rp-pink)] text-white">
            <div
              className="pointer-events-none absolute left-[30%] top-[38%] hidden select-none text-[22rem] font-black leading-none text-white/10 md:block"
              aria-hidden
            >
              ”
            </div>
            <div className="grid md:grid-cols-[300px_1fr]">
              <div className="relative order-2 flex items-end justify-center pt-4 md:order-1 md:pt-10">
                <img
                  src={`${IMG}/portrait.webp`}
                  alt="Collins C. Nwobodo, illustrated"
                  loading="lazy"
                  className="w-[260px] md:w-[300px]"
                />
              </div>
              <div className="relative order-1 space-y-4 px-6 pt-8 text-[15.5px] leading-relaxed sm:px-10 md:order-2 md:py-12 md:pl-6">
                <p>
                  Small businesses are not a side story in Nigeria. There are
                  39.65 million of them, they produce about 46% of the
                  country&apos;s output, and by the official count they hold
                  87.9% of its jobs.
                </p>
                <p>
                  The last three years asked more of them than any stretch in
                  recent memory. Money became expensive: the policy rate peaked
                  at 27.5%, and a third of the owners PwC surveyed named access
                  to finance as their biggest problem. Energy became expensive:
                  diesel went from ₦1,758 to ₦3,277 a litre in twelve months.
                  And customers felt it: two in three small businesses saw
                  demand fall.
                </p>
                <p>
                  The encouraging part sits in the same numbers. Inflation has
                  eased five months in a row to 14.06%. The naira closed 2025
                  stronger than it started, its first yearly gain in thirteen
                  years. And Nigeria became the second largest importer of
                  Chinese solar panels in Africa, which tells me owners are not
                  waiting to be rescued; they are fixing their own costs.
                </p>
                <p>
                  What separates the businesses that grow from the ones that
                  struggle is rarely luck. It is knowing your true cost per
                  carton, counting what you hold, chasing what you are owed and
                  seeing your team&apos;s work as it happens. This report puts
                  the numbers on the table. The rest is what we built AfterBI to
                  help with.
                </p>
                <p className="pt-2 text-[14px] font-bold">
                  Collins C. Nwobodo
                  <span className="block font-semibold italic opacity-85">
                    Founder, AfterBI
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- key findings */}
      <section className="rp-chapter pb-20">
        <div className={wrap}>
          <h2 className="rp-display flex items-center gap-3 text-[clamp(2.2rem,6vw,3.8rem)]">
            <Art name="spark" className="h-[0.8em] w-[0.8em]" /> At a glance
          </h2>
        </div>
        <KeyFindings />
      </section>

      {/* ---------------------------------------------------------- contents */}
      <section className="rp-noprint pb-24">
        <div className={wrap}>
          <h2 className="rp-display text-[clamp(2rem,5vw,3.2rem)]">
            In this report
          </h2>
          <ol className="mt-6 space-y-2">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="group flex items-center justify-between rounded-[6px] px-4 py-2.5 text-[15px] font-bold text-[#0b1324] transition-transform hover:translate-x-1"
                  style={{ background: c.color }}
                >
                  <span>{c.title}</span>
                  <span className="rp-num text-[1.2rem]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <EngineChapter />
      <PricesChapter />
      <MoneyChapter />
      <EnergyChapter />
      <LossesChapter />
      <PeopleChapter />
      <GrowthChapter />
      <Conclusion />
      <Sources />

      <div className="rp-noprint">
        <SiteEnd />
      </div>
    </div>
  );
}

/* ================================================================ blocks */

function Section({
  id,
  sheet,
  children,
  edge,
}: {
  id: string;
  sheet?: "cream" | "lilac" | "forest";
  children: ReactNode;
  edge?: string;
}) {
  if (!sheet)
    return (
      <section id={`sec-${id}`} className="rp-chapter py-20 sm:py-24">
        <div className={cn(wrap, "space-y-14 sm:space-y-20")}>{children}</div>
      </section>
    );
  const bg = {
    cream: "var(--rp-cream)",
    lilac: "var(--rp-lilac)",
    forest: "var(--rp-forest)",
  }[sheet];
  return (
    <section id={`sec-${id}`} className="rp-chapter py-10">
      <div className="rp-sheet">
        <TornEdge color={bg} seed={edge ?? id} />
        <div
          className={cn("pb-20 pt-10 sm:pb-24 sm:pt-14", `rp-sheet-${sheet}`)}
        >
          <div className={cn(wrap, "space-y-14 sm:space-y-20")}>{children}</div>
        </div>
        <TornEdge color={bg} seed={`${edge ?? id}-b`} flip />
      </div>
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 max-w-[38rem] text-[15px] leading-relaxed opacity-90">
      {children}
    </p>
  );
}

function KeyFindings() {
  const { ref, cycle } = useCycle<HTMLDivElement>(12000);
  const card = "rp-block relative overflow-hidden rounded-[20px] p-6 sm:p-7";
  return (
    <div
      ref={ref}
      className="mx-auto mt-8 grid w-full max-w-[1080px] gap-3 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-6"
    >
      <div className={cn(card, "bg-[var(--rp-blue)] lg:col-span-3")}>
        <BigStat
          value={39.65}
          format={(v) => `${v}m`}
          cycle={cycle}
          color="#fff"
          label="micro, small and medium businesses, by the last national count (2020)."
        />
        <Art
          name="bloom"
          className="absolute -bottom-10 -right-10 h-40 w-40 opacity-40"
        />
      </div>
      <div
        className={cn(card, "bg-[var(--rp-lime)] text-[#0b1324] lg:col-span-3")}
      >
        <BigStat
          value={14.06}
          format={(v) => `${v}%`}
          cycle={cycle}
          color="#0b1324"
          label="headline inflation in October 2026, down from 34.80% in December 2024."
        />
      </div>
      <div className={cn(card, "bg-[var(--rp-pink)] lg:col-span-2")}>
        <BigStat
          value={86}
          format={(v) => `+${v}%`}
          cycle={cycle}
          color="#fff"
          label="the rise in the price of diesel between May 2025 and May 2026."
        />
      </div>
      <div
        className={cn(
          card,
          "bg-[var(--rp-yellow)] text-[#0b1324] lg:col-span-2",
        )}
      >
        <BigStat
          value={1721}
          format={(v) => `${Math.round(v).toLocaleString("en-NG")}`}
          cycle={cycle}
          color="#0b1324"
          label="megawatts of solar panels imported in the year to June 2025, second in Africa."
        />
      </div>
      <div className={cn(card, "bg-[var(--rp-purple)] lg:col-span-2")}>
        <BigStat
          value={35}
          format={(v) => `${v}%`}
          cycle={cycle}
          color="#fff"
          label="of small businesses say access to finance is their biggest problem."
        />
      </div>
      <div
        className={cn(
          card,
          "bg-[#eef1f5] text-[#0b1324] sm:col-span-2 lg:col-span-6",
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <BigStat
            className="min-w-0 flex-1"
            value={19}
            format={(v) => `${v}%`}
            cycle={cycle}
            color="var(--rp-blue)"
            label="of employees in Sub-Saharan Africa are engaged at work. The world average is 20%."
          />
          <ReportTile
            className="h-28 w-28 shrink-0 rounded-[22%] bg-[var(--rp-brand)] p-3"
            animate={false}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 1 engine */

function EngineChapter() {
  return (
    <Section id="engine">
      <ChapterHead
        id="engine"
        n="One"
        title="The engine"
        color="var(--rp-blue)"
        art="bloom"
      />
      <div>
        <Asked
          seed="engine-q"
          className="-mb-6 ml-auto mr-0 w-fit sm:-mb-10 sm:mr-8"
        >
          How many small businesses keep Nigeria running?
        </Asked>
        <ColumnsOnPhoto
          photo={`${IMG}/factory.webp`}
          alt="A busy factory floor"
          items={MSME_COUNTS}
          format={millions}
          colors={PALETTES.vivid}
        />
        <Caption>
          The national count of micro, small and medium enterprises more than
          doubled between 2010 and 2013, peaked at 41.54 million in 2017, then
          fell 4.5% to 39.65 million by 2020.
        </Caption>
        <SourceLine
          sources={[S("nbs-msme-2010"), S("nbs-msme-2017"), S("nbs-msme-2020")]}
        />
      </div>

      <div className="grid items-center gap-10 md:grid-cols-[1fr_1.35fr]">
        <div>
          <p className="rp-num text-[clamp(3.5rem,10vw,6rem)] text-[var(--rp-yellow)]">
            97 in 100
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-white/85">
            businesses are micro enterprises:{" "}
            {MSME_SPLIT.micro.toLocaleString("en-NG")} of them. Small and medium
            firms number {MSME_SPLIT.sme.toLocaleString("en-NG")}, just{" "}
            {(100 - MSME_SPLIT.microShare).toFixed(1)}% of the total.
          </p>
          <SourceLine sources={[S("nbs-msme-2020")]} />
        </div>
        <Pictogram lit={97} icon="shop" color="var(--rp-yellow)" />
      </div>

      <div>
        <Lead color="var(--rp-blue)">What small businesses add up to</Lead>
        <div className="mt-8">
          <Rings
            items={MSME_SHARE}
            colors={["var(--rp-blue)", "var(--rp-lime)", "var(--rp-pink)"]}
          />
        </div>
        <SourceLine sources={[S("nbs-msme-2020"), S("pwc-2024")]} />
      </div>

      <Finding id="finding-gdp">
        MSMEs produce about 46% of Nigeria&apos;s GDP and hold 87.9% of its
        jobs, but account for only 6.21% of its exports.
      </Finding>
    </Section>
  );
}

/* ---------------------------------------------------------------- 2 prices */

function PricesChapter() {
  return (
    <Section id="prices" sheet="cream">
      <ChapterHead
        id="prices"
        n="Two"
        title="Prices"
        color="var(--rp-pink)"
        art="pinwheel"
      />
      <div className="relative">
        <div className="relative z-10 grid items-end gap-4 md:grid-cols-[1fr_1.1fr]">
          <Asked seed="prices-q" tilt={-1.5}>
            How fast are prices still rising?
          </Asked>
          <Cutout
            src={`${IMG}/inflation.webp`}
            alt="Two hands passing naira notes over baskets of produce, with a note: Inflation, the slow eater of capital"
            sticker={false}
            className="w-full max-w-[460px] justify-self-end"
          />
        </div>
        <div className="mt-8">
          <LineChart
            items={INFLATION_LINE}
            color="var(--rp-pink)"
            tone="light"
            min={8}
            max={38}
            notes={[{ at: 1, text: "New base year from January 2025" }]}
          />
        </div>
        <Caption>
          Headline inflation, as first published each month. The statistics
          bureau rebased the index in January 2025, so the step from December
          2024 is partly a change of method. Since then the rate has kept
          falling, to 14.06% in October 2026.
        </Caption>
        <SourceLine
          sources={[
            S("nbs-cpi-jan25"),
            S("nbs-cpi-oct25"),
            S("cbn-mpc-feb26"),
            S("nbs-cpi-oct26"),
          ]}
        />
      </div>

      <div>
        <Lead color="var(--rp-pink)">
          Where the pressure sits, October 2026
        </Lead>
        <div className="mt-6">
          <Columns
            items={INFLATION_PARTS}
            colors={["var(--rp-pink)", "var(--rp-purple)", "var(--rp-blue)"]}
            tone="light"
            max={22}
            height="clamp(220px, 32vw, 340px)"
          />
        </div>
        <SourceLine sources={[S("nbs-cpi-oct26")]} />
      </div>

      <Finding id="finding-food" tone="light">
        Food still rises faster than everything else: 19.13% a year in October
        2026, against 14.06% for all items and 10.78% for core prices.
      </Finding>

      <div>
        <Lead color="var(--rp-pink)">
          We also looked at how customers responded
        </Lead>
        <div className="mt-6">
          <SplitBar
            a={{ label: "Saw demand fall in two years", value: DEMAND.fell }}
            b={{ label: "Did not", value: 100 - DEMAND.fell }}
            colors={["var(--rp-pink)", "#fff"]}
            inks={["#fff", "var(--rp-pink)"]}
          />
        </div>
        <p className="mt-8 text-[15px] font-bold">
          Why demand fell, by share of businesses
        </p>
        <div className="mt-4">
          <RankedBars
            items={DEMAND_REASONS}
            colors={PALETTES.warm}
            tone="light"
            max={45}
          />
        </div>
        <SourceLine sources={[S("pwc-2024-release")]} />
      </div>

      <div>
        <Lead color="var(--rp-pink)">And how households feel about it</Lead>
        <div className="mt-4">
          <Seesaw
            a={{ label: "See inflation as high", value: 77.2 }}
            b={{ label: "Other answers", value: 22.8 }}
            colors={["var(--rp-pink)", "#ffd6e8"]}
            inks={["#fff", "#7a1446"]}
            tone="light"
          />
        </div>
        <Caption>
          In the central bank&apos;s September 2026 survey, 77.2% of households
          said inflation was high, up from 67.2% in August.
        </Caption>
        <SourceLine sources={[S("cbn-ies-sep26")]} />
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 3 money */

function MoneyChapter() {
  const { ref, cycle } = useCycle<HTMLDivElement>(12000);
  return (
    <Section id="money">
      <ChapterHead
        id="money"
        n="Three"
        title="Money"
        color="var(--rp-lime)"
        art="droplet"
      />
      <div>
        <Asked
          seed="money-q"
          tilt={-2}
          className="-mb-6 w-fit sm:-mb-10 sm:ml-6"
        >
          What does a dollar cost a business now?
        </Asked>
        <ColumnsOnPhoto
          photo={`${IMG}/ship.webp`}
          alt="A container ship heading out of port"
          items={NAIRA}
          format={nairaWhole}
          colors={PALETTES.fresh}
          ratio="16 / 8.4"
        />
        <Caption>
          Official naira per dollar at the close of each year: ₦461.50 in 2022,
          ₦907.11 in 2023 and ₦1,535 in 2024. In 2025 it closed at ₦1,429, the
          naira&apos;s first yearly gain in 13 years, and traded at ₦1,358.09 on
          17 November 2026.
        </Caption>
        <SourceLine
          sources={[
            S("fx-2022"),
            S("fx-2023"),
            S("fx-2024"),
            S("fx-2025"),
            S("fx-nov26"),
          ]}
        />
      </div>

      <div>
        <Lead color="var(--rp-lime)">
          The cost of borrowing: the Monetary Policy Rate, every change since
          January 2024
        </Lead>
        <div className="mt-6">
          <LineChart
            items={MPR}
            color="var(--rp-lime)"
            step
            min={14}
            max={30}
            height="clamp(230px, 34vw, 340px)"
            show={[0, 6, 9]}
          />
        </div>
        <Caption>
          Six rises in 2024 took the benchmark rate from 18.75% to 27.50%. The
          first cut came in September 2025, and in September 2026 it was reset
          at 23%.
        </Caption>
        <SourceLine
          sources={[
            S("cbn-mpr-2024"),
            S("cbn-mpr-nov24"),
            S("cbn-mpr-sep25"),
            S("cbn-mpr-feb26"),
            S("cbn-mpr-sep26"),
          ]}
        />
      </div>

      <div>
        <Lead color="var(--rp-lime)">
          Where small businesses actually get their money
        </Lead>
        <div className="mt-6 max-w-[520px]">
          <VsPairs
            pairs={[
              {
                label: "Primary source of funding",
                a: FUNDING.family,
                b: FUNDING.banks,
              },
            ]}
            aLabel="Family and friends"
            bLabel="Bank loans"
            colors={["var(--rp-lime)", "var(--rp-blue)"]}
          />
        </div>
        <p className="mt-10 text-[15px] font-bold">What stops them borrowing</p>
        <div className="mt-4">
          <RankedBars
            items={LOAN_BARRIERS}
            colors={["var(--rp-lime)", "var(--rp-sky)", "var(--rp-yellow)"]}
            max={32}
          />
        </div>
        <SourceLine sources={[S("pwc-2024-loans")]} />
      </div>

      <div
        ref={ref}
        className="grid gap-8 rounded-[20px] bg-white/[0.06] p-7 sm:grid-cols-[1.2fr_1fr] sm:p-10"
      >
        <BigStat
          value={32.2}
          format={usd}
          cycle={cycle}
          color="var(--rp-lime)"
          label="The financing gap PwC puts on Nigeria's small businesses, about ₦13 trillion."
        />
        <div className="self-end text-[15px] leading-relaxed text-white/80">
          Most micro and small firms need loans under $20,000, mostly in
          agriculture and retail, yet banks lend to them least.
          <SourceLine sources={[S("pwc-2024-release")]} />
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 4 energy */

function EnergyChapter() {
  return (
    <Section id="energy" sheet="forest">
      <ChapterHead
        id="energy"
        n="Four"
        title="Energy"
        color="var(--rp-lime)"
        art="spark"
      />
      <div>
        <Asked seed="energy-q" tilt={1.5}>
          What does it cost to keep the lights on and the trucks moving?
        </Asked>
        <div className="mt-12 grid items-end gap-8 md:grid-cols-[auto_1fr]">
          <VsArt year="2025" color="var(--rp-lime)" />
          <VsPairs
            pairs={[
              {
                label: "Diesel, per litre",
                a: FUEL.diesel.before,
                b: FUEL.diesel.after,
              },
              {
                label: "Petrol, per litre",
                a: FUEL.petrol.before,
                b: FUEL.petrol.after,
              },
            ]}
            aLabel="May 2025"
            bLabel="May 2026"
            format={nairaWhole}
            colors={["var(--rp-blue)", "var(--rp-pink)"]}
          />
        </div>
        <Caption>
          Diesel rose 86.4% in a year, to ₦3,277.47 a litre; petrol rose 55.31%,
          to ₦1,596.25. Distribution runs on both.
        </Caption>
        <SourceLine sources={[S("nbs-fuel-may26")]} />
      </div>

      <div>
        <Lead color="var(--rp-lime)">Petrol in 2026, average pump price</Lead>
        <div className="mt-6">
          <LineChart
            items={PETROL_2026}
            color="var(--rp-yellow)"
            format={nairaWhole}
            min={800}
            max={1800}
          />
        </div>
        <SourceLine sources={[S("nbs-pms-2026")]} />
      </div>

      <div>
        <Lead color="var(--rp-lime)">
          Grid power: the Band A tariff, per kilowatt hour
        </Lead>
        <div className="mt-6">
          <Columns
            items={BAND_A}
            colors={[
              "#5b8f83",
              "var(--rp-lime)",
              "var(--rp-yellow)",
              "var(--rp-sky)",
            ]}
            format={kwh}
            max={240}
            height="clamp(220px, 30vw, 320px)"
            gap={6}
          />
        </div>
        <Caption>
          Band A customers, promised at least 20 hours of supply a day, saw
          their tariff more than triple in April 2024. It has sat near ₦209.50
          since July 2024.
        </Caption>
        <SourceLine sources={[S("nerc-banda"), S("nerc-banda-jul24")]} />
      </div>

      <div className="space-y-10">
        <div className="relative overflow-hidden rounded-[18px]">
          <img
            src={`${IMG}/solar.webp`}
            alt="Workers carrying a solar panel, with notes: High cost of electricity births new market opportunity"
            loading="lazy"
            className="w-full"
          />
        </div>
        <Lead color="var(--rp-lime)">
          So businesses are buying their own power. Africa&apos;s top solar
          importers, megawatts in the year to June 2025
        </Lead>
        <BubbleRow
          items={SOLAR_TOP}
          colors={["var(--rp-yellow)", "var(--rp-lime)", "var(--rp-sky)"]}
          format={mwFmt}
          unit="MW"
        />
        <div className="pt-6">
          <VsPairs
            pairs={[
              {
                label: "Africa's solar panel imports from China, MW",
                a: SOLAR_AFRICA.before,
                b: SOLAR_AFRICA.after,
              },
            ]}
            aLabel="Year to June 2024"
            bLabel="Year to June 2025"
            format={mwFmt}
            colors={["var(--rp-sky)", "var(--rp-lime)"]}
          />
        </div>
        <SourceLine sources={[S("ember-2025")]} />
      </div>

      <Finding id="finding-solar">
        In Nigeria, the diesel a solar panel saves can pay for the panel in
        about six months, Ember estimates.
      </Finding>
    </Section>
  );
}

/* ---------------------------------------------------------------- 5 losses */

function LossesChapter() {
  return (
    <Section id="losses" sheet="lilac">
      <ChapterHead
        id="losses"
        n="Five"
        title="Losses"
        color="var(--rp-purple)"
        art="fourfold"
      />
      <div>
        <Asked seed="loss-q" tilt={-1}>
          How much is lost between the farm, the store and the shelf?
        </Asked>
        <div className="mt-10">
          <HalfDonut
            value={50}
            label="lost along the supply chain"
            rest="reaches buyers"
            colors={["var(--rp-purple)", "var(--rp-pink)"]}
          >
            <img
              src={`${IMG}/loss.webp`}
              alt="A man with his hands on his head among damaged goods, tagged Loss, damaged goods"
              loading="lazy"
              className="w-full"
            />
          </HalfDonut>
        </div>
        <Caption>
          Nigeria loses about half of its agricultural produce along the food
          supply chain, an FAO specialist said, through poor storage, handling
          and transport.
        </Caption>
        <SourceLine sources={[S("fao-2024")]} />
      </div>

      <div>
        <Lead color="var(--rp-purple)">Vegetables, after harvest</Lead>
        <div className="mt-6">
          <SplitBar
            a={{ label: "Spoil before they are eaten", value: 30 }}
            b={{ label: "Reach a plate", value: 70 }}
            colors={["var(--rp-purple)", "#fff"]}
            inks={["#fff", "var(--rp-purple)"]}
          />
        </div>
        <SourceLine sources={[S("ifdc-horti")]} />
      </div>

      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <Art name="fourfold" className="h-28 w-28 sm:h-40 sm:w-40" />
        <div>
          <p className="text-[14px] font-semibold opacity-70">
            Our view, from working with distributors:
          </p>
          <p className="rp-display mt-3 text-[clamp(1.6rem,3.6vw,2.4rem)] text-[var(--rp-purple)]">
            “Stock you cannot count is money you cannot see. Damaged cartons,
            expired lines and unrecorded movements rarely show up until the
            stock count.”
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 6 people */

function PeopleChapter() {
  const { ref, cycle } = useCycle<HTMLDivElement>(12000);
  return (
    <Section id="people" sheet="cream" edge="people-edge">
      <ChapterHead
        id="people"
        n="Six"
        title="People"
        color="var(--rp-blue)"
        art="orbit"
      />
      <img
        src={`${IMG}/staff.webp`}
        alt="An empty office of desks and chairs, with a note: Are your staff active?"
        loading="lazy"
        className="w-full"
      />

      <div>
        <Lead color="var(--rp-blue)">Employees engaged at work, worldwide</Lead>
        <div className="mt-6">
          <LineChart
            items={ENGAGEMENT_TREND}
            color="var(--rp-blue)"
            tone="light"
            min={8}
            max={26}
            show={[0, 5, 7, 10]}
          />
        </div>
        <SourceLine sources={[S("gallup-2026")]} />
      </div>

      <div className="grid items-center gap-10 md:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="rp-num text-[clamp(3.5rem,10vw,6rem)] text-[var(--rp-blue)]">
            19 in 100
          </p>
          <p className="mt-4 text-[16px] leading-relaxed">
            employees in Sub-Saharan Africa are engaged at work, against 20%
            worldwide.
          </p>
          <SourceLine sources={[S("gallup-2026")]} />
        </div>
        <Pictogram lit={19} color="var(--rp-blue)" tone="light" />
      </div>

      <div>
        <Lead color="var(--rp-blue)">
          How employees in the region feel, against the world
        </Lead>
        <div className="mt-6">
          <VsPairs
            pairs={WELLBEING.map((w) => ({
              label: w.label,
              a: w.ssa,
              b: w.world,
            }))}
            aLabel="Sub-Saharan Africa"
            bLabel="World"
            colors={["var(--rp-blue)", "var(--rp-pink)"]}
            tone="light"
          />
        </div>
        <SourceLine sources={[S("gallup-ssa")]} />
      </div>

      <div ref={ref} className="grid gap-8 sm:grid-cols-[1.2fr_1fr]">
        <BigStat
          value={438}
          format={(v) => `$${Math.round(v)}bn`}
          cycle={cycle}
          color="var(--rp-blue)"
          label="lost to the world economy in 2024 as engagement fell, Gallup estimates."
        />
        <div className="self-end text-[15px] leading-relaxed">
          Most of the drop came from managers, whose engagement fell from 30% to
          27%. For a distributor, that is the field supervisor and the depot
          lead.
          <SourceLine sources={[S("gallup-2025")]} />
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 7 growth */

function GrowthChapter() {
  return (
    <Section id="growth">
      <ChapterHead
        id="growth"
        n="Seven"
        title="Growth"
        color="var(--rp-pink)"
        art="blocks"
      />
      <img
        src={`${IMG}/grow.webp`}
        alt="A shop owner and an office owner, arms crossed, under the question: Why do some businesses grow while others struggle to survive?"
        loading="lazy"
        className="mx-auto w-full max-w-[760px] rounded-[18px] bg-white"
      />
      <div>
        <Lead color="var(--rp-pink)">
          What holds small businesses back most, by share of owners
        </Lead>
        <div className="mt-6">
          <RankedBars items={CHALLENGES} colors={PALETTES.berry} max={42} />
        </div>
        <SourceLine sources={[S("pwc-2024-release")]} />
      </div>
      <Finding id="finding-growth">
        Finance, power and taxes top the list of what holds Nigerian small
        businesses back. Two of the three are costs an owner can measure every
        month.
      </Finding>
    </Section>
  );
}

/* ---------------------------------------------------------------- conclusion */

const TIPS = [
  {
    title: "Know your true unit cost.",
    img: "factory.webp",
    bg: "var(--rp-blue)",
    ink: "#fff",
    span: "lg:col-span-3",
    zoom: 1,
    origin: "50% 50%",
  },
  {
    title: "Price for the next restock, not the last.",
    img: "ship.webp",
    bg: "var(--rp-lime)",
    ink: "#0b1324",
    span: "lg:col-span-3",
    zoom: 1.2,
    origin: "70% 60%",
  },
  {
    title: "Count your stock every month.",
    img: "loss.webp",
    bg: "var(--rp-cream)",
    ink: "#0b1324",
    span: "lg:col-span-2",
    zoom: 1.7,
    origin: "20% 95%",
  },
  {
    title: "Cut diesel where you can.",
    img: "solar.webp",
    bg: "var(--rp-forest)",
    ink: "var(--rp-lime)",
    span: "lg:col-span-2",
    zoom: 1.6,
    origin: "50% 100%",
  },
  {
    title: "See your field team's day as it happens.",
    img: "staff.webp",
    bg: "var(--rp-yellow)",
    ink: "#0b1324",
    span: "lg:col-span-2",
    zoom: 1.8,
    origin: "0% 80%",
  },
];

function Conclusion() {
  return (
    <section id="sec-conclusion" className="rp-chapter py-20 sm:py-24">
      <div className={wrap}>
        <header id="conclusion" className="scroll-mt-24">
          <h2 className="rp-display flex items-center gap-3 text-[clamp(2.4rem,7vw,4.6rem)]">
            <Art name="daisy" className="h-[0.8em] w-[0.8em]" /> Conclusion
          </h2>
        </header>
        <div className="mt-6 max-w-[40rem] space-y-4 text-[16px] leading-relaxed text-white/85">
          <p>
            Prices are easing and the naira has steadied, but the costs that
            matter most to a small business, money, fuel and power, remain far
            above where they were three years ago. Demand is still soft, and
            most owners still fund themselves.
          </p>
          <p>
            None of that is in an owner&apos;s control. What is in their control
            is how clearly they see their own business. A few steps that pay
            back quickly:
          </p>
        </div>
      </div>
      <div className="mx-auto mt-10 grid w-full max-w-[1080px] gap-3 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-6">
        {TIPS.map((t) => (
          <div
            key={t.title}
            className={cn(
              "rp-block relative flex min-h-[250px] overflow-hidden rounded-[18px] p-6 sm:p-7",
              t.span,
            )}
            style={{ background: t.bg, color: t.ink }}
          >
            <p className="rp-display relative z-10 max-w-[14ch] text-[clamp(1.45rem,2.4vw,1.9rem)]">
              {t.title}
            </p>
            <div className="absolute bottom-0 right-0 h-[58%] w-[54%] overflow-hidden rounded-tl-[18px]">
              <img
                src={`${IMG}/${t.img}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                style={{
                  transform: `scale(${t.zoom})`,
                  transformOrigin: t.origin,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1080px] px-5 sm:px-8">
        <div className="rp-block relative overflow-hidden rounded-[22px] bg-[var(--rp-brand)] px-7 py-10 sm:px-12 sm:py-14">
          <Art
            name="bloom"
            className="absolute -right-16 -top-16 h-64 w-64 opacity-25"
            speed={0.6}
          />
          <Art
            name="blocks"
            className="absolute bottom-6 right-[30%] hidden h-24 w-24 opacity-30 md:block"
          />
          <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
            <p className="rp-display text-[clamp(2rem,4.6vw,3.2rem)]">
              Run your distribution on numbers, not guesses.
            </p>
            <div>
              <p className="text-[15px] leading-relaxed text-white/90">
                AfterBI brings your orders, stock, invoices, payments and field
                team into one place, so the numbers in this report have a home
                in your business.
              </p>
              <div className="rp-noprint mt-5 flex flex-wrap gap-3">
                <Link
                  to="/?demo=1"
                  className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[14px] font-bold text-[var(--rp-brand)] hover:brightness-95"
                >
                  Create account
                </Link>
                <a
                  href={appUrl("/login")}
                  className="inline-flex h-12 items-center rounded-full border border-white/70 px-6 text-[14px] font-bold text-white hover:bg-white/10"
                >
                  Sign in
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Sources() {
  return (
    <section className="rp-chapter pb-20">
      <div className={wrap}>
        <h2 className="rp-display flex items-center gap-3 text-[clamp(2rem,5vw,3.2rem)]">
          <Art name="fourfold" className="h-[0.8em] w-[0.8em]" /> Method and
          sources
        </h2>
        <p className="mt-5 max-w-[42rem] text-[15px] leading-relaxed text-white/80">
          This is desk research, not a survey of our own. Every figure is taken
          from the published source listed below, as of 23 November 2026. Where
          a series changed method (the inflation index was rebased in January
          2025) the chart says so. Survey percentages are as reported by the
          survey&apos;s publisher. Pictures are illustrations.
        </p>
        <ol className="mt-8 grid gap-x-10 gap-y-3 text-[13px] leading-snug text-white/75 md:grid-cols-2">
          {SOURCES.map((s, i) => (
            <li key={s.id} className="flex gap-3">
              <span className="rp-num w-6 shrink-0 text-right text-white/45">
                {i + 1}
              </span>
              <span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
                >
                  {s.title}
                </a>
                <span className="block text-white/55">{s.publisher}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
