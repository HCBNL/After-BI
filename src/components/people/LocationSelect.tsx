/**
 * Where a person is based, chosen from the organisation's own places: head
 * office and every company depot saved under Warehouses. Never typed, so the
 * same depot is never spelt three ways across staff cards.
 */
import { Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';

export const HEAD_OFFICE = 'Head office';

export function LocationSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const { warehouses } = useOrg();
  const depots = warehouses.filter((w) => w.kind !== 'distributor').map((w) => w.name);
  const places = [HEAD_OFFICE, ...depots.filter((d) => d !== HEAD_OFFICE)];
  /* A location saved before the list existed still shows, so nothing silently changes. */
  if (value && !places.includes(value)) places.push(value);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Not set</option>
      {places.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </Select>
  );
}
