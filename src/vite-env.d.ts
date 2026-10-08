/// <reference types="vite/client" />

/**
 * The environment variables this app reads, and only those.
 *
 * Everything here is `VITE_`-prefixed, which means Vite writes the value into
 * the browser bundle at BUILD time. Two consequences worth stating, because
 * both have caught people out on this project:
 *
 *   - Nothing secret can go here. A Firebase web key is fine: it identifies
 *     the project, it does not grant access; `firestore.rules` does that. A
 *     service-account key or an API secret is not, and belongs in a server-side
 *     variable with no `VITE_` prefix.
 *   - Adding one to a host after a build does nothing until the site is rebuilt.
 *     A variable that is missing at build time is missing forever in that
 *     bundle, however correctly it is set in the dashboard.
 *
 * This file listed Cloudinary and a `VITE_HOME` switch inherited from the app
 * this was ported from. Nothing read either one, so they were config that
 * described a feature the code did not have: which is the most expensive kind
 * of documentation, because somebody eventually sets them and waits for
 * something to happen.
 */
interface ImportMetaEnv {
  /* Firebase: Console → Project settings → General → Your apps → SDK setup. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
