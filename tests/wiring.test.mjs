/**
 * Does every feature actually connect?
 *
 * Four things drift apart in an app this shape, silently, and each one is a
 * feature that exists but nobody can reach — or a control that leads nowhere:
 *
 *   1. An ACTION in `tiles.ts` whose path has no ROUTE in the portal the role
 *      lands in. The tile renders, the tap 404s.
 *   2. A ROUTE with no action pointing at it. The screen exists and appears in
 *      no menu, which is how the old build ended up with nine unreachable
 *      screens.
 *   3. A COLLECTION in `tenant.ts` with no block in `firestore.rules`. It falls
 *      through to the catch-all: readable by the org, writable by nobody, so
 *      every write silently fails in production and never in the mock preview.
 *   4. An exported DB function nothing calls, or a screen calling one that no
 *      longer exists. Dead weight, or a crash.
 *
 * All four are structural, so all four can be checked without a browser. This
 * runs as plain Node over the source text — no bundler, no types — because it
 * has to be able to see things the type system deliberately cannot, like a
 * route path written as a string literal.
 *
 * Run with `npm run test:wiring`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let passed = 0;
const failures = [];
const note = (what, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push(`${what}${detail ? `\n      ${detail}` : ''}`);
};

/* ------------------------------------------------ parse the action catalogue */

const tiles = read('src/lib/tiles.ts');

/**
 * Every action object, extracted by matching braces rather than by regex.
 *
 * The first version of this used one regex with `roles:\s*([^,]+)` and silently
 * missed seven of the thirty actions — every one whose role list contains a
 * comma, which is most of the interesting ones. A test that quietly checks two
 * thirds of the thing is worse than no test, because it reports success. So
 * this walks the array and counts braces, then pulls the fields out of each
 * complete object.
 */
function stripComments(source) {
  /*
   * Comments have to go before any brace or bracket counting.
   *
   * The catalogue's own doc comment contains the literal `['owner']`, and that
   * closing bracket ended the scan at depth zero — so the parser read the whole
   * file and returned an empty array, and every downstream check "passed"
   * against nothing. Prose that quotes code is normal and will happen again;
   * stripping is the fix, not avoiding the phrase.
   */
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function parseActions(raw) {
  const source = stripComments(raw);
  const marker = 'export const ACTIONS: AppAction[] = [';
  const start = source.indexOf(marker);
  if (start === -1) return [];
  /* Anchor past the WHOLE marker, not on the next '[' — the next '[' is the one
     in `AppAction[]`. */
  const body = source.slice(start + marker.length);

  const objects = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '{') { depth += 1; if (depth === 1) { current = ''; continue; } }
    if (ch === '}') { depth -= 1; if (depth === 0) { objects.push(current); continue; } }
    if (depth === 0 && ch === ']') break;
    if (depth > 0) current += ch;
  }

  return objects
    .map((text) => ({
      id: text.match(/\bid:\s*'([^']+)'/)?.[1],
      to: text.match(/\bto:\s*'([^']+)'/)?.[1],
      rolesExpr: text.match(/\broles:\s*([\s\S]*?),?\s*\bgroup:/)?.[1]?.trim(),
      soon: /\bsoon:\s*true/.test(text),
    }))
    .filter((a) => a.id && a.to && a.rolesExpr);
}

const actions = parseActions(tiles);

const ROLE_BUNDLES = {
  ADMINS: ['super_admin', 'admin'],
  OFFICE: ['super_admin', 'admin', 'staff'],
  SELLING: ['super_admin', 'admin', 'staff', 'sales_rep'],
  OPS: ['super_admin', 'admin', 'operations_manager', 'warehouse_manager'],
  MONEY: ['super_admin', 'admin', 'finance_manager'],
  EVERYONE: [
    'super_admin', 'admin', 'staff', 'sales_rep', 'distributor',
    'warehouse_manager', 'finance_manager', 'operations_manager',
  ],
};

/**
 * Turn a roles expression into the actual list.
 *
 * Four shapes appear in the catalogue and all four have to work:
 *   EVERYONE                          a named bundle
 *   ADMINS.concat('operations_manager')  a bundle plus extras
 *   ['owner']                         a literal, one line
 *   [ 'super_admin', 'admin', … ]     a literal across several lines
 */
function resolveRoles(expr) {
  const bundle = expr.match(/^([A-Z_]+)/);
  const literals = [...expr.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

  if (!bundle) return [...new Set(literals)];

  /* A bundle, plus anything named inside a `.concat(...)` after it. */
  return [...new Set([...(ROLE_BUNDLES[bundle[1]] ?? []), ...literals])];
}

const PORTAL_ROOT = Object.fromEntries(
  [...tiles.matchAll(/^\s+(\w+):\s*'(\/portal\/\w+)',$/gm)].map(([, role, root]) => [role, root]),
);

note('the action catalogue parses', actions.length > 15, `found ${actions.length} actions`);
note('every role has a portal root', Object.keys(PORTAL_ROOT).length === 9, `found ${Object.keys(PORTAL_ROOT).length}`);

/* --------------------------------------------------- parse the route table */

const app = read('src/App.tsx');

/**
 * portal root -> Map of leaf path -> whether that leaf carries its own guard.
 *
 * The guard matters because two portals are shared by two roles each, and the
 * two roles do not have the same catalogue. A leaf only one of them should see
 * has to be wrapped in its own `RequireRole`, or the other role reaches it by
 * typing the URL.
 */
const routes = {};
for (const block of app.matchAll(/path="(\/portal\/\w+)"[\s\S]*?>([\s\S]*?)\n          <\/Route>/g)) {
  const [, root, body] = block;
  const leaves = new Map();

  /*
   * Split on `<Route` rather than matching a shape.
   *
   * The first version matched `element={<Page />}` literally, so the moment a
   * route was wrapped — `element={<AdminOnly><Page /></AdminOnly>}` — the
   * parser stopped seeing it and reported the screen as unrouted. Splitting and
   * reading each fragment does not care how the element is built.
   */
  for (const fragment of body.split('<Route').slice(1)) {
    const path = fragment.match(/^\s*\n?\s*path="([^"]+)"/)?.[1]
      ?? fragment.match(/^\s+path="([^"]+)"/)?.[1];
    if (!path || path.includes('*')) continue;
    /* Everything up to the end of this route's own element expression. */
    const scope = fragment.split(/\n\s{12}<Route|\n\s{10}<\/Route>/)[0];
    leaves.set(path, /RequireRole|AdminOnly/.test(scope));
  }
  if (/<Route index/.test(body)) leaves.set('', false);

  routes[root] = leaves;
}

note('every portal has a route block', Object.keys(routes).length === 6, `found ${Object.keys(routes).join(', ')}`);

/** Which roles land in this portal. Two portals are shared by two roles. */
const rolesInPortal = (root) =>
  Object.entries(PORTAL_ROOT).filter(([, r]) => r === root).map(([role]) => role);

/* ---------------- 1. every action reaches a route, for every role ---------- */

note('the parser sees every action in the file',
  actions.length === (tiles.match(/^\s+id: '/gm) ?? []).length,
  `parsed ${actions.length} of ${(tiles.match(/^\s+id: '/gm) ?? []).length}`);

const unreachable = [];
for (const action of actions) {
  if (action.to.startsWith('/')) continue; // absolute, resolved elsewhere
  /* A `soon` action has no screen yet BY DESIGN — the grid must render it as
     dead rather than linking it, which is checked separately below. */
  if (action.soon) continue;
  for (const role of resolveRoles(action.rolesExpr)) {
    const root = PORTAL_ROOT[role];
    if (!root) { unreachable.push(`${action.id}: role ${role} has no portal`); continue; }
    if (!routes[root]) { unreachable.push(`${action.id}: ${root} has no route block`); continue; }
    if (!routes[root].has(action.to)) unreachable.push(`${action.id} -> ${root}/${action.to} (role ${role})`);
  }
}
note('every tile leads somewhere', unreachable.length === 0, unreachable.slice(0, 12).join('\n      '));

/* ---------------- 2. every route is reachable from the catalogue ----------- */

/** Routed leaves that legitimately have no tile. */
const UNLISTED_BY_DESIGN = new Set([
  '', 'all', 'profile', 'notices',   // shell furniture, reached from the chrome
  'notices-admin',                    // the owner's tile points here under another id
]);

const orphans = [];
const unguarded = [];

for (const [root, leaves] of Object.entries(routes)) {
  const portalRoles = rolesInPortal(root);

  for (const [leaf, isGuarded] of leaves) {
    if (UNLISTED_BY_DESIGN.has(leaf)) continue;

    /* Which of this portal's roles have a tile for this leaf? */
    const withTile = portalRoles.filter((role) =>
      actions.some((a) => a.to === leaf && resolveRoles(a.rolesExpr).includes(role)),
    );

    /* Nobody: the screen is routed and appears in no menu at all. */
    if (withTile.length === 0) { orphans.push(`${root}/${leaf}`); continue; }

    /*
     * Some but not all: the portal is shared and this screen is only one of
     * the roles' business, so it MUST carry its own guard — otherwise the
     * other role reaches it by typing the URL, past a menu that denies it.
     */
    if (withTile.length < portalRoles.length && !isGuarded) {
      unguarded.push(
        `${root}/${leaf} — for ${withTile.join(', ')} but routed for ${portalRoles.join(', ')}`,
      );
    }
  }
}

note('no screen is unreachable from the menu', orphans.length === 0, orphans.slice(0, 12).join('\n      '));
note(
  'a shared portal guards the screens that are not for every role in it',
  unguarded.length === 0,
  unguarded.join('\n      '),
);

/* ---------------- 2b. a "soon" tile is not a link to nowhere --------------- */

/*
 * The catalogue can carry an action whose screen is not built — `soon: true`.
 * Every surface that renders the catalogue has to draw it as unavailable rather
 * than as a link, or the "Soon" badge sits on a tile that 404s when tapped.
 */
const soonIds = actions.filter((a) => a.soon).map((a) => a.id);
if (soonIds.length) {
  for (const file of ['src/components/home/Shortcuts.tsx', 'src/components/home/MoreSheet.tsx',
                      'src/components/layout/MenuSheet.tsx', 'src/pages/home/AllActions.tsx',
                      'src/components/layout/NavRail.tsx']) {
    note(`${file.split('/').pop()} does not link a "soon" action`, /action\.soon/.test(read(file))
      && /soon\s*\?|action\.soon\s*&&|!action\.soon|disabled/.test(read(file)));
  }
}

/* ---------------- 3. every collection has a rules block -------------------- */

const tenant = read('src/lib/tenant.ts');
const rules = read('firestore.rules');
const collections = [...tenant.matchAll(/^\s+(\w+):\s*'(\w+)',$/gm)].map(([, , name]) => name);

const unruled = collections.filter(
  (c) => !new RegExp(`match /orgs/\\{orgId\\}/${c}/`).test(rules),
);
note('every collection has its own rules block', unruled.length === 0, unruled.join(', '));

/* ---------------- 4. the data layer and the screens agree ------------------ */

const db = read('src/lib/db.ts');
const exported = [...db.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map((m) => m[1]);

function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const rel = `${dir}/${entry}`;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}
const sources = walk('src').filter((f) => /\.tsx?$/.test(f) && f !== 'src/lib/db.ts');
const allSource = sources.map(read).join('\n');

/** Exports nothing outside db.ts imports. Internal helpers are named below. */
const INTERNAL = new Set(['COLLECTIONS', 'deleteDoc']);
const dead = exported.filter((name) => !INTERNAL.has(name) && !new RegExp(`\\b${name}\\b`).test(allSource));
note('no dead exports in the data layer', dead.length === 0, dead.join(', '));

/** Anything a screen imports from db.ts that db.ts does not export. */
const missing = [];
for (const file of sources) {
  const body = read(file);
  for (const imp of body.matchAll(/import \{([^}]+)\} from '@\/lib\/db'/g)) {
    for (const raw of imp[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name && !exported.includes(name)) missing.push(`${file}: ${name}`);
    }
  }
}
note('every screen imports a function that exists', missing.length === 0, missing.join('\n      '));

/* ---------------- 5. the preview harness keeps up with the real thing ------ */

const mock = read('preview/mock-db.ts');
const mockExports = [...mock.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map((m) => m[1]);
const usedByScreens = exported.filter(
  (name) => !INTERNAL.has(name) && new RegExp(`\\b${name}\\b`).test(allSource),
);
const unmocked = usedByScreens.filter((n) => !mockExports.includes(n));
note('the preview mock covers everything the screens call', unmocked.length === 0, unmocked.join(', '));

/* ---------------- 6. nothing still references the removed feature ---------- */

/*
 * Code, not prose.
 *
 * This first ran against the raw file and flagged `ReturnsPage`, whose doc
 * comment explains that the claim cases moved there — which is exactly the
 * comment you want to keep. Stripping comments first means the check is about
 * whether anything still CALLS the removed feature, which is the real question.
 */
const claimHits = sources.filter((f) => {
  const code = stripComments(read(f));
  if (!/\bclaim/i.test(code)) return false;
  /*
   * ONE reference is allowed and required: the legacy redirect.
   *
   * `/claims` is in bookmarks and in two years of WhatsApp messages. It has to
   * resolve rather than 404, and it resolves to Returns — which is where that
   * work now lives. Anything else mentioning a claim is a leftover.
   */
  const withoutRedirect = code.replace(
    /<Route path="\/claims" element=\{<LegacyRedirect to="returns" \/>\} \/>/,
    '',
  );
  return /\bclaim/i.test(withoutRedirect);
});
note('no code still references claims', claimHits.length === 0, claimHits.join(', '));
note(
  'the old /claims address still resolves, to Returns',
  /path="\/claims" element=\{<LegacyRedirect to="returns"/.test(read('src/App.tsx')),
);
note('claims are gone from the rules', !/orgs\/\{orgId\}\/claims/.test(rules));
note('claims are gone from the collections', !collections.includes('claims'));

/* ------------------------------------------------------- the activity log */

/*
 * Removed for weight, not for principle.
 *
 * Every write in `db.ts` used to fire a second, unawaited `addDoc` into
 * `auditLog`: a second document, a second index, and a collection that grows
 * faster than every other one put together on an app whose users are on
 * metered Nigerian data. What it bought was a screen two administrators would
 * open twice a year — because the facts anybody actually asks for (who
 * amended this order, who cancelled it, who received this stock) are stamped
 * on the records themselves, and the ledgers that matter are append-only in
 * the rules whether or not a log exists.
 *
 * So: no `audit()`, no `listAudit()`, no `auditLog` collection, no rule block
 * and no Activity tile. This check stops one creeping back in a call site
 * nobody notices.
 */
const auditHits = sources.filter((f) => /\baudit/i.test(read(f)));
note('no code still references the activity log', auditHits.length === 0, auditHits.join(', '));
note('the audit collection is gone from the rules', !/auditLog/.test(rules));
note('the audit collection is gone from the collections', !collections.includes('auditLog'));

/* ------------------------------------------------- explanations behind an (i) */

/*
 * Every screen used to open on a paragraph explaining itself, and every field
 * carried a grey sentence beside its label. Individually each one was a good
 * sentence; collectively they meant the product opened on prose and the first
 * table sat a hundred pixels lower than it needed to.
 *
 * The text is still there — it answers real questions — but it is folded
 * behind the (i) beside the thing it describes. These checks stop the
 * paragraph coming back, because it comes back one screen at a time.
 */
const pageHeader = read('src/components/layout/PageHeader.tsx');
note(
  'PageHeader no longer prints its description as a paragraph',
  !/<p[^>]*>\s*\{description\}/.test(pageHeader),
);
note(
  'PageHeader hands the description to the bar for the (i)',
  /setHeading\(title, description/.test(pageHeader),
);
note(
  'the shell draws an (i) when a page has something to explain',
  /note &&\s*\(?\s*<Hint/.test(read('src/components/layout/AppShell.tsx')),
);
note(
  'a field hint is an (i), not a line of grey text',
  /\{hint && <Hint/.test(read('src/components/ui/primitives.tsx')),
);

/* ------------------------------------------------------- printed documents */

/*
 * The proforma, the invoice and the statement are the only part of this
 * product that leaves it. One module builds all three — the app this replaced
 * had a template inside the orders screen and another inside the invoices
 * screen, and they had drifted into saying different things about the same
 * order.
 */
const print = read('src/lib/print.ts');
note('one module builds every printed document', /export function printDocument/.test(print));
/*
 * Scanned over the markup only. `title:` carries a plain string that `build()`
 * escapes when it writes the <title>, so including that line would make this
 * check fail on correct code — and a check that fails on correct code gets
 * deleted rather than fixed.
 */
const printMarkup = print
  .split('\n')
  .filter((line) => !/^\s*title:/.test(line))
  .join('\n');
const rawValue = printMarkup.match(/\$\{(order|invoice|distributor|settings)\.[a-zA-Z.]+\}/);
note(
  'every printed value is escaped or coerced to a number',
  /function esc\(/.test(print) && !rawValue,
  rawValue ? `unescaped: ${rawValue[0]}` : '',
);
for (const [screen, file] of [
  ['an order', 'src/pages/sales/OrderDrawer.tsx'],
  ['an invoice', 'src/pages/finance/InvoicesPage.tsx'],
  ['a statement', 'src/pages/finance/StatementPage.tsx'],
]) {
  note(`${screen} can be printed`, /printDocument\(/.test(read(file)));
}
note(
  'the bank accounts a document prints are the ones an administrator entered',
  /settings\.banks/.test(print) && /banks/.test(read('src/pages/admin/SettingsPage.tsx')),
);

/* ------------------------------------------------------- the config files */

/*
 * JSON HAS NO COMMENTS, AND THE PLACES THAT READ IT DO NOT FORGIVE ONE.
 *
 * This codebase explains itself in comments, which works everywhere except in
 * a `.json` file — and the habit leaks. A `"//"` key was added to a rewrite in
 * `vercel.json` to explain why the SPA needs a catch-all, and it failed the
 * deploy outright: `rewrites[1] should NOT have additional property '//'`. The
 * build never started, so no test in this repository had a chance to catch it;
 * the first sign was a red deployment.
 *
 * Every config file here is schema-validated by something — Vercel, the
 * Firebase CLI, TypeScript, npm — and all of them reject an unknown key. So the
 * explanations live in the README, and this check keeps them out of the JSON.
 */
const CONFIGS = [
  'vercel.json',
  'firebase.json',
  'firestore.indexes.json',
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
];

function commentKeys(value, path = '') {
  if (Array.isArray(value)) return value.flatMap((item, i) => commentKeys(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [
      ...(k.startsWith('//') || k === '_comment' ? [`${path}.${k}`] : []),
      ...commentKeys(v, `${path}.${k}`),
    ]);
  }
  return [];
}

for (const file of CONFIGS) {
  let parsed = null;
  try {
    parsed = JSON.parse(read(file));
    note(`${file} is valid JSON`, true);
  } catch (err) {
    note(`${file} is valid JSON`, false, String(err.message));
    continue;
  }
  const comments = commentKeys(parsed);
  note(`${file} carries no pseudo-comment keys`, comments.length === 0, comments.join(', '));
}

/*
 * The properties Vercel's schema actually allows on a rewrite and on a headers
 * entry. Anything else fails validation before the build starts.
 */
const vercel = JSON.parse(read('vercel.json'));
const REWRITE_KEYS = new Set(['source', 'destination', 'has', 'missing', 'statusCode']);
const HEADER_KEYS = new Set(['source', 'headers', 'has', 'missing']);

for (const [i, rule] of (vercel.rewrites ?? []).entries()) {
  const extra = Object.keys(rule).filter((k) => !REWRITE_KEYS.has(k));
  note(`vercel rewrites[${i}] has only properties Vercel allows`, extra.length === 0, extra.join(', '));
}
for (const [i, rule] of (vercel.headers ?? []).entries()) {
  const extra = Object.keys(rule).filter((k) => !HEADER_KEYS.has(k));
  note(`vercel headers[${i}] has only properties Vercel allows`, extra.length === 0, extra.join(', '));
}

/*
 * The SPA catch-all itself. Without it a deep link like
 * `/portal/office/orders` 404s on a cold load, because there is no file at that
 * path — the single most common way a client-routed app breaks in production,
 * and invisible in local dev because the dev server rewrites for you.
 */
note(
  'every path falls back to the SPA, so a deep link survives a cold load',
  (vercel.rewrites ?? []).some((r) => r.source === '/(.*)' && r.destination === '/index.html'),
);
note(
  'the build writes where Vercel is told to look',
  vercel.outputDirectory === 'dist' && /vite build/.test(JSON.parse(read('package.json')).scripts.build),
);

/* ------------------------------------------------------------- the boot guard */

/*
 * The only thing standing between a missing environment variable and a white
 * screen. It has to be inline in `index.html` and it has to come BEFORE the
 * module script: `lib/firebase.ts` throws while the bundle is still evaluating,
 * so nothing inside the bundle — not `main.tsx`, not `ErrorBoundary` — has run
 * yet. This is easy to lose in a routine tidy-up of `index.html`, and losing it
 * is invisible until the next deploy with a typo in a variable name.
 */
const html = read('index.html');
const guardAt = html.search(/window\.addEventListener\(\s*'error'/);
const moduleAt = html.indexOf('<script type="module"');
note('the boot guard is present', guardAt !== -1);
note('the boot guard runs before the bundle', guardAt !== -1 && guardAt < moduleAt);
note(
  'the boot guard names the missing variable rather than printing a raw error',
  /VITE_\[A-Z_\]\+\) is not set/.test(html) || /VITE_\[A-Z_\]\+\)/.test(html),
);
note(
  'the boot guard steps aside once React has mounted',
  /if \(!document\.getElementById\('boot'\)\) return;/.test(html),
);
note(
  'firebase.ts still refuses to start without its config',
  /is not set/.test(read('src/lib/firebase.ts')),
  'a silent fallback here is how a fork ends up writing to production',
);

/* ---------------------------------------------------- scripts and env vars */

/*
 * EVERY npm SCRIPT MUST POINT AT A FILE THAT EXISTS.
 *
 * `"seed": "node scripts/seed-demo.mjs"` sat in `package.json` pointing at a
 * file that had never been written. Nothing caught it, because a broken script
 * only fails when somebody runs it — and the one person who would run a seed
 * script is somebody setting up a brand-new database, on their first day, with
 * no way to tell a missing file from their own mistake. That is the worst
 * possible audience for a silent breakage.
 */
const pkg = JSON.parse(read('package.json'));
for (const [name, command] of Object.entries(pkg.scripts)) {
  for (const target of command.match(/(?:^|\s)((?:scripts|tests)\/[\w./-]+)/g) ?? []) {
    const file = target.trim();
    note(`npm run ${name} → ${file} exists`, existsSync(join(ROOT, file)), 'the script would fail on first use');
  }
}

/*
 * The declared environment variables are the ones the code reads.
 *
 * `vite-env.d.ts` inherited `VITE_CLOUDINARY_*` and a `VITE_HOME` switch from
 * the app this was ported from, and nothing read either. Config that describes
 * a feature the code does not have is worse than no config: somebody sets it,
 * redeploys, and waits for something to happen.
 */
const envTypes = read('src/vite-env.d.ts');
const declaredEnv = [...envTypes.matchAll(/readonly (VITE_[A-Z_]+)\??:/g)].map(([, n]) => n);
const readEnv = new Set(
  sources
    .concat(['src/lib/firebase.ts'])
    .flatMap((f) => [...read(f).matchAll(/import\.meta\.env\.(VITE_[A-Z_]+)/g)].map(([, n]) => n)),
);
const unusedEnv = declaredEnv.filter((n) => !readEnv.has(n));
note('every declared VITE_ variable is read somewhere', unusedEnv.length === 0, unusedEnv.join(', '));

const undeclaredEnv = [...readEnv].filter((n) => !declaredEnv.includes(n));
note('every VITE_ variable the code reads is declared', undeclaredEnv.length === 0, undeclaredEnv.join(', '));

/* ------------------------------------------------------------------ report */

console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:\n' + failures.map((f) => '  x ' + f).join('\n'));
  process.exit(1);
}
