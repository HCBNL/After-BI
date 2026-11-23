/**
 * The editor for the AfterBI Custom offer (used as an option in proposals).
 * It edits a draft the Website page publishes with everything else.
 */

import { Field, Input, Switch, Textarea } from '@/components/ui';
import { DEFAULT_CUSTOM, resolveCustom, type CustomBuild } from '@/lib/programme';

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

