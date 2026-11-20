import { createElement, setData, setStyleProperty } from '#shared/dom.ts';

// The run going on as a grid of squares, one per position, in the game's
// order: the engines' finds, the cloud's, those being searched, the rest.

export type PositionState = 'engine' | 'cloud' | 'busy' | 'todo';

// Rows of about 22 squares, as even as they can be; a long game's rows hold
// more, smaller squares, so the grid stays short. A short game's are no larger
// than 16 to a row.
const ROW = 22;
/** A long game's row, and the game over's card's, short of room. */
export const WIDE_ROW = 32;
const LONG_GAME = ROW * 6;
const FEWEST_COLUMNS = 16;

/** The squares to a row, for a game of `positions` positions, in rows of about `row`. */
export function gridColumns(
  positions: number,
  row = positions > LONG_GAME ? WIDE_ROW : ROW,
): number {
  const rows = Math.max(1, Math.ceil(positions / row));
  return Math.max(FEWEST_COLUMNS, Math.ceil(positions / rows));
}

/** Draws `states` into `grid`, touching only the squares whose state changed. */
export function drawGrid(grid: HTMLElement, states: readonly PositionState[]): void {
  setStyleProperty(grid, '--ln-ext-columns', String(gridColumns(states.length)));
  while (grid.children.length > states.length) grid.lastElementChild?.remove();
  while (grid.children.length < states.length) grid.append(createElement('i'));
  for (const [i, state] of states.entries()) {
    const square = grid.children[i];
    if (square instanceof HTMLElement) setData(square, 'lnExtState', state);
  }
}
