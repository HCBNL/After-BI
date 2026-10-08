/**
 * An AfterBI staff ID card, as a PDF. Nothing is stored.
 * (Ported from GetSchool's field staff card; same layout, AfterBI's brand,
 * CONTORIC LTD as the issuing company, the same CEO signature.)
 *
 * Portrait CR80 (54 × 85.6 mm), front and back, either at card size or on A4
 * with cut marks — the same two layouts as the school ID cards.
 *
 *   front  AfterBI's mark, the photo the staff member cropped, their name,
 *          position, location, phone and staff number
 *   back   fixed: the company, RC number, office, AfterBI's line, the CEO's
 *          signature, and a QR code to the staff member's digital card
 */

import type { jsPDF as JsPdf } from 'jspdf';
import { COMPANY } from './company';

/** CR80, portrait. */
export const CARD_W = 54;
export const CARD_H = 85.6;
export type IdCardLayout = 'card' | 'a4';


export interface StaffCardData {
  fullName: string;
  position: string;
  location: string;
  phone: string;
  staffNo: string;
  /** JPEG data URL, 3:4, already cropped. */
  photo: string;
  /** The AfterBI mark as a PNG data URL. */
  mark: string;
  /** The CEO's signature, PNG data URL. */
  signature: string;
  /** QR code PNG data URL (to the digital card), or empty. */
  qr: string;
}

type Rgb = [number, number, number];
const NAVY: Rgb = [15, 31, 54];
const RED: Rgb = [238, 106, 0];
const INK: Rgb = [17, 20, 32];
const GREY: Rgb = [104, 110, 126];

function fit(doc: JsPdf, text: string, width: number, max: number, min: number): number {
  let size = max;
  while (size > min && (doc.getStringUnitWidth(text) * size) / doc.internal.scaleFactor > width) size -= 0.25;
  return size;
}

function front(doc: JsPdf, d: StaffCardData, x: number, y: number): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, CARD_W, CARD_H, 'F');

  /*
   * One brand mark per end of the card: the AfterBI bars alone at the top,
   * the AfterBI name alone in the foot. Nothing competes in the corners.
   */
  doc.setFillColor(...NAVY);
  doc.rect(x, y, CARD_W, 33, 'F');
  doc.setFillColor(...RED);
  doc.rect(x, y + 33, CARD_W, 0.6, 'F');

  const markSize = 11;
  try {
    doc.addImage(d.mark, 'PNG', x + (CARD_W - markSize) / 2, y + 3.6, markSize, markSize, undefined, 'FAST');
  } catch {
    /* no mark drawn */
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setCharSpace(0.6);
  doc.setTextColor(200, 205, 218);
  const label = 'STAFF ID CARD';
  const labelW = (doc.getStringUnitWidth(label) * 5.4) / doc.internal.scaleFactor + label.length * 0.6;
  doc.text(label, x + (CARD_W - labelW) / 2, y + 19.6);
  doc.setCharSpace(0);

  /* Photo, overlapping the band, in a white frame with a red keyline. */
  const pw = 22.4;
  const ph = 28;
  const px = x + (CARD_W - pw) / 2;
  const py = y + 24;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(px - 1.4, py - 1.4, pw + 2.8, ph + 2.8, 2.6, 2.6, 'F');
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.roundedRect(px - 0.7, py - 0.7, pw + 1.4, ph + 1.4, 2.2, 2.2, 'S');
  if (d.photo) {
    try {
      doc.addImage(d.photo, 'JPEG', px, py, pw, ph, undefined, 'FAST');
    } catch {
      /* fall through */
    }
  } else {
    doc.setFillColor(236, 238, 243);
    doc.rect(px, py, pw, ph, 'F');
  }

  /* Name, position, location. */
  const name = d.fullName.toUpperCase() || 'YOUR NAME';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fit(doc, name, CARD_W - 6, 9.4, 6));
  doc.setTextColor(...INK);
  doc.text(name, x + CARD_W / 2, y + 58, { align: 'center' });
  doc.setFontSize(fit(doc, d.position || 'Position', CARD_W - 8, 7, 5));
  doc.setTextColor(...RED);
  doc.text(d.position || 'Position', x + CARD_W / 2, y + 61.9, { align: 'center' });
  if (d.location.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(...GREY);
    doc.text(d.location, x + CARD_W / 2, y + 65.2, { align: 'center' });
  }

  /* Phone and staff number. */
  doc.setDrawColor(222, 225, 232);
  doc.setLineWidth(0.2);
  doc.line(x + 5, y + 67.6, x + CARD_W - 5, y + 67.6);
  const cells: [string, string][] = [
    ['PHONE', d.phone || '—'],
    ['STAFF NO', d.staffNo || '—'],
  ];
  cells.forEach(([label, value], i) => {
    const cx = x + 5 + i * ((CARD_W - 10) / 2 + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.3);
    doc.setTextColor(...GREY);
    doc.text(label, cx, y + 71);
    doc.setFontSize(fit(doc, value, (CARD_W - 10) / 2 - 1, 6.8, 4.6));
    doc.setTextColor(...INK);
    doc.text(value, cx, y + 74);
  });

  /* Foot: the wordmark, alone. */
  const footY = y + CARD_H - 7.2;
  doc.setFillColor(...NAVY);
  doc.rect(x, footY, CARD_W, 7.2, 'F');
  doc.setFillColor(...RED);
  doc.rect(x, footY, CARD_W, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(COMPANY.product, x + CARD_W / 2, footY + 4.9, { align: 'center' });
}

function back(doc: JsPdf, d: StaffCardData, x: number, y: number): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, CARD_W, CARD_H, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(x, y, CARD_W, 11, 'F');
  doc.setFillColor(...RED);
  doc.rect(x, y + 11, CARD_W, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(255, 255, 255);
  doc.text(COMPANY.name, x + CARD_W / 2, COMPANY.rc ? y + 5.4 : y + 6.6, { align: 'center' });
  if (COMPANY.rc) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(200, 205, 218);
    doc.text(COMPANY.rc, x + CARD_W / 2, y + 8.7, { align: 'center' });
  }

  /* What AfterBI is, in one line. */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(...RED);
  doc.text(COMPANY.tagline, x + CARD_W / 2, y + 15.6, { align: 'center' });

  /* The notice. */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...INK);
  const notice =
    `The holder of this card is a member of staff of ${COMPANY.name}, the company behind ${COMPANY.product}. This card is the property of the company and is not transferable. If found, please return it to:`;
  const lines = doc.splitTextToSize(notice, CARD_W - 9) as string[];
  let ty = y + 20.2;
  for (const line of lines) {
    doc.text(line, x + 4.5, ty);
    ty += 2.5;
  }

  /* Contact rows, spread evenly down to the signature block. */
  const qrY = y + CARD_H - 27.5;
  const rows: [string, string[]][] = [
    ...(COMPANY.address ? ([['Office', [COMPANY.address]]] as [string, string[]][]) : []),
    ['Phone', [COMPANY.phone]],
    ['Email', [COMPANY.email]],
    ['Web', [COMPANY.website]],
  ];
  const LINE = 2.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  const wrapped = rows.map(([label, values]) => [label, values.flatMap((v) => doc.splitTextToSize(v, CARD_W - 19) as string[])] as const);
  const contentH = wrapped.reduce((h, [, v]) => h + v.length * LINE, 0);
  const top = ty + 2.6;
  const room = qrY - 4 - top;
  const gap = Math.min(5.6, Math.max(1.4, (room - contentH) / rows.length));
  ty = top + gap / 2;
  doc.setDrawColor(226, 229, 236);
  doc.setLineWidth(0.15);
  wrapped.forEach(([label, values], i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.6);
    doc.setTextColor(...RED);
    doc.text(label.toUpperCase(), x + 4.5, ty);
    doc.setFontSize(5.8);
    doc.setTextColor(...INK);
    values.forEach((line, j) => doc.text(line, x + 14.5, ty + j * LINE));
    ty += values.length * LINE + gap;
    if (i < wrapped.length - 1) doc.line(x + 4.5, ty - gap / 2 - 1.6, x + CARD_W - 4.5, ty - gap / 2 - 1.6);
  });

  /* QR to the public staff check, and the signature. */
  const qrSize = 15;
  if (d.qr) {
    try {
      doc.addImage(d.qr, 'PNG', x + 4.5, qrY, qrSize, qrSize, undefined, 'FAST');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.9);
      doc.setTextColor(...GREY);
      doc.text('Scan to verify', x + 4.5 + qrSize / 2, qrY + qrSize + 2, { align: 'center' });
    } catch {
      /* no QR */
    }
  }
  const sx = x + (d.qr ? 23 : 12);
  const sw = CARD_W - (sx - x) - 4.5;
  try {
    doc.addImage(d.signature, 'PNG', sx + sw / 2 - 12, qrY - 0.6, 24, 11.6, undefined, 'FAST');
  } catch {
    /* no signature */
  }
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.2);
  doc.line(sx, qrY + 11.2, sx + sw, qrY + 11.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setTextColor(...INK);
  doc.text(COMPANY.ceo, sx + sw / 2, qrY + 13.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(...GREY);
  doc.text(COMPANY.ceoTitle, sx + sw / 2, qrY + 16.1, { align: 'center' });

  doc.setFillColor(...NAVY);
  doc.rect(x, y + CARD_H - 6.5, CARD_W, 6.5, 'F');
  doc.setFillColor(...RED);
  doc.rect(x, y + CARD_H - 6.5, CARD_W, 0.6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(200, 205, 218);
  doc.text(COMPANY.footer, x + CARD_W / 2, y + CARD_H - 2.4, { align: 'center' });
}

function cutMarks(doc: JsPdf, x: number, y: number): void {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.15);
  for (const [cx, cy] of [
    [x, y],
    [x + CARD_W, y],
    [x, y + CARD_H],
    [x + CARD_W, y + CARD_H],
  ]) {
    const left = cx === x;
    const top = cy === y;
    doc.line(left ? cx - 5.2 : cx + 1.2, cy, left ? cx - 1.2 : cx + 5.2, cy);
    doc.line(cx, top ? cy - 5.2 : cy + 1.2, cx, top ? cy - 1.2 : cy + 5.2);
  }
}

export async function buildStaffCard(data: StaffCardData, layout: IdCardLayout): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  if (layout === 'card') {
    const doc = new jsPDF({ unit: 'mm', format: [CARD_W, CARD_H], orientation: 'portrait', compress: true });
    front(doc, data, 0, 0);
    doc.addPage([CARD_W, CARD_H], 'portrait');
    back(doc, data, 0, 0);
    doc.setProperties({ title: `AfterBI staff ID: ${data.fullName}`, creator: 'AfterBI' });
    return doc;
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const gap = 12;
  const x = (210 - (CARD_W * 2 + gap)) / 2;
  const y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`AfterBI staff ID: ${data.fullName}`, 105, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text('Print at 100% (actual size). Cut along the marks, glue back to back, then laminate.', 105, 21.5, { align: 'center' });
  front(doc, data, x, y);
  back(doc, data, x + CARD_W + gap, y);
  doc.setDrawColor(222, 225, 232);
  doc.setLineWidth(0.1);
  doc.rect(x, y, CARD_W, CARD_H);
  doc.rect(x + CARD_W + gap, y, CARD_W, CARD_H);
  cutMarks(doc, x, y);
  cutMarks(doc, x + CARD_W + gap, y);
  doc.setFontSize(7);
  doc.text('FRONT', x + CARD_W / 2, y + CARD_H + 6, { align: 'center' });
  doc.text('BACK', x + CARD_W + gap + CARD_W / 2, y + CARD_H + 6, { align: 'center' });
  doc.setProperties({ title: `AfterBI staff ID: ${data.fullName}`, creator: 'AfterBI' });
  return doc;
}

