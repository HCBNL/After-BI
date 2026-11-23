/**
 * A business card, as a PDF a print shop will accept.
 *
 * Landscape 85 × 55 mm, which is the size business cards are cut to almost
 * everywhere outside the United States, front and back. Either at card size
 * for a shop, or two-up on A4 with cut marks for an office printer.
 *
 *   front  the organisation's bar, the holder's photograph, their name,
 *          position, location and phone
 *   back   the organisation's name and website, and a QR code that opens the
 *          holder's digital card
 *
 * WHY THERE IS A BLEED OPTION AND WHY IT IS OFF BY DEFAULT
 *
 * A commercial printer trims a stack of cards together and the blade wanders
 * by up to half a millimetre, so artwork that runs to the edge needs to carry
 * on past it or the trim leaves a white hairline. That margin is `bleed`, and
 * the card is drawn 3 mm larger in each direction with the design overhanging
 * it. An office printer does not trim at all, and a page sized 91 × 61 would
 * simply print small and wrong there, so the plain size is the default and
 * bleed is asked for.
 */

import type { jsPDF as JsPdf } from 'jspdf';

/** Landscape, the size cards are trimmed to. */
export const BC_W = 85;
export const BC_H = 55;
/** What a commercial printer trims away, per edge. */
export const BLEED = 3;

export type BusinessCardLayout = 'card' | 'a4';

export interface BusinessCardArt {
  name: string;
  position: string;
  location: string;
  phone: string;
  email: string;
  company: string;
  website: string;
  /** The holder's photograph as a data URL, or empty for initials. */
  photo: string;
  /** The organisation's logo as a data URL, or empty. */
  logo: string;
  /** QR code to the digital card, PNG data URL. */
  qr: string;
  /** Ink for the bar and headings. */
  navy?: Rgb;
  /**
   * The one accent: the rule under the bar, the position, the icons.
   *
   * The organisation's `brandColor`, not whichever theme the holder happens
   * to have chosen in the app. A business card is a company artefact, and
   * two people from the same company handing out cards in different colours
   * because one of them prefers the app in blue is not a thing a company
   * would accept. `#rrggbb`; anything else falls back to the default.
   */
  accent?: Rgb;
}

/** `#rrggbb` to the triplet jsPDF wants. Null for anything malformed. */
export function hexToRgb(hex: string | undefined): Rgb | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

type Rgb = [number, number, number];
const NAVY: Rgb = [15, 31, 54];
const ACCENT: Rgb = [220, 60, 6];
const INK: Rgb = [17, 20, 32];
const GREY: Rgb = [110, 116, 130];
const HAIR: Rgb = [223, 226, 232];

/** Shrink a line until it fits, rather than letting it run off the card. */
function fit(doc: JsPdf, text: string, width: number, max: number, min: number): number {
  let size = max;
  while (size > min && (doc.getStringUnitWidth(text) * size) / doc.internal.scaleFactor > width) size -= 0.25;
  return size;
}

/** The holder's initials, for a card with no photograph on it. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function front(doc: JsPdf, d: BusinessCardArt, x: number, y: number, bleed: number): void {
  const navy = d.navy ?? NAVY;
  const accent = d.accent ?? ACCENT;

  /* Paper. Drawn over the bleed too, so the trim never finds white. */
  doc.setFillColor(255, 255, 255);
  doc.rect(x - bleed, y - bleed, BC_W + bleed * 2, BC_H + bleed * 2, 'F');

  /* The company bar across the head, and the accent rule under it. */
  const bar = 16;
  doc.setFillColor(...navy);
  doc.rect(x - bleed, y - bleed, BC_W + bleed * 2, bar + bleed, 'F');
  doc.setFillColor(...accent);
  doc.rect(x - bleed, y + bar, BC_W + bleed * 2, 1.2, 'F');

  if (d.logo) {
    try {
      doc.addImage(d.logo, 'PNG', x + 6, y + 4.4, 7.2, 7.2, undefined, 'FAST');
    } catch {
      /* an unreadable logo is simply left off */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const nameX = d.logo ? x + 15.5 : x + 6;
  doc.setFontSize(fit(doc, d.company, BC_W - (nameX - x) - 6, 10.5, 6));
  doc.text(d.company, nameX, y + 9.8);

  /*
   * The photograph, overlapping the bar.
   *
   * It is the one thing on the card a person recognises before they read
   * anything, so it breaks the line between the bar and the paper rather than
   * sitting politely below it.
   */
  const pw = 22;
  const px = x + 6;
  const py = y + bar - 6;
  if (d.photo) {
    try {
      /* White behind it, so a transparent PNG does not show the navy. */
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(px - 1, py - 1, pw + 2, pw + 2, 2.4, 2.4, 'F');
      doc.addImage(d.photo, 'JPEG', px, py, pw, pw, undefined, 'FAST');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.roundedRect(px - 0.5, py - 0.5, pw + 1, pw + 1, 2.2, 2.2, 'S');
    } catch {
      doc.setFillColor(...accent);
      doc.roundedRect(px, py, pw, pw, 2.2, 2.2, 'F');
    }
  } else {
    doc.setFillColor(...accent);
    doc.roundedRect(px, py, pw, pw, 2.2, 2.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(initialsOf(d.name), px + pw / 2, py + pw / 2 + 2.2, { align: 'center' });
  }

  /* Name and position, to the right of the photograph. */
  const tx = px + pw + 5;
  const tw = BC_W - (tx - x) - 6;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fit(doc, d.name, tw, 13, 8));
  doc.text(d.name, tx, y + bar + 7.5);

  if (d.position) {
    doc.setTextColor(...accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fit(doc, d.position.toUpperCase(), tw, 7.5, 5.5));
    doc.text(d.position.toUpperCase(), tx, y + bar + 12.4);
  }

  /* Contact lines along the foot, under a hairline. */
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.2);
  doc.line(x + 6, y + BC_H - 17, x + BC_W - 6, y + BC_H - 17);

  const lines = [d.phone, d.email, d.location].filter(Boolean);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  lines.slice(0, 3).forEach((line, i) => {
    doc.setFontSize(fit(doc, line, BC_W - 12, 7.5, 5.5));
    doc.text(line, x + 6, y + BC_H - 12 + i * 3.8);
  });
}

function back(doc: JsPdf, d: BusinessCardArt, x: number, y: number, bleed: number): void {
  const navy = d.navy ?? NAVY;
  const accent = d.accent ?? ACCENT;

  doc.setFillColor(...navy);
  doc.rect(x - bleed, y - bleed, BC_W + bleed * 2, BC_H + bleed * 2, 'F');
  doc.setFillColor(...accent);
  doc.rect(x - bleed, y + BC_H - 3.4, BC_W + bleed * 2, 1.2, 'F');

  /* The QR, on white so a scanner reads it off a dark card. */
  const q = 26;
  const qx = x + BC_W - q - 7;
  const qy = y + (BC_H - q) / 2 - 1;
  if (d.qr) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qx - 2, qy - 2, q + 4, q + 4, 2, 2, 'F');
    try {
      doc.addImage(d.qr, 'PNG', qx, qy, q, q, undefined, 'FAST');
    } catch {
      /* no code rather than a broken one */
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(255, 255, 255);
    doc.text('Scan for my card', qx + q / 2, qy + q + 6, { align: 'center' });
  }

  const tw = qx - x - 14;
  if (d.logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + 7, y + 12, 9.6, 9.6, 1.6, 1.6, 'F');
      doc.addImage(d.logo, 'PNG', x + 8.2, y + 13.2, 7.2, 7.2, undefined, 'FAST');
    } catch {
      /* no logo block rather than an empty white square */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fit(doc, d.company, tw, 11, 6.5));
  doc.text(d.company, x + 7, y + (d.logo ? 28.5 : 24));

  if (d.website) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fit(doc, d.website, tw, 7.5, 5.5));
    doc.setTextColor(214, 220, 230);
    doc.text(d.website.replace(/^https?:\/\//, ''), x + 7, y + (d.logo ? 34 : 29.5));
  }
}

/** Corner marks showing the printer where to cut. */
function cutMarks(doc: JsPdf, x: number, y: number): void {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.1);
  const m = 3;
  for (const [cx, cy, dx, dy] of [
    [x, y, -1, -1],
    [x + BC_W, y, 1, -1],
    [x, y + BC_H, -1, 1],
    [x + BC_W, y + BC_H, 1, 1],
  ] as const) {
    doc.line(cx + dx * 1, cy, cx + dx * m, cy);
    doc.line(cx, cy + dy * 1, cx, cy + dy * m);
  }
}

export async function buildBusinessCard(
  d: BusinessCardArt,
  layout: BusinessCardLayout,
  bleed = false,
): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const title = `Business card: ${d.name}`;

  if (layout === 'card') {
    const b = bleed ? BLEED : 0;
    const w = BC_W + b * 2;
    const h = BC_H + b * 2;
    const doc = new jsPDF({ unit: 'mm', format: [w, h], orientation: 'landscape', compress: true });
    front(doc, d, b, b, b);
    doc.addPage([w, h], 'landscape');
    back(doc, d, b, b, b);
    doc.setProperties({ title, creator: 'AfterBI' });
    return doc;
  }

  /* Two-up on A4, front beside back, with marks to cut between. */
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const gap = 10;
  const x = (210 - BC_W) / 2;
  const y = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(title, 105, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text('Print at 100% (actual size). Cut along the marks and glue back to back.', 105, 23.5, { align: 'center' });

  front(doc, d, x, y, 0);
  back(doc, d, x, y + BC_H + gap, 0);
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.1);
  doc.rect(x, y, BC_W, BC_H);
  doc.rect(x, y + BC_H + gap, BC_W, BC_H);
  cutMarks(doc, x, y);
  cutMarks(doc, x, y + BC_H + gap);
  doc.setProperties({ title, creator: 'AfterBI' });
  return doc;
}
