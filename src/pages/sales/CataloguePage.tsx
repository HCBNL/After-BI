/**
 * Catalogue — what is for sale, at YOUR price.
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
 */

import { useMemo, useState } from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, SearchInput, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { naira, count } from '@/lib/format';
import { PORTAL_ROOT } from '@/lib/tiles';
import { TIER_LABEL, type PriceTier } from '@/types';

export default function CataloguePage() {
  const { user } = useAuth();
  const { products } = useOrg();
  const [search, setSearch] = useState('');

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

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        product.status === 'active' &&
        typeof product.pricing[shown] === 'number' &&
        (!needle ||
          product.name.toLowerCase().includes(needle) ||
          product.category.toLowerCase().includes(needle)),
    );
  }, [products, shown, search]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    for (const product of rows) {
      const list = groups.get(product.category) ?? [];
      list.push(product);
      groups.set(product.category, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const root = user ? PORTAL_ROOT[user.role] : '/';

  return (
    <div>
      <PageHeader
        title="Catalogue"
        description={
          locked
            ? `Everything available to you, at your ${TIER_LABEL[shown].toLowerCase()} price.`
            : 'Everything for sale, at the tier you choose.'
        }
        actions={
          <Link
            to={`${root}/orders?new=1`}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
          >
            <ShoppingCart size={15} />
            New order
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Find a product…"
            className="max-w-xs"
          />
          {!locked && (
            <Select
              value={tier}
              onChange={(e) => setTier(e.target.value as PriceTier)}
              className="max-w-[220px]"
              aria-label="Price tier"
            >
              {(['OT', 'MT', 'SEP'] as PriceTier[]).map((t) => (
                <option key={t} value={t}>
                  {t} — {TIER_LABEL[t]}
                </option>
              ))}
            </Select>
          )}
          {locked && <Badge tone="brand">{TIER_LABEL[shown]}</Badge>}
        </div>
      </PageHeader>

      {byCategory.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title={search ? 'Nothing matches that' : 'Nothing priced for this tier'}
          description={
            search
              ? 'Try a different product name.'
              : 'No active product carries a price for this tier yet.'
          }
        />
      ) : (
        <div className="space-y-6">
          {byCategory.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                {category} · {count(items.length)}
              </h2>

              {/*
                Cards, not a table.

                A catalogue is browsed, not scanned — the question is "what do I
                want" rather than "where is the row I came for". Cards give the
                price room to be the largest thing on each one, which is what a
                buyer is actually reading.
              */}
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <li
                    key={product.id}
                    className="surface-card rounded-2xl border border-hairline p-4 shadow-card"
                  >
                    <p className="text-[14px] font-bold leading-tight text-primary">{product.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {product.unit}
                      {product.sku ? ` · ${product.sku}` : ''}
                    </p>
                    <p className="tabular mt-3 text-[20px] font-extrabold text-primary">
                      {naira(product.pricing[shown]!)}
                    </p>
                    {product.moq > 1 && (
                      <p className="mt-1 text-[11.5px] text-muted">
                        Minimum order {count(product.moq)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
