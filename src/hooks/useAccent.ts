/**
 * Which colour the portal wears, and the control that changes it.
 *
 * `useAccentSync` is mounted once, by the portal shells. It works out the
 * colour — this person's, else the school's, else red — paints it, and puts
 * GetSchool red back when the person leaves the portal for the public site.
 *
 * `usePersonalAccent` is what the menu's picker uses: change it here and the
 * whole app repaints at once, the choice is kept on this device for the next
 * visit's first frame, and it is saved to the profile so their other devices
 * follow.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import {
  applyAccent,
  cleanChoice,
  effectiveAccent,
  onPersonalAccentChange,
  rememberEffective,
  storedPersonalAccent,
  storePersonalAccent,
  type AccentChoice,
} from '@/lib/accent';

export function usePersonalAccent(): [AccentChoice | null, (next: AccentChoice | null) => void] {
  const { user } = useAuth();
  const uid = user?.id;
  const [choice, setChoice] = useState<AccentChoice | null>(() => storedPersonalAccent(uid));

  useEffect(() => {
    setChoice(storedPersonalAccent(uid));
    return onPersonalAccentChange(() => setChoice(storedPersonalAccent(uid)));
  }, [uid]);

  /*
   * The screen repaints on every change — dragging across a colour wheel
   * fires dozens a second and each one should show. The profile is written
   * once the choice settles, not dozens of times.
   */
  const saving = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(saving.current), []);

  const set = useCallback(
    (next: AccentChoice | null) => {
      if (!uid) return;
      storePersonalAccent(uid, next);
      window.clearTimeout(saving.current);
      saving.current = window.setTimeout(() => {
        // Fire and forget: a failed sync costs only the other devices catching up later.
        void import('@/lib/db').then(({ saveInterfaceColour }) =>
          saveInterfaceColour(uid, cleanChoice(next)).catch(() => {}),
        );
      }, 800);
    },
    [uid],
  );

  return [choice, set];
}

export function useAccentSync(): void {
  const { user } = useAuth();
  const { school, loaded } = useBrand();
  const uid = user?.id;
  const [personal, setPersonal] = useState<AccentChoice | null>(() => storedPersonalAccent(uid));

  /*
   * The profile is the record across devices. Adopted once per sign-in, not
   * on every render: the `user` object in memory is not refreshed when the
   * picker saves, and re-reading it would put the old colour back.
   */
  useEffect(() => {
    const fromProfile = cleanChoice(user?.uiColour);
    if (uid && fromProfile && fromProfile !== storedPersonalAccent(uid)) storePersonalAccent(uid, fromProfile);
    setPersonal(storedPersonalAccent(uid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => onPersonalAccentChange(() => setPersonal(storedPersonalAccent(uid))), [uid]);

  const effective = effectiveAccent(personal, school.interfaceColour);
  /*
   * Until the school's settings have arrived, the school's colour is not
   * known — `school` is still the bundled default. Painting then would flash
   * red over the colour `initAccent` already put up from the last visit, and
   * remember red for the next one. A person's own choice needs no settings,
   * so it goes up at once.
   */
  const known = loaded || Boolean(personal);

  useEffect(() => {
    if (!known) return;
    applyAccent(effective);
    rememberEffective(effective);
  }, [effective, known]);

  // Leaving the portal: the public website is GetSchool red.
  useEffect(() => () => applyAccent(null), []);
}
