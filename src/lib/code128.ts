/**
 * Code 128 (set B), drawn without a library.
 *
 * The count code is nine capital letters and digits, all inside set B, so one
 * code set covers it and the encoder stays a table and a loop. The output is a
 * list of module widths, turned into SVG for printing and onto a canvas for a
 * PNG download. Both are pure black on white with a quiet zone of ten modules
 * either side, which is what a phone camera needs to find the edges.
 */

/* Bar, space, bar, space, bar, space widths for each value 0 to 106 (106 is stop). */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;
export const QUIET = 10;

/** The widths, bar first, of `text` as Code 128 B with its check symbol. */
export function code128Widths(text: string): number[] {
  const values: number[] = [START_B];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Code 128 B cannot hold "${ch}".`);
    values.push(code - 32);
  }
  let sum = START_B;
  for (let i = 1; i < values.length; i += 1) sum += values[i] * i;
  values.push(sum % 103, STOP);
  const widths: number[] = [];
  for (const v of values) for (const w of PATTERNS[v]) widths.push(Number(w));
  return widths;
}

/** Modules across, quiet zones included. */
export function code128Modules(text: string): number {
  return code128Widths(text).reduce((a, b) => a + b, 0) + QUIET * 2;
}

/**
 * The barcode as an SVG element string, `width` by `height` in whatever units
 * the caller wants (mm on a sticker sheet). Bars only: the caller prints the
 * human readable line.
 */
export function code128Svg(text: string, width: number, height: number, unit = 'mm'): string {
  const widths = code128Widths(text);
  const total = widths.reduce((a, b) => a + b, 0) + QUIET * 2;
  let x = QUIET;
  let rects = '';
  widths.forEach((w, i) => {
    if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="1"/>`;
    x += w;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}${unit}" height="${height}${unit}" viewBox="0 0 ${total} 1" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${total}" height="1" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

/** Draw the bars on a canvas, whole pixels per module so no bar is blurred. */
export function drawCode128(
  ctx: CanvasRenderingContext2D,
  text: string,
  left: number,
  top: number,
  maxWidth: number,
  height: number,
): number {
  const widths = code128Widths(text);
  const total = widths.reduce((a, b) => a + b, 0) + QUIET * 2;
  const module = Math.max(1, Math.floor(maxWidth / total));
  const drawn = total * module;
  const start = left + Math.floor((maxWidth - drawn) / 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(start, top, drawn, height);
  ctx.fillStyle = '#000';
  let x = start + QUIET * module;
  widths.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(x, top, w * module, height);
    x += w * module;
  });
  return drawn;
}
