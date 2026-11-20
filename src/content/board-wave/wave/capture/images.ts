import { escapeHtml } from '#shared/escape.ts';
import { pageImage } from './page-image.ts';

// The images a picture of the board holds (after distortion-waves' capture,
// MIT). A picture is an SVG image, a sealed document that loads nothing, so
// each board and piece image travels inside it as a data URL, fetched once and
// kept for the tab. Lichess's assets allow any origin; an image that can't be
// read is left out, and the wave bends the board without it.

const STORE_LIMIT = 200;
const FETCH_MS = 4000;
/** An image is drawn at least this wide when it must go through a canvas: piece sets are small SVGs. */
const MIN_DRAWN = 256;

const store = new Map<string, string | null>();

function keep(url: string, data: string | null): void {
  if (store.size >= STORE_LIMIT) {
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(url, data);
}

const blobData = (blob: Blob): Promise<string | null> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.addEventListener('load', () =>
      resolve(typeof reader.result === 'string' ? reader.result : null),
    );
    reader.addEventListener('error', () => resolve(null));
    reader.readAsDataURL(blob);
  });

async function fetched(url: string): Promise<string | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) });
  return response.ok ? blobData(await response.blob()) : null;
}

// Where a page's rules keep a fetch out (Firefox holds a content script to the
// page's CSP), an image served with CORS can still be drawn and read back.
function drawn(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const image = pageImage();
    image.crossOrigin = 'anonymous';
    image.addEventListener('error', () => resolve(null));
    image.addEventListener('load', () => {
      try {
        const scale = Math.max(1, MIN_DRAWN / Math.max(image.naturalWidth, 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL());
      } catch {
        // A tainted canvas: the image is not to be read.
        resolve(null);
      }
    });
    image.src = url;
  });
}

async function load(url: string): Promise<void> {
  let data: string | null = null;
  try {
    data = await fetched(url);
  } catch {
    data = null;
  }
  keep(url, data ?? (await drawn(url)));
}

/** What stands in for an image that couldn't be read: a clear pixel. */
const LEFT_OUT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * The images one picture needs. One still to load is written as a mark, and
 * filled in once it's in: the board is walked once, not again after its images.
 */
export class Embeds {
  private readonly missing = new Map<string, string>();
  private readonly mark = `ln-ext-embed-${crypto.randomUUID()}-`;

  /** `url`'s data URL if kept; otherwise null if it can't be read, or a mark that `fill` replaces. */
  dataOf(url: string): string | null {
    if (url.startsWith('data:')) return url;
    const kept = store.get(url);
    if (kept !== undefined) return kept;
    let mark = this.missing.get(url);
    if (mark === undefined) {
      mark = `${this.mark}${this.missing.size}`;
      this.missing.set(url, mark);
    }
    return mark;
  }

  /** `markup` with the images it marks loaded in, those that can't be read left clear. */
  async fill(markup: string): Promise<string> {
    if (this.missing.size === 0) return markup;
    await Promise.all([...this.missing.keys()].map(load));
    let filled = markup;
    for (const [url, mark] of this.missing)
      filled = filled.replaceAll(mark, escapeHtml(store.get(url) ?? LEFT_OUT_IMAGE));
    this.missing.clear();
    return filled;
  }
}

const URL_IN_CSS = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g;

/** `value` with each `url()` in it turned into its data, or `none` while it has none. */
export function embedUrls(value: string, embeds: Embeds): string {
  return value.replace(
    URL_IN_CSS,
    (whole: string, double?: string, single?: string, bare?: string) => {
      const raw = double ?? single ?? bare ?? '';
      if (!raw || raw.startsWith('#')) return whole;
      let absolute: string;
      try {
        absolute = new URL(raw, document.baseURI).href;
      } catch {
        return whole;
      }
      const data = embeds.dataOf(absolute);
      return data ? `url("${data}")` : 'none';
    },
  );
}
