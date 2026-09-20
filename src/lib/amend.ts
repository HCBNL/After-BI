/**
 * Who may change what, and when — in one place.
 *
 * THE COMPLAINT THIS EXISTS TO ANSWER
 *
 * In the AfterBI this replaces, almost nothing could be changed after it was
 * written. An order keyed with the wrong quantity had to be rejected and raised
 * again. A return raised against the wrong distributor stayed that way. A
 * sell-out figure typed as 400 instead of 40 skewed the month and there was no
 * screen that would take it back. People worked around it by raising duplicates, which
 * is how a system stops being trusted: the data is wrong AND there is now more
 * of it.
 *
 * THE RULE, IN ONE SENTENCE
 *
 * Anything that has not yet been acted on can be changed by the person
 * responsible for it; once it has been acted on, only an administrator can
 * change it, and the change is recorded.
 *
 * FOUR STAGES, AND EVERY RECORD IS IN EXACTLY ONE
 *
 *   open       Not yet sent to anybody. A draft. The author edits it freely,
 *              and so does anybody whose role could have raised it — because a
 *              rep who is off sick should not be the only person who can fix
 *              their own draft.
 *
 *   submitted  Sent, waiting on a decision. The author can RECALL it — pull it
 *              back to `open`, which withdraws it from whoever was going to
 *              sign — and then edit and send it again. An administrator can
 *              edit it in place without recalling. This is the stage the old
 *              app had no answer for at all.
 *
 *   settled    Decided: approved, fulfilled, paid, rejected. Only an
 *              administrator may amend, and the record carries a visible
 *              `amendedAt` and `amendedBy` so the next person to read it knows
 *              it changed after the fact.
 *
 *   locked     A ledger entry. NOBODY, including a super admin. Stock
 *              movements and payments are append-only, and that is the only
 *              property that makes them worth keeping — see
 *              `firestore.rules`. A mistake is corrected with a second,
 *              opposite entry, which leaves both visible.
 *
 * WHY A MODULE AND NOT A CHECK IN EACH SCREEN
 *
 * Because there are nine record types and four stages, and the version of
 * this logic that lives inline in eleven screens is eleven slightly different
 * answers to the same question. This file is also mirrored almost line for line
 * in `firestore.rules`: this decides which buttons are drawn, the rules decide
 * what actually happens. If the two ever disagree, the rules win and somebody
 * sees a control that fails — which is why they are written to be read side by
 * side.
 */

import { isAdmin, normaliseRole, partnerScope } from './roles';
import type {
  Invoice,
  InvoiceStatus,
  Lead,
  Order,
  OrderStatus,
  ReturnRecord,
  ReturnStatus,
  Role,
  Sale,
  UserProfile,
} from '@/types';

export type Stage = 'open' | 'submitted' | 'settled' | 'locked';

export interface Verdict {
  /** Change the record's contents in place. */
  canEdit: boolean;
  /** Pull it back out of somebody's approval queue, to `open`. */
  canRecall: boolean;
  /** End it without deleting it — `cancelled`, `void`, `rejected`. */
  canCancel: boolean;
  /** True when the only reason this person may act is that they are an admin. */
  byOverride: boolean;
  /** Shown on the screen when nothing is permitted. Never a bare "no". */
  reason: string;
  stage: Stage;
}

const NO = (stage: Stage, reason: string): Verdict => ({
  canEdit: false,
  canRecall: false,
  canCancel: false,
  byOverride: false,
  reason,
  stage,
});

/* ------------------------------------------------------------ stage maps */

export function orderStage(status: OrderStatus): Stage {
  switch (status) {
    case 'draft':
      return 'open';
    case 'pending_approval':
      return 'submitted';
    /*
     * `fulfilled` is settled rather than locked, deliberately.
     *
     * The stock movement it produced IS locked and cannot be touched. But the
     * order itself — its note, a wrong distributor, a line somebody typed at
     * the wrong price — still has to be correctable by an administrator, or the
     * only remedy is a credit note against a document nobody can read straight.
     * Amending it does not re-run the deduction; that is what a stock
     * adjustment is for, and the screen says so.
     */
    case 'approved':
    case 'rejected':
    case 'fulfilled':
    case 'cancelled':
      return 'settled';
  }
}

export function returnStage(status: ReturnStatus): Stage {
  if (status === 'requested') return 'submitted';
  return 'settled';
}

export function invoiceStage(status: InvoiceStatus): Stage {
  if (status === 'draft') return 'open';
  if (status === 'issued') return 'submitted';
  /* Money has moved, or the document has been cancelled. */
  return 'settled';
}

/**
 * A sell-out record has no workflow, so it is staged by age.
 *
 * Within the same calendar month it is `open` — a rep fixing Tuesday's typo on
 * Wednesday is routine and needs no ceremony. Once the month is closed it is
 * `settled`, because the figure has been reported: it is in a scorecard, a
 * commission calculation and probably a slide. Changing it then is an
 * administrator's decision, and it leaves a trail.
 */
export function saleStage(saleDate: string, now = new Date()): Stage {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return saleDate.slice(0, 7) === month ? 'open' : 'settled';
}

/* ------------------------------------------------------------- the verdict */

interface Subject {
  stage: Stage;
  /** uid of whoever created the record. */
  authorId?: string;
  /** Distributor the record belongs to, for scoping a partner. */
  distributorId?: string;
  /** Roles that could have created this kind of record in the first place. */
  peerRoles?: Role[];
  /**
   * The function that OWNS this kind of record, acting with an administrator's
   * authority over it while it is still in flight.
   *
   * Finance owns invoices. A finance manager correcting a due date on an invoice
   * somebody else raised is their job, not an override — but they are neither
   * the author nor an admin, so without this they could not touch it, and the
   * only remedy for a wrong due date was to void a correct invoice and re-raise
   * it under a new number. That is how an accounts ledger grows gaps.
   *
   * Deliberately does NOT extend to `settled`. Once money has moved or the
   * document is void, it is an administrator's decision and nobody else's —
   * that is the promise the stage makes, and widening it here would quietly
   * un-make it.
   */
  authorityRoles?: Role[];
  /** What to call it in a sentence: "order", "return", "sell-out record". */
  noun: string;
}

/**
 * May this person change this record right now?
 *
 * `user` may be null while auth is still resolving; the verdict is then a
 * refusal, which is the safe default and renders as a disabled control rather
 * than a flash of one that works.
 */
export function amendmentFor(user: UserProfile | null, subject: Subject): Verdict {
  if (!user) return NO(subject.stage, 'Signing in…');

  const role = normaliseRole(user.role);
  const admin = isAdmin(role);
  const isAuthor = Boolean(subject.authorId && subject.authorId === user.id);
  const isPeer = Boolean(subject.peerRoles?.includes(role));
  /** Owns this record type, so acts like an admin while it is in flight. */
  const hasAuthority = admin || Boolean(subject.authorityRoles?.includes(role));

  /*
   * A partner may only ever touch their own account's records — and this is
   * checked BEFORE the admin override, because a distributor is never an admin
   * of the organisation selling to them. The rules enforce the same ordering.
   */
  if (role === 'distributor' || role === 'sales_rep') {
    if (subject.distributorId && !(partnerScope(user) ?? []).includes(subject.distributorId)) {
      return NO(subject.stage, `This ${subject.noun} belongs to another account.`);
    }
  }

  switch (subject.stage) {
    case 'locked':
      return NO(
        'locked',
        `A ${subject.noun} is part of the ledger and cannot be edited by anyone, including an administrator. Correct it with an opposite entry so both stay visible.`,
      );

    case 'open':
      if (isAuthor || isPeer || admin) {
        return {
          canEdit: true,
          canRecall: false,
          canCancel: true,
          byOverride: admin && !isAuthor && !isPeer,
          reason: '',
          stage: 'open',
        };
      }
      return NO('open', `Only whoever raised this ${subject.noun}, or an administrator, can change it.`);

    case 'submitted':
      /*
       * THE CASE THE OLD APP HAD NO ANSWER FOR.
       *
       * The author can pull it back — that is the "recall" — and an
       * administrator can edit it where it stands without disturbing the queue.
       * A peer can do neither: two reps editing each other's in-flight orders
       * while an approver is reading them is worse than the problem it solves.
       */
      if (hasAuthority) {
        return {
          canEdit: true,
          canRecall: true,
          canCancel: true,
          /* An owning function doing its own job is not an override. */
          byOverride: admin && !subject.authorityRoles?.includes(role),
          reason: '',
          stage: 'submitted',
        };
      }
      if (isAuthor) {
        return {
          canEdit: false,
          canRecall: true,
          canCancel: true,
          byOverride: false,
          reason: `Recall this ${subject.noun} to edit it. That takes it out of the approval queue and puts it back in your drafts.`,
          stage: 'submitted',
        };
      }
      return NO(
        'submitted',
        `This ${subject.noun} is waiting for a decision. Whoever raised it can recall it, or an administrator can amend it.`,
      );

    case 'settled':
      if (admin) {
        return {
          canEdit: true,
          canRecall: false,
          canCancel: true,
          byOverride: true,
          reason: '',
          stage: 'settled',
        };
      }
      return NO(
        'settled',
        `This ${subject.noun} has already been decided. Only an administrator can change it now, and the change is recorded.`,
      );
  }
}

/* --------------------------------------------- per-entity convenience */

/** Roles that can raise an order, and so can fix a colleague's draft. */
const ORDER_PEERS: Role[] = ['super_admin', 'admin', 'staff', 'sales_rep'];

export function orderAmendment(user: UserProfile | null, order: Order | null): Verdict {
  if (!order) return NO('open', 'No order selected.');

  const verdict = amendmentFor(user, {
    stage: orderStage(order.status),
    authorId: order.createdBy,
    distributorId: order.distributorId,
    peerRoles: ORDER_PEERS,
    noun: 'order',
  });

  /*
   * ONCE THE STOCK HAS LEFT, THERE IS NOTHING TO CANCEL.
   *
   * `cancelOrder` refuses a fulfilled order outright — the goods are gone and
   * the movement is in the ledger, so the remedy is a return, not a
   * cancellation. The generic verdict does not know that, so it was offering an
   * administrator a Cancel button that threw every time they pressed it. This
   * is exactly the "control that always fails" this whole module exists to
   * prevent, so the order-specific knowledge is applied here rather than left
   * to each screen to remember.
   */
  if (order.status === 'fulfilled' || order.status === 'cancelled') {
    return { ...verdict, canCancel: false };
  }

  return verdict;
}

export function returnAmendment(user: UserProfile | null, record: ReturnRecord | null): Verdict {
  if (!record) return NO('open', 'No return selected.');
  return amendmentFor(user, {
    stage: returnStage(record.status),
    authorId: record.requestedBy,
    distributorId: record.distributorId,
    noun: 'return',
  });
}

export function invoiceAmendment(user: UserProfile | null, invoice: Invoice | null): Verdict {
  if (!invoice) return NO('open', 'No invoice selected.');

  const verdict = amendmentFor(user, {
    stage: invoiceStage(invoice.status),
    authorId: invoice.createdBy,
    distributorId: invoice.distributorId,
    peerRoles: ['super_admin', 'admin', 'finance_manager'],
    /* Finance owns invoices — see `authorityRoles`. */
    authorityRoles: ['finance_manager'],
    noun: 'invoice',
  });

  /* Money has arrived: voiding is off the table for everyone. `voidInvoice`
     refuses it too, with a message naming the figure. */
  if ((invoice.amountPaid ?? 0) > 0) return { ...verdict, canCancel: false };

  return verdict;
}

export function saleAmendment(user: UserProfile | null, sale: Sale | null): Verdict {
  if (!sale) return NO('open', 'No record selected.');
  return amendmentFor(user, {
    stage: saleStage(sale.saleDate),
    authorId: sale.capturedBy,
    distributorId: sale.distributorId,
    noun: 'sell-out record',
  });
}

export function leadAmendment(user: UserProfile | null, lead: Lead | null): Verdict {
  if (!lead) return NO('open', 'No lead selected.');
  /* A lead has no approval step — it is `open` its whole life, owned by the rep
     working it, and an administrator can always step in. */
  return amendmentFor(user, {
    stage: 'open',
    authorId: lead.ownerId,
    peerRoles: ['super_admin', 'admin'],
    noun: 'lead',
  });
}

/* --------------------------------------------- distributor record access */

/**
 * A distributor record has no approval workflow, so it is split by FIELD
 * instead of by stage.
 *
 * Two different things live on one document and they have very different
 * consequences if they are wrong:
 *
 *   CONTACT DETAILS — the person, the phone number, the delivery address.
 *   Wrong ones cost a failed delivery, and the people who notice are the rep
 *   standing in the shop and the distributor themselves. Both can fix them.
 *
 *   COMMERCIAL TERMS — the price tier, the credit limit, the account status.
 *   These decide what the customer pays and how far they may go into debt. A
 *   rep who could move an account from OT to SEP could give away margin from a
 *   dropdown, with no approval and no trail. Administrators only.
 *
 * The version this replaces made no distinction and simply refused everyone
 * outside the office, which is why nobody could correct a phone number without
 * ringing head office.
 */
export interface DistributorAccess {
  canEditContact: boolean;
  canEditTerms: boolean;
  reason: string;
}

export function distributorAccess(
  user: UserProfile | null,
  distributorId?: string,
): DistributorAccess {
  if (!user) return { canEditContact: false, canEditTerms: false, reason: 'Signing in…' };

  const role = normaliseRole(user.role);
  const admin = isAdmin(role);
  const office = role === 'staff';
  const rep = role === 'sales_rep';
  const own = Boolean(distributorId && (partnerScope(user) ?? []).includes(distributorId));

  if (admin) return { canEditContact: true, canEditTerms: true, reason: '' };

  if (office) {
    return {
      canEditContact: true,
      canEditTerms: false,
      reason: 'The price tier, credit limit and status are an administrator’s to set.',
    };
  }

  /* A rep on this account, or the distributor themselves. */
  if ((rep && own) || (role === 'distributor' && own)) {
    return {
      canEditContact: true,
      canEditTerms: false,
      reason: 'You can keep the contact details right. The tier and credit limit are set by the office.',
    };
  }

  return {
    canEditContact: false,
    canEditTerms: false,
    reason: 'This account belongs to another part of the business.',
  };
}
