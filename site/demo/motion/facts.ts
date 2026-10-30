import { animate, inView } from 'motion';
import { queryAll, queryOne } from '#shared/dom.ts';

// The promises' lines (index.html's .facts): each line's tile pops in as the
// line comes into view, once.

export function startFacts(): void {
  for (const fact of queryAll(document, '.fact', HTMLElement)) {
    const tile = queryOne(fact, '.fact__tile', HTMLElement);
    if (!tile) continue;
    tile.style.opacity = '0';
    const stop = inView(
      fact,
      () => {
        stop();
        animate(
          tile,
          { opacity: [0, 1], scale: [0.4, 1], rotate: [-20, 0] },
          { type: 'spring', visualDuration: 0.5, bounce: 0.45 },
        );
      },
      { amount: 0.8 },
    );
  }
}
