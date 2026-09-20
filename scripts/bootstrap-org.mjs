#!/usr/bin/env node
/**
 * Create the first organisation and the first account in an empty database.
 *
 * WHY THIS HAS TO EXIST
 *
 * On a fresh Firebase project the app cannot let anybody in, and that is by
 * design rather than an oversight. Three rules interlock:
 *
 *   - `orgs/{orgId}` is writable only by `owner()`, and `owner()` is decided by
 *     reading `users/{uid}`, which does not exist yet;
 *   - `users/{uid}` cannot be created from the browser at all, because creating
 *     a Firebase Auth user client-side signs the CURRENT user out and into the
 *     new account — which is why the rules say accounts are made server-side;
 *   - `requireOrg()` throws rather than guessing, so a signed-in account with
 *     no `orgId` reaches no screen.
 *
 * Every one of those is the right call once the system is running, and together
 * they are a locked door with the key inside. This script is the key: it uses
 * the Admin SDK, which bypasses rules, to write the four documents that make
 * the first sign-in possible.
 *
 * WHAT IT WRITES
 *
 *   orgs/{orgId}                  the tenant record the platform owns
 *   orgs/{orgId}/settings/org     the company's own record of itself
 *   orgs/{orgId}/warehouses/{id}  a first depot, because nothing can be
 *                                 received or shipped until one exists
 *   users/{uid}                   the administrator, with orgId and role
 *
 * …and, with `--owner`, a platform account instead: role `owner`, no `orgId`,
 * which is what reaches `/portal/platform` and can create further tenants.
 *
 * USAGE
 *
 *   FIREBASE_SERVICE_ACCOUNT=./service-account.json \
 *   node scripts/bootstrap-org.mjs \
 *     --org bella --name "Bella Group Nigeria" \
 *     --email you@example.com --password "a-long-one" \
 *     --first Oluwaseun --last Adeyemi [--depot "Ikeja main warehouse"] [--dry]
 *
 *   FIREBASE_SERVICE_ACCOUNT=./service-account.json \
 *   node scripts/bootstrap-org.mjs --owner \
 *     --email platform@example.com --password "a-long-one" \
 *     --first Platform --last Admin
 *
 * It is idempotent: an existing auth user is reused rather than duplicated, and
 * every write is a `set(..., { merge: true })` at a deterministic path. Running
 * it twice changes nothing, which matters because the first run is the one most
 * likely to be interrupted by a typo in a flag.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/* Nothing happens at import; see the note in `migrate-to-tenants.mjs`. */
let opts = {};
let db = null;
let auth = null;

/**
 * A password rule, applied here rather than left to Firebase.
 *
 * Firebase's own floor is six characters. This account is a super admin on a
 * system holding every customer's prices and credit limits, it is created once
 * and then usually never changed, and it is the account somebody will be
 * tempted to give the company name as a password. Twelve characters is not a
 * serious defence on its own, but it is enough to stop the worst of it.
 */
function checkPassword(password) {
  if (!password || password.length < 12) {
    console.error('--password must be at least 12 characters. This account is a super admin.');
    process.exit(1);
  }
}

function boot() {
  const { values } = parseArgs({
    options: {
      org: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      first: { type: 'string' },
      last: { type: 'string' },
      depot: { type: 'string' },
      owner: { type: 'boolean', default: false },
      dry: { type: 'boolean', default: false },
    },
  });

  const missing = ['email', 'password', 'first', 'last'].filter((k) => !values[k]);
  if (!values.owner) missing.push(...['org', 'name'].filter((k) => !values[k]));
  if (missing.length) {
    console.error(`Missing: ${missing.map((m) => `--${m}`).join(', ')}`);
    console.error('See the usage block at the top of this file.');
    process.exit(1);
  }

  /*
   * The org id becomes a path segment — `orgs/{orgId}/orders` — so it has to
   * survive being in a URL and in a rules expression. Rejecting a bad one here
   * is far cheaper than discovering it after two hundred documents carry it.
   */
  if (values.org && !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(values.org)) {
    console.error(
      `--org "${values.org}" is not usable as a path segment. Lower case letters, ` +
        'digits and hyphens, 3-40 characters, not starting or ending with a hyphen.',
    );
    process.exit(1);
  }

  checkPassword(values.password);

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath) {
    console.error('Set FIREBASE_SERVICE_ACCOUNT to the path of a service-account JSON file.');
    console.error('Firebase console → Project settings → Service accounts → Generate new private key.');
    process.exit(1);
  }

  opts = values;
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
  db = getFirestore();
  auth = getAuth();
}

/**
 * The Auth user, created or found.
 *
 * Reusing an existing account rather than failing is what makes a second run
 * safe — and a second run is normal, because the first one is usually stopped
 * by a missing flag partway through.
 */
async function ensureUser() {
  const { email, password, first, last, dry } = opts;

  let existing = null;
  try {
    existing = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  if (existing) {
    console.log(`  auth                   — ${email} already exists (${existing.uid}), reused`);
    return existing.uid;
  }

  if (dry) {
    console.log(`    would create the auth user ${email}`);
    return '<new-uid>';
  }

  const created = await auth.createUser({
    email,
    password,
    displayName: `${first} ${last}`,
    emailVerified: true,
  });
  console.log(`  auth                   → created ${email} (${created.uid})`);
  return created.uid;
}

async function write(path, data) {
  if (opts.dry) {
    console.log(`    would write ${path}`);
    return;
  }
  await db.doc(path).set(data, { merge: true });
}

export async function main() {
  boot();

  const { org, name, email, first, last, depot, owner, dry } = opts;
  console.log(`\n${dry ? 'DRY RUN — nothing will be written' : 'BOOTSTRAPPING'}`);
  console.log(owner ? 'Platform owner account' : `Organisation: ${org} (${name})\n`);

  const uid = await ensureUser();

  /* ----------------------------------------------------- the platform owner */

  if (owner) {
    /*
     * No `orgId`, deliberately. An owner belongs to the platform rather than to
     * any tenant — `AuthContext` reads the missing field and leaves the active
     * org null, which is what routes them to `/portal/platform` and keeps
     * `requireOrg()` throwing if a tenant screen is reached by URL.
     */
    await write(`users/${uid}`, {
      email,
      firstName: first,
      lastName: last,
      role: 'owner',
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  users/${uid} — platform owner`);
    console.log(`\n${dry ? 'Would create' : 'Created'} the platform account. Sign in at /login.\n`);
    return;
  }

  /* --------------------------------------------------------- the first org */

  await write(`orgs/${org}`, {
    name,
    slug: org.toLowerCase(),
    status: 'active',
    seats: 1,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`  orgs/${org} — tenant record`);

  /*
   * `approvalThreshold: 0` on purpose for a new organisation.
   *
   * Zero means every order is approved the moment it is raised, which is right
   * for a business of one person setting the system up — and critically it is
   * the value that cannot strand an order. A threshold above zero with nobody
   * yet configured to approve is how the old build produced orders that could
   * never move. Settings explains the trade when they are ready to raise it.
   */
  /*
   * The depot is written first so that `defaultWarehouseId` can go into the
   * settings document in the same write. Two writes to one document is a
   * second round trip and, more to the point, a window in which the settings
   * exist while naming a depot that does not.
   */
  const depotName = depot || 'Main warehouse';
  await write(`orgs/${org}/warehouses/main`, {
    name: depotName,
    location: '',
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`  orgs/${org}/warehouses/main — "${depotName}"`);

  await write(`orgs/${org}/settings/org`, {
    name,
    shortName: name.split(/\s+/)[0],
    currency: 'NGN',
    approvalThreshold: 0,
    proformaValidityDays: 7,
    defaultWarehouseId: 'main',
    setupComplete: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`  orgs/${org}/settings/org — company record, default depot set`);

  /*
   * `super_admin`, not `admin`.
   *
   * The distinction matters at exactly one moment: the rules refuse to let an
   * administrator change their own role or suspend themselves, so that a lone
   * admin cannot lock the organisation out of its own account. The first
   * account is that lone admin.
   */
  await write(`users/${uid}`, {
    email,
    firstName: first,
    lastName: last,
    role: 'super_admin',
    orgId: org,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`  users/${uid} — super admin of ${org}`);

  console.log(`\n${dry ? 'Would bootstrap' : 'Bootstrapped'} ${org}.`);
  console.log(`Sign in at /login as ${email}, then work through Company → Setup.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('\nBootstrap failed:', err);
    process.exit(1);
  });
}

export { checkPassword };
