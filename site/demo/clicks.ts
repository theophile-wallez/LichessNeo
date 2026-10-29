import { closestTo, queryOne } from '#shared/dom.ts';
import { type Square, squareAt } from '#shared/chess/index.ts';
import { isError } from '#page/review/classes/classes.ts';
import type { Demo } from './demo.ts';
import { isMode, type PanelModes } from './modes.ts';
import { moves, positions } from './review.ts';

// What a click does in the live review: a tab, a move, a key moment, a
// control, one of the card's buttons or chips, the graph, or the board while
// retrying; and the arrow keys.

/** The card's buttons and chips, and the board while retrying: whether the click was theirs. */
function cardClick(demo: Demo, target: Element | null): boolean {
  const button = closestTo(target, '.ln-ext-review__nav [data-ln-ext]', HTMLButtonElement);
  const name = button?.dataset.lnExt;
  if (name === 'explain' || name === 'best' || name === 'retry') demo.press(name);
  if (name === 'next') demo.step(1);
  if (button) return true;
  const chip = closestTo(target, '[data-ln-ext=chip]', HTMLElement);
  if (chip) {
    const ucis = (chip.dataset.lnExtUcis ?? '').split(',').filter(uci => uci.length >= 4);
    demo.playLine({ base: chip.dataset.lnExtBase === 'a' ? 'a' : 'b', ucis });
    return true;
  }
  const action = closestTo(target, '.demo-say [data-action]', HTMLElement)?.dataset.action;
  if (action === 'line') demo.toggleLine();
  if (action === 'hint' || action === 'reveal') demo.retryAsk(action);
  return action !== undefined;
}

/** The square under a click on the board, White at the bottom. */
function squareOf(board: HTMLElement, event: MouseEvent): Square | null {
  const box = board.getBoundingClientRect();
  const file = Math.floor(((event.clientX - box.left) / box.width) * 8);
  const rank = 7 - Math.floor(((event.clientY - box.top) / box.height) * 8);
  return squareAt(file, rank);
}

/** The tabs and the summary's buttons: whether the click was theirs. */
function modeClick(demo: Demo, modes: PanelModes, target: Element | null): boolean {
  const mode = closestTo(target, 'button[data-mode]', HTMLElement)?.dataset.mode;
  if (isMode(mode)) {
    modes.set(mode);
    // The play button is the debrief's own.
    if (mode !== 'moves') demo.setPlaying(false);
    return true;
  }
  if (!closestTo(target, '[data-action=learn]', HTMLElement)) return false;
  // Lichess's exercise goes through a side's errors: here Black's, as White made none.
  const error = moves.find(move => move.color === 'black' && isError(move.moveClass));
  modes.set('moves');
  if (error) demo.retryAt(error.ply);
  return true;
}

export function wireDemo(root: HTMLElement, demo: Demo, modes: PanelModes): void {
  root.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (modeClick(demo, modes, target) || cardClick(demo, target)) return;
    const ply = closestTo(target, '[data-ply], [data-ln-ext-ply]', HTMLElement)?.dataset;
    if (ply) return demo.go(Number(ply.ply ?? ply.lnExtPly));
    const action = closestTo(target, '[data-action]', HTMLElement)?.dataset.action;
    if (action === 'first') demo.go(0);
    if (action === 'last') demo.go(positions.length - 1);
    if (action === 'prev') demo.step(-1);
    if (action === 'next') demo.step(1);
    if (action === 'play') demo.setPlaying(!demo.playing);
    if (action === 'poke') demo.coach.poke();
  });
  const graph = queryOne(root, '.demo-graph', HTMLElement);
  graph?.addEventListener('click', event => {
    const box = graph.getBoundingClientRect();
    demo.go(Math.round(((event.clientX - box.left) / box.width) * (positions.length - 1)));
  });
  const board = queryOne(root, '.demo-board', HTMLElement);
  board?.addEventListener('click', event => {
    const square = squareOf(board, event);
    if (square) demo.pick(square);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') demo.step(-1);
    if (event.key === 'ArrowRight') demo.step(1);
  });
}
