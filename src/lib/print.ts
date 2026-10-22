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

import { listPriceOf, summarise } from './pricing';
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
      /** The invoice raised from this order, if any: decides the payment status printed. */
      invoice?: Invoice | null;
      distributor?: Distributor | null;
      company: PrintCompany;
    }
  | {
      kind: 'delivery';
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
  .co-name{font-size:15px;font-weight:800;color:#101418;margin-top:8px;letter-spacing:-0.01em}
  .doc-title{font-size:15px;font-weight:600;text-align:right;letter-spacing:.16em;color:${brand}}
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
  /* Print friendly: white boxes, hairline borders, the brand colour as the only accent. */
  .balance{margin-top:12px;background:#fff;border:1px solid #d7dbdf;border-left:4px solid ${brand};border-radius:6px;
           padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .balance .lab{font-size:12.5px;font-weight:800;color:${brand};letter-spacing:.03em}
  .balance .sub{font-size:10px;color:#5b6167;margin-top:2px}
  .balance .val{font-size:18px;font-weight:900;color:#1a1d21;white-space:nowrap}

  .bank{margin-top:16px;padding:10px 12px;border:1px solid #d7dbdf;border-radius:6px;
        background:rgba(255,255,255,.85)}
  .bank h4{font-weight:800;margin-bottom:6px;font-size:10.5px;letter-spacing:.04em}
  .bank .accts{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;font-size:11px}
  .bank .warn{margin-top:8px;font-size:9.5px;color:#5b6167;font-style:italic;line-height:1.5}
  .bank .none{font-size:11px;color:#8a9097;font-style:italic}

  .notes{margin-top:10px;font-size:11px;color:#41474d;line-height:1.55}
  .goodwill{margin-top:10px;background:#fff;border:1px solid #d7dbdf;border-left:4px solid ${brand};border-radius:6px;
            padding:8px 12px;font-size:11px;color:#1a1d21;line-height:1.5;page-break-inside:avoid;break-inside:avoid}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:34px}
  .sig-img{height:52px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px}
  .sig-img img{max-height:50px;max-width:180px;object-fit:contain}
  .sig-line{border-top:1px solid #1a1d21;padding-top:6px;font-size:11px;text-align:center;font-weight:700}
  .sig-sub{font-size:9.5px;color:#7a8087;text-align:center;margin-top:2px}

  .foot{margin-top:26px;text-align:center;border-top:1px solid #e3e6e9;padding-top:12px}
  .foot .mark{font-size:14px;font-weight:900;letter-spacing:-0.02em;color:#1a1d21}
  .foot .mark .dot{display:inline-block;width:.26em;height:.26em;border-radius:50%;
                   background:${brand};vertical-align:baseline;margin-left:.08em}
  .foot .sub{font-size:9px;color:#8a9097;margin-top:3px;line-height:1.5}

  .status{display:inline-block;margin-top:5px;padding:3px 9px;border-radius:999px;font-size:9.5px;font-weight:800;letter-spacing:.08em;
          background:#fff;color:${brand};border:1px solid ${brand}}
  /* On paper, "Generated with AfterBI" sits at the foot of every page. */
  @media print{body{padding:0}.page{padding-bottom:20mm}
    .foot{position:fixed;left:0;right:0;bottom:0;margin:0;padding:6px 0 2px;background:#fff}}
`;

function watermark(mark: string): string {
  const row = Array(6).fill(esc(mark)).join('&ensp;&ensp;&ensp;');
  return `<div class="wm">${Array(18).fill(`<div class="wm-row">${row}</div>`).join('')}</div>`;
}

function header(settings: OrgSettings, title: string, meta: string): string {
  const mark = settings.logoUrl
    ? `<img class="logo-img" src="${esc(settings.logoUrl)}" alt="${esc(settings.name)}" />`
    : '';

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

  const rc = settings.rcNumber?.trim();
  const rcLine = rc ? (/^rc\b/i.test(rc) ? rc : `RC ${rc}`) : '';

  const lines = [settings.address,
    [settings.phone, settings.email].filter(Boolean).join(' · '), [rcLine, taxLine].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .map((line) => `<div>${esc(line)}</div>`)
    .join('');

  /* The registered name, under the logo and above everything else. */
  return `<div class="head">
    <div>${mark}<div class="co-name">${esc(settings.name)}</div><div class="org-line">${lines}</div></div>
    <div><div class="doc-title">${esc(title)}</div><div class="doc-meta">${meta}</div></div>
  </div>`;
}

function lineTable(lines: OrderLine[]): string {
  /*
   * With a discount anywhere on the document, every line shows its list price
   * beside the price charged, so the customer can see exactly where the
   * goodwill went. Without one, the table is the plain six columns.
   */
  const discounted = summarise(lines).discount > 0;
  if (discounted) {
    const rows = lines
      .map((line, i) => {
        const list = listPriceOf(line);
        const off = list > line.unitPrice;
        return `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(line.productName)}${line.category ? ` <span style="font-size:9.5px;color:#8a9097">(${esc(line.category)})</span>` : ''}${line.note ? `<div style="font-size:10px;color:#41474d;margin-top:2px">${esc(line.note)}</div>` : ''}</td>
        <td>${esc(line.unit)}</td>
        <td class="num">${line.quantity.toLocaleString('en-NG')}</td>
        <td class="num"${off ? ' style="color:#8a9097;text-decoration:line-through"' : ''}>${amount(list)}</td>
        <td class="num"${off ? ' style="font-weight:700"' : ''}>${amount(line.unitPrice)}</td>
        <td class="num" style="font-weight:700">${amount(line.lineTotal)}</td>
      </tr>`;
      })
      .join('');
    return `<table class="items">
    <colgroup><col style="width:30px"/><col/><col style="width:76px"/>
      <col style="width:52px"/><col style="width:96px"/><col style="width:112px"/><col style="width:110px"/></colgroup>
    <thead><tr>
      <th>NO.</th><th>ITEM</th><th>UNIT</th>
      <th class="num">QTY</th><th class="num" style="white-space:normal">NORMAL PRICE (₦)</th><th class="num" style="white-space:normal">DISCOUNTED PRICE (₦)</th><th class="num">AMOUNT (₦)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  }

  const rows = lines
    .map(
      (line, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(line.productName)}${line.category ? ` <span style="font-size:9.5px;color:#8a9097">(${esc(line.category)})</span>` : ''}${line.note ? `<div style="font-size:10px;color:#41474d;margin-top:2px">${esc(line.note)}</div>` : ''}</td>
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
 * Subtotal and discount rows for the totals block, and the goodwill line under
 * the table. Both empty when nothing was discounted.
 */
function discountRows(lines: OrderLine[], note?: string | null): string {
  const { gross, discount } = summarise(lines);
  if (!(discount > 0)) return '';
  return `<div class="t-row"><span>Normal price</span><span>${money(gross)}</span></div>
    <div class="t-row" style="font-weight:700"><span>Discount${note ? ` (${esc(note)})` : ''}</span><span>(${money(discount)})</span></div>`;
}

function goodwill(lines: OrderLine[], note?: string | null): string {
  const { gross, discount, net } = summarise(lines);
  if (!(discount > 0)) return '';
  return `<div class="goodwill">
    <strong>Discount${note ? ` (${esc(note)})` : ''}: ${money(discount)}</strong>.
    Normal price ${money(gross)}, discounted price <strong>${money(net)}</strong>.
  </div>`;
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
  const company = esc(settings.name);
  const banks = (settings.banks ?? []).filter((b) => String(b.accountNumber ?? '').trim());

  const body = banks.length
    ? `<div class="accts">${banks
        .map(
          (b) => `<div style="display:flex;gap:8px;align-items:flex-start">
            ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="" style="width:30px;height:30px;object-fit:contain;border-radius:6px;border:1px solid #e3e6e9;background:#fff;flex-shrink:0" />` : ''}
            <div>
            <div style="font-weight:800">${esc(b.bankName)}</div>
            <div>${esc(b.accountName)}</div>
            <div style="font-variant-numeric:tabular-nums;font-size:13px;font-weight:800;letter-spacing:.04em">${esc(b.accountNumber)}</div>
            </div>
          </div>`,
        )
        .join('')}</div>`
    : `<div class="none">No bank account has been set up. An administrator adds them under Settings → Bank accounts.</div>`;

  return `<div class="bank">
    <h4>PAYMENT: DESIGNATED BANK ACCOUNTS ONLY</h4>
    ${body}
    <div class="warn">Only payments into the account${banks.length === 1 ? '' : 's'} above, in the name of ${company}, are recognised.
      ${company} is not responsible for money paid into any other account or in any other name.</div>
  </div>`;
}

/** Who signed for the company, and whether the stored signature may be printed for them. */
export interface SignedBy {
  /** Printed only when it is the company's signatory's own. */
  image?: string;
  name: string;
  title?: string;
  /** "Approved 22 Oct 2026". */
  note?: string;
}

const sameName = (a?: string, b?: string) =>
  Boolean(a && b) && a!.toLowerCase().replace(/[^a-z]/g, '') === b!.toLowerCase().replace(/[^a-z]/g, '');

function signatures(
  settings: OrgSettings,
  company: PrintCompany,
  billTo: string,
  _billAddress: string,
  signed?: SignedBy | null,
): string {
  if (signed) {
    return `<div class="sig">
    <div>
      <div class="sig-img">${signed.image ? `<img src="${esc(signed.image)}" alt="Signature" />` : ''}</div>
      <div class="sig-line">FOR: ${esc(settings.name).toUpperCase()}</div>
      <div class="sig-sub">${esc([signed.name, signed.title].filter(Boolean).join(', '))}${signed.note ? ` · ${esc(signed.note)}` : ''}</div>
    </div>
    <div>
      <div class="sig-img"></div>
      <div class="sig-line">CUSTOMER SIGNATURE</div>
      <div class="sig-sub">${esc(billTo)}</div>
    </div>
  </div>`;
  }
  const who = company.preparedBy ? esc(company.preparedBy) : esc(settings.name);
  /* The signatory is named by their job title (Managing Director), not their app role (Super admin). */
  const role =
    sameName(company.preparedBy, settings.signatoryName) && settings.signatoryTitle
      ? settings.signatoryTitle
      : company.preparedByRole;
  return `<div class="sig">
    <div>
      <div class="sig-line">FOR: ${who}</div>
      ${role ? `<div class="sig-sub">${esc(role)}</div>` : ''}
    </div>
    <div>
      <div class="sig-line">CUSTOMER SIGNATURE</div>
      <div class="sig-sub">${esc(billTo)}</div>
    </div>
  </div>`;
}

/** The AfterBI four bar mark, small, for the footer. */
const AFTERBI_MARK = `<svg viewBox="0 0 130 120" width="15" height="14" style="vertical-align:-1px;margin-right:5px" aria-hidden="true"><g transform="skewX(-9) translate(14 0)"><rect x="3" y="78" width="25" height="36" rx="12.5" fill="#f2332b"/><rect x="35" y="55" width="25" height="59" rx="12.5" fill="#f5a400"/><rect x="67" y="37" width="25" height="77" rx="12.5" fill="#02a05c"/><rect x="99" y="20" width="25" height="94" rx="12.5" fill="#0e6dfd"/></g></svg>`;

function footer(_settings: OrgSettings, note: string): string {
  return `<div class="foot">
    <div class="mark">${AFTERBI_MARK}Generated with AfterBI</div>
    <div class="sub">${esc(note)} · Printed ${new Date().toLocaleString('en-NG')} (WAT)</div>
  </div>`;
}

/* payment status */

type PayTone = 'pending' | 'paid' | 'part' | 'late' | 'void';

interface PayState {
  tone: PayTone;
  label: string;
}

/** Where the money stands on an invoice, in the words a customer reads. */
function payState(invoice: Pick<Invoice, 'status' | 'total' | 'amountPaid' | 'dueOn'> | null | undefined): PayState {
  if (!invoice) return { tone: 'pending', label: 'PAYMENT PENDING' };
  if (invoice.status === 'void') return { tone: 'void', label: 'VOID' };
  const owing = Math.max(0, invoice.total - (invoice.amountPaid ?? 0));
  if (owing <= 0.009) return { tone: 'paid', label: 'PAID' };
  const today = new Date().toISOString().slice(0, 10);
  if (invoice.dueOn && invoice.dueOn < today) return { tone: 'late', label: 'OVERDUE' };
  if ((invoice.amountPaid ?? 0) > 0) return { tone: 'part', label: 'PART PAID' };
  return { tone: 'pending', label: 'PAYMENT PENDING' };
}

function statusPill(state: PayState): string {
  return `<span class="status">${state.label}</span>`;
}

/** The band under the totals: what is still owed, or that nothing is. */
function balanceBand(total: number, paid: number, state: PayState, dueLine: string): string {
  const owing = Math.max(0, total - paid);
  if (state.tone === 'paid') {
    return `<div class="balance">
      <div><div class="lab">PAID IN FULL</div>
        <div class="sub">Nothing outstanding. Thank you.</div></div>
      <div class="val">${money(total)}</div>
    </div>`;
  }
  const label = state.tone === 'late' ? 'OVERDUE: AMOUNT DUE' : state.tone === 'part' ? 'BALANCE DUE (PART PAID)' : 'AMOUNT DUE: PAYMENT PENDING';
  return `<div class="balance">
    <div>
      <div class="lab">${label}</div>
      <div class="sub">${paid > 0 ? `${money(paid)} received. ` : ''}${dueLine}</div>
    </div>
    <div class="val">${money(owing)}</div>
  </div>`;
}

/* who signs */

/**
 * An approved (or fulfilled) order is signed for the company.
 *
 * The stored signature (Settings, Signature) is printed only when it is the
 * signer's own: the order went straight through (raised by the super admin, or
 * under the threshold) or the person who approved it is the named signatory.
 * Approved by somebody else, their name is printed without anybody's ink.
 */
function orderSigner(order: Order, settings: OrgSettings): SignedBy | null {
  if (order.status !== 'approved' && order.status !== 'fulfilled') return null;
  const approval = (order.approvals ?? []).find((a) => a.decision === 'approved');
  const when = order.approvedAt ?? approval?.decidedAt;
  const note = when ? `Approved ${printDate(when)}` : 'Approved';
  if (approval && !sameName(approval.name, settings.signatoryName)) {
    return { name: approval.name, note };
  }
  const name = settings.signatoryName || approval?.name || order.createdByName;
  return { image: settings.signatureUrl || undefined, name, title: settings.signatoryTitle, note };
}

/** An issued invoice is the company's document, signed by its signatory. */
function invoiceSigner(invoice: Invoice, settings: OrgSettings): SignedBy | null {
  if (invoice.status === 'draft' || invoice.status === 'void') return null;
  if (!settings.signatoryName && !settings.signatureUrl) return null;
  return {
    image: settings.signatureUrl || undefined,
    name: settings.signatoryName || settings.name,
    title: settings.signatoryTitle,
    note: `Issued ${printDate(invoice.issuedOn)}`,
  };
}

/* variants */

function fullAddress(distributor: Distributor | null | undefined): string {
  const street = distributor?.address?.trim() ?? '';
  const state = distributor?.location?.trim() ?? '';
  if (!state || street.toLowerCase().includes(state.toLowerCase())) return street;
  const stateLine = /state$|fct|abuja/i.test(state) ? state : `${state} State`;
  return [street, stateLine].filter(Boolean).join(', ');
}

function billingBlock(distributor: Distributor | null | undefined, fallbackName: string) {
  return {
    name: distributor?.company || fallbackName,
    /* Shop or street, then the state: "Shop 12, Main Market, Onitsha, Anambra State". */
    address: fullAddress(distributor),
    phone: distributor?.phone ?? '',
    contact: distributor?.contactName ?? '',
  };
}

function proformaDoc(job: Extract<PrintJob, { kind: 'proforma' }>): { title: string; body: string } {
  const { order, distributor, company } = job;
  const settings = company.settings;
  const validity = settings.proformaValidityDays ?? 7;
  const bill = billingBlock(distributor, order.distributorName);

  const live = job.invoice && job.invoice.status !== 'void' ? job.invoice : null;
  const state = payState(live);
  const meta = `<div><strong>No.: ${esc(order.orderNumber)}</strong></div>
    <div style="font-size:10px;color:#5b6167">Valid ${validity} days from issue</div>
    ${order.status === 'cancelled' || order.status === 'rejected' ? statusPill({ tone: 'void', label: order.status.toUpperCase() }) : statusPill(state)}`;

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
          ${discountRows(order.lines, order.discountNote)}
          <div class="t-row t-final"><span>TOTAL</span><span>${money(order.total)}</span></div>
        </div>
      </div>
      ${goodwill(order.lines, order.discountNote)}
      ${
        order.status === 'cancelled' || order.status === 'rejected'
          ? ''
          : balanceBand(
              order.total,
              live?.amountPaid ?? 0,
              state,
              live ? `Invoice ${esc(live.invoiceNumber)}, due ${printDate(live.dueOn)}.` : `Pay into the account below, quoting ${esc(order.orderNumber)}.`,
            )
      }

      ${order.note ? `<div class="notes"><strong>Note:</strong> ${esc(order.note)}</div>` : ''}
      ${settings.invoiceFooter ? `<div class="notes">${esc(settings.invoiceFooter)}</div>` : ''}
      ${bankBlock(settings)}
      ${signatures(settings, company, bill.name, bill.address, orderSigner(order, settings))}
      ${footer(settings, `Proforma invoice · valid ${validity} days from issue`)}
    `,
  };
}

/**
 * The delivery note: what left the depot, for the driver and the customer to
 * sign. Quantities only, no prices, because it travels with the goods and is
 * read by people who do not need to see what they cost.
 */
function deliveryDoc(job: Extract<PrintJob, { kind: 'delivery' }>): { title: string; body: string } {
  const { order, distributor, company } = job;
  const settings = company.settings;
  const bill = billingBlock(distributor, order.distributorName);
  const number = order.deliveryNumber || 'DN pending';
  const goods = order.lines.filter((l) => !l.service);
  const services = order.lines.filter((l) => l.service);

  const meta = `<div><strong>No.: ${esc(number)}</strong></div>
    <div style="font-size:10px;color:#5b6167">Order ref: ${esc(order.orderNumber)}</div>`;

  const rows = goods
    .map(
      (line, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(line.productName)}${line.category ? ` <span style="font-size:9.5px;color:#8a9097">(${esc(line.category)})</span>` : ''}</td>
        <td>${esc(line.unit)}</td>
        <td class="num" style="font-weight:700">${line.quantity.toLocaleString('en-NG')}</td>
        <td></td>
      </tr>`,
    )
    .join('');

  return {
    title: number,
    body: `
      ${header(settings, 'DELIVERY NOTE', meta)}
      <div class="grid">
        <div>
          <div class="row"><span class="k">Deliver to:</span><strong>${esc(bill.name)}</strong></div>
          ${bill.contact ? `<div class="row"><span class="k">Attn:</span><span>${esc(bill.contact)}</span></div>` : ''}
          ${bill.address ? `<div class="row"><span class="k">Address:</span><span>${esc(bill.address)}</span></div>` : ''}
          ${bill.phone ? `<div class="row"><span class="k">Phone:</span><span>${esc(bill.phone)}</span></div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="row" style="justify-content:flex-end"><span class="k">Dispatched:</span><span>${printDate(order.fulfilledAt ?? new Date())}</span></div>
          <div class="row" style="justify-content:flex-end"><span class="k">Order date:</span><span>${printDate(order.createdAt)}</span></div>
          ${services.map((s) => `<div class="row" style="justify-content:flex-end"><span class="k">${esc(s.productName)}:</span><span>${esc(s.note || 'Included')}</span></div>`).join('')}
        </div>
      </div>

      <table class="items">
        <colgroup><col style="width:32px"/><col/><col style="width:100px"/><col style="width:80px"/><col style="width:150px"/></colgroup>
        <thead><tr><th>NO.</th><th>ITEM</th><th>UNIT</th><th class="num">QTY</th><th>CONDITION ON ARRIVAL</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#8a9097">No goods on this order.</td></tr>'}</tbody>
      </table>
      <div style="font-size:11px;color:#5b6167">Total units:
        <strong>${goods.reduce((s, l) => s + l.quantity, 0).toLocaleString('en-NG')}</strong></div>

      ${order.note ? `<div class="notes"><strong>Note:</strong> ${esc(order.note)}</div>` : ''}

      <div class="sig" style="grid-template-columns:1fr 1fr 1fr;gap:28px;margin-top:40px">
        <div><div class="sig-img"></div><div class="sig-line">DISPATCHED BY</div><div class="sig-sub">${esc(settings.name)}</div></div>
        <div><div class="sig-img"></div><div class="sig-line">DRIVER AND VEHICLE NO.</div><div class="sig-sub">Name, signature, plate number</div></div>
        <div><div class="sig-img"></div><div class="sig-line">RECEIVED IN GOOD CONDITION</div><div class="sig-sub">${esc(bill.name)}: name, signature, date</div></div>
      </div>
      ${footer(settings, `Delivery note ${number} · order ${order.orderNumber}`)}
    `,
  };
}

function invoiceDoc(job: Extract<PrintJob, { kind: 'invoice' }>): { title: string; body: string } {
  const { invoice, distributor, company } = job;
  const settings = company.settings;
  const bill = billingBlock(distributor, invoice.distributorName);
  const state = invoice.status === 'draft' ? { tone: 'void' as const, label: 'DRAFT' } : payState(invoice);
  const meta = `<div><strong>No.: ${esc(invoice.invoiceNumber)}</strong></div>
    ${statusPill(state)}`;

  return {
    title: invoice.invoiceNumber,
    body: `
      ${header(settings, 'INVOICE', meta)}
      <div class="grid">
        <div>
          <div class="row"><span class="k">Bill to:</span><strong>${esc(bill.name)}</strong></div>
          ${bill.contact ? `<div class="row"><span class="k">Attn:</span><span>${esc(bill.contact)}</span></div>` : ''}
          ${bill.address ? `<div class="row"><span class="k">Address:</span><span>${esc(bill.address)}</span></div>` : ''}
          ${bill.phone ? `<div class="row"><span class="k">Phone:</span><span>${esc(bill.phone)}</span></div>` : ''}
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
          ${discountRows(invoice.lines, invoice.discountNote)}
          <div class="t-row t-final"><span>TOTAL</span><span>${money(invoice.total)}</span></div>
          ${invoice.amountPaid > 0 ? `<div class="t-row" style="margin-top:5px"><span>Paid to date</span><span>${money(invoice.amountPaid)}</span></div>` : ''}
        </div>
      </div>

      ${goodwill(invoice.lines, invoice.discountNote)}
      ${invoice.status === 'void' ? '' : balanceBand(invoice.total, invoice.amountPaid ?? 0, payState(invoice), `Payment due ${printDate(invoice.dueOn)}.`)}

      ${settings.invoiceFooter ? `<div class="notes">${esc(settings.invoiceFooter)}</div>` : ''}
      ${bankBlock(settings)}
      ${signatures(settings, company, bill.name, bill.address, invoiceSigner(invoice, settings))}
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
      what: p.method === 'credit' ? `Credit for a return (${p.reference ?? ''})` : `Payment received (${p.method})`,
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
          ${fullAddress(distributor) ? `<div class="row"><span class="k">Address:</span><span>${esc(fullAddress(distributor))}</span></div>` : ''}
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

      <div class="balance">
        <div>
          <div class="lab">BALANCE CARRIED FORWARD</div>
          <div class="sub">${entries.length} entries to ${printDate(new Date())}</div>
        </div>
        <div class="val">${money(running)}</div>
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
    job.kind === 'proforma'
      ? proformaDoc(job)
      : job.kind === 'delivery'
        ? deliveryDoc(job)
        : job.kind === 'invoice'
          ? invoiceDoc(job)
          : statementDoc(job);

  return {
    title: doc.title,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
      <title>${esc(doc.title)}</title><style>${BASE_CSS(brand)}</style></head>
      <body>${watermark('AfterBI')}<div class="page">${doc.body}</div></body></html>`,
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
  printHtml(title, html);
}

/** Any finished HTML document to the print dialog. Must be called from a click. */
export function printHtml(title: string, html: string): void {

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
