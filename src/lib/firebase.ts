/**
 * The one Firebase app.
 *
 * WHAT IS NOT HERE, AND WHY
 *
 * No `storageBucket`: nothing in this app imports `firebase/storage`, because
 * nothing in this app uploads a file. The only image it has is the company
 * logo on printed documents, and that is a URL typed into Settings — which is
 * enough for a mark that is set once and then never touched.
 *
 * This comment used to say uploads went through Cloudinary, naming a
 * `lib/cloudinary.ts` that does not exist, and `vite-env.d.ts` declared two
 * `VITE_CLOUDINARY_*` variables to match. Both were inherited from the app this
 * was ported from. That is precisely the "config pointing at nothing" this
 * paragraph exists to warn about: somebody sets the variables, redeploys, and
 * waits for an upload button that was never built. If file upload is wanted —
 * a logo, a signed delivery note, a photo of damaged stock — it is a feature to
 * add deliberately, not an environment variable to fill in.
 *
 * No Functions SDK either. Server-side work — creating an auth user, resetting
 * a password, running a migration — goes through the serverless handlers under
 * `/api`, not Firebase callables.
 *
 * NO HARD-CODED FALLBACK CONFIG. The version this replaces shipped a real
 * project's apiKey, authDomain and appId as literals "so the app works before
 * env vars are configured", which meant every fork and every preview deploy
 * pointed at the production database by default. A missing variable now fails
 * loudly at boot instead, which is the only time it is cheap to find out.
 */
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill in the Firebase web config.`,
    );
  }
  return value;
}

const config: FirebaseOptions = {
  apiKey: required('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: required('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: required('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID),
};

export const app = initializeApp(config);
export const auth = getAuth(app);

/**
 * Firestore with the on-disk cache switched on.
 *
 * This is the single largest thing that makes the app usable on a Nigerian
 * mobile connection in a depot with two bars of signal: a screen that was
 * opened this week paints from the local copy immediately and reconciles with
 * the server behind it, rather than showing a skeleton for eleven seconds.
 *
 * `persistentMultipleTabManager` because warehouse staff genuinely do keep
 * Stock open in one tab and Movements in another; the single-tab manager makes
 * the second tab throw on open.
 */
export const db = initializeFirestore(app, {
  /* A field left undefined is skipped rather than failing the whole write. */
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
