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
import { Package, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, DataTable, Field, Hint, Input, Modal, SearchInput, SegmentedControl, Select, Switch, Textarea, type Column, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_ROOT } from '@/lib/tiles';
import { LinkButton } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { listProducts, retireProduct, saveProduct } from '@/lib/db';
import { naira, count } from '@/lib/format';
import { cloudinaryConfigured } from '@/lib/cloudinary';
import { ImagePicker } from '@/components/ImagePicker';
import { GalleryManager } from '@/components/GalleryManager';
import { ProductShot } from '@/components/catalogue/ProductShot';
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
      /*
         The thumbnail is here as much for what is MISSING as for what is
         there. An administrator maintaining the catalogue needs to see at a
         glance which lines a rep cannot show a customer, and a column of
         pictures with three grey gaps in it says that faster than any status
         badge would. Services get no frame: there is nothing to photograph.
 */
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {/* A service keeps the space but not the frame. Dropping the column
              entirely slid its name left and broke the one alignment that
              makes a column of thumbnails readable as a column. */}
          {row.service ? (
            <span className="h-10 w-10 shrink-0" aria-hidden />
          ) : (
            <ProductShot
              src={row.imageUrl}
              alt=""
              width={40}
              className="h-10 w-10 shrink-0 border border-hairline"
              rounded="rounded-lg"
              imgClassName="p-0.5"
            />
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-body font-semibold text-primary">
              <span className="truncate">{row.name}</span>
              {row.service && <Badge tone="info">Service</Badge>}
            </p>
            <p className="truncate text-caption text-muted">
              {row.category}
              {row.sku ? ` · ${row.sku}` : ''} · {row.unit}
            </p>
          </div>
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
          <span className="tabular text-label text-primary">{naira(row.pricing[tier]!)}</span>
        ) : (
          /*
            An unpriced tier is stated, not left blank.

            A blank cell reads as zero and zero is a price. "Not priced" is the
            honest version and it is also the actionable one: that tier cannot
            order this product at all until somebody fills it in.
          */
          <span className="text-caption text-muted">not priced</span>
        ),
    })),
    {
      key: 'moq',
      header: 'MOQ',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.moq,
      cell: (row) => <span className="tabular text-label text-muted">{count(row.moq)}</span>,
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
        packSize: draft.packSize?.trim() ?? '',
        brand: draft.brand?.trim() ?? '',
        barcode: draft.barcode?.trim() ?? '',
        salesNote: draft.salesNote?.trim() ?? '',
        /* Blank lines and half-filled rows are dropped rather than saved as noise. */
        features: (draft.features ?? []).map((f) => f.trim()).filter(Boolean).slice(0, 12),
        specs: (draft.specs ?? []).map((x) => ({ label: x.label.trim(), value: x.value.trim() })).filter((x) => x.label && x.value).slice(0, 16),
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
          {draft.id && root && (
            <LinkButton to={`${root}/costing?product=${draft.id}`} variant="outline">
              Work out prices
            </LinkButton>
          )}
          {draft.id && draft.status === 'active' && root && !draft.service && (
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
          <legend className="mb-2 flex items-center gap-1.5 text-label font-semibold text-secondary">
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
                  leading={<span className="text-label">₦</span>}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-hairline surface-sunken px-4 py-3">
          <Switch
            checked={Boolean(draft.service)}
            onChange={(next) => set('service', next)}
            label="Service, not stocked"
            description={
              draft.service
                ? 'Like Logistics: no quantity, never in stock, always orderable.'
                : 'Goods: counted in stock and checked when an order is fulfilled.'
            }
            hint="Turn this on for Logistics, delivery or any charge that is not goods. It never counts in inventory or stock value, is never checked or deducted when an order is fulfilled, and can always be added to an order. Whoever raises the order types its price and a note on the line (for example Lagos to Kano). Tier prices above are optional for a service: if set, they are the starting price."
          />
        </div>

        <Field label="Description" hint="Optional">
          <Textarea
            rows={2}
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {/*
          The details a rep is asked for after the price. All optional; the
          product sheet shows only what is filled, so an empty field costs
          nothing on screen.
        */}
        {!draft.service && (
          <fieldset className="space-y-4 rounded-xl border border-hairline surface-sunken px-4 py-3.5">
            <legend className="flex items-center gap-1.5 px-1 text-label font-semibold text-secondary">
              Product details
              <Hint label="About product details">
                What a sales rep is asked after the price. Everything here appears on the product sheet in the catalogue,
                except the sales note, which is folded away because that sheet is shown to customers.
              </Hint>
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Pack size" hint="As people say it">
                <Input value={draft.packSize ?? ''} onChange={(e) => set('packSize', e.target.value)} placeholder="144 pcs per CTN" />
              </Field>
              <Field label="Brand">
                <Input value={draft.brand ?? ''} onChange={(e) => set('brand', e.target.value)} />
              </Field>
              <Field label="Barcode" hint="EAN or UPC">
                <Input value={draft.barcode ?? ''} inputMode="numeric" onChange={(e) => set('barcode', e.target.value)} />
              </Field>
            </div>
            <Field label="Features" hint="One per line">
              <Textarea
                rows={4}
                value={(draft.features ?? []).join('\n')}
                onChange={(e) => set('features', e.target.value.split('\n'))}
                placeholder={'Three speed settings\nUSB rechargeable, 6 hours a charge\nFolds flat for a handbag'}
              />
            </Field>
            <SpecsEditor value={draft.specs ?? []} onChange={(specs) => set('specs', specs)} />
            <Field label="Sales note" hint="For staff, folded away">
              <Textarea
                rows={2}
                value={draft.salesNote ?? ''}
                onChange={(e) => set('salesNote', e.target.value)}
                placeholder="Sells fastest in March to May. Pair with the desk fan for supermarkets."
              />
            </Field>
          </fieldset>
        )}

        {/*
          PICTURES ARE A SALES TOOL, NOT DECORATION.

          Before this, a rep standing in front of a customer who asked "what
          does it look like" reached for their own phone and a photograph
          taken in somebody's shop two months ago. The cover set here is what
          the catalogue card shows and what gets shown across a desk; the rest
          are the angles that answer the second question.

          A service has nothing to photograph, so the whole section folds away
          rather than offering a frame that will stay empty forever.
 */}
        {!draft.service && (
          <fieldset className="rounded-xl border border-hairline surface-sunken px-4 py-3.5">
            <legend className="flex items-center gap-1.5 px-1 text-label font-semibold text-secondary">
              Pictures
              <Hint label="About product pictures">
                The cover is the one the catalogue shows, so make it the clearest shot of the
                product on its own. The others are opened from the product sheet, which is what a
                member of staff turns round to show a customer: use them for the back of the pack,
                the colourways, or the item in use. Photographs are resized on delivery, so a
                customer on a phone never downloads the full file.
              </Hint>
            </legend>

            <div className="mt-3 grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
              <ImagePicker
                value={draft.imageUrl}
                onChange={(url) => set('imageUrl', url)}
                kind="product"
                label="Cover"
                size={150}
                height={118}
                fill
                quiet
                placeholder="Cover shot"
              />

              <div>
                <p className="mb-2 text-micro font-semibold uppercase tracking-[0.1em] text-muted">
                  More shots
                </p>
                <GalleryManager
                  value={draft.images ?? []}
                  onChange={(urls) => set('images', urls)}
                  kind="product"
                  noun="product"
                  aspect="4 / 3"
                  quiet
                />
              </div>
            </div>

            {/* Said once for the whole section, not once per control: it is a
                fact about the deployment, not about either box. */}
            {!cloudinaryConfigured && (
              <p className="mt-3 text-caption leading-relaxed text-muted">
                Picture uploads are not set up on this deployment yet. Add{' '}
                <code className="break-all font-mono text-micro">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
                <code className="break-all font-mono text-micro">VITE_CLOUDINARY_UPLOAD_PRESET</code>, then
                redeploy. Pictures already saved still show everywhere.
              </p>
            )}
          </fieldset>
        )}

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

/** Label and value rows: Colour Blue, Battery 1200mAh, Warranty 6 months. */
function SpecsEditor({
  value,
  onChange,
}: {
  value: { label: string; value: string }[];
  onChange: (next: { label: string; value: string }[]) => void;
}) {
  /* Always one empty row on the end, so adding a spec is just typing. */
  const rows = value.length && !value[value.length - 1].label && !value[value.length - 1].value ? value : [...value, { label: '', value: '' }];
  const put = (index: number, key: 'label' | 'value', text: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: text } : row)));
  return (
    <div>
      <p className="mb-1.5 text-label font-semibold text-secondary">Specifications</p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2">
            <Input aria-label="Specification" value={row.label} onChange={(e) => put(index, 'label', e.target.value)} placeholder="Colour" />
            <Input aria-label="Value" value={row.value} onChange={(e) => put(index, 'value', e.target.value)} placeholder="Blue, pink, white" />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove"
              disabled={!row.label && !row.value}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <X size={15} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
