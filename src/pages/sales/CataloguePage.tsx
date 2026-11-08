/**
 * Catalogue: what is for sale, at YOUR price.
 *
 * The same products as the Products screen and a completely different job. That
 * one is an administrator maintaining a price list; this is a distributor
 * deciding what to buy, and they must see exactly one price: their own tier's.
 * Showing all three would tell every customer what their competitors pay, which
 * in Nigerian FMCG distribution is the single most sensitive number in the
 * business.
 *
 * So the tier comes from the signed-in account, not from a control on the page,
 * and there is no way to change it here.
 *
 * IT IS A CATALOGUE, SO IT HAS PICTURES
 *
 * The physical thing this replaces is a printed brochure that a rep carries to
 * a meeting and a customer flicks through on the other side of a desk. Before
 * the pictures, nobody used this screen that way: a customer who asked what a
 * line looked like got a member of staff photographing a carton in the store
 * with their own phone, and what reached the customer was a badly-lit picture
 * of somebody's shelf. Gallery view is the brochure. List view is the price
 * list, which is what the same rep wants on the phone the next morning when
 * they already know the products and are reading down for a number.
 *
 * Which of the two is a personal habit rather than a company policy, so the
 * choice is remembered per browser and never asked about again.
 */

import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid, List, Package, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, SearchInput, SegmentedControl, Select } from '@/components/ui';
import { ProductShot } from '@/components/catalogue/ProductShot';
import { ProductSheet } from '@/components/catalogue/ProductSheet';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { naira, count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import { cn } from '@/lib/cn';
import { PRICE_TIERS, TIER_LABEL, type PriceTier, type Product } from '@/types';

type View = 'gallery' | 'list';

const VIEW_KEY = 'afterbi:catalogue-view';

/* Read once, at first render. A wrapped read because a locked-down browser
   throws on localStorage rather than returning null, and a catalogue that
   will not open because of a view preference is a bad trade. */
function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'gallery';
  } catch {
    return 'gallery';
  }
}

/** The catalogue's subtitle for a partner, one whole sentence per price tier. */
const AT_YOUR_PRICE: Record<PriceTier, string> = {
  OT: 'Everything available to you, at your open trade price.',
  MT: 'Everything available to you, at your modern trade price.',
  SA: 'Everything available to you, at your service account price.',
};

export default function CataloguePage() {
  const { user } = useAuth();
  const { products } = useOrg();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [view, setViewState] = useState<View>(storedView);
  const [open, setOpen] = useState<Product | null>(null);

  const setView = useCallback((next: View) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* Private mode, or a quota that is already full. The choice simply does
         not survive the session, which nobody will notice. */
    }
  }, []);

  /*
   * Whose price are we showing?
   *
   * A distributor or their rep: their own account's tier, fixed. Anybody
   * internal: a chooser, because an admin looking at the catalogue is usually
   * answering "what would this cost an MT account" on the phone.
   */
  /* A distributor sees its own tier; a rep covering several accounts sees them all. */
  const ownTier = user?.role === 'distributor' ? user.distributorCategory : undefined;
  const [tier, setTier] = useState<PriceTier>(ownTier ?? 'OT');
  const locked = Boolean(ownTier);
  const shown = locked ? ownTier! : tier;

  /* Everything priced for this tier, before the search and the category pill:
     the pill counts have to be the counts of the whole catalogue, or picking
     one would change the number printed on it. */
  const priced = useMemo(
    () =>
      products.filter(
        (product) => product.status === 'active' && typeof product.pricing[shown] === 'number',
      ),
    [products, shown],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of priced) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [priced]);

  /*
   * ONE GRID, NOT A STACK OF CATEGORY SECTIONS.
   *
   * This screen used to print a heading per category. That was right when the
   * headings were the only way to tell one group from another, and wrong the
   * moment the pills above arrived: the pills already say what the categories
   * are and already filter to one, so the headings became a second, worse
   * copy of the same control. They also wrecked the grid. A real catalogue is
   * thirteen fans and one neck strap, so grouping produced one tidy block
   * followed by four sections holding a single card each, every one of them a
   * full card-height row with three empty columns beside it.
   *
   * Sorting by category and then by name keeps related products touching,
   * which is all the grouping was really buying, and the grid stays full.
   */
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return priced
      .filter(
        (product) =>
          (category === 'all' || product.category === category) &&
          (!needle ||
            product.name.toLowerCase().includes(needle) ||
            product.category.toLowerCase().includes(needle) ||
            (product.sku ?? '').toLowerCase().includes(needle)),
      )
      .sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      );
  }, [priced, category, search]);

  const root = user ? PORTAL_ROOT[user.role] : '/';
  /* A distributor browses and orders; everyone else may be looking it up on
     somebody's behalf, and the sheet's order button is still correct for them. */
  const orderHref = user ? `${root}/orders?new=1` : undefined;

  return (
    <div>
      <PageHeader
        title="Catalogue"
        description={
          locked
            ? AT_YOUR_PRICE[shown]
            : 'Everything for sale, at the tier you choose.'
        }
        actions={
          <Link
            to={`${root}/orders?new=1`}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-900 px-3 text-label font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
          >
            <ShoppingCart size={15} />
            New order
          </Link>
        }
      >
        <div className="space-y-3">
          {/*
            One row on a desktop; two on a phone, where three controls will
            not fit across 342 points. `sm:contents` dissolves the inner
            wrapper at that width so the tier and the toggle become children
            of the same row as the search box, and `sm:ml-auto` can then push
            the toggle to the far end of it.
 */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Find a product…"
              className="sm:max-w-xs"
            />

            <div className="flex items-center gap-2.5 sm:contents">
              {!locked && (
                <Select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as PriceTier)}
                  className="min-w-0 flex-1 sm:max-w-[220px] sm:flex-none"
                  aria-label="Price tier"
                >
                  {[...PRICE_TIERS].map((t) => (
                    <option key={t} value={t}>
                      {t} ({TIER_LABEL[t]})
                    </option>
                  ))}
                </Select>
              )}
              {locked && <Badge tone="brand">{TIER_LABEL[shown]}</Badge>}

              {/* Pushed to the far end: it changes how the page looks, not
                  what is on it, so it does not belong among the filters. */}
              <SegmentedControl<View>
                className="ml-auto shrink-0"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: 'gallery', label: 'Gallery', icon: <LayoutGrid size={14} /> },
                  { value: 'list', label: 'List', icon: <List size={14} /> },
                ]}
              />
            </div>
          </div>

          {/* Two categories is a catalogue with two sections, not something
              that needs filtering down. */}
          {categories.length > 2 && (
            <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <CategoryPill
                label="All"
                tally={priced.length}
                active={category === 'all'}
                onClick={() => setCategory('all')}
              />
              {categories.map(([name, tally]) => (
                <CategoryPill
                  key={name}
                  label={name}
                  tally={tally}
                  active={category === name}
                  onClick={() => setCategory(name)}
                />
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title={search || category !== 'all' ? 'Nothing matches that' : 'Nothing priced'}
          description={
            search || category !== 'all'
              ? 'Try a different product name, or another category.'
              : 'No active product carries a price for this tier yet.'
          }
        />
      ) : (
        <>
          {view === 'gallery' ? (
            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {rows.map((product) => (
                <GalleryCard
                  key={product.id}
                  product={product}
                  tier={shown}
                  onOpen={() => setOpen(product)}
                />
              ))}
            </ul>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
              {rows.map((product, index) => (
                <ListRow
                  key={product.id}
                  product={product}
                  tier={shown}
                  first={index === 0}
                  onOpen={() => setOpen(product)}
                />
              ))}
            </ul>
          )}

          {/* A catalogue that runs off the bottom of the screen should say how
              much of it there was, the way the last page of a brochure does. */}
          <p className="mt-4 text-caption text-muted">
            {category === 'all'
              ? rows.length === 1
                ? '1 product'
                : `${count(rows.length)} products`
              : rows.length === 1
                ? `1 product in ${category}`
                : `${count(rows.length)} products in ${category}`}
          </p>
        </>
      )}

      <ProductSheet
        product={open}
        tier={shown}
        orderHref={orderHref}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function CategoryPill({
  label,
  tally,
  active,
  onClick,
}: {
  label: string;
  tally: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-950'
          : 'border-hairline surface-card text-secondary hover:text-primary hover:border-[var(--border-strong)]',
      )}
    >
      {label}
      <span
        className={cn(
          'tabular rounded-full px-1.5 text-micro font-semibold',
          active ? 'bg-white/20 dark:bg-brand-950/20' : 'surface-sunken text-muted',
        )}
      >
        {tally}
      </span>
    </button>
  );
}

/**
 * The brochure card.
 *
 * The picture is the largest thing on it and the price is the second largest,
 * which is the order somebody browsing actually reads in. It is one button
 * rather than a card with a button on it: the whole tile is the target, which
 * matters most on the phone this is mostly used on.
 */
function GalleryCard({
  product,
  tier,
  onOpen,
}: {
  product: Product;
  tier: PriceTier;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group surface-card flex h-full w-full flex-col overflow-hidden rounded-2xl border border-hairline text-left shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <ProductShot
          src={product.imageUrl}
          alt={product.name}
          width={420}
          className="aspect-[4/3] w-full border-b border-hairline"
          rounded="rounded-none"
          imgClassName="p-4 transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <div className="flex flex-1 flex-col p-4">
          <p className="text-body font-semibold leading-tight text-primary">{product.name}</p>
          <p className="mt-0.5 text-caption text-muted">
            {product.unit}
            {product.sku ? ` · ${product.sku}` : ''}
          </p>

          {/* mt-auto pins the price to the bottom, so a row of cards whose
              names wrap to two lines still has its prices on one line. */}
          <p className="tabular mt-auto pt-3 text-heading font-bold text-primary">
            {naira(product.pricing[tier]!)}
          </p>
          {product.moq > 1 && (
            <p className="mt-1 text-caption text-muted">{`Minimum order ${count(product.moq)}`}</p>
          )}
        </div>
      </button>
    </li>
  );
}

/**
 * The price-list row.
 *
 * Still carries a thumbnail, because the point of recognising a product by
 * sight does not go away when the rep is in a hurry, but at a size that lets
 * twelve of them fit on a phone screen instead of three.
 */
function ListRow({
  product,
  tier,
  first,
  onOpen,
}: {
  product: Product;
  tier: PriceTier;
  first: boolean;
  onOpen: () => void;
}) {
  return (
    <li className={first ? undefined : 'border-t border-hairline'}>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:bg-[var(--surface-sunken)] sm:px-4"
      >
        <ProductShot
          src={product.imageUrl}
          alt=""
          width={56}
          className="h-12 w-12 shrink-0 border border-hairline sm:h-14 sm:w-14"
          rounded="rounded-lg"
          imgClassName="p-1"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-primary">{product.name}</p>
          <p className="truncate text-caption text-muted">
            {product.unit}
            {product.sku ? ` · ${product.sku}` : ''}
            {product.moq > 1 ? ` · min ${count(product.moq)}` : ''}
          </p>
        </div>

        <p className="tabular shrink-0 text-title font-bold text-primary">
          {naira(product.pricing[tier]!)}
        </p>
      </button>
    </li>
  );
}
