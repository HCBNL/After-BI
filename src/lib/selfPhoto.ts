/**
 * The signed in person's own picture, kept in the browser.
 *
 * The first time a picture is seen it is downloaded once, small (320px), and
 * saved on this device (`localStorage`, as a data URL of a few kilobytes).
 * Every time after that, the lock screen, the header, the bottom bar and the
 * menu draw it from there instantly, so the app never opens on initials and
 * then swaps in the photo. A new picture replaces the saved one; removing the
 * picture removes it. Only one picture is kept: the person signed in here.
 */
import { useEffect, useState } from 'react';
import { imageUrl } from './cloudinary';

const KEY = 'ab.photo';
const EVENT = 'ab-photo-change';
const MAX_BYTES = 250_000;

interface Saved {
  uid: string;
  /** The picture's address as stored on the profile, to know when it changes. */
  src: string;
  data: string;
}

function read(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function write(next: Saved | null): void {
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or off: the picture still loads from the web */
  }
  window.dispatchEvent(new Event(EVENT));
}

let saving: Promise<void> | null = null;

async function save(uid: string, src: string): Promise<void> {
  const res = await fetch(imageUrl(src, { width: 160 }), { mode: 'cors' });
  if (!res.ok) return;
  const blob = await res.blob();
  if (blob.size > MAX_BYTES) return;
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  write({ uid, src, data });
}

function pick(uid: string | undefined, src: string | undefined): string | undefined {
  if (!uid || !src) return undefined;
  const saved = read();
  if (saved && saved.uid === uid && saved.src === src) return saved.data;
  return imageUrl(src, { width: 160 });
}

/** The best source for this person's own picture: the saved copy when there is one, else the web address. */
export function useSelfPhoto(user: { id: string; photoURL?: string } | null | undefined): string | undefined {
  const uid = user?.id;
  const src = user?.photoURL || undefined;
  const [shown, setShown] = useState(() => pick(uid, src));

  useEffect(() => {
    setShown(pick(uid, src));
    const update = () => setShown(pick(uid, src));
    window.addEventListener(EVENT, update);

    if (uid) {
      const saved = read();
      if (!src) {
        if (saved?.uid === uid) write(null);
      } else if (!saved || saved.uid !== uid || saved.src !== src) {
        saving ??= save(uid, src)
          .catch(() => undefined)
          .finally(() => {
            saving = null;
          });
      }
    }
    return () => window.removeEventListener(EVENT, update);
  }, [uid, src]);

  return shown;
}
