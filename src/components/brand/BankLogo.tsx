/** A bank's logo on a white tile, or its initials on its colour when there is no logo. */
import type { BankProfile } from '@/lib/bankProfiles';

export function BankLogo({ bank, size = 44 }: { bank: Pick<BankProfile, 'name' | 'logoUrl' | 'color'>; size?: number }) {
  const initials = bank.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-white p-1"
      style={{ width: size, height: size }}
    >
      {bank.logoUrl ? (
        <img src={bank.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-lg text-[12px] font-extrabold text-white"
          style={{ background: bank.color || '#0f1f36' }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
