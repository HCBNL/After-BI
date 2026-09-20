/**
 * Run the bootstrap against an in-memory Firestore, and check what a brand-new
 * database ends up containing.
 *
 * WHY THIS IS THE MOST IMPORTANT SCRIPT TO TEST
 *
 * It runs exactly once per customer, on an empty database, before anybody can
 * sign in — so there is nothing to compare its output against and nobody to
 * notice it got something subtly wrong. If it writes `role: 'admin'` instead of
 * `super_admin`, or forgets `active: true`, or misses `orgId`, the symptom is
 * identical in all three cases: the customer signs in and reaches a screen that
 * says nothing is available. Debugging that from the outside means reading the
 * rules, the profile and the router together.
 *
 * Every field asserted here is one the rules or the router actually branch on.
 *
 * Run with `npm run test:bootstrap`.
 */

import { register } from 'node:module';

register('./fakes/loader.mjs', import.meta.url);

const { WRITES, AUTH } = await import('./fakes/firebase-admin.mjs');

let passed = 0;
const failures = [];
const note = (what, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push(`${what}${detail ? `\n      ${detail}` : ''}`);
};

const KEY = new URL('./fakes/service-account.json', import.meta.url).pathname;
const SCRIPT = new URL('../scripts/bootstrap-org.mjs', import.meta.url).pathname;

/*
 * `main` is imported and called rather than the file being re-imported per
 * run. The script only self-executes when it IS `process.argv[1]`, and the
 * first attempt at this test cache-busted the import with `?run=…` — which
 * changed `import.meta.url`, so the guard never matched and every assertion
 * failed against an untouched database. Calling the export is both honest
 * about what is being tested and immune to that.
 */
const { main } = await import('../scripts/bootstrap-org.mjs');

async function run(args) {
  process.env.FIREBASE_SERVICE_ACCOUNT = KEY;
  process.argv = [process.argv[0], SCRIPT, ...args];
  const quiet = console.log;
  console.log = () => {};
  await main();
  console.log = quiet;
}

const at = (path) => WRITES.get(path)?.data;

/* ------------------------------------------------------ an organisation */

await run([
  '--org', 'bella',
  '--name', 'Bella Group Nigeria',
  '--email', 'admin@bella.ng',
  '--password', 'a-sufficiently-long-one',
  '--first', 'Oluwaseun',
  '--last', 'Adeyemi',
  '--depot', 'Ikeja main warehouse',
]);

const uid = AUTH.get('admin@bella.ng')?.uid;
note('an auth account is created', Boolean(uid), [...AUTH.keys()].join(', '));

const tenant = at('orgs/bella');
note('the tenant record exists', tenant?.name === 'Bella Group Nigeria', JSON.stringify(tenant));
note('the tenant is active, so `member()` lets its people in', tenant?.status === 'active');

const settings = at('orgs/bella/settings/org');
note('the company record exists', settings?.name === 'Bella Group Nigeria');
note('the currency is set, because every screen formats money with it', settings?.currency === 'NGN');
note(
  'the approval threshold starts at zero',
  settings?.approvalThreshold === 0,
  /*
   * Above zero with nobody configured to approve is how the old build produced
   * orders that could never move: submitted, no approvers, and `decideOrder`
   * refusing anybody who is not in the empty list.
   */
  'a threshold with no approvers strands every order',
);
note('the setup checklist is shown, not hidden', settings?.setupComplete === false);

const depot = at('orgs/bella/warehouses/main');
note('a first depot exists', depot?.name === 'Ikeja main warehouse');
note(
  'and it is the default, so stock has somewhere to land',
  at('orgs/bella/settings/org')?.defaultWarehouseId === 'main',
);

const profile = at(`users/${uid}`);
note('the profile is at the ROOT users collection', Boolean(profile), JSON.stringify([...WRITES.keys()]));
note('it carries the orgId, which is what `requireOrg()` needs', profile?.orgId === 'bella');
note(
  'the first account is super_admin, not admin',
  profile?.role === 'super_admin',
  /*
   * The rules refuse to let an administrator change their own role or suspend
   * themselves, so that a lone admin cannot lock the organisation out of its
   * own account. The first account is that lone admin.
   */
  'so a lone administrator cannot lock themselves out',
);
note(
  'it is active — `activeProfile()` tests `!= false`, but be explicit',
  profile?.active === true,
);
note('it has a name, so the app has something to greet', profile?.firstName === 'Oluwaseun');
note('it has the email, so People can show who this is', profile?.email === 'admin@bella.ng');

/* ------------------------------------------------------------ idempotence */

const before = WRITES.size;
const authBefore = AUTH.size;
await run([
  '--org', 'bella',
  '--name', 'Bella Group Nigeria',
  '--email', 'admin@bella.ng',
  '--password', 'a-sufficiently-long-one',
  '--first', 'Oluwaseun',
  '--last', 'Adeyemi',
]);
note('a second run creates no second account', AUTH.size === authBefore, `${authBefore} → ${AUTH.size}`);
note('a second run creates no new documents', WRITES.size === before, `${before} → ${WRITES.size}`);

/* ------------------------------------------------------- the platform owner */

await run([
  '--owner',
  '--email', 'platform@afterbi.app',
  '--password', 'another-long-one-here',
  '--first', 'Platform',
  '--last', 'Admin',
]);

const ownerUid = AUTH.get('platform@afterbi.app')?.uid;
const ownerProfile = at(`users/${ownerUid}`);
note('the platform account exists', ownerProfile?.role === 'owner', JSON.stringify(ownerProfile));
note(
  'and belongs to no organisation',
  ownerProfile?.orgId === undefined,
  /*
   * `AuthContext` leaves the active org null for an owner, which routes them to
   * the platform console and keeps `requireOrg()` throwing on any tenant screen
   * reached by URL. An orgId here would quietly make the platform account a
   * member of one customer.
   */
  'an orgId here makes the platform account a member of one customer',
);
note('the platform account is active', ownerProfile?.active === true);

/* ------------------------------------------------------------------ report */

console.log(`\n${passed} bootstrap checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
