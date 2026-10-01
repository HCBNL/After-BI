/**
 * What a teacher's home screen says under the shortcuts.
 *
 * It answers one question — *am I set up?* — because that is the question a
 * teacher's empty screen was silently failing. Subjects and year groups are
 * set by the office, on the teacher's record, and until they are, every screen
 * in the teacher's portal is correctly empty: no classes to pick, no subjects
 * to enter marks against, nothing to write a note for. The app looked broken
 * and the teacher had no way to know the fault was a field on their profile
 * that somebody else fills in.
 *
 * So when it is not set, this says so and says who fixes it. When it is set,
 * this draws nothing at all: what the teacher takes is on the summary cards at
 * the top of the same screen, and saying it twice was clutter.
 *
 * Deliberately reads nothing. Everything below comes from the profile already
 * in memory and the class list already in the school context, so this costs no
 * document reads at all — which matters on the screen every teacher opens
 * every morning.
 */

import { TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { teacherClasses, teacherSubjects } from '@/lib/db';

export function TeacherToday() {
  const { user } = useAuth();
  const { classes, subjects } = useSchool();

  if (!user) return null;

  const mine = teacherClasses(user, classes);
  const taught = teacherSubjects(user, subjects);

  /*
   * The unset case, and it is not an edge case — it is every teacher on the
   * day their account is made.
   */
  if (!mine.length || !taught.length) {
    return (
      <section className="rounded-2xl border border-[#fab219]/50 bg-[#fab219]/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#8a6100] dark:text-[#fab219]" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-primary">Your subjects have not been set yet</h3>
            <p className="mt-1 text-[13.5px] text-secondary">Ask the school office to set them.</p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * Set up correctly? Then nothing.
   *
   * This used to go on to list the teacher's subjects and classes and offer a
   * button to write a lesson note. All three now live on the home screen: the
   * counts are on the summary cards and the button is a shortcut. Printing them
   * again here was the same information twice on one screen.
   *
   * What is kept is the warning above, because a teacher whose subjects have
   * not been recorded opens an app where nothing works and no screen says why.
   */
  return null;
}
