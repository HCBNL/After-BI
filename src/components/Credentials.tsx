import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * The sign-in details for an account just created, to hand over in person or
 * paste into whatever you use to reach them. Nothing is sent from the app.
 */
export function Credentials({ name, email, password }: { name: string; email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  const address = `${window.location.origin}/login`;
  const text = `AfterBI sign-in for ${name}\nAddress: ${address}\nEmail: ${email}\nPassword: ${password}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-hairline surface-sunken p-4">
      <dl className="space-y-2 text-[13.5px]">
        {[
          ['Address', address],
          ['Email', email],
          ['Password', password],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 break-all text-right font-semibold text-primary tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <Button
        className="mt-4"
        variant="outline"
        size="sm"
        full
        icon={copied ? <Check size={15} /> : <Copy size={15} />}
        onClick={() => void copy()}
      >
        {copied ? 'Copied' : 'Copy sign-in details'}
      </Button>
      <p className="mt-2.5 text-[12px] leading-snug text-muted">
        They can change the password after signing in with “Forgot password?”.
      </p>
    </div>
  );
}
