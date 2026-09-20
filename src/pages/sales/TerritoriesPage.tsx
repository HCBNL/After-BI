/**
 * Territories — who covers where, and which states have nobody in them.
 *
 * The gap is the point. A coverage list tells you where you are; the states
 * with no distributor and no rep tell you where the next appointment goes, and
 * that is the only thing anybody opens this screen to find out.
 */

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatTile } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useOrg } from '@/context/OrgContext';
import { listMembers } from '@/lib/db';
import { count } from '@/lib/format';
import { NIGERIAN_STATES } from '@/data/states';

export default function TerritoriesPage() {
  const { distributors } = useOrg();
  const { data: members } = useAsync(() => listMembers(), []);

  const coverage = useMemo(() => {
    const map = new Map<string, { distributors: string[]; reps: string[] }>(
      NIGERIAN_STATES.map((state) => [state, { distributors: [], reps: [] }]),
    );

    for (const distributor of distributors) {
      const state = (distributor.location ?? '').trim();
      const entry = map.get(state);
      if (entry) entry.distributors.push(distributor.company);
    }

    for (const member of members ?? []) {
      for (const territory of member.territories ?? []) {
        const entry = map.get(territory);
        if (entry) entry.reps.push(`${member.firstName} ${member.lastName}`);
      }
    }

    return [...map.entries()].map(([state, value]) => ({ state, ...value }));
  }, [distributors, members]);

  const covered = coverage.filter((c) => c.distributors.length > 0);
  const uncovered = coverage.filter((c) => c.distributors.length === 0);

  return (
    <div>
      <PageHeader
        title="Territories"
        description="Who covers where, and which states have nobody in them."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="States covered" value={count(covered.length)} icon={<MapPin size={16} />} tone="good" />
        <StatTile label="No distributor" value={count(uncovered.length)} tone={uncovered.length ? 'warning' : 'good'} />
        <StatTile label="Distributors" value={count(distributors.length)} />
      </div>

      {uncovered.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            No distributor yet
          </h2>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-hairline surface-card p-4 shadow-card">
            {uncovered.map((entry) => (
              <span
                key={entry.state}
                className="rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1 text-[12px] text-secondary"
              >
                {entry.state}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
          Covered
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {covered.map((entry) => (
            <li
              key={entry.state}
              className="rounded-2xl border border-hairline surface-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-bold text-primary">{entry.state}</p>
                <Badge tone="brand">{count(entry.distributors.length)}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-muted">
                {entry.distributors.join(', ')}
              </p>
              {entry.reps.length > 0 && (
                <p className="mt-1.5 text-[11.5px] text-secondary">
                  Rep: {entry.reps.join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
