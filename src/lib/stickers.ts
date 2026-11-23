/**
 * Carton stickers: printed sheets and single PNG downloads.
 *
 * A sticker carries the product's name and pack size (so a person can check
 * it is on the right carton), the count code as Code 128 bars, and the same
 * code in letters under the bars for when the bars are torn. No web address,
 * no price, nothing a stranger's scanner can use.
 *
 * THREE WAYS TO PRINT
 *
 *   a4      A4 sheet of 14 (2 across, 7 down, 99.1 × 38.1 mm), the common
 *           office label sheet. Plain paper and scissors work too.
 *   l100    a label printer roll, 100 × 50 mm, one sticker a label.
 *   l60     a label printer roll, 60 × 40 mm, one sticker a label.
 *
 * Printed through the browser (lib/print.ts `printHtml`), which also offers
 * Save as PDF.
 */

import { code128Svg, drawCode128 } from './code128';
import { displayCode } from './countCode';
import { printHtml } from './print';

export type StickerLayout = 'a4' | 'l100' | 'l60';

export const STICKER_LAYOUTS: { value: StickerLayout; label: string; perPage: number }[] = [
  { value: 'a4', label: 'A4 sheet, 14 a page (99 × 38 mm)', perPage: 14 },
  { value: 'l100', label: 'Label printer, 100 × 50 mm', perPage: 1 },
  { value: 'l60', label: 'Label printer, 60 × 40 mm', perPage: 1 },
];

export interface StickerItem {
  name: string;
  packSize?: string;
  code: string;
  copies: number;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SIZE: Record<StickerLayout, { w: number; h: number; bars: number; barH: number; name: number; code: number }> = {
  a4: { w: 99.1, h: 38.1, bars: 72, barH: 13, name: 3.6, code: 3.2 },
  l100: { w: 100, h: 50, bars: 80, barH: 19, name: 4.4, code: 3.8 },
  l60: { w: 60, h: 40, bars: 54, barH: 15, name: 3.2, code: 3 },
};

function sticker(item: StickerItem, layout: StickerLayout): string {
  const s = SIZE[layout];
  return `<div class="st">
    <div class="nm">${esc(item.name)}</div>
    ${item.packSize ? `<div class="pk">${esc(item.packSize)}</div>` : ''}
    <div class="bars">${code128Svg(item.code, s.bars, s.barH)}</div>
    <div class="cd">${esc(displayCode(item.code))}</div>
  </div>`;
}

/** Print stickers for every item, each as many times as its `copies`. Must be called from a click. */
export function printStickers(items: StickerItem[], layout: StickerLayout, title = 'Stock count stickers'): void {
  const s = SIZE[layout];
  const all = items.flatMap((item) => Array.from({ length: Math.max(0, Math.min(500, Math.round(item.copies))) }, () => item));
  if (!all.length) return;

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#000;
         -webkit-print-color-adjust:exact;print-color-adjust:exact}
    .st{width:${s.w}mm;height:${s.h}mm;padding:2.2mm 3mm 1.6mm;display:flex;flex-direction:column;
        align-items:center;justify-content:center;overflow:hidden;text-align:center;background:#fff}
    .nm{font-size:${s.name}mm;font-weight:800;line-height:1.15;max-height:${(s.name * 2.4).toFixed(1)}mm;overflow:hidden;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;width:100%}
    .pk{font-size:${(s.name * 0.72).toFixed(2)}mm;color:#333;margin-top:.4mm;white-space:nowrap;overflow:hidden;
        text-overflow:ellipsis;width:100%}
    .bars{margin-top:1.4mm;line-height:0}
    .bars svg{display:block}
    .cd{font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:${s.code}mm;font-weight:700;letter-spacing:.18em;margin-top:.9mm}
    ${
      layout === 'a4'
        ? `@page{size:A4;margin:0}
           .sheet{width:210mm;height:297mm;padding:15.15mm 4.65mm 0;display:grid;
                  grid-template-columns:repeat(2,99.1mm);grid-auto-rows:38.1mm;column-gap:2.5mm;
                  page-break-after:always;break-after:page}
           .sheet:last-child{page-break-after:auto;break-after:auto}
           @media screen{.sheet{outline:1px dashed #ccc;margin:0 auto 8mm}.st{outline:1px dotted #ddd}}`
        : `@page{size:${s.w}mm ${s.h}mm;margin:0}
           .st{page-break-after:always;break-after:page}
           .st:last-child{page-break-after:auto;break-after:auto}
           @media screen{.st{outline:1px dashed #ccc;margin:0 auto 4mm}}`
    }`;

  let body = '';
  if (layout === 'a4') {
    for (let i = 0; i < all.length; i += 14) {
      body += `<div class="sheet">${all.slice(i, i + 14).map((item) => sticker(item, layout)).join('')}</div>`;
    }
  } else {
    body = all.map((item) => sticker(item, layout)).join('');
  }

  printHtml(
    title,
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`,
  );
}

/** One sticker as a PNG (100 × 50 mm at about 300 dpi), for a label app or to send to a printer. */
export async function stickerPng(item: Pick<StickerItem, 'name' | 'packSize' | 'code'>): Promise<Blob> {
  const W = 1200;
  const H = 600;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the sticker.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const font = (size: number, weight = 800, mono = false) =>
    `${weight} ${size}px ${mono ? "'SFMono-Regular',Menlo,Consolas,monospace" : "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"}`;

  /* The name, on up to two lines, shrunk to fit. */
  let size = 52;
  ctx.font = font(size);
  const words = item.name.split(/\s+/);
  const wrap = (): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > W - 80 && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = wrap();
  while ((lines.length > 2 || lines.some((l) => ctx.measureText(l).width > W - 80)) && size > 28) {
    size -= 2;
    ctx.font = font(size);
    lines = wrap();
  }
  let y = 34;
  for (const line of lines.slice(0, 2)) {
    ctx.fillText(line, W / 2, y);
    y += size * 1.15;
  }
  if (item.packSize) {
    ctx.fillStyle = '#333';
    ctx.font = font(34, 500);
    ctx.fillText(item.packSize, W / 2, y + 4);
    y += 46;
    ctx.fillStyle = '#000';
  }

  const barTop = Math.max(y + 18, 170);
  const barHeight = H - barTop - 96;
  drawCode128(ctx, item.code, 40, barTop, W - 80, barHeight);

  ctx.font = font(48, 700, true);
  const text = displayCode(item.code);
  ctx.fillText(text, W / 2, barTop + barHeight + 18);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The sticker could not be saved.'))), 'image/png'),
  );
}
