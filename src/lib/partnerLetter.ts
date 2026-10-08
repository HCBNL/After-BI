/**
 * The Partner Programme invitation: a printable letter to someone the trade
 * already trusts, asking them to introduce AfterBI and paying a reward for
 * every business that subscribes.
 *
 * Same letterhead and print path as the proposals. The reward and payment
 * days start from Platform, Website, Partner Programme, so the letter and the
 * public Partners page say the same thing.
 */

import { naira } from './site';
import { BRAND, SITE_URL, SUPPORT_EMAIL, SALES_PHONE } from './siteMeta';
import { COMPANY, brandAsset } from './company';
import { esc, longDate, PROPOSAL_CSS } from './proposal';

export interface PartnerInput {
  /** "Mr Tunde Bakare", or empty for "Dear Partner". */
  partnerName: string;
  /** Optional line under the name: firm, association, role. */
  partnerDetail: string;
  reward: number;
  payDays: number;
  /** Optional personal line in the introduction. */
  note: string;
  date: string;
}

export function blankPartner(reward: number, payDays: number): PartnerInput {
  return { partnerName: '', partnerDetail: '', reward, payDays, note: '', date: new Date().toISOString().slice(0, 10) };
}

export function partnerReference(input: PartnerInput): string {
  const initials = input.partnerName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  return `AB-PP-${input.date.replace(/-/g, '').slice(2)}${initials ? `-${initials}` : ''}`;
}

const EXTRA = `
  .medal { display: flex; align-items: center; gap: 16px; background: #0b1410; color: #fff; border-radius: 14px; padding: 16px 18px; margin: 18px 0; }
  .medal .ring { flex: none; width: 116px; height: 116px; border-radius: 50%; border: 5px solid #10b981; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: 12.5pt; line-height: 1.15; }
  .medal .ring small { display: block; font-size: 7.5pt; font-weight: 600; color: #a7f3d0; }
  .steps td:first-child { width: 160px; }
  .medal p { margin: 0; color: #cbd5e1; }
  .medal b { color: #fff; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid4 div { border: 1px solid #dfe3e8; border-radius: 8px; padding: 8px 10px; }
  .grid4 b { display: block; }
  .grid4 span { color: #5b6472; font-size: 9pt; }
`;

export function partnerLetterHtml(input: PartnerInput): { title: string; html: string } {
  const reward = naira(input.reward);
  const ref = partnerReference(input);
  const to = input.partnerName.trim();
  const title = `${BRAND} Partner Programme${to ? ` for ${to}` : ''}`;

  const why = [
    ['Built for Nigerian distribution', 'Orders, stock, invoices, credit and sell-out, on the phones the trade already carries.'],
    ['Priced in naira, per business', 'Distributor logins are free on every plan, so the price never grows with the network.'],
    ['Live in about a month', 'We load the products, prices and distributors and train every role ourselves.'],
    ['Nothing for you to support', 'You make the introduction. Walkthroughs, setup and support are all ours.'],
  ];
  const steps = [
    ['Introduce', 'Tell us about a distributor or manufacturer, or bring them to a walkthrough.'],
    ['We walk them through it', 'On their own numbers, with a written proposal afterwards.'],
    ['They subscribe', 'Any plan, or an AfterBI Custom build.'],
    ['You are paid', `${reward} by bank transfer within ${input.payDays} working days of their first payment.`],
  ];

  const body = `
    <div class="top">
      <div><div class="brand"><img src="${brandAsset('mark')}" alt="">AfterBI</div><div style="font-size:9pt;color:#5b6472">${esc(COMPANY.tagline)}</div></div>
      <div class="meta">Reference ${esc(ref)}<br>${esc(longDate(input.date))}</div>
    </div>

    <div class="cover">
      <div class="eyebrow">Partner Programme invitation</div>
      <h1>Introduce a business to AfterBI. Earn ${esc(reward)} when it subscribes.</h1>
      <p style="margin-top:14px">${to ? `<b>${esc(to)}</b>${input.partnerDetail.trim() ? `<br>${esc(input.partnerDetail.trim())}` : ''}` : '<b>Dear Partner</b>'}</p>
      <p>The people who run distribution in Nigeria listen to a small number of advisers: the consultant who fixed their route to market, the accountant who audits their books, the association that speaks for them. We would like you to be one of the people who tells them about AfterBI.</p>
      ${input.note.trim() ? `<p class="note">${esc(input.note.trim())}</p>` : ''}
    </div>

    <div class="medal">
      <div class="ring">${esc(reward)}<small>per business</small></div>
      <p><b>For every business you introduce that subscribes</b>, we pay you ${esc(reward)}, once, by bank transfer within ${input.payDays} working days of its first payment. There is no cap on how many businesses you introduce.</p>
    </div>

    <section>
      <h2>Why AfterBI is easy to recommend</h2>
      <div class="grid4">${why.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
    </section>

    <section>
      <h2>How it works</h2>
      <table class="steps">${steps.map(([t, d], i) => `<tr><td>${i + 1}. ${esc(t)}</td><td>${esc(d)}</td></tr>`).join('')}</table>
    </section>

    <section>
      <h2>The terms</h2>
      <ul>
        <li>The reward is earned when a business you introduced subscribes and makes its first payment.</li>
        <li>A business counts as yours if we had not already been in touch with it before your introduction. We tell you straight away if we had.</li>
        <li>Paid in your name, by bank transfer, within ${input.payDays} working days.</li>
        <li>No fee to join, nothing to sell, install or support.</li>
      </ul>
    </section>

    <section>
      <h2>Next step</h2>
      <p>Reply to ${esc(SUPPORT_EMAIL)} or call ${esc(SALES_PHONE)} quoting ${esc(ref)}, and we will set you up. The programme is also at ${esc(SITE_URL.replace(/^https?:\/\//, ''))}/partners.</p>
      <div class="sign">
        <div class="signed"><img class="sigimg" src="${brandAsset('signature')}" alt="">For ${esc(COMPANY.name)} (AfterBI)<br><b>${esc(COMPANY.ceo)}</b>, ${esc(COMPANY.ceoTitle)}</div>
        <div>Partner<br>Name, signature and date</div>
      </div>
    </section>

    <div class="foot"><span>${esc(COMPANY.footer)}${COMPANY.rc ? ` · ${esc(COMPANY.rc)}` : ''}</span><span>${esc(SUPPORT_EMAIL)} · ${esc(SITE_URL.replace(/^https?:\/\//, ''))}</span></div>
  `;

  return {
    title,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PROPOSAL_CSS}${EXTRA}</style></head><body>${body}</body></html>`,
  };
}
