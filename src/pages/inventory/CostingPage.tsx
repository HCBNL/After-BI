/**
 * Costing: what a unit really cost to land, and what to sell it at.
 *
 * Put in the product cost, the freight, the clearance, the delivery and any
 * other expense, for the whole shipment or per unit, in naira or a foreign
 * currency at a rate you type. The total is divided by the quantity to give
 * the landed cost of one unit. Then add as many margins as you like (20%,
 * 50%) and the screen gives the selling price for each, and can write them
 * straight onto the product's OT, MT or SA price.
 *
 * Saved costings are for the super admin and administrators only: see
 * lib/costing.ts for why they do not live with the products.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Plus, Save, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  IconButton,
  Input,
  SearchInput,
  SegmentedControl,
  Select,
  Textarea,
  type Column,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { saveProduct } from '@/lib/db';
import { deleteCostSheet, listCostSheets, saveCostSheet } from '@/lib/costing';
import {
  blankSheet,
  costInNaira,
  CURRENCIES,
  CURRENCY_SIGN,
  currenciesUsed,
  earns,
  landedTotal,
  newId,
  sellingPrice,
  unitCost,
  type CostSheet,
  type Currency,
} from '@/lib/pricing';
import { count, formatDate, naira } from '@/lib/format';
import { PRICE_TIERS, TIER_LABEL, type PriceTier } from '@/types';

type Draft = Omit<CostSheet, 'id'> & { id?: string };

export default function CostingPage() {
  const { products } = useOrg();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);

  const { data, loading, reload } = useAsync(() => listCostSheets(), [], { handleError: true });

  /* Opened from a product ("Work out prices"): start a costing for it. */
  useEffect(() => {
    const id = params.get('product');
    if (!id) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setEditing(blankSheet(product));
    params.delete('product');
    setParams(params, { replace: true });
  }, [params, products, setParams]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (s) =>
        !needle ||
        s.name.toLowerCase().includes(needle) ||
        (s.productName ?? '').toLowerCase().includes(needle),
    );
  }, [data, search]);

  const columns: Column<CostSheet>[] = [
    {
      key: 'name',
      header: 'Costing',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.name}</p>
          <p className="truncate text-[12px] text-muted">
            {row.productName && row.productName !== row.name ? `${row.productName} · ` : ''}
            {count(row.quantity)} {row.unit ? row.unit.replace(/^per\s+/i, '') + 's' : 'units'}
          </p>
        </div>
      ),
    },
    {
      key: 'landed',
      header: 'Landed total',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.landedTotal ?? 0,
      cell: (row) => <span className="tabular text-[13px] text-secondary">{naira(row.landedTotal ?? 0)}</span>,
    },
    {
      key: 'unit',
      header: 'Per unit',
      align: 'right',
      sortValue: (row) => row.unitCost ?? 0,
      cell: (row) => (
        <span className="tabular text-[13.5px] font-bold text-primary">{naira(row.unitCost ?? 0, true)}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.updatedAt ?? '',
      cell: (row) => <span className="text-[12.5px] text-muted">{formatDate(row.updatedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Costing"
        description="Landed cost per unit from product, freight, clearance and delivery, then your selling price at any margin."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing(blankSheet())}>
            New costing
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Costing or product…" className="max-w-xs" />
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) => setEditing(row)}
        loading={loading}
        emptyIcon={<Calculator size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'No costings yet'}
        emptyDescription={
          search
            ? 'Try a different name.'
            : 'Press New costing, put in what the shipment cost you and how many units it holds, and see your price at any margin.'
        }
      />

      <CostingDrawer
        sheet={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(saved);
          reload();
        }}
        onDeleted={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

const ROUNDING = [0, 1, 10, 50, 100, 500, 1000];

function CostingDrawer({
  sheet,
  onClose,
  onSaved,
  onDeleted,
}: {
  sheet: Draft | null;
  onClose: () => void;
  onSaved: (sheet: Draft) => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const { products, reload: reloadOrg } = useOrg();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(sheet ?? blankSheet());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'apply' | 'delete'>(null);

  /* Re-seed when another costing is opened. */
  const [seed, setSeed] = useState<Draft | null>(sheet);
  if (sheet !== seed) {
    setSeed(sheet);
    if (sheet) setDraft(sheet);
  }

  const product = products.find((p) => p.id === draft.productId);
  const total = landedTotal(draft);
  const perUnit = unitCost(draft);
  const foreign = currenciesUsed(draft);
  const quantity = Number(draft.quantity) || 0;
  const unitWord = (draft.unit ?? product?.unit ?? '').replace(/^per\s+/i, '') || 'unit';

  const prices = draft.margins.map((m) => ({
    ...m,
    price: sellingPrice(perUnit, m.percent, draft.basis, draft.roundTo),
  }));
  const toApply = prices.filter((p) => p.tier && p.price > 0);

  if (!sheet) return null;

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const setCost = (id: string, next: Partial<Draft['costs'][number]>) =>
    patch({ costs: draft.costs.map((c) => (c.id === id ? { ...c, ...next } : c)) });
  const setMargin = (id: string, next: Partial<Draft['margins'][number]>) =>
    patch({ margins: draft.margins.map((m) => (m.id === id ? { ...m, ...next } : m)) });

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const id = await saveCostSheet(draft, user);
      toast.success('Costing saved');
      onSaved({ ...draft, id, landedTotal: total, unitCost: perUnit });
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const pricing = { ...product.pricing };
      for (const row of toApply) pricing[row.tier!] = row.price;
      await saveProduct({ id: product.id, pricing });
      reloadOrg();
      toast.success('Prices updated', `${product.name} now sells at the prices from this costing.`);
      setConfirm(null);
    } catch (err) {
      toast.error('Prices not updated', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    setBusy(true);
    try {
      await deleteCostSheet(draft.id);
      toast.success('Costing deleted');
      setConfirm(null);
      onDeleted();
    } catch (err) {
      toast.error('Not deleted', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={draft.id ? draft.name || 'Costing' : 'New costing'}>
      <div className="space-y-6">
        {/* what is being costed */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Product" hint="Link a product to see its current prices against this cost, and to write new prices onto it.">
            <Select
              value={draft.productId ?? ''}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                patch({
                  productId: p?.id,
                  productName: p?.name,
                  unit: p?.unit,
                  name: draft.name && draft.name !== draft.productName ? draft.name : (p?.name ?? draft.name),
                });
              }}
            >
              <option value="">Not linked to a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name" hint="So you can find it again, for example the shipment or container number.">
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={draft.productName || 'Container 12, March'}
            />
          </Field>
          <Field label={`Quantity (${unitWord}s)`} required hint="How many units all the costs below cover. The total is divided by this.">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.quantity || ''}
              onChange={(e) => patch({ quantity: Number(e.target.value) })}
              placeholder="0"
            />
          </Field>
        </section>

        {/* the costs */}
        <section>
          <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Costs</h3>
          <ul className="space-y-2">
            {draft.costs.map((line) => (
              <li key={line.id} className="rounded-xl border border-hairline surface-card p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={line.label}
                    onChange={(e) => setCost(line.id, { label: e.target.value })}
                    placeholder="What it is"
                    aria-label="Cost name"
                    className="font-semibold"
                  />
                  <IconButton
                    label={`Remove ${line.label || 'this cost'}`}
                    onClick={() => patch({ costs: draft.costs.filter((c) => c.id !== line.id) })}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={line.amount || ''}
                    onChange={(e) => setCost(line.id, { amount: Number(e.target.value) })}
                    placeholder="0"
                    aria-label={`${line.label} amount`}
                    leading={<span className="text-[13px]">{CURRENCY_SIGN[line.currency]}</span>}
                  />
                  <Select
                    value={line.currency}
                    aria-label="Currency"
                    onChange={(e) => setCost(line.id, { currency: e.target.value as Currency })}
                    className="w-[88px]"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={line.per}
                    aria-label="Total or per unit"
                    onChange={(e) => setCost(line.id, { per: e.target.value as 'total' | 'unit' })}
                    className="w-[124px]"
                  >
                    <option value="total">For all</option>
                    <option value="unit">Per {unitWord}</option>
                  </Select>
                </div>
                {(line.currency !== 'NGN' || line.per === 'unit') && (
                  <p className="tabular mt-1.5 text-right text-[12px] text-muted">
                    {naira(costInNaira(line, draft), true)} in all
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            icon={<Plus size={15} />}
            onClick={() =>
              patch({ costs: [...draft.costs, { id: newId(), label: '', amount: 0, currency: 'NGN', per: 'total' }] })
            }
          >
            Add a cost
          </Button>

          {foreign.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {foreign.map((c) => (
                <Field key={c} label={`Rate: ₦ per 1 ${c}`} required>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={draft.rates[c] || ''}
                    onChange={(e) => patch({ rates: { ...draft.rates, [c]: Number(e.target.value) } })}
                    placeholder="0"
                    leading={<span className="text-[13px]">₦</span>}
                  />
                </Field>
              ))}
            </div>
          )}
        </section>

        {/* the answer */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-hairline surface-sunken p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total landed cost</p>
            <p className="tabular mt-1 text-[22px] font-extrabold text-primary">{naira(total, true)}</p>
          </div>
          <div className="rounded-2xl border border-brand-500/40 bg-brand-50/60 p-4 dark:bg-brand-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Landed cost per {unitWord}</p>
            <p className="tabular mt-1 text-[22px] font-extrabold text-primary">
              {quantity > 0 ? naira(perUnit, true) : 'Add a quantity'}
            </p>
            {quantity > 0 && (
              <p className="tabular mt-0.5 text-[12px] text-muted">
                {naira(total, true)} ÷ {count(quantity)}
              </p>
            )}
          </div>
        </section>

        {foreign.some((c) => !(draft.rates[c] ?? 0)) && (
          <Alert tone="warning" title="A rate is missing">
            Costs in {foreign.filter((c) => !(draft.rates[c] ?? 0)).join(' and ')} count as nothing until you type the
            exchange rate.
          </Alert>
        )}

        {/* selling prices */}
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Selling prices</h3>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                size="sm"
                value={draft.basis}
                onChange={(basis) => patch({ basis })}
                options={[
                  { value: 'markup', label: 'Markup on cost' },
                  { value: 'margin', label: 'Margin on price' },
                ]}
              />
              <Select
                value={String(draft.roundTo)}
                aria-label="Round prices up"
                onChange={(e) => patch({ roundTo: Number(e.target.value) })}
                className="h-9 w-[150px] text-[13px]"
              >
                {ROUNDING.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? 'No rounding' : `Round up to ₦${count(r)}`}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="mb-3 text-[12px] leading-snug text-muted">
            {draft.basis === 'markup'
              ? 'Markup adds the percent to your cost: 50% on ₦1,000 sells at ₦1,500.'
              : 'Margin is the share of the selling price that is profit: 50% on ₦1,000 sells at ₦2,000.'}
          </p>

          <div className="surface-card overflow-hidden rounded-2xl border border-hairline">
            {prices.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-3 border-b border-hairline px-3 py-3 last:border-0">
                <div className="w-[96px]">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={Number.isFinite(row.percent) ? row.percent : ''}
                    onChange={(e) => setMargin(row.id, { percent: Number(e.target.value) })}
                    aria-label="Percent"
                    trailing={<span className="text-[13px] text-muted">%</span>}
                  />
                </div>
                <div className="min-w-[120px] flex-1">
                  <p className="tabular text-[16px] font-extrabold text-primary">
                    {row.price > 0 ? naira(row.price, true) : 'None'}
                  </p>
                  {row.price > 0 && (
                    <p className="tabular text-[11.5px] text-muted">
                      {naira(row.price - perUnit, true)} profit per {unitWord}
                      {quantity > 0 ? ` · ${naira((row.price - perUnit) * quantity)} on all ${count(quantity)}` : ''}
                    </p>
                  )}
                  {draft.basis === 'margin' && row.percent >= 100 && (
                    <p className="text-[11.5px] text-status-critical">A margin must be under 100%.</p>
                  )}
                </div>
                <Select
                  value={row.tier ?? ''}
                  aria-label="Use for tier"
                  onChange={(e) => setMargin(row.id, { tier: (e.target.value || undefined) as PriceTier | undefined })}
                  className="h-9 w-[150px] text-[13px]"
                  disabled={!draft.productId}
                >
                  <option value="">Not for a tier</option>
                  {PRICE_TIERS.map((t) => (
                    <option key={t} value={t}>
                      Use for {t}
                    </option>
                  ))}
                </Select>
                <IconButton
                  label="Remove this margin"
                  onClick={() => patch({ margins: draft.margins.filter((m) => m.id !== row.id) })}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            icon={<Plus size={15} />}
            onClick={() => patch({ margins: [...draft.margins, { id: newId(), percent: 30 }] })}
          >
            Add a margin
          </Button>
        </section>

        {/* the product's prices today, against this cost */}
        {product && perUnit > 0 && (
          <section>
            <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {product.name}: prices today
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRICE_TIERS.map((tier) => {
                const price = product.pricing[tier];
                const e = earns(perUnit, price ?? 0);
                const below = typeof price === 'number' && price < perUnit;
                return (
                  <div key={tier} className="rounded-xl border border-hairline px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {tier} ({TIER_LABEL[tier]})
                    </p>
                    {typeof price === 'number' ? (
                      <>
                        <p className="tabular mt-0.5 text-[15px] font-bold text-primary">{naira(price, true)}</p>
                        <p className={`tabular text-[11.5px] ${below ? 'font-semibold text-status-critical' : 'text-muted'}`}>
                          {below
                            ? `Below cost by ${naira(perUnit - price, true)}`
                            : `${e.markup.toFixed(1)}% markup · ${e.margin.toFixed(1)}% margin`}
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-[12px] text-muted">Not priced</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Field label="Note" hint="Optional">
          <Textarea rows={2} value={draft.note ?? ''} onChange={(e) => patch({ note: e.target.value })} />
        </Field>

        {/* actions */}
        <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 border-t border-hairline surface-card px-5 pb-safe-4 pt-3 shadow-[0_-10px_24px_-18px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Save size={15} />} loading={busy} onClick={() => void save()}>
              Save costing
            </Button>
            {product && (
              <Button
                variant="outline"
                icon={<Upload size={15} />}
                disabled={busy || toApply.length === 0}
                onClick={() => setConfirm('apply')}
              >
                Apply prices to product
              </Button>
            )}
            {draft.id && (
              <Button variant="ghost" className="ml-auto" disabled={busy} onClick={() => setConfirm('delete')}>
                Delete
              </Button>
            )}
          </div>
          {product && toApply.length === 0 && (
            <p className="mt-2 text-[12px] leading-snug text-muted">
              To write prices onto {product.name}, pick a tier beside a margin (Use for OT, MT or SA).
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'apply'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void apply()}
        loading={busy}
        title={`Update ${product?.name ?? 'product'} prices?`}
        confirmLabel="Update prices"
        message={
          <span className="block space-y-1">
            {toApply.map((row) => (
              <span key={row.id} className="block">
                <Badge tone="brand">{row.tier}</Badge>{' '}
                {typeof product?.pricing[row.tier!] === 'number' ? `${naira(product.pricing[row.tier!]!, true)} to ` : ''}
                <strong>{naira(row.price, true)}</strong>
              </span>
            ))}
            <span className="block pt-1 text-[12.5px] text-muted">
              New orders use these prices. Orders already raised keep the price they were raised at.
            </span>
          </span>
        }
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void remove()}
        loading={busy}
        tone="danger"
        title="Delete this costing?"
        confirmLabel="Delete"
        message="It goes for good. Product prices already set from it stay as they are."
      />
    </Drawer>
  );
}
