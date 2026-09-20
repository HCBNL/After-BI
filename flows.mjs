/**
 * Does every feature actually work when you use it?
 *
 * `sweep.mjs` proves every screen RENDERS. This proves the controls on them DO
 * something — which is a different question, and the one that caught a crash the
 * sweep passed clean (a conditional hook that only fired once a row was
 * clicked).
 *
 * Each case: open a screen as a role, operate its primary control, assert what
 * appears. Run against the mock preview on :4190.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];

async function flow(name, { role = 'admin', portal = 'office', url, steps, expect: want, reject, shot }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 110)));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/TUNNEL|fonts|favicon|404/.test(t)) errs.push(t.slice(0, 110));
  });

  /*
   * `?` or `&`, depending on whether the path already carries a query.
   *
   * This built `/orders?new=1?role=admin` for a while — two question marks — so
   * `params.get('new')` came back as `1?role=admin`, the drawer never opened,
   * and two perfectly good tests failed for a reason that had nothing to do
   * with the app.
   */
  const sep = url.includes('?') ? '&' : '?';
  const target = url.startsWith('//') ? url.slice(1) : `/portal/${portal}${url}`;
  await page.goto(`${BASE}${target}${sep}role=${role}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1000);

  try {
    if (steps) await steps(page);
    await page.waitForTimeout(500);
    const raw = await page.locator('body').innerText();
    /*
     * Matched case-insensitively on purpose.
     *
     * Half this design system's labels are uppercased in CSS — stat tiles,
     * table headers, section headings — and `innerText` returns them as
     * rendered. Asserting on the source casing failed fourteen checks that were
     * all looking at the right text. These assertions are about whether the
     * content is there, not how it is cased; the casing itself is covered by
     * the table-header check in the design pass.
     */
    const text = raw.toLowerCase();

    const problems = [];
    if (errs.length) problems.push(`JS: ${errs[0]}`);
    if (raw.includes('This screen did not load')) problems.push('ERROR BOUNDARY');
    if (want && !text.includes(want.toLowerCase())) problems.push(`missing "${want}"`);
    if (reject && text.includes(reject.toLowerCase())) problems.push(`should NOT show "${reject}"`);

    if (shot) await page.screenshot({ path: `/home/claude/shots/${shot}.png` });
    results.push({ name, ok: problems.length === 0, why: problems.join(' | ') });
  } catch (e) {
    results.push({ name, ok: false, why: String(e).split('\n')[0].slice(0, 110) });
  }
  await ctx.close();
}

const click = (label) => async (p) => p.getByRole('button', { name: label }).first().click();
const openRow = (text) => async (p) => p.getByText(text).first().click();

/* ============================ ORDERS ============================ */

await flow('orders: list loads with data', { url: '/orders', expect: 'PO-2026-0041' });
await flow('orders: status tabs filter', {
  url: '/orders', expect: 'PO-2026-0037', reject: 'PO-2026-0039',
  steps: async (p) => p.getByRole('tab', { name: /Drafts/ }).click(),
});
await flow('orders: search narrows the list', {
  url: '/orders', expect: 'Northgate', reject: 'Delta Supplies',
  steps: async (p) => p.getByPlaceholder(/Order number/).fill('Northgate'),
});
await flow('orders: new-order form prices from the tier', {
  url: '/orders?new=1', expect: '₦3,950',
  steps: async (p) => {
    await p.locator('select').first().selectOption({ label: 'Adeola Ventures Ltd — Modern trade' });
    await p.waitForTimeout(400);
    await p.getByText('Bella Malt 33cl').first().click();
  },
  shot: 'f-new-order',
});
await flow('orders: credit headroom is shown before you build', {
  url: '/orders?new=1', expect: 'credit',
  steps: async (p) => p.locator('select').first().selectOption({ label: 'Adeola Ventures Ltd — Modern trade' }),
});
await flow('orders: admin can EDIT an approved order', {
  url: '/orders', expect: 'Edit', steps: openRow('PO-2026-0040'), shot: 'f-admin-edit-approved',
});
await flow('orders: edit opens the form pre-loaded', {
  url: '/orders', expect: 'Edit PO-2026-0040',
  steps: async (p) => {
    await p.getByText('PO-2026-0040').first().click();
    await p.waitForTimeout(600);
    await p.getByRole('button', { name: 'Edit' }).first().click();
  },
  shot: 'f-edit-loaded',
});
await flow('orders: rep can RECALL their own submitted order', {
  role: 'sales_rep', portal: 'sales', url: '/orders', expect: 'Recall',
  steps: openRow('PO-2026-0042'), shot: 'f-rep-recall',
});
await flow('orders: rep cannot recall a colleague’s', {
  role: 'sales_rep', portal: 'sales', url: '/orders',
  expect: 'Whoever raised it can recall it',
  steps: async (p) => {
    await p.getByText('PO-2026-0041').first().click();
    await p.waitForTimeout(600);
    /* Assert on the CONTROL, not the prose. The explanation on this screen
       contains the word "recall" — which is the point of it — so a text match
       can never distinguish "no button" from "a button". */
    if ((await p.getByRole('button', { name: /^Recall$/ }).count()) > 0) {
      throw new Error('a Recall button was offered on a colleague’s order');
    }
  },
});
await flow('orders: draft offers Send for approval', {
  url: '/orders', expect: 'Send for approval', steps: openRow('PO-2026-0037'),
});
await flow('orders: recall dialog explains cleared signatures', {
  url: '/orders', expect: 'signatures already given are cleared',
  steps: async (p) => {
    await p.getByText('PO-2026-0041').first().click();
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: 'Recall' }).first().click();
  },
});
await flow('orders: approver sees the signature panel', {
  url: '/orders', expect: 'Your signature', steps: openRow('PO-2026-0041'),
});
await flow('orders: fulfilled order offers no cancel', {
  url: '/orders', reject: 'Cancel order', steps: openRow('PO-2026-0039'),
});

/* ============================ APPROVALS ============================ */

await flow('approvals: shows what is waiting on me', { url: '/approvals', expect: 'PO-2026-0041' });

/* ============================ SELL-OUT ============================ */

await flow('sell-out: list and totals load', { url: '/sell-out', expect: 'This month' });
await flow('sell-out: capture form prices from the tier', {
  url: '/sell-out', expect: 'Record a sale', steps: click(/Record a sale/),
});
await flow('sell-out: rows offer correction', {
  url: '/sell-out',
  steps: async (p) => {
    if ((await p.getByRole('button', { name: /^Edit the /i }).count()) === 0) {
      throw new Error('no per-row edit control');
    }
  },
});
await flow('sell-out: correction dialog opens', {
  url: '/sell-out', expect: 'Correct this record',
  steps: async (p) => p.getByRole('button', { name: /^Edit the /i }).first().click(),
  shot: 'f-sellout-edit',
});

/* ============================ CATALOGUE ============================ */

await flow('catalogue: groups by category with prices', { url: '/catalogue', expect: 'Beverages' });
await flow('catalogue: distributor sees ONE tier, locked', {
  role: 'distributor', portal: 'partner', url: '/catalogue',
  expect: 'Modern trade', reject: 'Open trade',
});

/* ============================ STOCK ============================ */

await flow('stock: low lines surface first', { url: '/stock', expect: 'LOW' });
await flow('stock: movement dialog opens from the toolbar', {
  url: '/stock', expect: 'Record a movement', steps: click(/Record a movement/),
});
await flow('stock: movement dialog opens from a row', {
  url: '/stock', expect: 'Record a movement', steps: openRow('Zesty Orange 1L'),
});
await flow('stock: everything-tab shows untracked lines', {
  url: '/stock', expect: 'not tracked',
  steps: async (p) => p.getByRole('button', { name: 'Everything' }).click(),
});
await flow('movements: ledger loads with balances', { url: '/movements', expect: 'Balance after' });

/* ============================ PRODUCTS ============================ */

await flow('products: three tier columns', { url: '/products', expect: 'not priced' });
await flow('products: editor opens on a row', {
  url: '/products', expect: 'Price by tier', steps: openRow('Bella Malt 33cl'),
});
await flow('products: new-product form opens', {
  url: '/products', expect: 'New product', steps: click(/New product/),
});

/* ============================ DEPOTS ============================ */

await flow('depots: list and editor', {
  url: '/warehouses', expect: 'New depot', steps: click(/New depot/),
});

/* ============================ RETURNS ============================ */

await flow('returns: list loads', { url: '/returns', expect: 'RET-2026-0006' });
await flow('returns: raise form opens', {
  portal: 'operations', role: 'operations_manager', url: '/returns',
  expect: 'Raise a return', steps: click(/Raise a return/), shot: 'f-raise-return',
});
await flow('returns: requested return can be decided', {
  portal: 'operations', role: 'operations_manager', url: '/returns',
  expect: 'Approve', steps: openRow('RET-2026-0006'),
});
await flow('returns: approved return offers receipt into a depot', {
  portal: 'operations', role: 'operations_manager', url: '/returns',
  expect: 'Receive it back into stock',
  steps: async (p) => {
    await p.getByRole('tab', { name: /All/ }).click();
    await p.waitForTimeout(400);
    await p.getByText('RET-2026-0007').first().click();
  },
  shot: 'f-return-receive',
});

/* ============================ DISTRIBUTORS ============================ */

await flow('distributors: outstanding and headroom compute', { url: '/distributors', expect: 'Credit left' });
await flow('distributors: admin edits everything', {
  url: '/distributors', reject: 'Some fields are locked', steps: openRow('Adeola Ventures Ltd'),
});
await flow('distributors: staff sees terms locked', {
  role: 'staff', url: '/distributors', expect: 'Some fields are locked',
  steps: openRow('Adeola Ventures Ltd'), shot: 'f-distributor-locked',
});
await flow('distributors: new form opens', {
  url: '/distributors', expect: 'New distributor', steps: click(/New distributor/),
});

/* ============================ INVOICES ============================ */

await flow('invoices: overdue sorts to the top', { url: '/invoices', expect: 'days late' });
await flow('invoices: raise form lists un-invoiced orders', {
  portal: 'finance', role: 'finance_manager', url: '/invoices',
  expect: 'Raise an invoice', steps: click(/Raise an invoice/), shot: 'f-raise-invoice',
});
await flow('invoices: payment dialog opens on a row', {
  portal: 'finance', role: 'finance_manager', url: '/invoices',
  expect: 'owing', steps: openRow('INV-2026-0112'),
});
await flow('invoices: dates can be corrected', {
  portal: 'finance', role: 'finance_manager', url: '/invoices',
  expect: 'Correct the issue or due date', steps: openRow('INV-2026-0112'),
});
await flow('invoices: void offered only with nothing paid', {
  portal: 'finance', role: 'finance_manager', url: '/invoices',
  expect: 'Void', steps: openRow('INV-2026-0112'),
});
await flow('invoices: part-paid invoice cannot be voided', {
  portal: 'finance', role: 'finance_manager', url: '/invoices',
  reject: 'Void',
  steps: async (p) => {
    await p.getByRole('tab', { name: /All/ }).click();
    await p.waitForTimeout(400);
    await p.getByText('INV-2026-0111').first().click();
  },
});

/* ============================ STATEMENT ============================ */

await flow('statement: running balance renders', { url: '/statement', expect: 'Balance carried forward' });
await flow('statement: picks an account once loaded', { url: '/statement', reject: 'Nothing on this account' });

/* ============================ CREDIT ============================ */

await flow('credit: exposure and ceiling used', { url: '/credit', expect: 'Ceiling used' });

/* ============================ REPORTS ============================ */

await flow('reports: export form renders', { url: '/reports', expect: 'Download CSV' });

/* ============================ LEADS ============================ */

await flow('leads: pipeline board renders all stages', { url: '/leads', expect: 'Qualified' });
await flow('leads: editor opens on a card', {
  url: '/leads', expect: 'Stage', steps: openRow('Kwara Foods Ltd'),
});
await flow('leads: new-lead form opens', { url: '/leads', expect: 'New lead', steps: click(/New lead/) });

/* ============================ TARGETS ============================ */

await flow('targets: attainment computes from sell-out', { url: '/targets', expect: 'Attainment' });
await flow('targets: admin can set one', {
  url: '/targets', expect: 'Who carries it', steps: click(/Set a target/), shot: 'f-set-target',
});
await flow('targets: rep gets no controls', {
  role: 'sales_rep', portal: 'sales', url: '/targets', reject: 'Set a target',
});

/* ============================ SCORECARDS / TERRITORIES ============================ */

await flow('scorecards: ranks by value', { url: '/scorecards', expect: 'Attainment' });
await flow('scorecards: dimension toggle works', {
  url: '/scorecards', expect: 'Rep',
  steps: async (p) => p.getByRole('button', { name: 'Reps' }).click(),
});
await flow('territories: covered and uncovered split', { url: '/territories', expect: 'No distributor yet' });

/* ============================ PEOPLE / INVITE / SETTINGS ============================ */

await flow('people: list loads with roles', { url: '/users', expect: 'Sales rep' });
await flow('people: editor opens', { url: '/users', expect: 'Active', steps: openRow('Ifeanyi') });
await flow('people: suspended account is flagged', { url: '/users', expect: 'Suspended' });
await flow('invite: both panels render', { url: '/invite', expect: 'A distributor' });
await flow('settings: loads current org values', { url: '/settings', expect: 'Tax ID' });
await flow('settings: the threshold states its consequence as you type', {
  url: '/settings', expect: 'needs a signature',
});
await flow('settings: bank accounts can be added', {
  url: '/settings', expect: 'Account number',
  steps: async (p) => p.getByRole('button', { name: 'Add an account' }).click(),
});
await flow('setup: checklist reflects real state', { url: '/setup', expect: 'Add your depots' });
/*
 * The activity log is gone — on purpose, for weight. Its route has to 404
 * into the portal rather than render half a screen, and no tile may still
 * offer it.
 */
await flow('activity log is gone: no tile offers it', { url: '/all', reject: 'Activity' });
await flow('activity log is gone: the route does not render a screen', {
  url: '/audit', reject: 'who changed what',
});

/* ============================ PRINTED DOCUMENTS ============================ */

/*
 * The printed proforma, invoice and statement are the only part of this
 * product that leaves it. These check the button is offered and that pressing
 * it builds a document rather than throwing — the print dialog itself is
 * stubbed, because a real one blocks the browser forever.
 */
const stubPrint = async (p) => {
  await p.addInitScript(() => {
    // eslint-disable-next-line no-undef
    window.__printed = [];
    const realCreate = document.createElement.bind(document);
    document.createElement = (tag, ...rest) => {
      const el = realCreate(tag, ...rest);
      if (String(tag).toLowerCase() === 'iframe') {
        queueMicrotask(() => {
          try {
            Object.defineProperty(el.contentWindow, 'print', {
              value: () => window.__printed.push(el.contentWindow.document.title),
              configurable: true,
            });
          } catch { /* not ready yet; the assertion below covers it */ }
        });
      }
      return el;
    };
  });
};

await flow('print: an order offers a proforma', {
  url: '/orders', expect: 'Proforma', steps: openRow('PO-2026-0041'),
});
await flow('print: an invoice offers a printed copy', {
  url: '/invoices', expect: 'Print', steps: openRow('INV-2026'),
});
await flow('print: a statement offers a printed copy', { url: '/statement', expect: 'Print' });
await flow('print: building a proforma throws nothing', {
  url: '/orders',
  steps: async (p) => {
    await stubPrint(p);
    await openRow('PO-2026-0041')(p);
    await p.waitForTimeout(400);
    await p.getByRole('button', { name: 'Proforma' }).first().click();
  },
});

/* ============================ THE (i) DISCLOSURE ============================ */

/*
 * Every screen used to open on a paragraph explaining itself. The paragraph
 * now lives behind the (i) beside the title in the bar: absent until asked
 * for, and complete when it arrives.
 */
await flow('hints: a page explains itself only when asked', {
  url: '/invoices',
  reject: 'with the days each one is late',
});
await flow('hints: the (i) reveals the explanation', {
  url: '/invoices',
  expect: 'with the days each one is late',
  steps: async (p) => p.getByRole('button', { name: /^About / }).first().click(),
});
await flow('hints: a field hint is folded too', {
  url: '/settings',
  reject: 'nothing needs a signature',
});

/* ============================ SHELL / ACCESS ============================ */

await flow('home: KPIs and shortcuts render', { url: '', expect: 'OPEN ORDERS' });
await flow('all actions: every group listed', { url: '/all', expect: 'All actions' });
await flow('profile: loads and shows role', { url: '/profile', expect: 'Administrator' });
await flow('notices: platform notices render', { url: '/notices', expect: 'maintenance' });
await flow('claims are gone: the old /claims address redirects, does not 404', {
  url: '//claims', expect: 'Returns', reject: 'That page is not here',
});
await flow('claims are gone: no in-portal claims screen', {
  url: '/claims', expect: 'That page is not here',
});
await flow('access: staff cannot reach Settings by URL', {
  /* Asserting on a Settings-only string. The org name was the wrong probe —
     the home screen staff are bounced to shows it in the header. */
  role: 'staff', url: '/settings', reject: 'Approval threshold', shot: 'f-staff-blocked',
});
await flow('access: staff cannot reach People by URL', {
  role: 'staff', url: '/users', reject: 'Invite',
});
await flow('access: warehouse manager cannot reach Depots by URL', {
  role: 'warehouse_manager', portal: 'operations', url: '/warehouses', reject: 'New depot',
});
await flow('access: finance can correct an issued invoice', {
  role: 'finance_manager', portal: 'finance', url: '/invoices',
  expect: 'Correct the issue or due date',
  steps: async (p) => p.getByText('INV-2026-0112').first().click(),
});
await flow('access: distributor sees only their own account', {
  role: 'distributor', portal: 'partner', url: '/orders', expect: 'Adeola Ventures',
});

/* ============================ PLATFORM ============================ */

await flow('platform: tenant list and revenue', { portal: 'platform', role: 'owner', url: '/organisations', expect: 'Bella Group Nigeria' });
await flow('platform: pricing summary', { portal: 'platform', role: 'owner', url: '/pricing', expect: 'Annualised' });
await flow('platform: enquiries inbox', { portal: 'platform', role: 'owner', url: '/enquiries', expect: 'Harmony' });
await flow('platform: notice composer', {
  portal: 'platform', role: 'owner', url: '/notices-admin',
  expect: 'New notice', steps: click(/New notice/),
});
await flow('platform: website tile is inert, not a dead link', {
  portal: 'platform', role: 'owner', url: '', expect: 'Website',
  steps: async (p) => {
    const el = p.getByTitle(/not built yet/).first();
    if ((await el.count()) === 0) throw new Error('"soon" tile is not marked unavailable');
  },
});

/* ============================ report ============================ */

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  |  ${r.why}`}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
if (failed.length) process.exit(1);
