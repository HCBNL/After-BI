/**
 * The handbook as a PDF: every page captured at twice its size and laid on
 * an A4 sheet, edge to edge, in order. What is on screen is what is printed.
 */

export async function handbookPdf(
  pages: HTMLElement[],
  fileName: string,
  onPage?: (done: number, total: number) => void,
): Promise<void> {
  const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await document.fonts?.ready;
  /* The fonts are read once and handed to every page, not fetched sixteen times. */
  const fontEmbedCSS = pages[0] ? await getFontEmbedCSS(pages[0]).catch(() => '') : '';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title: fileName.replace(/\.pdf$/, '').replace(/-/g, ' '), author: 'AfterBI', creator: 'AfterBI' });

  for (let i = 0; i < pages.length; i++) {
    const data = await toJpeg(pages[i], {
      pixelRatio: 2,
      quality: 0.9,
      width: 794,
      height: 1123,
      fontEmbedCSS: fontEmbedCSS || undefined,
    });
    if (i) pdf.addPage();
    pdf.addImage(data, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    onPage?.(i + 1, pages.length);
  }
  pdf.save(fileName);
}
