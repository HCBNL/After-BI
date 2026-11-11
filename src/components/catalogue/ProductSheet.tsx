/**
 * One product, big enough to turn the laptop round.
 *
 * THE JOB THIS DOES
 *
 * A customer is standing at the desk, or on the other end of a WhatsApp call,
 * and asks what the thing looks like. Until now that meant a member of staff
 * photographing a carton in the store with their own phone. This is the
 * answer: the product at a size somebody can see from across a desk, with the
 * one price that customer is entitled to and nothing else that would be
 * awkward if they were looking at the screen.
 *
 * WHAT IS DELIBERATELY NOT ON IT
 *
 *   - The other two tiers. The whole reason the catalogue takes its tier from
 *     the account rather than a control is that showing a distributor what a
 *     supermarket chain pays is the one disclosure that ends relationships.
 *     A sheet built to be shown to a customer must not undo that.
 *   - Stock. "We have 4 left" invites a negotiation the rep did not plan, and
 *     the number is a depot number anyway, not a promise.
 *
 * SCREENSHOT AS A FIRST-CLASS OUTPUT
 *
 * Staff will screenshot this far more often than they will press anything on
 * it, so the layout is built to survive being cropped: the name, the price and
 * the picture sit together in the top block with no control cutting through
 * them, and the buttons are kept to the footer where a crop loses nothing.
 */

import { useState } from 'react';
import { Check, ChevronDown, Download, Lightbulb, Package2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, useToast } from '@/components/ui';
import { ProductShot } from './ProductShot';
import { saveFile } from '@/lib/download';
import { naira, count } from '@/lib/format';
import { cn } from '@/lib/cn';
import { productShots, type PriceTier, type Product } from '@/types';

export function ProductSheet({
  product,
  tier,
  orderHref,
  onClose,
}: {
  product: Product | null;
  tier: PriceTier;
  /** Where "Order this" goes. Omitted for anyone who cannot raise an order. */
  orderHref?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [shown, setShown] = useState(0);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  /* Re-seed when a different product is opened, or the second product opened
     starts on the first one's fourth photograph. */
  const [seed, setSeed] = useState(product?.id);
  if (product && product.id !== seed) {
    setSeed(product.id);
    setShown(0);
    setNoteOpen(false);
  }

  if (!product) return null;

  const shots = productShots(product);
  const active = shots[Math.min(shown, shots.length - 1)];
  const price = product.pricing[tier];

  /*
   * "Save picture" rather than "right click, save as".
   *
   * Half the people doing this are on a phone, where there is no right click,
   * and the picture they want is the supplier's full-resolution original
   * rather than the thumbnail the browser actually has in hand. Fetching it
   * also keeps the Cloudinary URL out of the customer's view, which a
   * long-press "copy image address" would not.
   */
  const savePicture = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const response = await fetch(active);
      if (!response.ok) throw new Error(`The picture could not be fetched (${response.status}).`);
      const blob = await response.blob();
      const extension = (blob.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
      const base = product.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const outcome = await saveFile(`${base || 'product'}.${extension}`, blob);
      if (outcome.status === 'saved') toast.success('Picture saved');
      else if (outcome.status === 'unsupported') toast.warning('Could not save it here', outcome.reason);
    } catch (error) {
      toast.error(
        'Could not save the picture',
        error instanceof Error ? error.message : 'Check the connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      /*
         Wider than a form dialog, because the picture is the content. At `lg`
         the product came out about 370px across, which is a thumbnail with a
         frame round it: fine for confirming which SKU you clicked, useless
         for the thing this sheet exists to do, which is being turned round
         and looked at by somebody on the other side of a desk.
 */
      size="xl"
      title={product.name}
      description={
        /* Separate pieces, so the category and the unit are each read in the chosen language. */
        <>
          {product.category}
          {' · '}
          {product.unit}
          {product.sku ? ` · ${product.sku}` : null}
        </>
      }
      footer={
        <>
          {active && (
            <Button
              variant="outline"
              className="mr-auto"
              icon={<Download size={15} />}
              loading={saving}
              onClick={() => void savePicture()}
            >
              Save picture
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {orderHref && (
            <Link
              to={orderHref}
              className="tap inline-flex items-center gap-2 rounded-xl bg-brand-900 px-3.5 text-label font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
            >
              <ShoppingCart size={15} />
              Order this
            </Link>
          )}
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- pictures */}
        {/*
          A height the window can always afford, not an aspect ratio.

          `aspect-[4/3]` at this width made the picture about 600px tall,
          taller than the dialog has room for on a laptop, so the body
          scrolled and the product was cut off at the knees: the one thing
          this sheet exists to show, and you had to scroll to see all of it.
          Capped by the viewport, with the photograph contained inside it, the
          whole product is always in view.
        */}
        <div className="min-w-0">
          <ProductShot
            src={active}
            alt={product.name}
            width={820}
            className="h-[min(46vh,26rem)] w-full border border-hairline"
            rounded="rounded-2xl"
            imgClassName="object-contain p-4"
          />

          {/* One shot is not a gallery, so it gets no strip to choose from. */}
          {shots.length > 1 && (
            <div className="scrollbar-thin mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {shots.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setShown(index)}
                  aria-label={`Picture ${index + 1} of ${shots.length}`}
                  aria-current={index === shown}
                  className={cn(
                    'h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-colors',
                    index === shown
                      ? 'border-brand-600 ring-2 ring-brand-500/25 dark:border-brand-400'
                      : 'border-hairline hover:border-[var(--border-strong)]',
                  )}
                >
                  <ProductShot src={url} alt="" width={56} className="h-full w-full" rounded="rounded-none" imgClassName="p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------- facts */}
        <div className="flex min-w-0 flex-col">
          <div className="rounded-2xl border border-hairline surface-sunken px-4 py-3.5">
            <p className="text-micro font-semibold uppercase tracking-[0.12em] text-muted">
              Your price
            </p>
            <p className="tabular mt-1 text-display font-bold leading-none text-primary">
              {typeof price === 'number' ? naira(price) : 'Not priced'}
            </p>
            <p className="mt-1.5 text-caption text-muted">
              {product.unit}
              {product.moq > 1 ? ` · minimum ${count(product.moq)}` : ''}
            </p>
          </div>

          {(product.packSize || product.brand || product.barcode) && (
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {product.packSize && <Fact label="Pack size" value={product.packSize} icon={<Package2 size={13} />} wide />}
              {product.brand && <Fact label="Brand" value={product.brand} />}
              {product.barcode && <Fact label="Barcode" value={product.barcode} mono />}
            </dl>
          )}

          {product.service && (
            <div className="mt-3">
              <Badge tone="info">Service · priced on the order</Badge>
            </div>
          )}

          {product.description && (
            <p className="mt-3.5 whitespace-pre-line text-body leading-relaxed text-secondary">
              {product.description}
            </p>
          )}

          {product.features && product.features.length > 0 && (
            <ul className="mt-3.5 space-y-1.5">
              {product.features.map((f) => (
                <li key={f} className="flex gap-2 text-body leading-snug text-primary">
                  <Check size={15} className="mt-[3px] shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          )}

          {product.specs && product.specs.length > 0 && (
            <dl className="mt-3.5 divide-y divide-[var(--border-hairline)] rounded-2xl border border-hairline">
              {product.specs.map((x) => (
                <div key={x.label} className="flex justify-between gap-3 px-3.5 py-2 text-label">
                  <dt className="text-muted">{x.label}</dt>
                  <dd className="text-right font-semibold text-primary">{x.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/*
            The sales note is for the person holding the laptop, and this
            sheet is built to be turned round. So it is folded until asked
            for, and folds itself again when another product is opened.
          */}
          {product.salesNote && (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={() => setNoteOpen((v) => !v)}
                aria-expanded={noteOpen}
                className="inline-flex items-center gap-1.5 text-label font-semibold text-muted hover:text-primary"
              >
                <Lightbulb size={14} aria-hidden /> Sales note
                <ChevronDown size={14} className={cn('transition-transform', noteOpen && 'rotate-180')} aria-hidden />
              </button>
              {noteOpen && (
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-gold-400/15 px-3.5 py-2.5 text-label leading-relaxed text-primary">
                  {product.salesNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Fact({ label, value, icon, wide, mono }: { label: string; value: string; icon?: React.ReactNode; wide?: boolean; mono?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-hairline px-3 py-2', wide && 'col-span-2')}>
      <dt className="flex items-center gap-1 text-micro font-semibold uppercase tracking-[0.1em] text-muted">
        {icon}
        {label}
      </dt>
      <dd className={cn('mt-0.5 truncate text-body font-semibold text-primary', mono && 'font-mono tabular')}>{value}</dd>
    </div>
  );
}
