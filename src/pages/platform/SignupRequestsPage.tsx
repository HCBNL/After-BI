/**
 * Platform → Sign up requests. Everybody who pressed Create account on the
 * website and left their details: who, which business, how to reach them.
 * Call, message or email in one tap, then mark them contacted. The website
 * promised them a call within 48 hours, so a request older than that and
 * still new is flagged.
 */

import { useMemo, useState } from 'react';
import { Check, Mail, MessageCircle, Phone, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Select, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { whatsappLink, whatsappNumber } from '@/lib/businessCard';
import { deleteSignupRequest, listSignupRequests, setSignupStatus, type SignupRequest } from '@/lib/signupRequests';

const PROMISE_MS = 48 * 3_600_000;

function when(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SignupRequestsPage() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => listSignupRequests(), [], { handleError: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<'new' | 'all'>('new');
  const all = data ?? [];
  const waiting = all.filter((r) => r.status === 'new');
  const shown = useMemo(() => (view === 'new' ? waiting : all), [view, waiting, all]);

  const mark = async (r: SignupRequest, status: SignupRequest['status']) => {
    setBusy(r.id);
    try {
      await setSignupStatus(r.id, status);
      reload();
    } catch (err) {
      toast.error('Could not update it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r: SignupRequest) => {
    if (!window.confirm(`Remove the request from ${r.company}?`)) return;
    setBusy(r.id);
    try {
      await deleteSignupRequest(r.id);
      reload();
    } catch (err) {
      toast.error('Could not remove it', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sign up requests"
        description="People who asked for an account on the website. They were told you will call within 48 hours."
        actions={
          <Select aria-label="Show" value={view} onChange={(e) => setView(e.target.value as 'new' | 'all')} className="w-44">
            <option value="new">{`Waiting (${waiting.length})`}</option>
            <option value="all">{`All (${all.length})`}</option>
          </Select>
        }
      />

      {loading && !data ? (
        <Card>
          <p className="text-label text-muted">Loading…</p>
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserPlus size={22} />}
            title={view === 'new' ? 'Nobody waiting' : 'No requests yet'}
            description={view === 'new' ? 'Every request has been contacted.' : 'Requests from Create account on the website appear here.'}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((r) => {
            const late = r.status === 'new' && r.createdAt && Date.now() - new Date(r.createdAt).getTime() > PROMISE_MS;
            const wa = whatsappNumber(r.phone);
            return (
              <li key={r.id} className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lead font-semibold text-primary">{r.company}</p>
                    <p className="mt-0.5 text-body text-secondary">{r.name}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {r.status === 'contacted' ? (
                      <Badge tone="good">Contacted</Badge>
                    ) : late ? (
                      <Badge tone="critical">Over 48 h</Badge>
                    ) : (
                      <Badge tone="brand">New</Badge>
                    )}
                    <span className="text-caption text-muted">{when(r.createdAt)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-body">
                  <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Phone size={15} className="text-muted" /> {r.phone}
                  </a>
                  <a href={`mailto:${r.email}`} className="flex items-center gap-2 break-all text-primary hover:underline">
                    <Mail size={15} className="shrink-0 text-muted" /> {r.email}
                  </a>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`tel:${r.phone.replace(/\s/g, '')}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-label font-semibold text-white hover:bg-brand-800"
                  >
                    <Phone size={14} /> Call
                  </a>
                  {wa && (
                    <a
                      href={whatsappLink(wa, `Hello ${r.name.split(' ')[0]}, this is AfterBI. You asked for an account for ${r.company}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3 text-label font-semibold text-primary hover:bg-[var(--surface-sunken)]"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  {r.status === 'new' ? (
                    <Button size="sm" variant="secondary" icon={<Check size={14} />} loading={busy === r.id} onClick={() => void mark(r, 'contacted')}>
                      Mark contacted
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} loading={busy === r.id} onClick={() => void mark(r, 'new')}>
                      Back to waiting
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" aria-label={`Remove ${r.company}`} onClick={() => void remove(r)} className="ml-auto">
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
