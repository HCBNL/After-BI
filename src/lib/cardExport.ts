/**
 * A card's two faces, as they are drawn on screen (components/cards), turned
 * into a print PDF: each face is rendered to an image at about 400 dpi and
 * placed at its true size in millimetres, on a card sized page or on A4 with
 * cut marks. Loaded on demand.
 */

export type CardSheet = 'card' | 'a4';

interface Options {
  front: HTMLElement;
  back: HTMLElement;
  /** The card's size in mm. */
  w: number;
  h: number;
  sheet: CardSheet;
  title: string;
  /** Card sheet only: 3 mm of each face's edge colour all round, for a print shop. */
  bleed?: { front: string; back: string };
}

async function snap(node: HTMLElement, widthMm: number): Promise<string> {
  const { toPng } = await import('html-to-image');
  /* about 400 dpi */
  const ratio = Math.max(3, Math.round(((widthMm / 25.4) * 400) / node.offsetWidth));
  return toPng(node, { pixelRatio: ratio, cacheBust: true, backgroundColor: 'transparent' });
}

function marks(doc: import('jspdf').jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.15);
  for (const [cx, cy] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ]) {
    const left = cx === x;
    const top = cy === y;
    doc.line(left ? cx - 5.2 : cx + 1.2, cy, left ? cx - 1.2 : cx + 5.2, cy);
    doc.line(cx, top ? cy - 5.2 : cy + 1.2, cx, top ? cy - 1.2 : cy + 5.2);
  }
}

export async function cardPdf(o: Options): Promise<Blob> {
  const [{ jsPDF }, front, back] = await Promise.all([import('jspdf'), snap(o.front, o.w), snap(o.back, o.w)]);
  const portrait = o.h >= o.w;

  if (o.sheet === 'card') {
    const b = o.bleed ? 3 : 0;
    const W = o.w + b * 2;
    const H = o.h + b * 2;
    const doc = new jsPDF({ unit: 'mm', format: [W, H], orientation: portrait ? 'portrait' : 'landscape', compress: true });
    const page = (img: string, edge?: string) => {
      if (edge) {
        doc.setFillColor(edge);
        doc.rect(0, 0, W, H, 'F');
      }
      doc.addImage(img, 'PNG', b, b, o.w, o.h, undefined, 'FAST');
    };
    page(front, o.bleed?.front);
    doc.addPage([W, H], portrait ? 'portrait' : 'landscape');
    page(back, o.bleed?.back);
    doc.setProperties({ title: o.title, creator: 'AfterBI' });
    return doc.output('blob');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const gap = 12;
  const side = portrait;
  const x = side ? (210 - (o.w * 2 + gap)) / 2 : (210 - o.w) / 2;
  const y = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 20, 32);
  doc.text(o.title, 105, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(104, 110, 126);
  doc.text('Print at 100% (actual size). Cut along the marks, glue back to back, then laminate.', 105, 21.5, { align: 'center' });
  const bx = side ? x + o.w + gap : x;
  const by = side ? y : y + o.h + gap;
  doc.addImage(front, 'PNG', x, y, o.w, o.h, undefined, 'FAST');
  doc.addImage(back, 'PNG', bx, by, o.w, o.h, undefined, 'FAST');
  marks(doc, x, y, o.w, o.h);
  marks(doc, bx, by, o.w, o.h);
  doc.setFontSize(7);
  doc.text('FRONT', x + o.w / 2, y + o.h + 5, { align: 'center' });
  doc.text('BACK', bx + o.w / 2, by + o.h + 5, { align: 'center' });
  doc.setProperties({ title: o.title, creator: 'AfterBI' });
  return doc.output('blob');
}
