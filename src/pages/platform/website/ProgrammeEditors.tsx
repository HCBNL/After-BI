/**
 * The two editors for what sits beyond the three plans:
 *
 *   CustomEditor   the AfterBI Custom card on the Pricing page
 *   PartnerEditor  the reward, packages and testimonies on the Partners page
 *
 * Both edit a draft the Website page publishes with everything else.
 */

import { Plus, Star, Trash2 } from 'lucide-react';
import { Button, Field, Input, Switch, Textarea } from '@/components/ui';
import {
  DEFAULT_CUSTOM,
  DEFAULT_PACKAGES,
  resolveCustom,
  resolvePartners,
  type CustomBuild,
  type PartnerPackage,
  type PartnerSettings,
  type PartnerTestimony,
} from '@/lib/programme';

const lines = (text: string) => text.split('\n');

/* ================================================================ Custom */

export function CustomEditor({
  value,
  onChange,
}: {
  value: Partial<CustomBuild> | undefined;
  onChange: (next: Partial<CustomBuild>) => void;
}) {
  const c = resolveCustom(value);
  const set = (patch: Partial<CustomBuild>) => onChange({ ...c, ...value, ...patch });

  return (
    <div className="space-y-4">
      <Switch
        checked={c.enabled}
        onChange={(enabled) => set({ enabled })}
        label="Show on the Pricing page"
        description={c.enabled ? 'Shown under the three plans, and offered in proposals.' : 'Hidden everywhere.'}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={value?.name ?? ''} placeholder={DEFAULT_CUSTOM.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Price line">
          <Input
            value={value?.priceLine ?? ''}
            placeholder={DEFAULT_CUSTOM.priceLine}
            onChange={(e) => set({ priceLine: e.target.value })}
          />
        </Field>
      </div>
      <Field label="One line on who it is for">
        <Input value={value?.tagline ?? ''} placeholder={DEFAULT_CUSTOM.tagline} onChange={(e) => set({ tagline: e.target.value })} />
      </Field>
      <Field label="What is included" hint="One per line.">
        <Textarea
          rows={5}
          value={(value?.points ?? DEFAULT_CUSTOM.points).join('\n')}
          onChange={(e) => set({ points: lines(e.target.value) })}
        />
      </Field>
    </div>
  );
}

/* ================================================================ Partners */

export function PartnerEditor({
  value,
  onChange,
}: {
  value: PartnerSettings | undefined;
  onChange: (next: PartnerSettings) => void;
}) {
  const p = resolvePartners(value);
  const packages = value?.packages ?? DEFAULT_PACKAGES;
  const testimonies = value?.testimonies ?? [];
  const set = (patch: PartnerSettings) => onChange({ ...value, ...patch });

  const setPackage = (index: number, patch: Partial<PartnerPackage>) =>
    set({ packages: packages.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setTestimony = (index: number, patch: Partial<PartnerTestimony>) =>
    set({ testimonies: testimonies.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reward per business (₦)" hint="Paid once the business has subscribed and paid.">
          <Input
            inputMode="numeric"
            value={value?.reward || ''}
            placeholder={String(p.reward)}
            onChange={(e) => set({ reward: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          />
        </Field>
        <Field label="Paid within (working days)">
          <Input
            inputMode="numeric"
            value={value?.payDays || ''}
            placeholder={String(p.payDays)}
            onChange={(e) => set({ payDays: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-primary">Packages</p>
        {packages.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-hairline p-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={item.name} onChange={(e) => setPackage(index, { name: e.target.value })} />
                </Field>
                <Field label="Who it is for">
                  <Input value={item.audience} onChange={(e) => setPackage(index, { audience: e.target.value })} />
                </Field>
              </div>
              <Field label="About">
                <Textarea rows={2} value={item.blurb} onChange={(e) => setPackage(index, { blurb: e.target.value })} />
              </Field>
              <Field label="What the partner gets" hint="One per line. {reward} and {payDays} fill themselves in.">
                <Textarea rows={3} value={item.perks.join('\n')} onChange={(e) => setPackage(index, { perks: lines(e.target.value) })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={item.featured ? 'primary' : 'outline'}
                  size="sm"
                  icon={<Star size={14} />}
                  onClick={() => set({ packages: packages.map((x, i) => ({ ...x, featured: i === index ? !x.featured : false })) })}
                >
                  {item.featured ? 'Highlighted' : 'Highlight'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => set({ packages: packages.filter((_, i) => i !== index) })}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
        {packages.length < 6 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() =>
              set({
                packages: [
                  ...packages,
                  { id: `p${Date.now().toString(36)}`, name: '', audience: '', blurb: '', perks: ['{reward} for every business that subscribes'] },
                ],
              })
            }
          >
            Add a package
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-primary">What partners say</p>
        {testimonies.length === 0 && (
          <p className="text-[13px] text-muted">None yet. The section stays hidden until you add a real one.</p>
        )}
        {testimonies.map((item, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-xl border border-hairline p-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-3">
              <Field label="Their words">
                <Textarea rows={3} value={item.quote} onChange={(e) => setTestimony(index, { quote: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={item.name} onChange={(e) => setTestimony(index, { name: e.target.value })} />
                </Field>
                <Field label="Role and company">
                  <Input value={item.role} onChange={(e) => setTestimony(index, { role: e.target.value })} />
                </Field>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => set({ testimonies: testimonies.filter((_, i) => i !== index) })}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {testimonies.length < 6 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => set({ testimonies: [...testimonies, { quote: '', name: '', role: '' }] })}
          >
            Add a testimony
          </Button>
        )}
      </div>
    </div>
  );
}
