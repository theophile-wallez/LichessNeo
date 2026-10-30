import { animate, stagger } from 'motion';
import { queryAll } from '#shared/dom.ts';
import { countUp } from './count-up.ts';

// A tab of the live review's panel picked: its parts come in one after the
// other, and its figures count up.

const FIGURES = '.ln-ext-acc, .ln-ext-t-num, .ln-ext-end__accuracy b, .ln-ext-end__count b';

export function showPanel(panel: HTMLElement): void {
  const parts = [...panel.children].filter(
    (part): part is HTMLElement =>
      part instanceof HTMLElement && !part.matches('.demo-tabs') && part.offsetParent !== null,
  );
  animate(
    parts,
    { opacity: [0, 1], y: [14, 0] },
    { type: 'spring', visualDuration: 0.45, bounce: 0.2, delay: stagger(0.045) },
  );
  countUp(queryAll(panel, FIGURES, HTMLElement));
}

/** The figures of a summary further down the page count up as it shows. */
export const countUpIn = (summary: HTMLElement): void =>
  countUp(queryAll(summary, FIGURES, HTMLElement));
