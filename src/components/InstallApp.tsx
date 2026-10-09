/**
 * Whether the browser can install the app right now, as a React value.
 *
 * The install button itself lives where it is shown (the front page's sign-in
 * strip); this only turns `src/lib/pwa.ts`'s event into something a component
 * can re-render on.
 */

import { useSyncExternalStore } from 'react';
import { installState, subscribeInstall, type InstallState } from '@/lib/pwa';

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribeInstall, installState, () => 'unavailable' as const);
}
