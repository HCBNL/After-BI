/**
 * Reading a Code 128 sticker from the camera.
 *
 * Two readers, one interface:
 *
 *   the phone's own   Chrome on Android (and some desktop browsers) has a
 *                     built in barcode reader, `BarcodeDetector`. It is fast
 *                     and costs nothing to load, so it is used when it says it
 *                     reads Code 128.
 *   ZXing             everywhere else, notably every iPhone. A WebAssembly
 *                     build of the ZXing reader, served from this app's own
 *                     assets (never a CDN) and loaded only when a scanner
 *                     first opens, so nobody downloads it to place an order.
 *
 * Only Code 128 is looked for. A carton carries other barcodes (the maker's
 * EAN, a shipping label); asking for Code 128 alone means the scanner is not
 * distracted by them, and the count code check (lib/countCode.ts) throws out
 * any other Code 128 it happens to see.
 */

type Source = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | Blob;

export interface Reader {
  kind: 'native' | 'zxing';
  /** Every Code 128 text found in this frame or image. */
  read(source: Source): Promise<string[]>;
}

interface NativeDetector {
  detect(source: unknown): Promise<{ rawValue: string; format: string }[]>;
}
interface NativeDetectorClass {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

let cached: Promise<Reader> | null = null;

/** The best reader this browser has. Loaded once per visit. */
export function getReader(): Promise<Reader> {
  if (!cached) cached = pick().catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}

async function pick(): Promise<Reader> {
  const Native = (globalThis as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const formats = await Native.getSupportedFormats();
      if (formats.includes('code_128')) {
        const detector = new Native({ formats: ['code_128'] });
        return {
          kind: 'native',
          async read(source) {
            const input = source instanceof Blob ? await createImageBitmap(source) : source;
            const found = await detector.detect(input);
            return found.map((f) => f.rawValue);
          },
        };
      }
    } catch {
      /* A detector that throws on setup is no detector: fall through to ZXing. */
    }
  }
  return zxing();
}

async function zxing(): Promise<Reader> {
  const [{ prepareZXingModule, readBarcodes }, wasm] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  const wasmUrl = (wasm as { default: string }).default;
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
    fireImmediately: true,
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const options = { formats: ['Code128' as const], tryHarder: true, tryRotate: true, maxNumberOfSymbols: 4 };
  /*
   * Three ways of deciding which pixels are black. The default copes with
   * uneven light across a carton; a fixed threshold rescues a small, soft,
   * grainy picture (warehouse light, phone held far back) that the default
   * misses; the histogram catches the rest. Each is a few milliseconds.
   */
  const BINARIZERS = ['LocalAverage', 'FixedThreshold', 'GlobalHistogram'] as const;
  const readAll = async (input: Blob | ImageData): Promise<string[]> => {
    for (const binarizer of BINARIZERS) {
      const found = (await readBarcodes(input, { ...options, binarizer })).filter((r) => r.isValid).map((r) => r.text);
      if (found.length) return found;
    }
    return [];
  };

  return {
    kind: 'zxing',
    async read(source) {
      if (source instanceof Blob) return readAll(source);
      if (!ctx) return [];
      const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      if (!w || !h) return [];
      /* Large frames are slow and no sharper for a barcode filling the guide; cap the long side. */
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
      return readAll(ctx.getImageData(0, 0, canvas.width, canvas.height));
    },
  };
}

/** Short buzz and a click, so a counter knows the read landed without looking. */
export function scanFeedback(good = true): void {
  try {
    navigator.vibrate?.(good ? 60 : [40, 60, 40]);
  } catch {
    /* no vibration on this device */
  }
  try {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const audio = new Ctx();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = good ? 1320 : 330;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + (good ? 0.09 : 0.18));
    osc.onended = () => void audio.close();
  } catch {
    /* no sound: the vibration and the screen say it anyway */
  }
}
