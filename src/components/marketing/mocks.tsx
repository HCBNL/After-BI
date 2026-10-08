/**
 * Product pictures, drawn in code.
 *
 * These stand in for screenshots and photographs until real files are dropped
 * into /public/site/. They are drawn from the same shapes as the app itself,
 * so a page that never gets a picture still looks finished. The figures in
 * them are illustrative, like the numbers on a printed brochure's screenshot.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ModuleIcon } from './site-ui';
import { Wordmark } from '@/components/brand/Wordmark';

/* ------------------------------------------------------------------ frames */

/** A browser window. */
export function Window({ children, className, title = 'afterbi.com' }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white shadow-[0_30px_80px_-30px_rgba(15,31,54,0.45)] ring-1 ring-navy-900/10', className)}>
      <div className="flex h-8 items-center gap-1.5 border-b border-navy-900/8 bg-navy-50 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c941]" />
        <span className="ml-3 h-4 flex-1 max-w-[14rem] rounded bg-white px-2 text-[9px] leading-4 text-navy-400 ring-1 ring-navy-900/8">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/** A phone. */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[1.8rem] bg-navy-950 p-1.5 shadow-[0_30px_70px_-25px_rgba(15,31,54,0.6)]', className)}>
      <div className="overflow-hidden rounded-[1.4rem] bg-white">
        <div className="flex h-5 items-center justify-center bg-brand-700">
          <span className="h-1.5 w-10 rounded-full bg-navy-950/40" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- pieces */

function Kpi({ label, value, delta, up = true }: { label: string; value: string; delta: string; up?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-2.5 ring-1 ring-navy-900/8">
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 font-display text-[15px] font-extrabold leading-none text-navy-900">{value}</p>
      <p className={cn('mt-1 text-[8.5px] font-bold', up ? 'text-brand-600' : 'text-[#d9534f]')}>{delta}</p>
    </div>
  );
}

const STATUS = {
  Approved: 'bg-[#dcfce7] text-[#166534]',
  Pending: 'bg-[#fff4d6] text-[#8a6100]',
  Delivered: 'bg-navy-100 text-navy-700',
  Overdue: 'bg-[#fde6e6] text-[#a12b2b]',
} as const;

function Pill({ s }: { s: keyof typeof STATUS }) {
  return <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', STATUS[s])}>{s}</span>;
}

function Bars({ a, b, className }: { a: number[]; b: number[]; className?: string }) {
  return (
    <div className={cn('flex h-full items-end gap-1.5', className)}>
      {a.map((value, index) => (
        <div key={index} className="flex h-full flex-1 items-end gap-[2px]">
          <span className="flex-1 rounded-t-sm bg-navy-300" style={{ height: `${value}%` }} />
          <span className="flex-1 rounded-t-sm bg-brand-500" style={{ height: `${b[index]}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Two smooth lines, the way a trend card draws them. */
export function Sparkline({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" className={cn('w-full', className)} aria-hidden>
      {[20, 40, 60].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke={light ? 'rgba(255,255,255,0.12)' : 'rgba(15,31,54,0.08)'} strokeWidth="1" />
      ))}
      <path d="M0 62 C 25 55, 40 66, 60 58 S 95 40, 115 46 S 150 30, 170 24 S 190 14, 200 10" fill="none" stroke="var(--color-brand-500)" strokeWidth="3" strokeLinecap="round" />
      <path d="M0 66 C 30 64, 50 60, 75 56 S 120 50, 140 44 S 180 36, 200 30" fill="none" stroke={light ? 'rgba(255,255,255,0.45)' : '#9bb4d4'} strokeWidth="2" strokeDasharray="5 5" />
    </svg>
  );
}

const ORDERS: [string, string, string, keyof typeof STATUS][] = [
  ['SO-10482', 'Apex Retail Group', '₦2,480,000', 'Approved'],
  ['SO-10481', 'Bright Star Stores', '₦1,125,500', 'Pending'],
  ['SO-10479', 'Northgate Distribution', '₦4,902,000', 'Delivered'],
  ['SO-10476', 'FreshMart (MT)', '₦860,200', 'Approved'],
  ['SO-10473', 'Summit Wholesale', '₦1,740,000', 'Overdue'],
];

function OrdersTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg bg-white ring-1 ring-navy-900/8">
      <div className="flex items-center justify-between border-b border-navy-900/8 px-3 py-2">
        <p className="text-[10px] font-bold text-navy-900">Recent orders</p>
        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[8px] font-bold text-white">New order</span>
      </div>
      {ORDERS.slice(0, rows).map(([id, who, amount, status]) => (
        <div key={id} className="grid grid-cols-[3.4rem_1fr_auto_auto] items-center gap-2 border-b border-navy-900/5 px-3 py-1.5 last:border-0">
          <span className="text-[8.5px] font-semibold text-navy-400">{id}</span>
          <span className="truncate text-[9px] font-semibold text-navy-800">{who}</span>
          <span className="text-[9px] font-bold text-navy-900">{amount}</span>
          <Pill s={status} />
        </div>
      ))}
    </div>
  );
}

const SIDEBAR_LABEL: Record<string, string> = {
  leads: 'Pipeline',
  orders: 'Orders',
  stock: 'Inventory',
  invoices: 'Billing',
  credit: 'Credit',
  'sell-out': 'Channel',
  analytics: 'Analytics',
};

function Sidebar() {
  const items = ['leads', 'orders', 'stock', 'invoices', 'credit', 'sell-out', 'analytics'];
  return (
    <div className="hidden w-[22%] shrink-0 flex-col gap-1 border-r border-navy-900/8 bg-navy-50/60 p-2 sm:flex">
      <p className="px-1.5 pb-2">
        <Wordmark className="text-[11px] !text-navy-900" />
      </p>
      {items.map((slug, index) => (
        <span
          key={slug}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8.5px] font-semibold',
            index === 0 ? 'bg-white text-brand-700 ring-1 ring-navy-900/8' : 'text-navy-500',
          )}
        >
          <ModuleIcon slug={slug} size={10} />
          {SIDEBAR_LABEL[slug] ?? slug}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- the hero */

/** The front page's picture: the head office screen, with the phone beside it. */
export function DashboardMock({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Window>
        <div className="flex aspect-[16/10]">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-2 bg-navy-50/40 p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-navy-900">Good morning, Grace</p>
              <span className="text-[8.5px] font-semibold text-navy-400">October</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Kpi label="Sell-in" value="₦84.2m" delta="+6.1%" />
              <Kpi label="Sell-out" value="₦71.9m" delta="+3.4%" />
              <Kpi label="Overdue" value="₦4.3m" delta="-1.2m" up={false} />
              <Kpi label="Orders" value="312" delta="+28" />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-5 gap-1.5">
              <div className="col-span-2 flex flex-col rounded-lg bg-white p-2 ring-1 ring-navy-900/8">
                <p className="text-[9px] font-bold text-navy-900">Sell-in vs sell-out</p>
                <Bars className="mt-1 min-h-0 flex-1" a={[60, 72, 55, 80, 68, 90]} b={[48, 60, 50, 64, 61, 72]} />
              </div>
              <div className="col-span-3 min-h-0 overflow-hidden">
                <OrdersTable rows={4} />
              </div>
            </div>
          </div>
        </div>
      </Window>

      <Phone className="absolute -bottom-8 -right-3 w-[30%] sm:-right-8">
        <PortalScreen />
      </Phone>
    </div>
  );
}

export function PortalScreen() {
  return (
    <div className="space-y-1.5 p-2">
      <p className="text-[9px] font-extrabold text-navy-900">Your account</p>
      <div className="rounded-lg bg-navy-900 p-2 text-white">
        <p className="text-[7.5px] text-white/60">Balance</p>
        <p className="font-display text-[13px] font-extrabold">₦1,240,500</p>
        <p className="text-[7.5px] text-brand-300">Limit ₦3,000,000</p>
      </div>
      {['Place an order', 'My statement', 'Report sell-out'].map((label, index) => (
        <div key={label} className="flex items-center justify-between rounded-md bg-navy-50 px-2 py-1.5">
          <span className="text-[8px] font-bold text-navy-800">{label}</span>
          <span className={cn('h-1.5 w-1.5 rounded-full', index === 0 ? 'bg-brand-500' : 'bg-navy-300')} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- per module */

function ModuleBody({ slug }: { slug: string }) {
  switch (slug) {
    case 'sell-out':
      return (
        <div className="flex h-full flex-col gap-2 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <Kpi label="Sell-in" value="₦84.2m" delta="+6.1%" />
            <Kpi label="Sell-out" value="₦71.9m" delta="+3.4%" />
            <Kpi label="In channel" value="₦12.3m" delta="+2.7m" up={false} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white p-2 ring-1 ring-navy-900/8">
            <p className="text-[9px] font-bold text-navy-900">By week</p>
            <Bars className="mt-1 min-h-0 flex-1" a={[55, 70, 62, 85, 74, 92, 80, 88]} b={[45, 58, 57, 66, 70, 71, 74, 78]} />
          </div>
        </div>
      );
    case 'stock':
      return (
        <div className="space-y-1.5 p-3">
          {[
            ['Central DC', 82],
            ['North Hub', 64],
            ['East Hub', 41],
            ['West Hub', 23],
            ['South Hub', 57],
          ].map(([depot, level]) => (
            <div key={depot as string} className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-navy-900/8">
              <div className="flex justify-between text-[9px] font-bold text-navy-800">
                <span>{depot}</span>
                <span>{level}% cover</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-navy-100">
                <div
                  className={cn('h-full rounded-full', (level as number) < 30 ? 'bg-[#e0a100]' : 'bg-brand-500')}
                  style={{ width: `${level}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    case 'invoices':
      return (
        <div className="p-3">
          <div className="rounded-lg bg-white p-3 ring-1 ring-navy-900/8">
            <div className="flex justify-between">
              <p className="font-display text-[12px] font-extrabold text-navy-900">Invoice INV-2291</p>
              <Pill s="Approved" />
            </div>
            <p className="mt-0.5 text-[8.5px] text-navy-400">Apex Retail Group</p>
            {['Instant noodles (carton)', 'Seasoning cubes (case)', 'Vegetable oil 1L (carton)'].map((line, index) => (
              <div key={line} className="mt-1.5 flex justify-between border-b border-navy-900/5 pb-1 text-[8.5px] text-navy-700">
                <span>{line}</span>
                <span className="font-bold">₦{[640, 410, 1290][index]},000</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between text-[10px] font-extrabold text-navy-900">
              <span>Total</span>
              <span>₦2,340,000</span>
            </div>
          </div>
        </div>
      );
    case 'credit':
      return (
        <div className="p-3">
          <div className="rounded-lg bg-white p-2.5 ring-1 ring-navy-900/8">
            <p className="text-[9px] font-bold text-navy-900">Ageing</p>
            {[
              ['Current', 70, 'bg-brand-500'],
              ['30 days', 45, 'bg-brand-300'],
              ['60 days', 24, 'bg-[#e0a100]'],
              ['90+ days', 12, 'bg-[#d9534f]'],
            ].map(([label, width, color]) => (
              <div key={label as string} className="mt-2 flex items-center gap-2">
                <span className="w-12 text-[8.5px] font-semibold text-navy-500">{label}</span>
                <div className="h-2.5 flex-1 rounded-full bg-navy-100">
                  <div className={cn('h-full rounded-full', color as string)} style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-[#fde6e6] px-2.5 py-2 text-[8.5px] font-bold text-[#a12b2b]">
            Order held: Summit Wholesale is over its credit limit
          </div>
        </div>
      );
    case 'deliveries':
      return (
        <div className="space-y-1.5 p-3">
          {[
            ['Load L-118', 'Central DC to North Hub', 'Delivered'],
            ['Load L-119', 'Central DC to West Hub', 'Approved'],
            ['Load L-120', 'East Hub to FreshMart', 'Pending'],
          ].map(([load, route, status]) => (
            <div key={load} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 ring-1 ring-navy-900/8">
              <span>
                <span className="block text-[9px] font-bold text-navy-900">{load}</span>
                <span className="block text-[8.5px] text-navy-400">{route}</span>
              </span>
              <Pill s={status as keyof typeof STATUS} />
            </div>
          ))}
        </div>
      );
    case 'targets':
      return (
        <div className="grid grid-cols-2 gap-1.5 p-3">
          {[
            ['Daniel (East)', 92],
            ['Grace (Central)', 78],
            ['Samuel (North)', 64],
            ['Amara (South)', 103],
          ].map(([who, score]) => (
            <div key={who as string} className="rounded-lg bg-white p-2 ring-1 ring-navy-900/8">
              <p className="truncate text-[8.5px] font-semibold text-navy-500">{who}</p>
              <p className="mt-1 font-display text-[16px] font-extrabold text-navy-900">{score}%</p>
              <div className="mt-1 h-1.5 rounded-full bg-navy-100">
                <div
                  className={cn('h-full rounded-full', (score as number) >= 90 ? 'bg-brand-500' : 'bg-[#e0a100]')}
                  style={{ width: `${Math.min(100, score as number)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    case 'leads':
      return (
        <div className="grid h-full grid-cols-4 gap-1.5 p-3">
          {[
            ['New', ['Apex Retail', 'Kola Stores']],
            ['Contacted', ['FreshMart', 'Unity Mall']],
            ['Qualified', ['Summit Wholesale']],
            ['Won', ['Northgate', 'Bright Star']],
          ].map(([stage, cards]) => (
            <div key={stage as string} className="rounded-lg bg-white/70 p-1.5 ring-1 ring-navy-900/8">
              <p className="text-[8.5px] font-bold text-navy-500">{stage as string}</p>
              {(cards as string[]).map((card) => (
                <div key={card} className="mt-1.5 rounded-md bg-white p-1.5 shadow-sm ring-1 ring-navy-900/8">
                  <p className="truncate text-[8.5px] font-bold text-navy-900">{card}</p>
                  <p className="text-[7.5px] text-navy-400">₦{(card.length * 0.31).toFixed(1)}m</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case 'analytics':
      return (
        <div className="flex h-full flex-col gap-2 p-3">
          <div className="grid grid-cols-4 gap-1.5">
            <Kpi label="Revenue" value="₦84.2m" delta="+6.1%" />
            <Kpi label="Margin" value="23.4%" delta="+0.8pt" />
            <Kpi label="Receivables" value="₦9.1m" delta="-4%" up={false} />
            <Kpi label="Coverage" value="78%" delta="+5%" />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
            <div className="flex flex-col rounded-lg bg-white p-2 ring-1 ring-navy-900/8">
              <p className="text-[9px] font-bold text-navy-900">Revenue trend</p>
              <Sparkline className="mt-1 min-h-0 flex-1" />
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-navy-900/8">
              <p className="text-[9px] font-bold text-navy-900">By region</p>
              {[['Central', 82], ['North', 61], ['East', 54], ['South', 47]].map(([r, v]) => (
                <div key={r as string} className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-9 text-[8px] font-semibold text-navy-500">{r}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'automation':
      return (
        <div className="space-y-1.5 p-3">
          {[
            ['Approval needed', 'SO-10481 is waiting for you', 'bg-brand-500'],
            ['Reminder sent', 'Summit Wholesale: statement due', 'bg-navy-400'],
            ['Task assigned', 'Stock count at North Hub', 'bg-navy-400'],
            ['Order unfinished', 'Draft for FreshMart, 2 lines', 'bg-[#e0a100]'],
          ].map(([title, body, dot]) => (
            <div key={title} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-navy-900/8">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
              <span className="min-w-0">
                <span className="block text-[9px] font-bold text-navy-900">{title}</span>
                <span className="block truncate text-[8.5px] text-navy-500">{body}</span>
              </span>
            </div>
          ))}
        </div>
      );
    case 'access':
      return (
        <div className="space-y-1.5 p-3">
          {[
            ['Head office', 'Full access'],
            ['Sales', 'Own accounts only'],
            ['Operations', 'Approvals and inventory'],
            ['Finance', 'Billing and credit'],
            ['Partners', 'Own workspace only'],
          ].map(([role, scope]) => (
            <div key={role} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 ring-1 ring-navy-900/8">
              <span className="text-[9px] font-bold text-navy-900">{role}</span>
              <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[8px] font-semibold text-navy-600">{scope}</span>
            </div>
          ))}
        </div>
      );
    case 'distributor-portal':
      return (
        <div className="flex h-full items-center justify-center p-3">
          <Phone className="w-[42%]">
            <PortalScreen />
          </Phone>
        </div>
      );
    default:
      return (
        <div className="space-y-2 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <Kpi label="Today" value="48" delta="+9 orders" />
            <Kpi label="Value" value="₦11.1m" delta="+12%" />
            <Kpi label="To approve" value="6" delta="2 over limit" up={false} />
          </div>
          <OrdersTable />
        </div>
      );
  }
}

/** A screen of one module, in a window. */
export function ModuleMock({ slug, className }: { slug: string; className?: string }) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-50 to-brand-50 p-[6%]', className)}>
      <Window className="w-full">
        <div className="aspect-[16/10] bg-navy-50/50">
          <ModuleBody slug={slug} />
        </div>
      </Window>
    </div>
  );
}

/** For photograph slots: a module screen on a deep, softly lit panel. */
export function SceneMock({ slug, className }: { slug: string; className?: string }) {
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center overflow-hidden bg-navy-900 p-[8%]', className)}>
      <div aria-hidden className="site-dark-dots absolute inset-0" />
      <div aria-hidden className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-navy-400/30 blur-3xl" />
      <Window className="relative w-full">
        <div className="aspect-[16/10] bg-navy-50/50">
          <ModuleBody slug={slug} />
        </div>
      </Window>
    </div>
  );
}
