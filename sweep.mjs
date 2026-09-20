import { chromium } from 'playwright';

const ROUTES = {
  office: ['', '/all', '/orders', '/approvals', '/sell-out', '/catalogue', '/leads', '/targets',
           '/scorecards', '/territories', '/stock', '/products', '/movements', '/warehouses',
           '/returns', '/invoices', '/statement', '/credit', '/reports', '/distributors',
           '/contacts', '/setup', '/users', '/invite', '/settings',
           '/profile', '/notices', '/bogus'],
  sales: ['', '/orders', '/sell-out', '/catalogue', '/leads', '/targets', '/invoices', '/statement', '/contacts', '/profile'],
  operations: ['', '/orders', '/approvals', '/deliveries', '/stock', '/movements', '/warehouses', '/returns', '/reports', '/profile'],
  finance: ['', '/orders', '/invoices', '/statement', '/credit', '/reports', '/targets', '/profile'],
  partner: ['', '/orders', '/deliveries', '/sell-out', '/catalogue', '/stock', '/returns', '/invoices', '/statement', '/profile'],
  platform: ['', '/all', '/organisations', '/enquiries', '/pricing', '/notices-admin', '/profile'],
};
const ROLE_FOR = { office: 'admin', sales: 'sales_rep', operations: 'warehouse_manager', finance: 'finance_manager', partner: 'distributor', platform: 'owner' };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const problems = [];
let checked = 0;

for (const [portal, paths] of Object.entries(ROUTES)) {
  for (const vp of [{ w: 390, h: 844, n: 'phone' }, { w: 1440, h: 900, n: 'desktop' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: 'light' });
    const page = await ctx.newPage();
    for (const path of paths) {
      const url = `/portal/${portal}${path}?role=${ROLE_FOR[portal]}`;
      const errs = [];
      const onErr = (e) => errs.push(String(e).split('\n')[0].slice(0, 120));
      const onCon = (m) => { const t = m.text(); if (m.type() === 'error' && !/TUNNEL|fonts|favicon|404/.test(t)) errs.push(t.slice(0, 120)); };
      page.on('pageerror', onErr);
      page.on('console', onCon);
      await page.goto(`http://localhost:4173${url}`, { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(700);

      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        text: document.body.innerText.replace(/\s+/g, ' ').trim(),
        boundary: document.body.innerText.includes('This screen did not load'),
      }));

      checked += 1;
      if (errs.length) problems.push(`${url} [${vp.n}] JS: ${errs[0]}`);
      if (info.boundary) problems.push(`${url} [${vp.n}] ERROR BOUNDARY TRIPPED`);
      if (info.overflow > 2) problems.push(`${url} [${vp.n}] H-OVERFLOW ${info.overflow}px`);
      if (info.text.length < 40 && !path.includes('bogus')) problems.push(`${url} [${vp.n}] NEARLY EMPTY (${info.text.length} chars)`);

      page.off('pageerror', onErr);
      page.off('console', onCon);
    }
    await ctx.close();
  }
}

console.log(`checked ${checked} route/viewport combinations`);
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n` + problems.join('\n') : '\nno problems found');
await browser.close();
