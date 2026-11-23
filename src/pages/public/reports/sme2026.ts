/**
 * The SME Report 2026: every number on the page, with where it came from.
 *
 * Nothing here is invented or estimated. Each figure is copied from a
 * published source (the `src` ids point into SOURCES at the bottom), and the
 * page prints the source under every chart. When a series mixes methods (the
 * inflation line runs across the January 2025 rebasing) the note says so.
 *
 * Compiled from public sources up to 23 November 2026.
 */

export const REPORT = {
  slug: "sme-2026",
  title: "The SME Report 2026",
  subtitle:
    "What it now costs to run, move and grow a small business in Nigeria, told in numbers.",
  published: "2026-11-23",
  publishedLabel: "November 2026",
};

export type SourceId =
  | "nbs-msme-2020"
  | "nbs-msme-2017"
  | "nbs-msme-2010"
  | "pwc-2024"
  | "pwc-2024-release"
  | "pwc-2024-loans"
  | "nbs-cpi-oct26"
  | "nbs-cpi-oct25"
  | "nbs-cpi-jan25"
  | "cbn-mpc-feb26"
  | "cbn-ies-sep26"
  | "fx-2022"
  | "fx-2023"
  | "fx-2024"
  | "fx-2025"
  | "fx-nov26"
  | "cbn-mpr-2024"
  | "cbn-mpr-nov24"
  | "cbn-mpr-sep25"
  | "cbn-mpr-feb26"
  | "cbn-mpr-sep26"
  | "nbs-fuel-may26"
  | "nbs-pms-2026"
  | "nerc-banda"
  | "nerc-banda-jul24"
  | "ember-2025"
  | "fao-2024"
  | "ifdc-horti"
  | "gallup-2026"
  | "gallup-2025"
  | "gallup-ssa";

export interface Source {
  id: SourceId;
  publisher: string;
  title: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: "nbs-msme-2020",
    publisher: "SMEDAN and NBS, reported by The Guardian",
    title: "Over 39.65m MSMEs operate in Nigeria (MSME survey 2020/21)",
    url: "https://guardian.ng/business-services/over-39-65m-msmes-operate-in-nigeria-says-report",
  },
  {
    id: "nbs-msme-2017",
    publisher: "National Bureau of Statistics",
    title: "MSME National Survey 2017, foreword (2013 count)",
    url: "https://nigerianstat.gov.ng/download/966",
  },
  {
    id: "nbs-msme-2010",
    publisher: "National Bureau of Statistics",
    title: "MSME survey presentation (2010 baseline count)",
    url: "https://www.nigerianstat.gov.ng/pdfuploads/MSME%20Presentation.pdf",
  },
  {
    id: "pwc-2024",
    publisher: "PwC Nigeria",
    title: "PwC's MSME Survey 2024: Building resilience",
    url: "https://www.pwc.com/ng/en/assets/pdf/msme-survey-report-july-2024.pdf",
  },
  {
    id: "pwc-2024-release",
    publisher: "PwC Nigeria",
    title: "PwC's 2024 MSME Survey, press release",
    url: "https://www.pwc.com/ng/en/press-room/pwc-msme-survey-2024.html",
  },
  {
    id: "pwc-2024-loans",
    publisher: "Leadership, citing PwC MSME Survey 2024",
    title: "Loan barriers and funding sources of MSMEs",
    url: "https://leadership.ng/msmes-face-236bn-funding-gap-as-bank-lending-remains-at-4/",
  },
  {
    id: "nbs-cpi-oct26",
    publisher:
      "NBS CPI October 2026, reported by Nairametrics and Economic Confidential",
    title: "Headline inflation 14.06%, food 19.13%, core 10.78%",
    url: "https://economicconfidential.com/nbs-reveals-headline-inflation/",
  },
  {
    id: "nbs-cpi-oct25",
    publisher: "NBS CPI October 2025, reported by Premium Times",
    title: "Nigeria's inflation rate eases to 16.05%",
    url: "https://www.premiumtimesng.com/business/business-news/836171-nigerias-inflation-rate-eases-for-seventh-consecutive-month.html",
  },
  {
    id: "nbs-cpi-jan25",
    publisher: "NBS, reported by KPMG",
    title: "Rebased CPI: 24.48% in January 2025 after 34.80% in December 2024",
    url: "https://kpmg.com/ng/en/insights/2025/02/kpmg-financial-services-industry-pulse.html",
  },
  {
    id: "cbn-mpc-feb26",
    publisher: "CBN MPC, reported by Nairametrics",
    title: "Inflation at 15.1% in January 2026; MPR cut to 26.5%",
    url: "https://nairametrics.com/2026/02/24/cbn-cuts-interest-rate-to-26-5-at-304th-mpc-meeting/",
  },
  {
    id: "cbn-ies-sep26",
    publisher: "CBN household survey, reported by TechEconomy",
    title: "77.2% of households saw inflation as high in September 2026",
    url: "https://techeconomy.ng/nigeria-inflation-rate-october-2026",
  },
  {
    id: "fx-2022",
    publisher: "Nairametrics",
    title: "Official rate closed 2022 at ₦461.5/$1",
    url: "https://nairametrics.com/2023/01/01/nigerias-exchange-rate-depreciates-23-to-close-2022-at-n735-1-at-black-market/",
  },
  {
    id: "fx-2023",
    publisher: "Legit.ng, citing CBN",
    title: "Official rate at the end of 2023: ₦907.11/$1",
    url: "https://www.legit.ng/business-economy/money/1633589-naira-weakens-official-market-loses-41-cbn-reforms",
  },
  {
    id: "fx-2024",
    publisher: "Nairametrics",
    title: "Exchange rate ends 2024 at ₦1,535/$1",
    url: "https://nairametrics.com/2024/12/31/exchange-rate-ends-2024-at-n1535-1-marking-a-40-9-depreciation",
  },
  {
    id: "fx-2025",
    publisher: "Nairametrics",
    title: "Naira ends 2025 at ₦1,429/$1, first annual gain in 13 years",
    url: "https://nairametrics.com/2026/01/01/naira-ends-2025-at-n1429-first-annual-gain-in-13-years/",
  },
  {
    id: "fx-nov26",
    publisher: "TechEconomy, citing CBN",
    title: "NFEM rate ₦1,358.09/$1 on 17 November 2026",
    url: "https://techeconomy.ng/dollar-to-naira-exchange-rate-today-november-18-2026",
  },
  {
    id: "cbn-mpr-2024",
    publisher: "Nairametrics",
    title: "Six rate rises in 2024, from 18.75%",
    url: "https://nairametrics.com/2024/11/26/november-2024-mpr-cbn-raises-interest-rate-once-again-by-0-25-to-27-50",
  },
  {
    id: "cbn-mpr-nov24",
    publisher: "Central Bank of Nigeria",
    title: "MPC Communique No. 155: MPR raised to 27.50%",
    url: "https://www.cbn.gov.ng/Out/2024/CCD/FINAL%20MPC%20Communique%20No.%20155%20November%2026%202024%2015.08pm.pdf",
  },
  {
    id: "cbn-mpr-sep25",
    publisher: "Central Bank of Nigeria",
    title: "MPC Communique No. 159: MPR reduced to 27.00%",
    url: "https://www.cbn.gov.ng/Out/2025/CCD/Final%20MPC%20Communique%20No.%20159%20September%2023%202025.pdf",
  },
  {
    id: "cbn-mpr-feb26",
    publisher: "Nairametrics",
    title: "CBN cuts interest rate to 26.5%",
    url: "https://nairametrics.com/2026/02/24/cbn-cuts-interest-rate-to-26-5-at-304th-mpc-meeting/",
  },
  {
    id: "cbn-mpr-sep26",
    publisher: "Central Bank of Nigeria",
    title: "307th MPC: Monetary Policy Rate reset at 23.00%",
    url: "https://www.cbn.gov.ng/Out/2026/CCD/Personal%20Statements%20of%20Members%20for%20the%20307th%20Meeting%20of%20the%20MPC_September%202026.pdf",
  },
  {
    id: "nbs-fuel-may26",
    publisher: "NBS Price Watch, reported by AllAfrica",
    title: "Diesel ₦3,277.47 and petrol ₦1,596.25 a litre in May 2026",
    url: "https://allafrica.com/stories/202606300015.html",
  },
  {
    id: "nbs-pms-2026",
    publisher:
      "NBS Petrol Price Watch, reported by Nairametrics and Premium Times",
    title: "Average petrol price, January to May 2026",
    url: "https://nairametrics.com/2026/05/29/petrol-price-jumps-19-to-n1533-litre-in-april-nbs/",
  },
  {
    id: "nerc-banda",
    publisher: "Nairametrics",
    title: "NERC raises Band A tariff from ₦66 to ₦225/kWh",
    url: "https://nairametrics.com/2024/04/03/nerc-increases-electricity-tariffs-for-band-a-customers-to-n225-kwh/?amp=1",
  },
  {
    id: "nerc-banda-jul24",
    publisher: "Nairametrics",
    title: "Band A moves from ₦206.80 to ₦209.50/kWh",
    url: "https://nairametrics.com/2024/07/03/discos-announce-new-electricity-tariff-increase-for-band-a-customers",
  },
  {
    id: "ember-2025",
    publisher: "Ember",
    title: "Africa's solar imports surge 60% (12 months to June 2025)",
    url: "https://ember-energy.org/?p=15073",
  },
  {
    id: "fao-2024",
    publisher: "FAO specialist, reported by Arise News",
    title:
      "Nigeria loses about 50% of agricultural products along the supply chain",
    url: "https://arise.tv/nigeria-loses-50-of-agricultural-products-along-supply-chain-says-fao-expert",
  },
  {
    id: "ifdc-horti",
    publisher: "IFDC HortiNigeria",
    title: "Scoping and mapping of postharvest losses",
    url: "https://ifdc.org/wp-content/uploads/2024/01/Scoping-and-Mapping-of-Postharvest-Losses-HortiNigeria.pdf",
  },
  {
    id: "gallup-2026",
    publisher: "Gallup",
    title: "State of the Global Workplace 2026: global data",
    url: "https://www.gallup.com/workplace/697904/hybrid-work-productivity.aspx",
  },
  {
    id: "gallup-2025",
    publisher: "Gallup",
    title: "State of the Global Workplace 2025 press release",
    url: "https://www.gallup.com/file/workplace/660197/State-of-the-Global-Workplace-Global-Press-Release-2025.pdf",
  },
  {
    id: "gallup-ssa",
    publisher: "Gallup",
    title: "State of the Global Workplace 2026: Sub-Saharan Africa averages",
    url: "https://www.gallup.com/workplace/707162/state-global-workplace-south-africa-country-level-data.aspx",
  },
];

export function sourceOf(id: SourceId): Source {
  return SOURCES.find((s) => s.id === id)!;
}

/* ------------------------------------------------------------ the numbers */

/** MSMEs counted by each national survey (SMEDAN and NBS). */
export const MSME_COUNTS = [
  { label: "2010", value: 17_284_671 },
  { label: "2013", value: 37_067_416 },
  { label: "2017", value: 41_543_028 },
  { label: "2020", value: 39_654_385 },
];

export const MSME_SPLIT = {
  micro: 38_413_420,
  sme: 1_240_965,
  total: 39_654_385,
  microShare: 96.9,
};

export const MSME_SHARE = [
  { label: "of GDP", value: 46.31 },
  { label: "of jobs", value: 87.9 },
  { label: "of exports", value: 6.21 },
];

/** Headline inflation, as each month was first published. */
export const INFLATION_LINE = [
  { label: "Dec '24", value: 34.8 },
  { label: "Jan '25", value: 24.48 },
  { label: "Oct '25", value: 16.05 },
  { label: "Jan '26", value: 15.1 },
  { label: "Sep '26", value: 14.63 },
  { label: "Oct '26", value: 14.06 },
];

export const INFLATION_PARTS = [
  { label: "Food", value: 19.13 },
  { label: "Headline", value: 14.06 },
  { label: "Core", value: 10.78 },
];

export const DEMAND = { fell: 67 };

export const DEMAND_REASONS = [
  { label: "High product costs", value: 38 },
  { label: "Low purchasing power", value: 36 },
  { label: "Customers switching", value: 12 },
  { label: "Changing tastes", value: 10 },
];

/** Official naira per dollar at the close of each year. */
export const NAIRA = [
  { label: "2022", value: 461.5 },
  { label: "2023", value: 907.11 },
  { label: "2024", value: 1535 },
  { label: "2025", value: 1429 },
  { label: "Nov 2026", value: 1358.09 },
];

/** Monetary Policy Rate, each time it changed. */
export const MPR = [
  { label: "Jan '24", value: 18.75 },
  { label: "Feb '24", value: 22.75 },
  { label: "Mar '24", value: 24.75 },
  { label: "May '24", value: 26.25 },
  { label: "Jul '24", value: 26.75 },
  { label: "Sep '24", value: 27.25 },
  { label: "Nov '24", value: 27.5 },
  { label: "Sep '25", value: 27 },
  { label: "Feb '26", value: 26.5 },
  { label: "Sep '26", value: 23 },
];

export const LOAN_BARRIERS = [
  { label: "High interest rates", value: 27 },
  { label: "Lengthy loan process", value: 26 },
  { label: "Not enough collateral", value: 14 },
];

export const FUNDING = { family: 38, banks: 26 };

export const FUEL = {
  diesel: { before: 1758.26, after: 3277.47 },
  petrol: { before: 1027.76, after: 1596.25 },
};

export const PETROL_2026 = [
  { label: "Jan", value: 1034.76 },
  { label: "Feb", value: 1051.47 },
  { label: "Mar", value: 1288.54 },
  { label: "Apr", value: 1532.93 },
  { label: "May", value: 1596.25 },
];

export const BAND_A = [
  { label: "Before Apr 2024", value: 66 },
  { label: "Apr 2024", value: 225 },
  { label: "May 2024", value: 206.8 },
  { label: "Jul 2024", value: 209.5 },
];

export const SOLAR_TOP = [
  { label: "South Africa", value: 3784 },
  { label: "Nigeria", value: 1721 },
  { label: "Algeria", value: 1199 },
];

export const SOLAR_AFRICA = { before: 9379, after: 15032 };

export const ENGAGEMENT_TREND = [
  { label: "2009", value: 12 },
  { label: "2012", value: 13 },
  { label: "2014", value: 14 },
  { label: "2016", value: 17 },
  { label: "2018", value: 19 },
  { label: "2019", value: 22 },
  { label: "2020", value: 20 },
  { label: "2022", value: 23 },
  { label: "2023", value: 23 },
  { label: "2024", value: 21 },
  { label: "2025", value: 20 },
];

export const WELLBEING = [
  { label: "Stressed a lot", ssa: 46, world: 40 },
  { label: "Thriving", ssa: 18, world: 34 },
];

export const CHALLENGES = [
  { label: "Access to finance", value: 35 },
  { label: "Unreliable power", value: 21 },
  { label: "Multiple taxes", value: 12 },
  { label: "Skilled labour", value: 11 },
  { label: "Insecurity", value: 10 },
];
