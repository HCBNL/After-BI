/**
 * Notices — what the platform has to say.
 *
 * Read-only inside a tenant. These are written by whoever runs AfterBI — a
 * maintenance window, a new feature, a price change — and appear as a moving
 * line above every home screen until the date they expire.
 */

import { useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { formatDate, todayISO } from '@/lib/format';
import type { Notice } from '@/types';

export default function NoticePage() {
  const { data, loading } = useAsync(async () => {
    /* Platform-wide, so a root collection rather than a tenant subtree — the
       one notice reaches every organisation. The rules make it world-readable
       to any signed-in account and writable only by `owner`. */
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notice);
  }, [], { handleError: true });

  const today = todayISO();
  const notices = useMemo(() => data ?? [], [data]);
  const live = notices.filter((n) => n.until >= today);
  const past = notices.filter((n) => n.until < today);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Notices" description="Announcements from the AfterBI team." />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title="Nothing to report"
          description="Announcements appear here and as a line above your home screen."
        />
      ) : (
        <div className="space-y-5">
          {live.length > 0 && (
            <ul className="space-y-2.5">
              {live.map((notice) => (
                <li key={notice.id} className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-[15px] font-bold text-primary">{notice.title}</h2>
                    <Badge tone={notice.tone === 'warning' ? 'gold' : 'info'}>
                      until {formatDate(notice.until)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-secondary">{notice.body}</p>
                </li>
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                Past
              </h2>
              <ul className="space-y-2">
                {past.map((notice) => (
                  <li key={notice.id} className="rounded-xl border border-hairline px-4 py-3 opacity-70">
                    <p className="text-[13.5px] font-semibold text-primary">{notice.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{notice.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
