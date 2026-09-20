/**
 * Notices — the line above every home screen, everywhere.
 *
 * One document reaches every organisation on the platform, which is a lot of
 * reach for a text box. Hence the expiry date being required rather than
 * optional: a notice with no end date is a notice that is still telling people
 * about a maintenance window from March.
 */

import { useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { formatDate, todayISO } from '@/lib/format';
import type { Notice } from '@/types';

export default function NoticesAdminPage() {
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Notice> | null>(null);
  const [removing, setRemoving] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useAsync(async () => {
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notice);
  }, [], { handleError: true });

  const today = todayISO();
  const notices = useMemo(() => data ?? [], [data]);

  const save = async () => {
    if (!editing?.title?.trim() || !editing.body?.trim() || !editing.until) {
      toast.warning('Missing something', 'A notice needs a headline, a body and a date it stops.');
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, 'notices'), {
        title: editing.title.trim(),
        body: editing.body.trim(),
        until: editing.until,
        tone: editing.tone ?? 'info',
        createdAt: serverTimestamp(),
      });
      setEditing(null);
      reload();
      toast.success('Notice published', 'It is on every home screen now.');
    } catch (err) {
      toast.error('Not published', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notices"
        description="The moving line above every home screen, in every organisation, until the day you set."
        actions={
          <Button
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setEditing({ tone: 'info', until: todayISO() })}
          >
            New notice
          </Button>
        }
      />

      {loading ? (
        <div className="skeleton h-32 rounded-2xl" />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title="No notices"
          description="Publish one and it appears above every home screen on the platform until it expires."
        />
      ) : (
        <ul className="space-y-2.5">
          {notices.map((notice) => {
            const live = notice.until >= today;
            return (
              <li
                key={notice.id}
                className="rounded-2xl border border-hairline surface-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-[14.5px] font-bold text-primary">{notice.title}</h2>
                  <div className="flex items-center gap-2">
                    <Badge tone={live ? (notice.tone === 'warning' ? 'gold' : 'good') : 'neutral'}>
                      {live ? `until ${formatDate(notice.until)}` : 'expired'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setRemoving(notice)}
                      aria-label="Delete notice"
                      className="text-muted transition-colors hover:text-status-critical"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-secondary">{notice.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="New notice"
        note="Keep the headline short — it scrolls past in a single line on a phone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={busy}>
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Headline" required>
            <Input
              value={editing?.title ?? ''}
              onChange={(e) => setEditing((c) => ({ ...c, title: e.target.value }))}
              placeholder="Scheduled maintenance on Saturday"
            />
          </Field>
          <Field label="Body" required>
            <Textarea
              rows={3}
              value={editing?.body ?? ''}
              onChange={(e) => setEditing((c) => ({ ...c, body: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stops showing on" required>
              <Input
                type="date"
                value={editing?.until ?? ''}
                onChange={(e) => setEditing((c) => ({ ...c, until: e.target.value }))}
              />
            </Field>
            <Field label="Tone">
              <Select
                value={editing?.tone ?? 'info'}
                onChange={(e) => setEditing((c) => ({ ...c, tone: e.target.value as Notice['tone'] }))}
              >
                <option value="info">Information</option>
                <option value="warning">Needs attention</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete this notice?"
        message="It disappears from every home screen immediately."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          await deleteDoc(doc(db, 'notices', removing.id));
          setRemoving(null);
          reload();
          toast.success('Deleted');
        }}
      />
    </div>
  );
}
