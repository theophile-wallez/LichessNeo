import { createElement, queryOne } from '#shared/dom.ts';
import { CONFETTI_COUNT, confettiEndMs, confettiMarkup, confettiPieces } from '#shared/confetti.ts';
import { setHtml } from '#shared/html.ts';

// Practice's cheers on the board: the day's goal met, an opening known
// better, a record beaten. Confetti rains over the board, as on a game won, in
// a layer of its own that lets every click through (styles/game/game-end.css).

/** Rains confetti over the analysis board, once. */
export function rainConfetti(): void {
  const main = queryOne(document, 'main.analyse', HTMLElement);
  if (!main) return;
  const pieces = confettiPieces(CONFETTI_COUNT, Math.random);
  const layer = createElement('div', { className: 'ln-ext-end ln-ext-cheer' });
  setHtml(layer, confettiMarkup(pieces));
  main.append(layer);
  setTimeout(() => layer.remove(), confettiEndMs(pieces));
}
