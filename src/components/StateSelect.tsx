import { Select } from '@/components/ui';
import { STATES_BY_ZONE, ZONES } from '@/data/states';

/**
 * Every state, grouped by zone. One list, used wherever a state is chosen, so
 * the spelling on a distributor's record always matches the one on the map.
 */
export function StateSelect({
  value,
  onChange,
  placeholder = 'Choose a state…',
  disabled,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={className}>
      <option value="">{placeholder}</option>
      {ZONES.map((zone) => (
        <optgroup key={zone} label={zone}>
          {STATES_BY_ZONE[zone].map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
