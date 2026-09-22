/**
 * The printed document: proforma, invoice, statement.
 *
 * WHY THIS EXISTS AT ALL
 *
 * Everything else in this product is a screen. This is the one thing that
 * leaves it: it is emailed to a distributor, printed for a driver, signed and
 * scanned back, and filed by somebody's accountant. It is the only part of
 * AfterBI most of a distributor's staff will ever see, so it is also the part
 * that has to look like a company rather than like a web page that was printed.
 *
 * WHY ONE MODULE AND NOT A TEMPLATE PER SCREEN
 *
 * The app this replaced had two, one written inside the orders screen and one
 * inside the invoices screen, and they had drifted: different column sets,
 * different totals, one saying "INV No: INV-2026-0041" because the label and
 * the number both carried the prefix. A document that says two different things
 * about the same order is worse than no document. Here the three variants share
 * one header, one items table, one totals block and one signature block, and
 * differ only where they must.
 *
 * WHY HTML AND THE BROWSER'S OWN PRINT
 *
 * The alternative is a PDF library, which is 300kB of bundle before it renders
 * a single line: on an app whose users are on metered Nigerian data and
 * mid-range Android phones. The browser already has a very good PDF writer
 * behind Ctrl+P, every platform exposes "Save as PDF" in that dialog, and
 * `@page`/`break-inside` give real control over pagination. So: build the
 * document, hand it to the browser, and let the person choose print or save.
 *
 * WHY AN IFRAME AND NOT A NEW WINDOW
 *
 * `window.open` is the traditional route and it is what the old app used. It
 * is also the thing phone browsers block most eagerly, and when it is blocked
 * nothing happens at all: no error, no document, just a button that appears
 * broken. A same-document iframe cannot be blocked. `window.open` remains as
 * the fallback for the one case the iframe cannot serve.
 */

import { INVOICE_STATUS_LABEL } from '@/types';
import type { Distributor, Invoice, Order, OrderLine, OrgSettings, Payment } from '@/types';

/* escaping */

/**
 * Every value that reaches the document goes through here.
 *
 * A product called `Bella <25cl>` or a distributor called `Smith & Sons` is
 * ordinary data and completely capable of breaking the markup around it. This
 * is also the boundary where a stored string stops being data and starts being
 * a document, which is the only place an injected `<script>` could ever matter.
 */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* numbers */

/**
 * Money, without the currency symbol.
 *
 * The symbol is in the column heading, `AMOUNT (₦)`, rather than repeated on
 * every one of forty rows, because a column of numbers that all begin with the
 * same character is a column that is harder to scan and harder to add up.
 * `naira()` from `lib/format` is for the app; this is for the page.
 */
function amount(value: number): string {
  return Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function money(value: number): string {
  return `₦${amount(value)}`;
}

function printDate(input?: string | number | Date | null): string {
  if (!input) return 'Not set';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* inputs */

export interface PrintCompany {
  settings: OrgSettings;
  /** Who pressed print. Named on the document, because somebody has to be. */
  preparedBy?: string;
  preparedByRole?: string;
}

export type PrintJob =
  | {
      kind: 'proforma';
      order: Order;
      distributor?: Distributor | null;
      company: PrintCompany;
    }
  | {
      kind: 'invoice';
      invoice: Invoice;
      distributor?: Distributor | null;
      company: PrintCompany;
    }
  | {
      kind: 'statement';
      distributor: Distributor;
      invoices: Invoice[];
      payments: Payment[];
      company: PrintCompany;
    };

/* pieces */

const BASE_CSS = (brand: string) => `
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:12mm}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
       font-size:12px;color:#1a1d21;padding:16px 20px;
       -webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* The watermark is fixed rather than absolute so that it repeats on every
     printed page instead of only the first. It is very light on purpose: it
     has to survive a photocopy without obscuring a figure. */
  .wm{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;
      display:flex;flex-direction:column;justify-content:space-between;padding:10px 0}
  .wm-row{white-space:nowrap;font-size:26px;font-weight:900;letter-spacing:.35em;
      color:${brand}0a;text-align:center;transform:translateX(-4%)}
  .page{position:relative;z-index:1}

  .head{display:flex;align-items:flex-start;justify-content:space-between;
        gap:24px;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid ${brand}}
  .logo-img{max-height:46px;max-width:190px;object-fit:contain;display:block}
  .logo{font-size:25px;font-weight:900;letter-spacing:-0.02em;color:#101418}
  .logo .dot{display:inline-block;width:.24em;height:.24em;border-radius:50%;
             background:${brand};vertical-align:baseline;margin-left:.08em}
  .org-line{font-size:10px;color:#5b6167;margin-top:3px;line-height:1.5}
  .doc-title{font-size:19px;font-weight:900;text-align:right;letter-spacing:.06em;color:${brand}}
  .doc-meta{font-size:11px;margin-top:4px;text-align:right;line-height:1.6}

  .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:14px}
  .row{display:flex;gap:8px;font-size:11.5px;margin-bottom:3px}
  .row .k{font-weight:700;min-width:74px;color:#5b6167}

  table{width:100%;border-collapse:collapse;margin:12px 0}
  /* Long documents flow onto more pages instead of being clipped. The head
     repeats so the columns stay labelled, and no row is allowed to split. */
  table.items{table-layout:fixed}
  table.items thead{display:table-header-group}
  table.items tr{page-break-inside:avoid;break-inside:avoid}
  table.items th,table.items td{overflow:hidden;word-wrap:break-word}
  th{background:#f2f4f5;padding:8px 10px;text-align:left;font-size:10px;font-weight:800;
     letter-spacing:.03em;border:1px solid #d7dbdf;white-space:nowrap;line-height:1.25}
  td{padding:7px 10px;border:1px solid #e3e6e9;vertical-align:top;font-size:11px;
     background:rgba(255,255,255,.75);line-height:1.45}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}

  .totals,.bank,.sig,.balance{page-break-inside:avoid;break-inside:avoid}
  .totals{min-width:264px;margin-left:auto}
  .t-row{display:flex;justify-content:space-between;gap:24px;padding:4px 0;font-size:12px}
  .t-final{font-weight:900;font-size:14px;border-top:2px solid #1a1d21;padding-top:6px;margin-top:4px}
  .balance{margin-top:12px;background:#fdf2f2;border:1.5px solid #d03b3b;border-radius:6px;
           padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .balance .lab{font-size:13px;font-weight:900;color:#a52929}
  .balance .sub{font-size:10px;color:#8a7070;margin-top:2px}
  .balance .val{font-size:19px;font-weight:900;color:#a52929;white-space:nowrap}

  .bank{margin-top:14px;padding:10px 12px;border:1px solid #d7dbdf;border-radius:6px;
        background:rgba(255,255,255,.85)}
  .bank h4{font-weight:800;margin-bottom:6px;font-size:10.5px;letter-spacing:.04em}
  .bank .accts{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;font-size:11px}
  .bank .warn{margin-top:8px;font-size:9.5px;color:#8a6100;font-style:italic;line-height:1.5}
  .bank .none{font-size:11px;color:#8a9097;font-style:italic}

  .notes{margin-top:10px;font-size:11px;color:#41474d;line-height:1.55}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:34px}
  .sig-line{border-top:1px solid #1a1d21;padding-top:6px;font-size:11px;text-align:center;font-weight:700}
  .sig-sub{font-size:9.5px;color:#7a8087;text-align:center;margin-top:2px}

  .foot{margin-top:26px;text-align:center;border-top:1px solid #e3e6e9;padding-top:12px}
  .foot .mark{font-size:14px;font-weight:900;letter-spacing:-0.02em;color:#1a1d21}
  .foot .mark .dot{display:inline-block;width:.26em;height:.26em;border-radius:50%;
                   background:${brand};vertical-align:baseline;margin-left:.08em}
  .foot .sub{font-size:9px;color:#8a9097;margin-top:3px;line-height:1.5}

  @media print{body{padding:0}.page{padding-bottom:16mm}}
`;

function watermark(mark: string): string {
  const row = Array(6).fill(esc(mark)).join('&ensp;&ensp;&ensp;');
  return `<div class="wm">${Array(18).fill(`<div class="wm-row">${row}</div>`).join('')}</div>`;
}

function header(settings: OrgSettings, title: string, meta: string): string {
  const short = settings.shortName || settings.name;
  const mark = settings.logoUrl
    ? `<img class="logo-img" src="${esc(settings.logoUrl)}" alt="${esc(short)}" />`
    : `<div class="logo">${esc(short)}<span class="dot"></span></div>`;

  /*
   * `TIN TIN-20984412`.
   *
   * People type the prefix into the field, because the field is called Tax ID
   * and that is what their certificate says. Prefixing unconditionally printed
   * it twice on every invoice the old app produced. Label the number only when
   * the number is not already labelled.
   */
  const tax = settings.taxId?.trim();
  const taxLine = tax ? (/^(tin|rc)\b/i.test(tax) ? tax : `TIN ${tax}`) : '';

  const lines = [settings.name, settings.address,
    [settings.phone, settings.email].filter(Boolean).join(' · '), taxLine]
    .filter(Boolean)
    .map((line) => `<div>${esc(line)}</div>`)
    .join('');

  return `<div class="head">
    <div>${mark}<div class="org-line">${lines}</div></div>
    <div><div class="doc-title">${esc(title)}</div><div class="doc-meta">${meta}</div></div>
  </div>`;
}

function lineTable(lines: OrderLine[]): string {
  const rows = lines
    .map(
      (line, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(line.productName)}${line.category ? ` <span style="font-size:9.5px;color:#8a9097">(${esc(line.category)})</span>` : ''}</td>
        <td>${esc(line.unit)}</td>
        <td class="num">${line.quantity.toLocaleString('en-NG')}</td>
        <td class="num">${amount(line.unitPrice)}</td>
        <td class="num" style="font-weight:700">${amount(line.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  return `<table class="items">
    <colgroup><col style="width:32px"/><col/><col style="width:88px"/>
      <col style="width:72px"/><col style="width:104px"/><col style="width:120px"/></colgroup>
    <thead><tr>
      <th>NO.</th><th>ITEM</th><th>UNIT</th>
      <th class="num">QTY</th><th class="num">UNIT PRICE (₦)</th><th class="num">AMOUNT (₦)</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#8a9097">No lines on this document.</td></tr>'}</tbody>
  </table>`;
}

/**
 * The bank block, and the sentence under it.
 *
 * Only accounts an administrator has actually entered under Settings are
 * printed: never a hardcoded one, and never a placeholder. The warning below
 * them is not decoration: paying a "supplier" account that turns out to belong
 * to somebody else is the single most common fraud in Nigerian distribution,
 * and it works because the invoice is the only thing the payer checks.
 */
function bankBlock(settings: OrgSettings): string {
  const short = esc(settings.shortName || settings.name);
  const banks = (settings.banks ?? []).filter((b) => String(b.accountNumber ?? '').trim());

  const body = banks.length
    ? `<div class="accts">${banks
        .map(
          (b) => `<div>
            <div style="font-weight:800">${esc(b.bankName)}</div>
            <div>${esc(b.accountName)}</div>
            <div style="font-variant-numeric:tabular-nums">Acct: ${esc(b.accountNumber)}</div>
          </div>`,
        )
        .join('')}</div>`
    : `<div class="none">No bank account has been set up. An administrator adds them under Settings → Bank accounts.</div>`;

  return `<div class="bank">
    <h4>PAYMENT: DESIGNATED BANK ACCOUNTS ONLY</h4>
    ${body}
    <div class="warn">Only payments into ${short}'s designated accounts above are recognised.
      ${short} is not responsible for money paid into any other account.</div>
  </div>`;
}

function signatures(settings: OrgSettings, company: PrintCompany, billTo: string, billAddress: string): string {
  const who = company.preparedBy ? esc(company.preparedBy) : esc(settings.name);
  return `<div class="sig">
    <div>
      <div class="sig-line">FOR: ${who}</div>
      ${company.preparedByRole ? `<div class="sig-sub">${esc(company.preparedByRole)}</div>` : ''}
    </div>
    <div>
      <div class="sig-line">CUSTOMER SIGNATURE</div>
      <div class="sig-sub">${esc(billAddress || billTo)}</div>
    </div>
  </div>`;
}

function footer(settings: OrgSettings, note: string): string {
  const short = settings.shortName || settings.name;
  return `<div class="foot">
    <div class="mark">Generated with ${esc(short)}<span class="dot"></span></div>
    <div class="sub">${esc(note)} · Printed ${new Date().toLocaleString('en-NG')} (WAT)</div>
  </div>`;
}

/* variants */

function billingBlock(distributor: Distributor | null | undefined, fallbackName: string) {
  return {
    name: distributor?.company || fallbackName,
    address: distributor?.address ?? '',
    phone: distributor?.phone ?? '',
    contact: distributor?.contactName ?? '',
  };
}

function proformaDoc(job: Extract<PrintJob, { kind: 'proforma' }>): { title: string; body: string } {
  const { order, distributor, company } = job;
  const settings = company.settings;
  const validity = settings.proformaValidityDays ?? 7;
  const bill = billingBlock(distributor, order.distributorName);

  const meta = `<div><strong>No.: ${esc(order.orderNumber)}</strong></div>
    <div style="font-size:10px;color:#5b6167">Valid ${validity} days from issue</div>`;

  return {
    title: order.orderNumber,
    body: `
      ${header(settings, 'PROFORMA INVOICE', meta)}
      <div class="grid">
        <div>
          <div class="row"><span class="k">Bill to:</span><strong>${esc(bill.name)}</strong></div>
          ${bill.contact ? `<div class="row"><span class="k">Attn:</span><span>${esc(bill.contact)}</span></div>` : ''}
          ${bill.address ? `<div class="row"><span class="k">Address:</span><span>${esc(bill.address)}</span></div>` : ''}
          ${bill.phone ? `<div class="row"><span class="k">Phone:</span><span>${esc(bill.phone)}</span></div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="row" style="justify-content:flex-end"><span class="k">Date:</span><span>${printDate(order.createdAt)}</span></div>
          <div class="row" style="justify-content:flex-end"><span class="k">Raised by:</span><span>${esc(order.createdByName)}</span></div>
          ${distributor ? `<div class="row" style="justify-content:flex-end"><span class="k">Tier:</span><span>${esc(distributor.category)}</span></div>` : ''}
        </div>
      </div>

      ${lineTable(order.lines)}

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
        <div style="font-size:11px;color:#5b6167">Total units:
          <strong>${order.lines.reduce((s, l) => s + l.quantity, 0).toLocaleString('en-NG')}</strong></div>
        <div class="totals">
          <div class="t-row t-final"><span>TOTAL</span><span>${money(order.total)}</span></div>
        </div>
      </div>

      ${order.note ? `<div class="notes"><strong>Note:</strong> ${esc(order.note)}</div>` : ''}
      ${bankBlock(settings)}
      ${signatures(settings, company, bill.name, bill.address)}
      ${footer(settings, `Proforma invoice · valid ${validity} days from issue`)}
    `,
  };
}

function invoiceDoc(job: Extract<PrintJob, { kind: 'invoice' }>): { title: string; body: string } {
  const { invoice, distributor, company } = job;
  const settings = company.settings;
  const bill = billingBlock(distributor, invoice.distributorName);
  const owing = Math.max(0, invoice.total - invoice.amountPaid);
  const today = new Date().toISOString().slice(0, 10);
  const late = invoice.status !== 'paid' && invoice.dueOn < today;

  const meta = `<div><strong>No.: ${esc(invoice.invoiceNumber)}</strong></div>
    <div style="font-size:10.5px;color:${late ? '#a52929' : '#5b6167'};font-weight:700">
      ${esc(late ? 'Overdue' : INVOICE_STATUS_LABEL[invoice.status]).toUpperCase()}</div>`;

  return {
    title: invoice.invoiceNumber,
    body: `
      ${header(settings, 'INVOICE', meta)}
      <div class="grid">
        <div>
          <div class="row"><span class="k">Bill to:</span><strong>${esc(bill.name)}</strong></div>
          ${bill.contact ? `<div class="row"><span class="k">Attn:</span><span>${esc(bill.contact)}</span></div>` : ''}
          ${bill.address ? `<div class="row"><span class="k">Address:</span><span>${esc(bill.address)}</span></div>` : ''}
          ${invoice.orderNumber ? `<div class="row"><span class="k">Order ref:</span><span>${esc(invoice.orderNumber)}</span></div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="row" style="justify-content:flex-end"><span class="k">Issued:</span><span>${printDate(invoice.issuedOn)}</span></div>
          <div class="row" style="justify-content:flex-end"><span class="k">Due:</span><strong>${printDate(invoice.dueOn)}</strong></div>
          ${distributor?.paymentTermsDays !== undefined ? `<div class="row" style="justify-content:flex-end"><span class="k">Terms:</span><span>${Number(distributor.paymentTermsDays)} days</span></div>` : ''}
        </div>
      </div>

      ${lineTable(invoice.lines)}

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
        <div style="font-size:11px;color:#5b6167">Total units:
          <strong>${invoice.lines.reduce((s, l) => s + l.quantity, 0).toLocaleString('en-NG')}</strong></div>
        <div class="totals">
          <div class="t-row t-final"><span>TOTAL</span><span>${money(invoice.total)}</span></div>
          ${invoice.amountPaid > 0 ? `<div class="t-row" style="color:#0a7a0a;margin-top:5px"><span>Paid to date</span><span>${money(invoice.amountPaid)}</span></div>` : ''}
        </div>
      </div>

      ${
        owing > 0
          ? `<div class="balance">
              <div>
                <div class="lab">OUTSTANDING BALANCE</div>
                <div class="sub">Payment due ${printDate(invoice.dueOn)}</div>
              </div>
              <div class="val">${money(owing)}</div>
            </div>`
          : `<div class="balance" style="background:#f2fbf2;border-color:#0ca30c">
              <div><div class="lab" style="color:#0a7a0a">PAID IN FULL</div>
                <div class="sub" style="color:#6f8a6f">Nothing outstanding on this invoice.</div></div>
              <div class="val" style="color:#0a7a0a">${money(invoice.total)}</div>
            </div>`
      }

      ${settings.invoiceFooter ? `<div class="notes">${esc(settings.invoiceFooter)}</div>` : ''}
      ${bankBlock(settings)}
      ${signatures(settings, company, bill.name, bill.address)}
      ${footer(settings, 'Invoice')}
    `,
  };
}

function statementDoc(job: Extract<PrintJob, { kind: 'statement' }>): { title: string; body: string } {
  const { distributor, invoices, payments, company } = job;
  const settings = company.settings;

  /*
   * One list, in date order, of everything that moved the balance: which is
   * what a statement is, and why invoices and payments cannot be shown as two
   * separate tables. The running balance is computed here rather than stored,
   * because it is a view of the ledger, not a fact in it.
 */
  const entries = [
    ...invoices.map((i) => ({
      on: i.issuedOn,
      ref: i.invoiceNumber,
      what: i.orderNumber ? `Invoice · order ${i.orderNumber}` : 'Invoice',
      debit: i.total,
      credit: 0,
    })),
    ...payments.map((p) => ({
      on: p.paidOn,
      ref: p.reference || p.invoiceNumber,
      what: `Payment received (${p.method})`,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));

  let running = 0;
  const rows = entries
    .map((e) => {
      running += e.debit - e.credit;
      return `<tr>
        <td>${printDate(e.on)}</td>
        <td>${esc(e.ref)}</td>
        <td>${esc(e.what)}</td>
        <td class="num">${e.debit ? amount(e.debit) : ''}</td>
        <td class="num">${e.credit ? amount(e.credit) : ''}</td>
        <td class="num" style="font-weight:700">${amount(running)}</td>
      </tr>`;
    })
    .join('');

  const meta = `<div><strong>${esc(distributor.company)}</strong></div>
    <div style="font-size:10px;color:#5b6167">As at ${printDate(new Date())}</div>`;

  return {
    title: `${distributor.company} statement`,
    body: `
      ${header(settings, 'STATEMENT OF ACCOUNT', meta)}
      <div class="grid">
        <div>
          ${distributor.contactName ? `<div class="row"><span class="k">Attn:</span><span>${esc(distributor.contactName)}</span></div>` : ''}
          ${distributor.address ? `<div class="row"><span class="k">Address:</span><span>${esc(distributor.address)}</span></div>` : ''}
        </div>
        <div style="text-align:right">
          ${distributor.creditLimit !== undefined ? `<div class="row" style="justify-content:flex-end"><span class="k">Credit limit:</span><span>${money(distributor.creditLimit)}</span></div>` : ''}
          ${distributor.paymentTermsDays !== undefined ? `<div class="row" style="justify-content:flex-end"><span class="k">Terms:</span><span>${Number(distributor.paymentTermsDays)} days</span></div>` : ''}
        </div>
      </div>

      <table class="items">
        <colgroup><col style="width:92px"/><col style="width:120px"/><col/>
          <col style="width:104px"/><col style="width:104px"/><col style="width:112px"/></colgroup>
        <thead><tr>
          <th>DATE</th><th>REFERENCE</th><th>DETAIL</th>
          <th class="num">DEBIT (₦)</th><th class="num">CREDIT (₦)</th><th class="num">BALANCE (₦)</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#8a9097">Nothing on this account yet.</td></tr>'}</tbody>
      </table>

      <div class="balance" ${running <= 0 ? 'style="background:#f2fbf2;border-color:#0ca30c"' : ''}>
        <div>
          <div class="lab" ${running <= 0 ? 'style="color:#0a7a0a"' : ''}>BALANCE CARRIED FORWARD</div>
          <div class="sub">${entries.length} entries to ${printDate(new Date())}</div>
        </div>
        <div class="val" ${running <= 0 ? 'style="color:#0a7a0a"' : ''}>${money(running)}</div>
      </div>

      ${bankBlock(settings)}
      ${footer(settings, 'Statement of account')}
    `,
  };
}

/* the driver */

function build(job: PrintJob): { title: string; html: string } {
  const settings = job.company.settings;
  const brand = /^#[0-9a-f]{6}$/i.test(settings.brandColor ?? '') ? settings.brandColor! : '#10b981';
  const doc =
    job.kind === 'proforma' ? proformaDoc(job) : job.kind === 'invoice' ? invoiceDoc(job) : statementDoc(job);

  return {
    title: doc.title,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
      <title>${esc(doc.title)}</title><style>${BASE_CSS(brand)}</style></head>
      <body>${watermark(settings.shortName || settings.name)}<div class="page">${doc.body}</div></body></html>`,
  };
}

/**
 * Build the document and hand it to the browser's print dialog.
 *
 * Must be called from a click. Browsers only allow `print()` during a gesture,
 * and the fallback window would be blocked outside one.
 *
 * The iframe is removed on a timer rather than immediately after `print()`
 * returns: in Safari and in Chrome on Android `print()` resolves before the
 * dialog has read the document, and tearing the frame down early produces a
 * blank page. Ten seconds is long past any dialog opening and short enough
 * that a person who prints thirty invoices does not accumulate thirty frames.
 */
export function printDocument(job: PrintJob): void {
  const { title, html } = build(job);

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    document.body.removeChild(frame);
    fallbackWindow(title, html);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  const go = () => {
    try {
      win.focus();
      win.print();
    } catch {
      fallbackWindow(title, html);
    }
    window.setTimeout(() => frame.remove(), 10_000);
  };

  // Images (a logo) must have loaded or they print as gaps. `onload` covers
  // that; the timer covers a logo URL that never resolves.
  let fired = false;
  const once = () => {
    if (fired) return;
    fired = true;
    go();
  };
  frame.onload = once;
  window.setTimeout(once, 1200);
}

function fallbackWindow(title: string, html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    throw new Error('Your browser blocked the print window. Allow pop-ups for this site and try again.');
  }
  win.document.write(html);
  win.document.title = title;
  win.document.close();
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}
