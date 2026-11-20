/**
 * Stickers: the barcode each product's cartons carry for a stock count.
 *
 * Every goods product has one code (lib/countCode.ts). This screen prints it,
 * as many as there are cartons to label, on an A4 label sheet or a label
 * printer roll, or saves one sticker as a picture.
 *
 * A NEW CODE KILLS THE OLD STICKERS
 *
 * "New code" exists for one case: a run of stickers was lost or copied where
 * it should not have been. The old code stops scanning the moment the new one
 * is saved, so every carton of that product has to be relabelled. The button
 * says so before it does it.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer, RefreshCw, Tag, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Field, Input, SearchInput, Select, useToast } from '@/components/ui';
import { ProductShot } from '@/components/catalogue/ProductShot';
import { useOrg } from '@/context/OrgContext';
import { assignMissingCountCodes, reissueCountCode } from '@/lib/db';
import { displayCode } from '@/lib/countCode';
import { piecesFromPack, piecesOf } from '@/lib/packs';
import { STICKER_LAYOUTS, printStickers, stickerPng, type StickerLayout } from '@/lib/stickers';
import { saveFile } from '@/lib/download';
import { count } from '@/lib/format';
import type { Product } from '@/types';

export default function StickersPage() {
  const { products, reload } = useOrg();
  const toast = useToast();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [layout, setLayout] = useState<StickerLayout>('a4');
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [each, setEach] = useState('1');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [renew, setRenew] = useState<Product | null>(null);

  const goods = useMemo(
    () => products.filter((p) => !p.service && p.status === 'active').sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const missing = goods.filter((p) => !p.countCode);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return goods.filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.sku ?? '').toLowerCase().includes(needle) ||
        (p.countCode ?? '').toLowerCase().includes(needle.replace(/\s/g, '')),
    );
  }, [goods, search]);

  const printable = rows.filter((p) => p.countCode);
  const allPicked = printable.length > 0 && printable.every((p) => picked.has(p.id));
  const copiesOf = (p: Product) => Math.max(0, Math.round(Number(copies[p.id] ?? each) || 0));

  const toggle = (id: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const giveCodes = async () => {
    setBusy(true);
    try {
      const n = await assignMissingCountCodes();
      reload();
      toast.success(n === 1 ? '1 product given a sticker code' : `${count(n)} products given sticker codes`);
    } catch (err) {
      toast.error('Codes not given', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const print = (list: Product[]) => {
    const items = list
      .filter((p) => p.countCode)
      .map((p) => ({ name: p.name, packSize: p.packSize, code: p.countCode!, copies: copiesOf(p) }))
      .filter((i) => i.copies > 0);
    if (!items.length) {
      toast.warning('Nothing to print', 'Tick at least one product and give it one copy or more.');
      return;
    }
    printStickers(items, layout);
  };

  const download = async (p: Product) => {
    if (!p.countCode) return;
    try {
      const blob = await stickerPng({ name: p.name, packSize: p.packSize, code: p.countCode });
      const outcome = await saveFile(`${p.name.replace(/[\\/:*?"<>|]/g, '').trim()} sticker.png`, blob);
      if (outcome.status === 'unsupported') toast.warning('Not saved', outcome.reason);
    } catch (err) {
      toast.error('Sticker not saved', err instanceof Error ? err.message : undefined);
    }
  };

  const total = [...picked].map((id) => goods.find((p) => p.id === id)).filter((p): p is Product => Boolean(p?.countCode)).reduce((n, p) => n + copiesOf(p), 0);

  return (
    <div>
      <PageHeader
        title="Stickers"
        description="The barcode on each product's cartons. A stock count scans it to open the product. It only works inside AfterBI, for this company: any other scanner reads letters that mean nothing."
        actions={
          <Button size="sm" icon={<Printer size={16} />} onClick={() => print(goods.filter((p) => picked.has(p.id)))} disabled={!picked.size}>
            {picked.size ? `Print ${count(total)}` : 'Print'}
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Product, SKU or code…" className="max-w-xs" />
          <Select value={layout} onChange={(e) => setLayout(e.target.value as StickerLayout)} className="max-w-[280px]" aria-label="Sticker size">
            {STICKER_LAYOUTS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-label text-muted">Copies each</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={each}
              onChange={(e) => setEach(e.target.value)}
              className="w-20"
              aria-label="Copies of each sticker"
            />
          </div>
        </div>
      </PageHeader>

      {missing.length > 0 && (
        <Alert tone="warning" className="mb-4" title={missing.length === 1 ? '1 product has no sticker code yet' : `${count(missing.length)} products have no sticker code yet`} defaultOpen>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span>Products added from now on get one automatically. Give the older ones theirs in one go.</span>
            <Button size="sm" variant="secondary" icon={<Wand2 size={15} />} loading={busy} onClick={() => void giveCodes()}>
              Give them codes
            </Button>
          </div>
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Tag size={22} />}
          title={search ? 'Nothing matches that' : 'No goods in the catalogue'}
          description={search ? 'Try another name or code.' : 'Add products under Products and each one gets a sticker code.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline surface-card shadow-card">
          <label className="flex items-center gap-3 border-b border-hairline px-4 py-3 text-label font-semibold text-secondary">
            <input
              type="checkbox"
              checked={allPicked}
              onChange={(e) => setPicked(e.target.checked ? new Set(printable.map((p) => p.id)) : new Set())}
              className="h-4 w-4 accent-[var(--color-brand-600)]"
            />
            {allPicked ? 'Untick all' : 'Tick all'}
            <span className="ml-auto font-normal text-muted">{`${count(picked.size)} ticked`}</span>
          </label>
          <ul className="divide-y divide-[var(--border-hairline)]">
            {rows.map((p) => {
              const per = piecesOf(p);
              const fromPack = !p.piecesPerUnit && piecesFromPack(p.packSize);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <input
                    type="checkbox"
                    disabled={!p.countCode}
                    checked={picked.has(p.id)}
                    onChange={(e) => toggle(p.id, e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                    aria-label={`Print ${p.name}`}
                  />
                  <ProductShot src={p.imageUrl} alt="" width={40} className="h-10 w-10 shrink-0 border border-hairline" rounded="rounded-lg" imgClassName="p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-primary">{p.name}</p>
                    <p className="truncate text-caption text-muted">
                      {per > 1 ? `${count(per)} pcs per ${p.unit.replace(/^per\s+/i, '').toLowerCase() || 'carton'}${fromPack ? ' (read from pack size)' : ''}` : 'Pieces per carton not set'}
                    </p>
                  </div>
                  <div className="w-[118px] shrink-0">
                    {p.countCode ? (
                      <span className="notranslate font-mono text-label font-bold tracking-[0.1em] text-primary" translate="no">
                        {displayCode(p.countCode)}
                      </span>
                    ) : (
                      <Badge tone="warning">No code</Badge>
                    )}
                  </div>
                  <Field className="w-[76px] shrink-0">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={copies[p.id] ?? each}
                      onChange={(e) => setCopies((c) => ({ ...c, [p.id]: e.target.value }))}
                      aria-label={`Copies of ${p.name}`}
                      disabled={!p.countCode}
                    />
                  </Field>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" icon={<Printer size={15} />} disabled={!p.countCode} onClick={() => print([p])} aria-label={`Print stickers for ${p.name}`}>
                      <span className="hidden lg:inline">Print</span>
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Download size={15} />} disabled={!p.countCode} onClick={() => void download(p)} aria-label={`Save a sticker picture for ${p.name}`}>
                      <span className="hidden lg:inline">PNG</span>
                    </Button>
                    <Button size="sm" variant="ghost" icon={<RefreshCw size={15} />} disabled={!p.countCode} onClick={() => setRenew(p)} aria-label={`New code for ${p.name}`}>
                      <span className="hidden xl:inline">New code</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(renew)}
        onClose={() => setRenew(null)}
        title="Give this product a new code?"
        message={
          renew
            ? `Every sticker already printed for ${renew.name} stops scanning, at once. Only do this if stickers were lost or copied, and relabel its cartons with the new ones.`
            : ''
        }
        confirmLabel="New code"
        tone="danger"
        loading={busy}
        onConfirm={async () => {
          if (!renew) return;
          setBusy(true);
          try {
            await reissueCountCode(renew.id);
            reload();
            toast.success('New code saved', 'Print new stickers for this product.');
            setRenew(null);
          } catch (err) {
            toast.error('Not changed', err instanceof Error ? err.message : undefined);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
