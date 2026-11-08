/**
 * Costing, the second section: the import calculator.
 *
 * For the moment you are at the supplier's table. Type the price they quote
 * for one unit; everything else (exchange rate, freight multiple, delivery
 * percent, other expenses, your profit) is already there from last time, and
 * the naira cost and selling price update as you type. The bargain box turns
 * it round: the price you want to sell at gives the most you can pay them.
 *
 * The arithmetic lives in lib/quickCost.ts.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Hint, IconButton, Input, SegmentedControl, Select, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  defaultQuick,
  loadLocalQuick,
  loadRemoteQuick,
  localSavedAt,
  maxSupplierPrice,
  QUICK_NAME,
  QUICK_SIGN,
  runQuick,
  saveLocalQuick,
  saveRemoteQuick,
  stepId,
  type QuickCurrency,
  type QuickSettings,
  type QuickStep,
  type StepKind,
} from '@/lib/quickCost';
import { count, formatDate, naira } from '@/lib/format';
import { cn } from '@/lib/cn';

const KIND_LABEL: Record<StepKind, string> = { times: '× multiple', percent: '% of total', amount: '₦ per unit' };
const QUICK_VALUES: Record<StepKind, number[]> = { times: [2, 2.5, 3], percent: [5, 10, 15], amount: [50, 100, 200] };
const PROFITS = [30, 50, 100];
const ROUNDING = [0, 10, 50, 100, 500];

const num = (v: string) => {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const foreign = (value: number, currency: QuickCurrency) =>
  `${QUICK_SIGN[currency]}${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'tabular rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
          : 'border-hairline text-secondary hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function ImportCalculator() {
  const { user } = useAuth();
  const toast = useToast();
  const uid = user?.id ?? 'anon';

  const [s, setS] = useState<QuickSettings>(() => loadLocalQuick(uid) ?? defaultQuick());
  const [synced, setSynced] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const loaded = useRef(false);
  /* Read before the first save below stamps the phone copy with "now". */
  const localAt = useRef(localSavedAt(uid));

  /* The copy online wins when it is newer (settings changed on another phone). */
  useEffect(() => {
    let live = true;
    void loadRemoteQuick(uid).then((remote) => {
      if (!live) return;
      if (remote && remote.savedAt > localAt.current) setS(remote.settings);
      loaded.current = true;
    });
    return () => {
      live = false;
    };
  }, [uid]);

  /* Kept as you type: on the phone at once, online a moment later. */
  useEffect(() => {
    const at = saveLocalQuick(uid, s);
    if (!loaded.current) return;
    setSynced('saving');
    const t = window.setTimeout(() => {
      saveRemoteQuick(uid, s, at)
        .then(() => setSynced('saved'))
        .catch(() => setSynced('offline'));
    }, 1200);
    return () => window.clearTimeout(t);
  }, [s, uid]);

  const patch = (next: Partial<QuickSettings>) => setS((prev) => ({ ...prev, ...next }));
  const setStep = (id: string, next: Partial<QuickStep>) =>
    patch({ steps: s.steps.map((st) => (st.id === id ? { ...st, ...next } : st)) });

  const r = useMemo(() => runQuick(s), [s]);
  const sign = QUICK_SIGN[s.currency];
  const rate = s.rates[s.currency] || 0;
  const ready = s.price > 0 && rate > 0;
  const maxPay = maxSupplierPrice(r, s.target, s);
  const cut = s.price > 0 && maxPay > 0 ? s.price - maxPay : 0;

  const saveQuote = () => {
    if (!ready) return;
    const quote = {
      id: stepId(),
      name: s.name.trim() || `Quote ${foreign(s.price, s.currency)}`,
      currency: s.currency,
      price: s.price,
      rate,
      quantity: s.quantity,
      cost: Math.round(r.cost * 100) / 100,
      sell: r.sell,
      at: new Date().toISOString(),
    };
    patch({ quotes: [quote, ...s.quotes].slice(0, 60) });
    toast.success('Quote kept', `${quote.name}: cost ${naira(quote.cost, true)}, sell ${naira(quote.sell, true)}.`);
  };

  const box = 'rounded-2xl border border-hairline surface-card p-4 shadow-card sm:p-5';
  const heading = 'text-micro font-semibold uppercase tracking-[0.08em] text-muted';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* the answer, first on a phone and kept in view while you type */}
      <aside className="sticky top-2 z-10 order-first space-y-3 lg:order-last lg:top-4">
        <div className="rounded-2xl border border-brand-500/40 bg-[var(--surface-card)] p-4 shadow-card sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={heading}>Cost per unit</p>
              <p className="tabular mt-1 text-headline font-bold text-primary">{ready ? naira(r.cost, true) : '₦0'}</p>
            </div>
            <div className="text-right">
              <p className={heading}>Sell at</p>
              <p className="tabular mt-1 text-headline font-bold text-brand-700 dark:text-brand-300">{ready ? naira(r.sell, true) : '₦0'}</p>
            </div>
          </div>
          {ready && (
            <p className="tabular mt-2 text-caption text-muted">
              {`${naira(r.profit, true)} profit per unit (${Math.round(r.markup)}% on cost, ${Math.round(r.margin)}% margin)`}</p>
          )}
          {ready && s.quantity > 0 && (
            <div className="tabular mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3 text-caption">
              <div>
                <p className="text-muted">Pay supplier</p>
                <p className="font-semibold text-primary">{foreign(s.price * s.quantity, s.currency)}</p>
              </div>
              <div>
                <p className="text-muted">Landed total</p>
                <p className="font-semibold text-primary">{naira(r.cost * s.quantity)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted">Total profit</p>
                <p className="font-semibold text-primary">{naira(r.profit * s.quantity)}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="space-y-5">
        {/* 1. the supplier's price */}
        <section className={box}>
          <div className="mb-3 flex items-center gap-1.5">
            <h3 className={heading}>Supplier price (one unit)</h3>
            <Hint label="About the supplier price">
              Price for a single unit, even on a 20,000 unit order. Everything below is worked out per unit. Your rates,
              steps and profit are remembered on this phone and in your account, so next time you only type this price.
            </Hint>
            <SegmentedControl
              size="sm"
              className="ml-auto shrink-0 whitespace-nowrap"
              value={s.currency}
              onChange={(currency) => patch({ currency })}
              options={[
                { value: 'CNY', label: '¥ RMB' },
                { value: 'USD', label: '$ USD' },
              ]}
            />
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={s.price || ''}
            onChange={(e) => patch({ price: num(e.target.value) })}
            placeholder="0.00"
            aria-label={`Supplier price per unit in ${QUICK_NAME[s.currency]}`}
            leading={<span className="text-body font-semibold">{sign}</span>}
            className="h-14 text-headline font-bold"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-label font-medium text-secondary">{`₦ per ${sign}1`}</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={rate || ''}
                onChange={(e) => patch({ rates: { ...s.rates, [s.currency]: num(e.target.value) } })}
                placeholder="0"
                leading={<span className="text-label">₦</span>}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-label font-medium text-secondary">Units (optional)</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={s.quantity || ''}
                onChange={(e) => patch({ quantity: Math.max(0, Math.round(num(e.target.value))) })}
                placeholder="20000"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-label font-medium text-secondary">Product (optional)</span>
            <Input value={s.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ceramic mug 350ml" />
          </label>
          {ready && (
            <p className="tabular mt-2 text-right text-caption text-muted">
              {foreign(s.price, s.currency)} × {count(rate)} = {naira(r.productNaira, true)}
            </p>
          )}
        </section>

        {/* 2. what it takes to land it */}
        <section className={box}>
          <div className="mb-3 flex items-center gap-1.5">
            <h3 className={heading}>Costs to bring it to Nigeria</h3>
            <Hint label="About the cost steps">
              Each step works on the total above it, in order. × multiple: freight at ×2.5 turns ₦1,000 into ₦2,500. %:
              delivery at 10% adds a tenth of the running total. ₦ per unit: a fixed amount you have already divided out,
              such as ₦100 of other expenses per unit.
            </Hint>
          </div>
          <ol className="space-y-2.5">
            {s.steps.map((st, i) => {
              const row = r.rows[i];
              return (
                <li key={st.id} className="rounded-xl border border-hairline p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={st.label}
                      onChange={(e) => setStep(st.id, { label: e.target.value })}
                      placeholder="Name this cost"
                      aria-label="Cost name"
                      className="h-9 text-body font-semibold"
                    />
                    <IconButton label={`Remove ${st.label || 'this cost'}`} onClick={() => patch({ steps: s.steps.filter((x) => x.id !== st.id) })}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={st.value || ''}
                      onChange={(e) => setStep(st.id, { value: num(e.target.value) })}
                      placeholder="0"
                      aria-label={`${st.label} value`}
                      leading={<span className="text-label">{st.kind === 'times' ? '×' : st.kind === 'percent' ? '%' : '₦'}</span>}
                    />
                    <Select
                      value={st.kind}
                      aria-label="How this cost is worked out"
                      onChange={(e) => setStep(st.id, { kind: e.target.value as StepKind, value: QUICK_VALUES[e.target.value as StepKind][1] })}
                      className="w-[132px]"
                    >
                      {(Object.keys(KIND_LABEL) as StepKind[]).map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABEL[k]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {QUICK_VALUES[st.kind].map((v) => (
                      <Chip key={v} active={st.value === v} onClick={() => setStep(st.id, { value: v })}>
                        {st.kind === 'times' ? `×${v}` : st.kind === 'percent' ? `${v}%` : `₦${v}`}
                      </Chip>
                    ))}
                    {ready && row && (
                      <span className="tabular ml-auto text-caption text-muted">
                        +{naira(row.added, true)} <ArrowRight size={11} className="inline" aria-hidden />{' '}
                        <span className="font-semibold text-primary">{naira(row.running, true)}</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => patch({ steps: [...s.steps, { id: stepId(), label: '', kind: 'amount', value: 0 }] })}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-label font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
          >
            <Plus size={14} aria-hidden /> Add a cost
          </button>
        </section>

        {/* 3. profit */}
        <section className={box}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className={heading}>Your profit</h3>
            <Hint label="About profit">
              On cost adds the percent to your cost: 100% on ₦1,000 sells at ₦2,000. Margin is the share of the selling
              price that is profit: 50% on ₦1,000 sells at ₦2,000.
            </Hint>
            <SegmentedControl
              size="sm"
              className="ml-auto shrink-0 whitespace-nowrap"
              value={s.basis}
              onChange={(basis) => patch({ basis })}
              options={[
                { value: 'markup', label: 'On cost' },
                { value: 'margin', label: 'Margin' },
              ]}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={s.profit || ''}
              onChange={(e) => patch({ profit: num(e.target.value) })}
              placeholder="0"
              aria-label="Profit percent"
              leading={<span className="text-label">%</span>}
            />
            <Select value={String(s.roundTo)} aria-label="Round the selling price up" onChange={(e) => patch({ roundTo: Number(e.target.value) })} className="w-[150px]">
              {ROUNDING.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? 'No rounding' : `Round up to ₦${count(v)}`}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROFITS.map((p) => (
              <Chip key={p} active={s.profit === p} onClick={() => patch({ profit: p })}>
                {p}%
              </Chip>
            ))}
          </div>
          {s.basis === 'margin' && s.profit >= 100 && (
            <p className="mt-2 text-caption text-status-critical">A margin must be under 100%. For double your cost, choose On cost at 100%.</p>
          )}
        </section>

        {/* 4. bargaining */}
        <section className={box}>
          <div className="mb-3 flex items-center gap-1.5">
            <h3 className={heading}>Bargain</h3>
            <Hint label="About bargaining">
              Type the price the Nigerian market will pay for one unit. It works backwards through your costs and profit
              to the most you can pay the supplier.
            </Hint>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={s.target || ''}
            onChange={(e) => patch({ target: num(e.target.value) })}
            placeholder="Price you want to sell at"
            aria-label="Target selling price in naira"
            leading={<span className="text-label">₦</span>}
          />
          {s.target > 0 && rate > 0 && (
            <div className="mt-3 rounded-xl surface-sunken px-4 py-3">
              {maxPay > 0 ? (
                <>
                  <p className="text-caption text-muted">Pay the supplier at most</p>
                  <p className="tabular text-headline font-bold text-primary">{foreign(maxPay, s.currency)}</p>
                  {s.price > 0 && (
                    <p className={cn('tabular mt-0.5 text-caption font-semibold', cut > 0 ? 'text-status-critical' : 'text-status-good')}>
                      {cut > 0
                        ? `Ask for ${foreign(cut, s.currency)} off their ${foreign(s.price, s.currency)} (${Math.round((cut / s.price) * 100)}% lower)`
                        : `Their ${foreign(s.price, s.currency)} already works, with ${foreign(-cut, s.currency)} to spare`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-caption text-status-critical">Your fixed costs alone are above that price. No supplier price works.</p>
              )}
            </div>
          )}
        </section>

        {/* kept quotes */}
        <section className={box}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={heading}>Kept quotes</h3>
            <span className="text-caption text-muted">
              {synced === 'saving' ? 'Saving' : synced === 'offline' ? 'Saved on this phone only (offline)' : synced === 'saved' ? 'Saved' : ''}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => patch({ name: '', price: 0, quantity: 0, target: 0 })}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label font-semibold text-muted transition-colors hover:text-primary"
              >
                <RotateCcw size={14} aria-hidden /> Next product
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={saveQuote}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-label font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Bookmark size={14} aria-hidden /> Keep quote
              </button>
            </div>
          </div>
          {s.quotes.length === 0 ? (
            <p className="mt-2 text-caption text-muted">Keep a quote to compare products and suppliers later.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border-hairline)]">
              {s.quotes.map((q) => (
                <li key={q.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      patch({ name: q.name, price: q.price, currency: q.currency, quantity: q.quantity, rates: { ...s.rates, [q.currency]: q.rate } })
                    }
                  >
                    <p className="truncate text-body font-semibold text-primary">{q.name}</p>
                    <p className="tabular truncate text-caption text-muted">
                      {`${foreign(q.price, q.currency)} at ₦${count(q.rate)} · ${formatDate(q.at)}`}
                    </p>
                  </button>
                  <div className="tabular text-right">
                    <p className="text-caption text-muted">{`Cost ${naira(q.cost, true)}`}</p>
                    <p className="text-label font-semibold text-primary">{`Sell ${naira(q.sell, true)}`}</p>
                  </div>
                  <IconButton label={`Remove ${q.name}`} onClick={() => patch({ quotes: s.quotes.filter((x) => x.id !== q.id) })}>
                    <X size={15} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
