/**
 * Products: the catalogue itself.
 *
 * THE THREE PRICES ARE THE SCREEN
 *
 * Everything else about a product is a label. The three tier prices are what
 * every order, invoice and margin report resolves against, so they get their
 * own columns rather than hiding in an edit dialog: an administrator has to be
 * able to scan the list and see that somebody has left the MT price off the new
 * SKU, because the first time they find out otherwise is a rep saying "it is
 * not in the catalogue" for a product that plainly is.
 *
 * A product is retired, never deleted. See `retireProduct` in db.ts.
 */

import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, DataTable, Field, Hint, Input, Modal, SearchInput, SegmentedControl, Select, Textarea, type Column, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_ROOT } from '@/lib/tiles';
import { LinkButton } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { listProducts, retireProduct, saveProduct } from '@/lib/db';
import { naira, count } from '@/lib/format';
import { PRICE_TIERS, TIER_LABEL, type PriceTier, type Product } from '@/types';

const BLANK: Partial<Product> = {
  name: '',
  category: '',
  unit: 'Per carton',
  sku: '',
  pricing: {},
  moq: 1,
  status: 'active',
};

export default function ProductsPage() {
  const { reload: reloadOrg } = useOrg();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'active' | 'all'>('active');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data, loading, reload } = useAsync(() => listProducts(), [], { handleError: true });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter((product) => {
      if (view === 'active' && product.status !== 'active') return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.sku ?? '').toLowerCase().includes(needle) ||
        product.category.toLowerCase().includes(needle)
      );
    });
  }, [data, search, view]);

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-primary">{row.name}</p>
          <p className="truncate text-[12px] text-muted">
            {row.category}
            {row.sku ? ` · ${row.sku}` : ''} · {row.unit}
          </p>
        </div>
      ),
    },
    ...PRICE_TIERS.map<Column<Product>>((tier) => ({
      key: tier,
      header: tier,
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.pricing[tier] ?? -1,
      cell: (row) =>
        typeof row.pricing[tier] === 'number' ? (
          <span className="tabular text-[13px] text-primary">{naira(row.pricing[tier]!)}</span>
        ) : (
          /*
            An unpriced tier is stated, not left blank.

            A blank cell reads as zero and zero is a price. "Not priced" is the
            honest version and it is also the actionable one: that tier cannot
            order this product at all until somebody fills it in.
          */
          <span className="text-[11.5px] text-muted">not priced</span>
        ),
    })),
    {
      key: 'moq',
      header: 'MOQ',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.moq,
      cell: (row) => <span className="tabular text-[13px] text-muted">{count(row.moq)}</span>,
    },
    {
      key: 'status',
      header: '',
      cell: (row) =>
        row.status === 'active' ? null : <Badge tone="neutral">Retired</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="The catalogue itself: names, units, the three price tiers, minimum order."
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing({ ...BLANK })}>
            New product
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Name, SKU or category…"
            className="max-w-xs"
          />
          <SegmentedControl
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'all', label: 'Including retired' },
            ]}
          />
        </div>
      </PageHeader>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) => setEditing(row)}
        loading={loading}
        emptyIcon={<Package size={22} />}
        emptyTitle={search ? 'Nothing matches that' : 'No products yet'}
        emptyDescription={
          search ? 'Try a different name or SKU.' : 'Add the first one and it will appear here.'
        }
      />

      <ProductModal
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          /* The catalogue is shared through OrgContext, so the order screen has
             to hear about a new product too: otherwise a rep cannot order what
             an administrator just added until they reload the whole app. */
          reloadOrg();
          toast.success('Product saved');
        }}
        onRetired={() => {
          setEditing(null);
          reload();
          reloadOrg();
          toast.success('Product retired', 'It stays on every past order.');
        }}
      />
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSaved,
  onRetired,
}: {
  product: Partial<Product> | null;
  onClose: () => void;
  onSaved: () => void;
  onRetired: (product: Partial<Product>) => void;
}) {
  const { user } = useAuth();
  const root = user ? PORTAL_ROOT[user.role] : '';
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<Product>>(product ?? BLANK);
  const [busy, setBusy] = useState(false);

  /* Re-seed when a different product is opened. Without this the dialog keeps
     the previous product's values, which is how one product's price ends up on
     another. */
  const [seed, setSeed] = useState(product?.id);
  if (product && product.id !== seed) {
    setSeed(product.id);
    setDraft(product);
  }

  if (!product) return null;

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setPrice = (tier: PriceTier, raw: string) =>
    setDraft((current) => {
      const pricing = { ...(current.pricing ?? {}) };
      if (raw.trim() === '') delete pricing[tier];
      else pricing[tier] = Number(raw);
      return { ...current, pricing };
    });

  const save = async () => {
    if (!draft.name?.trim()) {
      toast.warning('A product needs a name');
      return;
    }
    setBusy(true);
    try {
      await saveProduct({
        ...draft,
        name: draft.name.trim(),
        category: draft.category?.trim() || 'Uncategorised',
        moq: Math.max(1, Number(draft.moq) || 1),
      });
      onSaved();
    } catch (err) {
      toast.error('Not saved', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? draft.name || 'Product' : 'New product'}
      size="lg"
      footer={
        <>
          {draft.id && draft.status === 'active' && (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={busy}
              onClick={async () => {
                await retireProduct(draft.id!);
                onRetired(draft);
              }}
            >
              Retire
            </Button>
          )}
          {draft.id && draft.status === 'active' && root && (
            <LinkButton to={`${root}/stock?add=${draft.id}`} variant="outline">
              Add to a depot
            </LinkButton>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="SKU" hint="Optional">
            <Input value={draft.sku ?? ''} onChange={(e) => set('sku', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" required>
            <Input
              value={draft.category ?? ''}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Beverages"
            />
          </Field>
          <Field label="Unit" required hint="What one counts">
            <Input
              value={draft.unit ?? ''}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="Per carton"
            />
          </Field>
          <Field label="Minimum order">
            <Input
              type="number"
              min={1}
              value={draft.moq ?? 1}
              onChange={(e) => set('moq', Number(e.target.value))}
            />
          </Field>
        </div>

        <fieldset>
          {/*
            Leaving one blank is a real choice, not an oversight, and the hint
            says so. A product that only modern trade carries should have no OT
            price: and `NewOrderDrawer` will then correctly refuse to sell it
            to an OT distributor rather than selling it at zero.
 */}
          <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-secondary">
            Price by tier
            <Hint label="About tier pricing">
              Leave a tier blank and that tier cannot order this product at all. That is usually what
              you want for a line only one channel carries.
            </Hint>
          </legend>

          <div className="grid gap-3 sm:grid-cols-3">
            {PRICE_TIERS.map((tier) => (
              <Field key={tier} label={`${tier} (${TIER_LABEL[tier]})`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={draft.pricing?.[tier] ?? ''}
                  onChange={(e) => setPrice(tier, e.target.value)}
                  placeholder="0"
                  leading={<span className="text-[13px]">₦</span>}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <Field label="Description" hint="Optional">
          <Textarea
            rows={2}
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {draft.id && (
          <Field label="Status">
            <Select
              value={draft.status ?? 'active'}
              onChange={(e) => set('status', e.target.value as Product['status'])}
            >
              <option value="active">Active (in the catalogue)</option>
              <option value="inactive">Retired (off the catalogue, kept on history)</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
