import type { Color, Square } from '#shared/chess/types.ts';
import { rainConfetti } from '#shared/confetti.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import { endAnimation, endResults, playsAfter, type GameResult } from '#shared/end-animation.ts';
import { postGameEnd } from '#shared/protocol.ts';
import { lastLanding, markedSquares, readBoard } from '#page/sounds/board-reader.ts';
import { boardWrap } from './board.ts';

// What plays over the board as the player's game ends, as the settings pick it
// and after the results they pick (#shared/end-animation.ts): confetti in a
// layer of their own over the board, or the board's wave, which the content
// script draws (content/board-wave). It plays off what the page shows as the
// game ends, the score and the board, without waiting for the finished game.

export interface EndScene {
  readonly main: HTMLElement;
  readonly result: GameResult;
  /** The mated king's square, if known; else the king the board shows in check. */
  readonly mated?: Square | null;
}

const SCORES: ReadonlyMap<string, Color | null> = new Map([
  ['1-0', 'white'],
  ['0-1', 'black'],
  ['½-½', null],
]);

/** The result the move list's score shows for `player`, or null without one (an aborted game). */
export function shownResult(main: HTMLElement, player: Color): GameResult | null {
  const score = main.querySelector('.result-wrap .result')?.textContent.trim() ?? '';
  const winner = SCORES.get(score);
  if (winner === undefined) return null;
  if (winner === null) return 'draw';
  return winner === player ? 'win' : 'loss';
}

/** Where the wave starts: the mated king, else where the last move landed. */
function waveSquare({ main, mated }: EndScene): Square | null {
  if (mated) return mated;
  const wrap = boardWrap(main);
  const board = wrap?.querySelector('cg-board');
  const checked = board ? markedSquares(board, 'check')[0] : undefined;
  if (checked) return checked;
  const shown = readBoard(wrap ?? null);
  return shown ? (lastLanding(shown.pieces, shown.lastMove)?.to ?? null) : null;
}

/** The confetti's layer over the board (styles/game/game-end.css), kept for the page's next game. */
function confettiLayer(main: HTMLElement): HTMLElement {
  const kept = queryOne(main, ':scope > .ln-ext-end-fx', HTMLElement);
  if (kept) return kept;
  const layer = createElement('div', { className: 'ln-ext-end-fx' });
  main.append(layer);
  return layer;
}

/** Plays the end's animation the settings pick, if they pick it after this result. */
export function playEndAnimation(scene: EndScene): void {
  if (!playsAfter(endResults(), scene.result)) return;
  const pick = endAnimation();
  if (pick === 'confetti') rainConfetti(confettiLayer(scene.main));
  else if (pick === 'wave') postGameEnd({ result: scene.result, square: waveSquare(scene) });
}
