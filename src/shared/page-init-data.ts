import { isParsing } from './dom.ts';

// Lichess inlines the data of each page's module in <script id="page-init-data">
// and removes the element once the module has read it. We hold on to the node
// while the page parses, as its text stays readable after Lichess removes it.
// The text is only complete at DOMContentLoaded: the element ends the page, so
// it can arrive split across network chunks.

const ID = 'page-init-data';

type Reader = (text: string | null) => void;

let node: Element | null = null;
let readers: Reader[] | null = null;

function watch(): void {
  readers = [];
  const observer = new MutationObserver(() => {
    node = document.getElementById(ID);
    if (node) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      observer.disconnect();
      const text = node?.textContent ?? null;
      // Some pages carry megabytes of it, so don't keep the node alive.
      node = null;
      const waiting = readers ?? [];
      readers = null;
      // One listener serves every feature's reader, so a reader that throws
      // must not keep the others from their data.
      for (const read of waiting) {
        try {
          read(text);
        } catch (error) {
          console.error('[LichessReimagined] page init data reader failed', error);
        }
      }
    },
    { once: true },
  );
}

/**
 * Hands the page's init data to `read` once the page is parsed, or right away
 * (whatever is still in the document) when it already is.
 */
export function readPageInitData(read: Reader): void {
  if (!isParsing()) {
    read(document.getElementById(ID)?.textContent ?? null);
    return;
  }
  if (readers === null) watch();
  readers?.push(read);
}
