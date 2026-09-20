/**
 * Redirect every `firebase-admin/*` import to the stand-in beside this file.
 *
 * Registered by `tests/migrate-smoke.test.mjs` so the migration script can be
 * run for real — its batching, its ordering, its counter seeding — without a
 * Firestore to run it against. The emulator would be the better tool and this
 * environment cannot download it (see the README); this covers the part that
 * matters most, which is what actually lands in the new database.
 */
import { pathToFileURL } from 'node:url';
const STUB = new URL('./firebase-admin.mjs', import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('firebase-admin')) {
    return { url: `${STUB}?m=${encodeURIComponent(specifier)}`, shortCircuit: true };
  }
  return next(specifier, context);
}
