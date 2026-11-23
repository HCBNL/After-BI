/**
 * Who is signed in, for the audit log. Kept apart from lib/audit so the
 * sign in code can set it without pulling the database SDK into every page,
 * the public website included.
 */
import type { UserProfile } from '@/types';

export type AuditActor = Pick<UserProfile, 'id' | 'firstName' | 'lastName' | 'role' | 'employeeCode'> & { orgId?: string };

let actor: AuditActor | null = null;

export function setAuditActor(user: AuditActor | null): void {
  actor = user;
}

export function auditActor(): AuditActor | null {
  return actor;
}
