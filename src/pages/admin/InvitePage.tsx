/**
 * Invite — getting the next person in.
 *
 * TWO DIFFERENT THINGS THAT LOOK THE SAME
 *
 * Inviting a colleague creates an account in this organisation. Inviting a
 * distributor creates a code that attaches whoever redeems it to a specific
 * distributor record and a specific price tier. Conflating them is how a
 * distributor ends up with an internal role and sees every competitor's pricing
 * — so they are two panels with two different explanations, not one form with a
 * dropdown.
 *
 * The account itself is created server-side (`/api/invite`), because creating a
 * Firebase Auth user from the browser signs the CURRENT user out and into the
 * new account. That is not a subtle bug; it is an administrator being thrown
 * out of their own session every time they add somebody.
 */

import { useState } from 'react';
import { Copy, Send, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Field, Hint, Input, Select, useToast } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { saveDistributor } from '@/lib/db';
import { ROLE_LABEL, ROLES, type Role } from '@/types';

const ASSIGNABLE: Role[] = ROLES.filter((r) => r !== 'owner' && r !== 'distributor');

/** Six characters, unambiguous. No O/0, no I/1 — these get read over a phone. */
function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export default function InvitePage() {
  const { distributors, reload } = useOrg();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [busy, setBusy] = useState(false);

  const [distributorId, setDistributorId] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const inviteColleague = async () => {
    if (!email.trim() || !firstName.trim()) {
      toast.warning('A name and an email, at least');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role }),
      });
      if (!response.ok) throw new Error(await response.text());
      setEmail('');
      setFirstName('');
      setLastName('');
      toast.success('Invitation sent', 'They set their own password from the link.');
    } catch (err) {
      toast.error('Not sent', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const issueCode = async () => {
    if (!distributorId) {
      toast.warning('Which distributor?');
      return;
    }
    setBusy(true);
    try {
      const next = inviteCode();
      await saveDistributor({ id: distributorId, inviteCode: next });
      setCode(next);
      reload();
    } catch (err) {
      toast.error('Not issued', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Invite"
        description="Create an account for a colleague, or issue a distributor the code that makes them one."
      />

      <div className="space-y-5">
        {/* ------------------------------------------------------ colleague */}
        <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-bold text-primary">A colleague</h2>
            <Hint label="About inviting a colleague">
              They get an email, set their own password, and land in this organisation with the role
              you choose. You can change or suspend it later from People.
            </Hint>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>

            <Field label="Email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>

            <Field label="Role" required>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>

            <Button icon={<Send size={15} />} loading={busy} onClick={() => void inviteColleague()}>
              Send invitation
            </Button>
          </div>
        </section>

        {/* ---------------------------------------------------- distributor */}
        <section className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-bold text-primary">A distributor</h2>
            <Hint label="About distributor codes">
              A code attaches whoever redeems it to this distributor's account and their price tier.
              Give it out over the phone if you like — it is single-use and clears itself the moment
              it is redeemed.
            </Hint>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Distributor" required>
              <Select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}>
                <option value="">Choose…</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.company} — {d.category}
                    {d.inviteCode ? ' (code outstanding)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Button variant="outline" icon={<UserPlus size={15} />} loading={busy} onClick={() => void issueCode()}>
              Issue a code
            </Button>

            {code && (
              <Alert tone="good" title="Code issued" defaultOpen>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="tabular rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[18px] font-extrabold tracking-[0.2em] text-primary">
                    {code}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Copy size={14} />}
                    onClick={() => {
                      void navigator.clipboard?.writeText(code);
                      toast.success('Copied');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="mt-2 text-[12px]">
                  Issuing a new code replaces any outstanding one for this distributor.
                </p>
              </Alert>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
