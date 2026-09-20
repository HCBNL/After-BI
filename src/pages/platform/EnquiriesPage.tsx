/**
 * Enquiries — businesses that asked about AfterBI.
 *
 * Filed by `/api/enquiry` BEFORE it tries to email anybody, so a mail outage
 * costs a confirmation message rather than a lead. That ordering is the whole
 * design of this screen: the list is the source of truth, the email is a
 * courtesy.
 */

import { useMemo, useState } from 'react';
import { Inbox, Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, SearchInput } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { formatDateTime } from '@/lib/format';

interface Enquiry {
  id: string;
  company: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  createdAt: string;
}

export default function EnquiriesPage() {
  const [search, setSearch] = useState('');

  const { data, loading } = useAsync(async () => {
    const snap = await getDocs(
      query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'), limit(200)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Enquiry);
  }, [], { handleError: true });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (e) =>
        !needle ||
        e.company?.toLowerCase().includes(needle) ||
        e.name?.toLowerCase().includes(needle) ||
        e.email?.toLowerCase().includes(needle),
    );
  }, [data, search]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Enquiries"
        description="Businesses that asked about AfterBI. Every one is a call somebody owes."
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Company, name or email…" className="max-w-sm" />
      </PageHeader>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="Nothing waiting"
          description="An enquiry from the website lands here immediately, whether or not the email goes out."
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((enquiry) => (
            <li key={enquiry.id} className="rounded-2xl border border-hairline surface-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-bold text-primary">{enquiry.company}</p>
                  <p className="truncate text-[12.5px] text-muted">{enquiry.name}</p>
                </div>
                {enquiry.source && <Badge tone="neutral">{enquiry.source}</Badge>}
              </div>

              {enquiry.message && (
                <p className="mt-2.5 text-[13px] leading-relaxed text-secondary">{enquiry.message}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {enquiry.phone && (
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-primary"
                  >
                    <Phone size={13} /> {enquiry.phone}
                  </a>
                )}
                <a
                  href={`mailto:${enquiry.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-primary"
                >
                  <Mail size={13} /> {enquiry.email}
                </a>
                <span className="ml-auto text-[11.5px] text-muted">
                  {formatDateTime(enquiry.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
