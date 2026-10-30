import { animate, inView, stagger } from 'motion';
import { queryAll, queryOne } from '#shared/dom.ts';

// The "Make it yours" heading's last word (index.html's .word-cycle): the
// things to pick, one after the other while the heading is on screen, each
// word's letters leaving upward and the next one's rising in. The words share
// one grid cell, so the heading keeps the longest's width.

const SHOWN_MS = 2200;

/** `word`'s text, a span per letter, for each to move on its own. */
function splitLetters(word: HTMLElement): HTMLElement[] {
  const segments = new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(
    word.textContent ?? '',
  );
  const letters = [...segments].map(({ segment }) => {
    const span = document.createElement('span');
    span.textContent = segment;
    return span;
  });
  word.replaceChildren(...letters);
  return letters;
}

export function startWordCycle(): void {
  const cycle = queryOne(document, '.word-cycle', HTMLElement);
  if (!cycle) return;
  const words = queryAll(cycle, ':scope > span', HTMLElement).map(splitLetters);
  for (const [i, letters] of words.entries())
    if (i > 0) for (const letter of letters) letter.style.opacity = '0';
  let shown = 0;
  const next = async (): Promise<void> => {
    const leaving = words[shown] ?? [];
    shown = (shown + 1) % words.length;
    const coming = words[shown] ?? [];
    animate(
      leaving,
      { y: '-0.45em', opacity: 0, filter: 'blur(6px)' },
      { duration: 0.32, ease: [0.4, 0, 1, 1], delay: stagger(0.025) },
    );
    await animate(
      coming,
      { y: ['0.45em', '0em'], opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'] },
      {
        type: 'spring',
        visualDuration: 0.5,
        bounce: 0.3,
        delay: stagger(0.03, { startDelay: 0.12 }),
      },
    );
  };
  inView(
    cycle,
    () => {
      const timer = window.setInterval(() => {
        next().catch(() => undefined);
      }, SHOWN_MS);
      return () => window.clearInterval(timer);
    },
    { amount: 1 },
  );
}
