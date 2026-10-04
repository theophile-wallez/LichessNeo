import { queryOne } from '#shared/dom.ts';

// The puzzle's session chips are one sideways-scrolling row
// (styles/puzzle/layout.css): keep the latest in view.

/** A sync task scrolling the session to its end whenever a chip is added. */
export function createSessionSync(): () => void {
  let lastChips = 0;
  return () => {
    const session = queryOne(document, 'main.puzzle .puzzle__session', HTMLElement);
    const chips = session?.childElementCount ?? 0;
    if (chips === lastChips) return;
    lastChips = chips;
    if (session) session.scrollLeft = session.scrollWidth;
  };
}
