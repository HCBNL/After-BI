/**
 * Public Firestore reads, without the Firestore client.
 *
 * WHY THIS EXISTS
 *
 * The public site reads three things: `site/home` (the owner's pictures and
 * videos), the list of published blog articles, and one article. All three
 * are public in `firestore.rules`. Reading them through the SDK meant every
 * visitor downloaded and started the database client (about 150 KB
 * compressed) before the front page knew which picture to draw.
 *
 * Firestore also answers plain HTTPS. One `fetch`, no library, and the answer
 * is the same document the rules already allow anybody to read. GetSchool does
 * the same job with a server function; this needs no server and no secret,
 * because the web API key identifies the project and grants nothing.
 *
 * Writes never come through here. The owner's console uses the SDK.
 */

const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const KEY = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

const BASE = PROJECT
  ? `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
  : '';

type RestValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
};

/** Firestore's typed JSON, as the plain object the SDK would have returned. */
function decode(value: RestValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
  return null;
}

function decodeFields(fields: Record<string, RestValue> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) out[key] = decode(value);
  return out;
}

async function call(url: string, init?: RequestInit, ms = 6000): Promise<Response> {
  const stop = new AbortController();
  const timer = window.setTimeout(() => stop.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: stop.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/** One document, or null when it is missing or refused. Throws only when offline. */
export async function restGet(path: string): Promise<Record<string, unknown> | null> {
  if (!BASE) return null;
  const response = await call(`${BASE}/${path}${KEY ? `?key=${KEY}` : ''}`);
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Firestore answered ${response.status}`);
  const body = (await response.json()) as { fields?: Record<string, RestValue> };
  return decodeFields(body.fields);
}

/**
 * Every document in a root collection where `field == value`.
 *
 * A structured query rather than a listing, because the rules allow a reader
 * only the published articles and a listing that might include a draft is
 * refused as a whole.
 */
export async function restWhere(
  collection: string,
  field: string,
  value: string,
  limit = 100,
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  if (!BASE) return [];
  const response = await call(`${BASE}:runQuery${KEY ? `?key=${KEY}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
        limit,
      },
    }),
  });
  if (!response.ok) throw new Error(`Firestore answered ${response.status}`);
  const rows = (await response.json()) as { document?: { name: string; fields?: Record<string, RestValue> } }[];
  return rows
    .filter((row) => row.document)
    .map((row) => ({
      id: row.document!.name.split('/').pop() ?? '',
      data: decodeFields(row.document!.fields),
    }));
}
