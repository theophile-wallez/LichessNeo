import Megaphone01Icon from '@hugeicons/core-free-icons/Megaphone01Icon';
import { queryOne } from '#shared/dom.ts';
import { countdown } from './stack.ts';
import type { Toaster } from './toaster.ts';

// The server's announcement (a restart's countdown…). Lichess appends `#announce` to <body>:
// its message as bare text, a `time` for the date it's about, and a close link; it removes it
// at that date, or when closed.

const ID = 'announce';

const announcementText = (announce: Element): string =>
  [...announce.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .trim();

function timeLeft(announce: Element, now: number): string | undefined {
  const date = Date.parse(queryOne(announce, 'time', HTMLElement)?.getAttribute('datetime') ?? '');
  return Number.isNaN(date) ? undefined : countdown(date - now);
}

export function createAnnounceSync(toaster: Toaster): () => void {
  let shown: HTMLElement | null = null;
  return () => {
    const announce = document.getElementById('announce');
    if (announce !== shown) {
      if (shown) toaster.dismiss(ID);
      shown = announce;
    }
    if (!announce) return;
    toaster.show(ID, {
      kind: 'info',
      icon: Megaphone01Icon,
      title: announcementText(announce),
      chip: timeLeft(announce, Date.now()),
      closeButton: true,
      // Lichess's own link, so it forgets the announcement as it does on its own.
      onClose: () => queryOne(announce, '.close', HTMLElement)?.click(),
    });
  };
}
