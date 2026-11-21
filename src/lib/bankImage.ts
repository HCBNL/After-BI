/**
 * A bank account as a picture, drawn straight onto a canvas.
 *
 * The same plain design for every company: black, white type, the account
 * number large. It does not depend on the screen, the theme or the bank's
 * logo loading, so it comes out the same for one company or fifty thousand,
 * on any phone, and reads clearly when forwarded or printed.
 */

export interface BankImageDetails {
  company: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** A number to call to confirm the account. Optional. */
  phone?: string;
}

const W = 1600;
const H = 1000;
const PAD = 96;

function spaced(n: string): string {
  return n.replace(/\s+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}

/** Shrinks the font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > max && s > 18) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

export async function bankImage(d: BankImageDetails): Promise<Blob> {
  try {
    await document.fonts?.ready;
  } catch {
    /* system fonts then */
  }
  const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the image.');

  /* the card */
  ctx.fillStyle = '#0A0A0B';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  const max = W - PAD * 2;

  const label = (text: string, y: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 30px ${family}`;
    ctx.fillText(text.toUpperCase().split('').join(' '), PAD, y);
  };
  const value = (text: string, y: number, weight = 700, size = 54) => {
    ctx.fillStyle = '#FFFFFF';
    fit(ctx, text, weight, size, family, max);
    ctx.fillText(text, PAD, y);
  };

  /* the bank, top left; the company, top right */
  ctx.fillStyle = '#FFFFFF';
  fit(ctx, d.bankName, 800, 56, family, max * 0.6);
  ctx.fillText(d.bankName, PAD, PAD + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const co = d.company;
  fit(ctx, co, 600, 30, family, max * 0.38);
  ctx.textAlign = 'right';
  ctx.fillText(co, W - PAD, PAD + 36);
  ctx.textAlign = 'left';

  /* the number, large */
  label('Account number', 330);
  value(spaced(d.accountNumber), 450, 800, 136);

  label('Account name', 570);
  value(d.accountName, 640);

  label('Bank', 730);
  value(d.bankName, 800);

  if (d.phone) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 30px ${family}`;
    ctx.fillText('TO CONFIRM, CALL'.split('').join(' '), W - PAD, 730);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 54px ${family}`;
    ctx.fillText(d.phone, W - PAD, 800);
    ctx.textAlign = 'left';
  }

  /* the rule and the note */
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(PAD, H - PAD - 46, max, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const note = `Pay only into this account. ${co} does not accept payment into any other.`;
  fit(ctx, note, 500, 28, family, max);
  ctx.fillText(note, PAD, H - PAD + 4);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image came out empty.'))), 'image/png'),
  );
}
