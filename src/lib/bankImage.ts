/**
 * A bank account as a picture, drawn straight onto a canvas.
 *
 * The same plain design for every company: black, white type, the account
 * number large, and the bank's logo on a white pill. If the logo cannot load,
 * the bank's initials on its colour stand in, so it still comes out the same
 * on any phone and reads clearly when forwarded or printed.
 */

export interface BankImageDetails {
  company: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** A number to call to confirm the account. Optional. */
  phone?: string;
  /** The bank's logo, drawn on a white tile beside its name. */
  logoUrl?: string;
  /** The bank's colour, for the initials tile when there is no logo. */
  color?: string;
}

/** Loads a picture for the canvas without tainting it; null when it cannot. */
async function loadLogo(url?: string): Promise<CanvasImageSource | null> {
  if (!url) return null;
  try {
    const blob = await (await fetch(url, { mode: 'cors' })).blob();
    if ('createImageBitmap' in window) {
      try {
        return await createImageBitmap(blob);
      } catch {
        /* an SVG: fall through to an <img> */
      }
    }
    const src = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('logo'));
      img.src = src;
    });
    return img;
  } catch {
    return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

  /* the bank on a white pill, logo and name, top left; the company, top right */
  const logo = await loadLogo(d.logoUrl);
  const pillH = 112;
  const tile = 84;
  const tx = PAD + 14;
  const ty = PAD - 20 + (pillH - tile) / 2;
  fit(ctx, d.bankName.toUpperCase(), 800, 40, family, max * 0.42);
  const nameW = ctx.measureText(d.bankName.toUpperCase()).width;
  const nameFont = ctx.font;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, PAD, PAD - 20, 14 + tile + 26 + nameW + 36, pillH, 32);
  ctx.fill();
  if (logo) {
    const lw = (logo as { width: number }).width || tile;
    const lh = (logo as { height: number }).height || tile;
    const k = Math.min((tile - 8) / lw, (tile - 8) / lh);
    ctx.drawImage(logo, tx + (tile - lw * k) / 2, ty + (tile - lh * k) / 2, lw * k, lh * k);
  } else {
    ctx.fillStyle = d.color || '#0f1f36';
    roundRect(ctx, tx, ty, tile, tile, 22);
    ctx.fill();
    const initials = d.bankName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 36px ${family}`;
    ctx.textAlign = 'center';
    ctx.fillText(initials, tx + tile / 2, ty + tile / 2 + 13);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#0A0A0B';
  ctx.font = nameFont;
  ctx.fillText(d.bankName.toUpperCase(), tx + tile + 26, PAD - 20 + pillH / 2 + 14);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const co = d.company;
  fit(ctx, co, 600, 30, family, max * 0.38);
  ctx.textAlign = 'right';
  ctx.fillText(co, W - PAD, PAD + 46);
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
