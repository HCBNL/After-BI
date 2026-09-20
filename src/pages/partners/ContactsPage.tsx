/**
 * Contacts — everyone you can reach.
 *
 * Internal people and distributor contacts in one list, because "who do I call
 * about this order" does not divide neatly along that line. A rep chasing a
 * short delivery needs the warehouse manager and the distributor's contact, and
 * two separate address books means finding one of them and guessing the other.
 */

import { useMemo, useState } from 'react';
import { Mail, Phone, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, EmptyState, SearchInput, SegmentedControl } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { listMembers } from '@/lib/db';
import { ROLE_SHORT } from '@/types';

interface Contact {
  id: string;
  name: string;
  detail: string;
  email?: string;
  phone?: string;
  kind: 'team' | 'partner';
  tag: string;
  photoURL?: string;
}

export default function ContactsPage() {
  const { distributors } = useOrg();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'all' | 'team' | 'partner'>('all');

  const { data: members, loading } = useAsync(() => listMembers(), [], { handleError: true });

  const contacts = useMemo<Contact[]>(() => {
    const team: Contact[] = (members ?? [])
      .filter((m) => m.active !== false)
      .map((m) => ({
        id: m.id,
        name: `${m.title ? `${m.title} ` : ''}${m.firstName} ${m.lastName}`,
        detail: ROLE_SHORT[m.role],
        email: m.email,
        phone: m.phone,
        kind: 'team',
        tag: ROLE_SHORT[m.role],
        photoURL: m.photoURL,
      }));

    const partners: Contact[] = distributors.map((d) => ({
      id: d.id,
      name: d.contactName || d.company,
      detail: d.company,
      email: d.email,
      phone: d.phone,
      kind: 'partner',
      tag: d.category,
    }));

    return [...team, ...partners].sort((a, b) => a.name.localeCompare(b.name));
  }, [members, distributors]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (kind !== 'all' && contact.kind !== kind) return false;
      if (!needle) return true;
      return (
        contact.name.toLowerCase().includes(needle) ||
        contact.detail.toLowerCase().includes(needle) ||
        (contact.email ?? '').toLowerCase().includes(needle)
      );
    });
  }, [contacts, kind, search]);

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Everyone on the platform you can reach, and which account they belong to."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, company or email…" className="max-w-xs" />
          <SegmentedControl
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'team', label: 'Team' },
              { value: 'partner', label: 'Partners' },
            ]}
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="Nobody matches that" description="Try a different name." />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((contact) => (
            <li
              key={`${contact.kind}-${contact.id}`}
              className="flex items-start gap-3 rounded-2xl border border-hairline surface-card p-4 shadow-card"
            >
              <Avatar name={contact.name} src={contact.photoURL} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-primary">{contact.name}</p>
                <p className="truncate text-[12px] text-muted">{contact.detail}</p>

                {/*
                  Real `tel:` and `mailto:` links, not text.

                  This app is used on a phone standing in a warehouse. A phone
                  number you have to select, copy and paste into the dialer is a
                  phone number that does not get called.
                */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-2 py-1 text-[11.5px] font-semibold text-secondary transition-colors hover:text-primary"
                    >
                      <Phone size={12} /> Call
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-2 py-1 text-[11.5px] font-semibold text-secondary transition-colors hover:text-primary"
                    >
                      <Mail size={12} /> Email
                    </a>
                  )}
                </div>
              </div>
              <Badge tone={contact.kind === 'team' ? 'brand' : 'neutral'}>{contact.tag}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
