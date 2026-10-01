/**
 * "You have not taken the register yet."
 *
 * WHY THE APP'S FIRST AUTOMATIC POP-UP IS THIS ONE
 *
 * Because attendance is the only thing in the product that has to happen at a
 * particular time or it cannot happen at all. A lesson note written on Friday
 * for Monday is fine; a register taken on Friday for Monday is a guess. Every
 * school that has ever tried to computerise attendance has failed at the same
 * step — not the screen, the remembering — and a tile on a home page is not a
 * reminder, it is a place a reminder could have been.
 *
 * So this is deliberately a modal, and deliberately the only one.
 *
 * WHAT STOPS IT BECOMING A NAG
 *
 *   • It asks once a day. Dismissing it writes today's date to localStorage
 *     and it does not come back until tomorrow — the same shape as the tour,
 *     which records "seen" on close rather than on completion, because
 *     somebody who shut it has said no.
 *   • It never appears at the weekend. Nigerian schools do not open, and a
 *     Saturday reminder is how a person learns to dismiss without reading.
 *   • It never appears for a teacher with no classes, or when every register
 *     is already sent.
 *   • A failure to check counts as "already done". A bad connection must not
 *     manufacture a reminder for a register that went in an hour ago.
 *   • It waits for the home screen to settle before appearing, so it does not
 *     land on top of a half-painted page.
 *
 * It does not block. There is a way out that is not the action, because a
 * teacher opening the app to check something at 7pm should not have to argue
 * with a dialog first.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { registersOutstanding, teacherClasses, termPosition } from '@/lib/db';
import { isWeekend, todayISO } from '@/lib/format';
import { classLabel } from '@/lib/classLabel';

const KEY = 'getschool.register.asked';

/** Has this teacher already been asked today? Storage failures mean "no". */
function askedToday(date: string): boolean {
  try {
    return localStorage.getItem(KEY) === date;
  } catch {
    return false;
  }
}

function markAsked(date: string) {
  try {
    localStorage.setItem(KEY, date);
  } catch {
    /* Private mode, or storage blocked. It will ask again; that is the safe way round. */
  }
}

export function RegisterNag() {
  const { user } = useAuth();
  const { classes, currentTerm } = useSchool();
  const navigate = useNavigate();

  const [owing, setOwing] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const today = todayISO();
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (!isTeacher || !user) return;
    // No register is due at a weekend or during the mid-term break.
    if (isWeekend(today) || (currentTerm?.startDate && termPosition(currentTerm).onBreak)) return;
    if (askedToday(today)) return;

    const mine = teacherClasses(user, classes);
    if (!mine.length) return;

    let live = true;
    /*
     * A beat after the screen has settled, for the same reason the tour waits:
     * a dialog that lands mid-paint reads as a crash, and on a slow phone the
     * shortcuts underneath are still arriving at 700ms.
     */
    const timer = window.setTimeout(async () => {
      const outstanding = await registersOutstanding(
        mine.map((c) => c.id),
        today,
      );
      if (!live || !outstanding.length) return;
      setOwing(outstanding);
      setOpen(true);
    }, 1200);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [isTeacher, user, classes, today]);

  if (!open) return null;

  const names = owing
    .map((id) => classLabel(classes.find((c) => c.id === id)))
    .filter(Boolean)
    .join(', ');

  const close = () => {
    markAsked(today);
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={close} title="Today's register">
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-200">
            <CalendarCheck size={19} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-bold leading-snug text-primary">
              {owing.length === 1
                ? `${names} has not been marked yet.`
                : `${owing.length} of your classes have not been marked yet.`}
            </p>
            {owing.length > 1 && <p className="mt-1 text-[13px] leading-relaxed text-secondary">{names}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            icon={<CalendarCheck size={16} />}
            onClick={() => {
              markAsked(today);
              setOpen(false);
              navigate('/portal/teacher/register');
            }}
          >
            Take it now
          </Button>
          <Button variant="ghost" icon={<X size={15} />} onClick={close}>
            Not now
          </Button>
        </div>

        <p className="text-[12px] leading-relaxed text-muted">
          You will not be asked again today.
        </p>
      </div>
    </Modal>
  );
}
