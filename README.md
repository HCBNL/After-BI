# AfterBI

Multi-tenant distribution management for Nigerian FMCG — orders, stock, invoices
and returns, with the sell-out figure behind them.

This is AfterBI rebuilt on the GetSchool interface: the same shell, the same
design-token architecture, the same one-catalogue navigation, the same
tenant-subtree data model. The domain is distribution rather than education, so
teacher/student/lesson-note became sales rep/distributor/order — but the
structure underneath is the reference app's, deliberately and almost line for
line where the code was domain-neutral.

---

## What changed, and why

| | Old AfterBI | This build |
|---|---|---|
| Language | JSX, no types | TypeScript, `strict` |
| Styling | CSS Modules + inline styles + 923-line `index.css` | Tailwind v4 on semantic design tokens |
| Icons | Font Awesome via CDN | `lucide-react`, tree-shaken |
| Tenancy | flat root collections, single customer | `orgs/{orgId}/…` subtree |
| Navigation | `NAV_CONFIG`: 250 lines, per-role, plus a `⋯` popover | one `ACTIONS` catalogue |
| Dashboards | 3 files, ~1,900 lines | 1 `PortalHome`, role picks its KPIs |
| Routes | 51 flat routes, hand-kept `allowedRoles` | 6 portals, guarded per block |
| Firebase config | production keys hard-coded as fallback | env only; fails loudly if unset |
| Stock deduction | a loop of `updateDoc`, no transaction | one transaction, all-or-nothing |
| Editing | almost nothing could be changed after it was written | one amendment policy, everywhere |
| Returns / targets / invoices | read-only screens | fully writable |
| Claims | its own collection, screen, drawer and workflow | removed — settled offline, outcome is a return |

Nine routes in the old build appeared in no menu at all and were reachable only
by typing the URL. That cannot happen here: every screen has a row in
`src/lib/tiles.ts`, and that array is what draws the rail, the bottom bar, the
menu sheet, the tile grid and the All actions page.

---

## Running it

```bash
cp .env.example .env.local     # fill in the Firebase web config
npm install
npm run dev
```

There is no hard-coded fallback config. The old build shipped a real project's
`apiKey`, `authDomain` and `appId` as literals "so the app works before env vars
are configured", which meant every fork and preview deploy pointed at the
production database. A missing variable now throws at boot.

```bash
npm run typecheck   # tsc -b
npm run build       # tsc -b && vite build
```

---

## Who can change what

This is the part the old build got most wrong, so it is worth stating plainly.
The whole policy lives in `src/lib/amend.ts`, is mirrored in
`firestore.rules`, and is covered by 44 assertions in `tests/amend.test.ts`
(`npm run test`).

**One sentence:** anything that has not yet been acted on can be changed by the
person responsible for it; once it has been acted on, only an administrator can
change it, and the change is recorded.

Every record is in exactly one of four stages:

| Stage | Who can change it | Example |
|---|---|---|
| **open** | the author, anyone who could have raised it, an admin | a draft order |
| **submitted** | the author can **recall** it; an admin can amend in place | an order awaiting approval |
| **settled** | administrators only — and it is stamped `amendedAt` on the record | an approved or fulfilled order |
| **locked** | **nobody**, including a super admin | a stock movement, a payment, an audit line |

Concretely, what you can now do that you could not before:

- **Recall your own order** out of the approval queue, edit it, and send it
  again. Every signature already given is cleared at the same time — nobody
  should be recorded as approving lines they never saw.
- **Cancel** an order that has not shipped. It stays in the list as cancelled
  rather than disappearing, because its number has been quoted.
- **Edit anything as an administrator**, at any stage, with the change shown on
  the record and written to the activity log.
- **Correct a sell-out figure.** Inside the month you keyed it, it is yours to
  fix. Once the month is reported — it is in a scorecard and a commission run —
  it takes an administrator.
- **Raise and decide returns**, **set targets**, **raise and void invoices**.
  All three were read-only screens.
- **Fix customer details** as the rep on that account, or as the distributor
  themselves — while the price tier, credit limit, payment terms and account
  status stay administrators-only. A rep who could change the tier could give
  away margin from a dropdown.

The four deliberate exceptions, and why:

- **Ledger entries** (stock movements, payments, the audit log) can never be
  edited by anyone. That is the only property that makes them worth keeping. A
  mistake is corrected with a second, opposite entry so both stay visible.
- **A fulfilled order's lines** are frozen even for an administrator — the stock
  movement they produced is in the ledger, and letting the two disagree breaks
  the thing a stock count reconciles against. The note, the distributor and
  cancellation are all still open to them.
- **An invoice** cannot be edited below what has already been paid against it,
  by anybody. That would leave the account in credit with no credit note to
  explain it.
- **A sell-out record** is genuinely deleted rather than cancelled — the one
  record in the app that is. A sale that never happened has no number anybody
  quoted and no balance that follows from it, so a "cancelled sale" row would
  just be something every report has to remember to filter out.

## Why explanations live behind an (i)

This app explains itself well, and that turned into its own fault. Every screen
opened on a paragraph under the title, every field carried a grey sentence
beside its label, and several cards ended in a boxed note. Individually each one
is a good sentence. Collectively they meant the product opened on prose, the
first table on every screen sat a hundred pixels lower than it needed to, and on
a 360px phone — which is what most of this is read on — the actual work was
below the fold.

The text is worth keeping: it answers questions people really have ("do these
prices update?", "what happens if I leave a tier blank?"). It just should not be
shouted at somebody who already knows. So it is folded behind a small **(i)**
beside the thing it describes, and it appears when it is asked for.

| Where it was | Where it is now |
|---|---|
| `PageHeader description` — a paragraph on all thirty screens | the (i) beside the title in the sticky bar |
| `Field hint` — grey text at the end of the label row, 47 of them | the (i) beside the field's label |
| A `Modal`/`Drawer` explaining what writing this form will do | the (i) beside the dialog's title (`note`, not `description`) |
| A section's standing subtitle | the (i) beside the section heading |

`Modal` and `Drawer` keep **both** props, and the distinction is load-bearing:

- `description` is a **subtitle** — who this record belongs to, what it is worth.
  It identifies the thing in front of you, so it is printed. Covering it up would
  make the dialog ambiguous.
- `note` is an **explanation** — why this dialog behaves the way it does. Worth
  reading once, so it goes behind the (i).

Three things stayed printed on purpose, and they are the test of whether the
rule is being applied or just obeyed:

- **`Alert` blocks.** "This order was cancelled", "this account has been
  suspended", "you are over your credit limit" — these are the *state of the
  thing you are looking at*, not instructions. An alert that has to be opened is
  an alert nobody reads.
- **Empty states.** Nothing else is on the screen, so the sentence is not
  competing with anything, and it is the only thing that distinguishes "nothing
  here yet" from "broken".
- **Feedback that changes as you type.** The approval threshold still states its
  own consequence under the input, because that sentence is a *readout of the
  number you just typed*, not a standing instruction.

`components/ui/Hint.tsx` is the primitive — a disclosure button, not a tooltip,
because half this app's users are on a phone where hover does not exist and a
tooltip vanishes the moment a finger moves. It unmounts its body when closed, so
a closed card is exactly as tall as every other closed card.

## The printed document

`lib/print.ts` builds the three things that leave this app: a **proforma** from
an order, an **invoice**, and a **statement of account**. For most of a
distributor's staff this is the only part of AfterBI they will ever see.

One module builds all three. The app this replaced had a template written inside
the orders screen and another inside the invoices screen, and they had drifted:
different columns, different totals, one of them printing `INV No: INV-2026-0041`
because the label and the number both carried the prefix. A document that says
two different things about the same order is worse than no document.

- **HTML and the browser's own print dialog**, not a PDF library. A PDF library
  is ~300kB of bundle before it renders a line, on an app whose users are on
  metered data and mid-range Android phones. Every platform already offers
  "Save as PDF" behind Ctrl+P, and `@page` / `break-inside` give real control
  over pagination — the items table repeats its headings across pages and no row
  splits down the middle.
- **An iframe, not `window.open`.** A new window is the thing phone browsers
  block most eagerly, and when it is blocked *nothing happens at all* — no
  error, just a button that looks broken. `window.open` remains as the fallback.
- **Designated bank accounts**, entered under Settings, printed under a line
  saying that nothing paid anywhere else is recognised. This is not decoration:
  paying a "supplier account" that turns out to belong to somebody else is the
  commonest fraud in this trade, and it works because the invoice is the only
  thing the payer checks. Nothing is printed that an administrator did not type,
  and there is no hardcoded account anywhere in the module.
- **Everything is escaped.** A product called `Bella <25cl>` or a distributor
  called `Smith & Sons` is ordinary data and completely capable of breaking the
  markup around it. The wiring audit fails if a value reaches the document
  without going through `esc()`.

The prefix bug is fixed at the source, too: a Tax ID already reading `TIN-…` is
not labelled `TIN` a second time.

## Why there is no activity log

There was one: an `auditLog` collection, a screen, and an unawaited second write
on every action in `db.ts`. It is gone.

What it cost was a second document and a second index on every write, in a
collection that grows faster than every other one put together. What it bought
was a screen two administrators would open twice a year — because the facts
anybody actually asks for are already on the records themselves: who amended
this order and when (`amendedAt` / `amendedBy`, shown on the order), who
cancelled it and why, who received this stock. And the ledgers that matter —
stock movements and payments — are append-only in `firestore.rules` whether or
not a log exists, so the property that made the log worth keeping was never the
log's to begin with.

The wiring audit fails if the word `audit` reappears anywhere in `src`, because
this is the kind of thing that comes back one call site at a time.

## Why there is no Claims feature

There was one — file, review, approve, reject, with its own collection, screen,
drawer and timeline. It is gone, deliberately.

A claim is an argument between people, and it is settled between people: on the
phone, at the depot gate, on WhatsApp. Software that models the argument adds
process without adding truth — you get a status field that lags the real
conversation by a week, and two places to look for the answer.

What software is needed for is the **outcome**, and the outcome is one of two
things:

- **The goods come back** → raise a **Return**. It puts the stock back into a
  depot, writes the ledger, and carries the credit that settles it. The old
  claim taxonomy — damage, shortage, wrong item, expiry — is now the reason list
  on the return form, which is where it does something.
- **The goods stay where they are** → apply a **discount on the next order**.
  That is a commercial decision, made by whoever has the authority to make it,
  and it lands in this system as the price tier on the distributor's account.

The old `/claims` address still resolves — to Returns — because it is in
bookmarks and in two years of messages. Old claim documents are left in the
database rather than migrated, so nothing is destroyed and nothing dead is
carried into the tenant subtree; export them first if you want the history.

**There is no credit-note record.** A return carries a credit *value*, which is
what the statement needs. A separate credit-note document with its own numbering
and approval would be the next thing to add if accounts ask for it — and it
would be worth asking whether they actually do before building it.

## Indexes, after the move to a subtree

This is the part of the port that survived longest in the wrong shape, so it is
worth stating plainly what did and did not change.

### The reassuring half

A Firestore composite index is keyed on the collection's **ID** and its query
scope — not on its full path. `queryScope: "COLLECTION"` means *any collection
with this ID, anywhere in the database, queried directly*. So
`orgs/bella/orders` and `orgs/harmony/orders` are both served by one `orders`
index definition.

**You do not need an index per tenant, and onboarding the four hundredth
customer needs no index change and no deploy.** You also do not want
`COLLECTION_GROUP` scope: that is for querying every tenant's `orders` at once,
which this app deliberately never does — see below.

### What actually broke

Three things, all about fields rather than paths:

1. **Indexes whose leading field was `orgId`.** In the flat database every query
   began `where('orgId', '==', …)`. The tenant is now in the path and
   `requireOrg()` enforces it, so those indexes described a query nothing makes.
   Dead storage, billed.
2. **Indexes that were never there.** Because the old queries all led with
   `orgId`, the index the *new* query needs is a different index. Two were
   missing outright, and one of them — `payments` by `invoiceId` — is hit by the
   statement screen, so **that screen would have failed on first use in
   production** with `FAILED_PRECONDITION`. Nothing catches this locally: the
   emulator and the mock preview both create indexes on demand.
3. **Indexes for collections that no longer exist** — `claims`, `auditLog`.

`users` is the one place `orgId` legitimately remains, and it must stay. It is
deliberately a **root** collection: signing in yields a uid and nothing else, so
something readable *before* a tenant is known has to say which tenant that uid
belongs to.

### Never add a collection-group index

A `collectionGroup('orders')` query reads every tenant's orders at once, and the
rules cannot stop it: the tenant catch-all `match /orgs/{orgId}/{document=**}`
does not apply to a collection group, which needs its own
`match /{path=**}/orders/{id}` block. An index at that scope is the first half
of a cross-tenant data leak, so `tests/indexes.test.mjs` fails on one. If the
platform console ever genuinely needs a cross-tenant query, add the rules block
in the same commit.

### Field exemptions, which is where the money is

Firestore indexes every field of every document automatically, in both
directions — and for an array of maps it indexes each element's subfields. An
order with forty lines writes hundreds of index entries nobody will ever query,
on every write, **per tenant**.

`orders.lines`, `orders.approvals`, `orders.approverNames` and `invoices.lines`
are snapshots: read with the document, never filtered or sorted on. They are
exempted in `fieldOverrides`. This is the single cheapest change in the file and
also a one-way door — re-enabling an exemption means a backfill — so it is
limited to fields that are structurally unqueryable rather than merely unqueried
today.

### Keeping it from drifting again

`tests/indexes.test.mjs` holds `SHAPES`: every query the data layer can build,
written out rather than inferred, because the interesting ones assemble their
constraints conditionally. It closes the loop in both directions —

1. every shape that needs a composite index has one;
2. every index in the file is needed by some shape (this catches the leftovers);
3. every field named in the file is one the data layer queries on;
4. every indexed collection still exists;
5. no index is collection-group scoped;
6. the snapshot payloads are exempt, and nothing exempted is also queried.

And a seventh guards the list itself: every `where`/`orderBy` field in `db.ts`
must appear in `SHAPES`, so adding a query with a new field fails the suite until
somebody writes the shape down — which is the moment to notice an index is
needed.

## Migrating: the three things that are not copies

`scripts/migrate-to-tenants.mjs` moves a flat database into `orgs/{orgId}/…`.
Most of it is copying. Three steps are not, and each one exists because of the
subtree:

**It strips the old tenant field.** A document inside `orgs/{orgId}/…` already
says which tenant it belongs to — its path does. A leftover `orgId` is a second
source of truth that can disagree with the first, and it will, the first time
somebody clones an organisation's data to set up a second one.

**It seeds the document counters.** Numbering moved from "count the collection"
to a per-tenant counter document incremented in a transaction. A counter that
does not exist reads as zero, so the first order raised after a migration is
`PO-2026-0001` — a number a distributor already has in an email. The counters
are seeded from the **highest number already used**, per year, not the document
count: a cancelled order still consumed its number, and counting the survivors
would hand it out again.

**It explodes the payments that lived on the invoice.** They were
`invoice.payments: [...]`, which answers "what has been paid on this invoice"
and cannot answer "what has this account paid, in date order" — which is what a
statement is. They are now `orgs/{orgId}/payments`, with deterministic ids so a
re-run overwrites rather than duplicating.

It also renames the flat schema's abbreviations (`distId` → `distributorId`,
`prodId`, `qty`, `totalValue`) from **one table applied to every collection**,
rather than a shape function per collection. That is not tidiness: invoices had
no shape function, so a migrated invoice kept `distId`,
`listInvoices({ distributorId })` matched nothing, and every statement in the
new app came out blank. Nothing threw and nothing was missing — the screen was
just empty, for the customer.

Two test layers cover it, and the second one is the one that found that bug:

```bash
npm run test:migrate         # the reshaping functions, one at a time
npm run test:migrate:smoke   # the whole migration, over an in-memory Firestore
```

The smoke test runs `main()` against a small but realistic flat database and
asserts on every document that lands. Every unit test passed while the migration
was still producing a broken database, because the bugs were not inside any
single function — they were in which function was wired to which collection.
That class of bug is only visible end to end.

## The five ideas worth knowing

### 1. Every organisation lives in its own subtree

`orgs/{orgId}/orders`, never `orders` filtered by `orgId`. The argument is in
full at the top of `src/lib/tenant.ts`; the short version is that a forgotten
`where('orgId','==',…)` on a shared collection returns every customer's pricing,
and there is no shape of code review that catches that reliably across ~140
queries. Under a subtree, a path without an org id is not a valid path.

It also collapses the security rules from 27 kB to one membership test:

```
match /orgs/{orgId}/{document=**} {
  allow read: if owner() || member(orgId);
}
```

A collection added next year is covered by that rule the day it is written.

Nothing in the app builds a path by hand. Screens call functions in
`src/lib/db.ts`; those call `orgPath('orders')`; that calls `requireOrg()`,
which throws rather than falling back.

### 2. One catalogue drives every navigation surface

`src/lib/tiles.ts` holds `ACTIONS` — id, label, sentence, icon, leaf path,
roles, group. The rail, the bottom bar, the menu sheet, the home tile grid and
the All actions page are five renderings of that one array. They cannot drift.

A screen's path is a **leaf** (`orders`), resolved against the role's portal
root by `resolveTo`. `/portal/office/orders` and `/portal/sales/orders` are the
same component; the catalogue does not repeat it.

### 3. Snapshots, not joins

`OrderLine.productName` and `OrderLine.unitPrice` are copies taken at write
time and never updated. A distributor querying a six-month-old invoice sees the
price they agreed to, not today's. The old build got this right for
`sales.unitPrice` and wrong for nearly everything else, so renaming a product
silently rewrote history on every past order.

The price is also never a form field. It resolves from
`product.pricing[distributor.category]`, so a rep cannot discount an order by
typing in a box. A genuine special price is a **tier** on the distributor's
account, set by an administrator, which leaves a trail.

### 4. Ledgers are append-only, and the rules enforce it

`stockMovements`, `payments` and `auditLog` allow `create` and refuse `update`
and `delete` to everybody — including a super admin. That asymmetry is the only
thing that makes them worth keeping. A mistake is corrected with a second,
opposite entry, which leaves both the error and the correction visible.

Stock deduction runs inside one `runTransaction`: every position is read, the
shortfall is checked across the whole order, then every write is issued. An
order that cannot be filled completely deducts nothing. The old
`inventoryDeduction.js` looped `updateDoc` with no transaction, so a dropped
connection left three of six lines deducted and the order marked fulfilled.

### 5. The tenant's brand reaches paper, not the app

An organisation's colour and logo appear on its invoices and statements.
Neither touches the app chrome. `src/lib/brand.ts` explains why at length: an
app that repaints its navigation per customer has no design system, it has a
theme engine, and every contrast pair in it has to hold for a colour nobody has
seen yet. AfterBI green is the app's colour for everyone.

---

## Layout

```
src/
  index.css              design tokens — light/dark, surfaces, brand ramp, print
  App.tsx                every route, six portal blocks
  types/index.ts         the whole domain
  lib/
    tenant.ts            org resolution + path builders   ← read this first
    tiles.ts             the action catalogue
    db.ts                every read and write
    roles.ts             role normalisation + scoping helpers
    brand.ts             tenant brand, and where it stops
    format.ts            naira, counts, dates
    theme.ts             light/dark, stamped before first paint
  context/
    AuthContext.tsx      who is signed in; the one place a role is cleaned
    OrgContext.tsx       products, distributors, depots — loaded once
  components/
    ui/                  Button, Card, Badge, DataTable, Modal, Drawer, Toast…
    layout/              AppShell, NavRail, BottomBar, MenuSheet, PageHeader
    home/                HomeKpis, Shortcuts, MoreSheet, SetupChecklist
    brand/               Mark, Loader
  pages/
    home/ sales/ inventory/ partners/ finance/ ops/ admin/ shared/ platform/
```

### The six portals

| Root | Roles |
|---|---|
| `/portal/platform` | `owner` — the platform itself; sees organisations, not orders |
| `/portal/office` | `super_admin`, `admin`, `staff` |
| `/portal/sales` | `sales_rep` |
| `/portal/operations` | `warehouse_manager`, `operations_manager` |
| `/portal/finance` | `finance_manager` |
| `/portal/partner` | `distributor` |

Every old address (`/admin/*`, `/invoices`, `/claims`, …) redirects into the
signed-in person's own portal. Those links are in bookmarks and in emailed
invoices, and they resolve rather than 404.

---

## Migrating existing data

```bash
FIREBASE_SERVICE_ACCOUNT=./service-account.json \
  node scripts/migrate-to-tenants.mjs --org acme --name "Acme Distribution" --dry
```

Run with `--dry` first; it prints what it would write and touches nothing.

The script copies each old root collection into `orgs/{orgId}/…`, fixes the
shapes that changed (`items` → `lines`, `qty` → `quantity`, `prodId` →
`productId`, signed movement quantities → positive + `direction`), rewrites
stock positions to the `{warehouseId}_{productId}` key, normalises legacy role
strings, and stamps `orgId` onto every `users/{uid}`.

It **deletes nothing** — the old collections are left exactly as they were, so a
bad run costs a re-run rather than a restore. It is idempotent: every write is a
`set` at a deterministic path, so running it twice produces the same database.
That matters because a run over a large database will be interrupted, and the
recovery has to be "run it again".

Then deploy the rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## The preview harness

`vite.preview.config.ts` renders the real screens against fixtures. Four
aliases — `@/lib/db`, `@/lib/firebase`, `firebase/firestore` and
`@/context/AuthContext` — are swapped for mocks in `preview/`; every component,
context and route below them is the real one.

```bash
npx vite build --config vite.preview.config.ts
npx vite preview --config vite.preview.config.ts --port 4183
# then: /portal/office?role=admin, /portal/partner?role=distributor, …
```

It exists because it exercises the actual layout code rather than a parallel
copy, and it is what found every rendering bug in this build — see below. It is
not part of the shipped build and can be deleted if you would rather not keep
it.

## How this is checked

Four layers, because each one catches things the others cannot:

```bash
npm run test           # policy 51 · wiring 33 · indexes 30 · migration 27 + 30
node sweep.mjs         # 146 route x role x viewport renders
node flows.mjs         # 89 interaction tests: click the control, assert the result
```

| Layer | What it catches | Example it caught |
|---|---|---|
| `tests/amend.test.ts` | the amendment policy, as a truth table | — |
| `tests/indexes.test.mjs` | a query with no index, an index with no query | the statement screen had no `payments` index and would have failed in production |
| `tests/migrate.test.mjs` | the migration's reshaping, function by function | `role: ''` — an account that can sign in and see nothing |
| `tests/migrate-smoke.test.mjs` | the whole migration, end to end | invoices kept `distId`, so every migrated statement was blank |
| `tests/wiring.test.mjs` | tiles/routes/rules/data-layer drift | staff could reach Settings by URL |
| `sweep.mjs` | a screen that fails to render | — |
| `flows.mjs` | a control that does nothing, or the wrong thing | opening any order drawer crashed |
| the config checks in `wiring` | a deploy that fails before any build runs | a `"//"` comment key in `vercel.json` failed Vercel's schema validation |

The distinction between the last two matters. The sweep only ever *renders* a
screen, so it passed a build in which opening any order drawer crashed with
React error #310 — a conditional hook that only fired once a row was tapped. A
render check and an interaction check are not the same test.

The wiring audit is worth describing, because it is the one that keeps the app
honest as it grows. It reads `tiles.ts`, `App.tsx`, `tenant.ts` and
`firestore.rules` as text and asserts they agree:

1. every tile resolves to a real route, for every role that sees it;
2. every route is reachable from some role's menu;
3. a portal shared by two roles guards the screens that are not for both;
4. every collection has its own rules block;
5. nothing is exported from the data layer that no screen calls, and nothing is
   called that is not exported;
6. the preview mock covers everything the screens call;
7. no explanation has crept back out from behind its (i);
8. every value reaching a printed document is escaped, and the three screens
   that produce one still can;
9. nothing references claims or the activity log.

---

## Bugs found and fixed

Beyond the editing gap, in rough order of severity:

1. **Every order in a new organisation was permanently stuck.** With the default
   approval threshold of ₦0, submitting wrote `pending_approval` with an empty
   approver list — and `decideOrder` requires the caller to be in that list, so
   nothing could ever move it. The first thing anybody did with the product was
   raise an order the depot never saw. Submitting with no required signature now
   means `approved`.
2. **Opening an order drawer crashed the screen.** A `useAsync` call sat below an
   early `return null`, so the hook count changed the moment a row was tapped.
3. **"Record a movement" did nothing until stock already existed** — and
   recording stock *in* is how the first position gets created. A bootstrap
   deadlock on a fresh install.
4. **The statement screen never picked an account.** `distributors[0]` was read
   in `useState` before `OrgContext` had loaded, so it seeded `''` and never
   corrected — the screen read as "this account has no history".
5. **The overdue meter filled backwards.** It showed the proportion of debt that
   was *healthy* on a card whose number, label and colour are all about what is
   late, so worse debt drew a shorter red bar.
6. **Sortable table headers lost their uppercase** to Tailwind's preflight
   `button { text-transform: none }`, so a table with one static column looked
   like two tables.
7. **The profile screen demanded an `OrgProvider`** the platform console
   correctly does not mount.
8. **The order drawer promised a control that did not exist** — "open it from
   the list and send it for approval", with no such button anywhere.
9. **Staff could reach ten administrator screens by typing the URL** — Settings,
   People, Invite, the audit log, the price list. The rules refused every write,
   so what they actually saw was a form whose Save button failed. Same in the
   operations portal for four screens. Both now carry nested role guards, and
   the wiring audit fails the build if a guard goes missing.
10. **A fulfilled order offered a Cancel button that always threw.** The stock
   has gone; `cancelOrder` refuses it. The generic verdict did not know that.
11. **A finance manager could not correct a due date** on an invoice somebody
   else raised — they were neither the author nor an admin — so the only remedy
   was to void a correct invoice and re-raise it under a new number. Finance now
   holds authority over invoices while they are in flight.
12. **"Soon" tiles were live links to nowhere.** The platform Website tile
   rendered with a badge and 404'd on tap. All five navigation surfaces now draw
   an unbuilt action as dimmed and inert.

## What is not built yet

- `/api/invite` — the Invite screen posts to it. Accounts must be created with
  the Admin SDK server-side: creating a Firebase Auth user from the browser
  signs the *current* user out and into the new account.
- `/api/enquiry` — the marketing site's form. Enquiries are read-only from the
  client; the rules refuse client writes so the platform inbox is not an open
  spam endpoint.
- The marketing site itself. `/` redirects to sign-in.
- The platform Website screen is marked `soon` in the catalogue and dims itself.
- Invoices are raised from a fulfilled order by hand. Doing it automatically, in
  the same transaction as fulfilment, is the next thing worth building.
- There are no notifications. A fulfilled order that nobody invoices, and an
  invoice that quietly goes overdue, are both visible on their own screens and
  on the home KPIs, but nothing goes looking for the person who should act. That
  is the other half of "complete workflows" and it needs a notifications
  collection before it needs anything else.
- The printed document has no delivery note variant. Orders, invoices and
  statements print; a waybill for the driver does not.
- `firestore.rules` is mirrored from `lib/amend.ts` by hand and reviewed
  line-by-line, but has **not** been run against the Firestore emulator — its
  jar could not be downloaded in the environment this was built in. Before going
  live, run `firebase emulators:start --only firestore` and exercise the
  amendment paths; that is the one piece of this work without automated
  coverage.
- The migration is covered by an in-memory Firestore (`tests/fakes/`) rather
  than the emulator, for the same reason. What that stub cannot tell you is
  whether a batch of 400 commits cleanly against a real project, or how long a
  million-document collection takes. **Always run it with `--dry` first**, and
  run it against a restored copy of the database before you run it against the
  database.
- A credit note is referred to in one place (an invoice that cannot be reduced
  below what has been paid) but is not its own record. See the Claims section
  above for why that is a deliberate pause rather than an oversight.

---

## Deploying the database shape

The two files that describe the database are deployed separately from the app,
and both are safe to deploy before the code that uses them:

```bash
firebase deploy --only firestore:indexes,firestore:rules
```

Composite indexes **build in the background**, over every existing document, and
a query against an index that is still building fails exactly as one against a
missing index does. On a database with real history that is minutes, not
seconds. So the order is: deploy the indexes, watch them go green in the
Firestore console under Indexes, then deploy the app.

`fieldOverrides` are the exception worth pausing on. Disabling a field's
automatic index takes effect immediately and **deletes those index entries** —
re-enabling means a backfill over the whole collection. Only exempt a field you
are sure is structurally unqueryable. `npm run test:indexes` refuses an
exemption on a field the app filters or sorts on, which is the mistake that
matters.

Onboarding a new tenant needs neither file redeployed: a tenant is a subtree,
and every index in this file already covers every collection with that ID at
any path.

---

## Deploying the app (Vercel)

`vercel.json` sets the build command, the output directory and the SPA
catch-all. Two things about it are worth knowing before you edit it.

**It is schema-validated, and JSON has no comments.** A `"//"` key added to a
rewrite to explain the catch-all failed the deploy outright —
`rewrites[1] should NOT have additional property '//'` — and because validation
happens before the build starts, no test in this repository ran. The first sign
was a red deployment. Explanations go here in the README instead, and
`npm run test:wiring` now rejects a pseudo-comment key in any config file, plus
any property Vercel's rewrite and header schemas do not allow.

**The SPA catch-all is load-bearing.** Without `"/(.*)" → "/index.html"`, a deep
link like `/portal/office/orders` 404s on a cold load, because there is no file
at that path. It never shows up in development, because the dev server rewrites
for you.

### Set the environment variables, then rebuild

In Vercel → Settings → Environment Variables, for Production **and** Preview:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Vite writes these into the bundle **at build time**, so adding one to an
existing deployment does nothing until you redeploy. Nothing here is secret: a
Firebase web key identifies the project, it does not grant access — that is
`firestore.rules`.

A missing variable does not fail the build. `lib/firebase.ts` throws at module
scope instead, which is deliberate (the build this replaced shipped a real
project's keys as literals, so every fork pointed at production). But that throw
happens while the bundle is still evaluating, before React exists — so
`ErrorBoundary` cannot catch it and the page would simply be **white**. There is
an inline guard in `index.html`, ahead of the module script, that paints the
name of the missing variable instead. It is the only code that has run at that
point, and the only code that runs at all if the bundle itself 404s.

### Then add the domain to Firebase

Sign-in fails with `auth/unauthorized-domain` until the deployed host is in
**Firebase console → Authentication → Settings → Authorized domains**. Add both
the production domain and the `*.vercel.app` preview domain. This is not a code
change and it is the most common reason a first deploy looks broken after the
build finally goes green.

### The order that works

1. `firebase deploy --only firestore:indexes,firestore:rules`, and wait for the
   indexes to finish building (see above — a query against an index that is
   still building fails exactly like one against a missing index);
2. set the environment variables in Vercel;
3. deploy the app;
4. add the domain to Firebase's authorized list;
5. run `scripts/migrate-to-tenants.mjs --dry` against a restored copy of the
   database before you run it for real.

`/api/invite` and `/api/enquiry` are rewritten but not implemented — see
"What is not built yet". Nothing else depends on them.
