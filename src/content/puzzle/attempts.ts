import { queryAll, setData } from '#shared/dom.ts';

// Lichess keeps each wrong try as a variation of its own under the move. The
// stylesheet shows a group of them as one row of chips; a variation explored
// after the puzzle stays as it is. A `:has()` can't tell them apart: the move
// list changes on every move (AGENTS.md, ":has() slows the board").

export function syncAttempts(): void {
  for (const group of queryAll(document, 'main.puzzle .tview2 interrupt', HTMLElement)) {
    const moves = queryAll(group, 'move', HTMLElement);
    const tries = moves.length > 0 && moves.every(move => move.classList.contains('fail'));
    setData(group, 'cdcTries', tries ? '' : null);
  }
}
