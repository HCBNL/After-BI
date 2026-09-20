/**
 * Handing a generated file to the person looking at the page.
 *
 * In a normal deployment this is an anchor click, the way every browser
 * download works. When the app is embedded in a viewer that sandboxes
 * downloads, that anchor is inert — so we first ask the host whether it will
 * mediate the save on our behalf, and use that when it says yes.
 *
 * The host bridge is entirely optional: `window.claude` does not exist in a
 * normal deployment, and everything below falls back silently.
 */

interface HostDownloads {
  save: (request: { filename: string; data: Blob | ArrayBuffer | string }) => Promise<{ status: string }>;
}

interface HostBridge {
  use?: (name: string) => Promise<unknown>;
}

declare global {
  interface Window {
    claude?: HostBridge;
  }
}

export type SaveOutcome =
  | { status: 'saved'; via: 'host' | 'browser' }
  | { status: 'declined' }
  | { status: 'unsupported'; reason: string };

/** Resolves the host's downloads namespace, or null if there isn't one. */
async function hostDownloads(): Promise<HostDownloads | null> {
  try {
    const bridge = window.claude;
    if (!bridge || typeof bridge.use !== 'function') return null;
    const namespace = (await bridge.use('downloads')) as HostDownloads | null;
    return namespace && typeof namespace.save === 'function' ? namespace : null;
  } catch {
    return null;
  }
}

function browserDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Save a generated file. Prefers the host bridge when one is present so the
 * file actually reaches the viewer in a sandboxed frame; otherwise does the
 * ordinary browser download.
 */
export async function saveFile(filename: string, blob: Blob): Promise<SaveOutcome> {
  const host = await hostDownloads();

  if (host) {
    try {
      await host.save({ filename, data: blob });
      return { status: 'saved', via: 'host' };
    } catch (error) {
      const code = (error as { code?: string })?.code ?? 'unavailable';

      if (code === 'declined') return { status: 'declined' };

      // The host cannot take this file type (or saves are off). Fall through
      // to the browser path — it may still work, and if it does not the
      // caller shows the message below.
      if (code === 'extension_not_enabled' || code === 'rejected_extension') {
        browserDownload(filename, blob);
        return {
          status: 'unsupported',
          reason: 'This preview cannot save PDFs. Run the app yourself and the download works normally.',
        };
      }

      if (code === 'too_large') {
        return { status: 'unsupported', reason: 'That file is too large to save from this preview.' };
      }

      if (code === 'rate_limited') {
        return { status: 'unsupported', reason: 'A save is already in progress. Try again in a moment.' };
      }
    }
  }

  browserDownload(filename, blob);
  return { status: 'saved', via: 'browser' };
}

/* ------------------------------------------------------------------- CSV */

export type CsvCell = string | number | null | undefined;

/**
 * Quote a cell the way Excel expects.
 *
 * The leading-character guard matters more than it looks: a Nigerian phone
 * number typed as 0803… loses its zero when Excel decides it is a number, and
 * a cell starting with = is executed as a formula when the file is opened.
 * Both are quietly corrupted data in a file a school may rely on for years.
 */
function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  const risky = /^[=+\-@]/.test(text);
  return `"${(risky ? `'${text}` : text).replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Build a CSV and hand it to the person. Excel needs the BOM for accents. */
export async function downloadCsv(filename: string, rows: CsvCell[][]): Promise<SaveOutcome> {
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  return saveFile(filename, blob);
}

/** `students-2026-08-27.csv`, a name that still sorts sensibly in a year. */
export function datedFilename(base: string, extension = 'csv'): string {
  return `${base}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
