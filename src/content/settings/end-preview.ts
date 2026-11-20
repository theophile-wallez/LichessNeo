import type { Square } from '#shared/chess/types.ts';
import { rainConfetti } from '#shared/confetti.ts';
import { queryOne } from '#shared/dom.ts';
import type { EndAnimation, GameResult } from '#shared/end-animation.ts';
import { loadWave } from '#content/board-wave/load.ts';
import { endPlan } from '#content/board-wave/plan.ts';
import type { Palette } from '#content/board-wave/wave/color.ts';
import { markSquare, placeOn, setPosition } from './preview-board.ts';

// The end's animation in the settings' preview (intro-preview.ts), as a game
// the user plays with White would end: the board shows the position before the
// last move, the move is played, then the animation, out of the mated king, or
// the centre for a draw.

interface FinalMove {
  /** The position before it, a FEN's first field. */
  readonly placement: string;
  readonly from: Square;
  readonly to: Square;
  readonly mated: Square | null;
}

// The last moves of two famous games and a famous study, checked move by move.
const FINAL_MOVES: Readonly<Record<GameResult, FinalMove>> = {
  // The Immortal Game, Anderssen–Kieseritzky, London 1851: 23.Be7#, down both rooks and the queen.
  win: {
    placement: 'r1bk3r/p2p1pNp/n2B1n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1',
    from: 'd6',
    to: 'e7',
    mated: 'd8',
  },
  // Saavedra's study, 1895: the queen that takes the rook leaves Black's king stalemated.
  draw: { placement: '2Q5/8/8/8/2r5/8/2K5/k7', from: 'c8', to: 'c4', mated: null },
  // The Game of the Century, Byrne–Fischer, New York 1956: 41...Rc2#.
  loss: {
    placement: '1Q6/5pk1/2p3p1/1p2N2p/1b5P/1bn5/r5P1/2K5',
    from: 'a2',
    to: 'c2',
    mated: 'c1',
  },
};

/** What the end's preview plays: the animation, after which result, a win's wave in `win`. */
export interface EndShow {
  readonly pick: EndAnimation;
  readonly result: GameResult;
  readonly win: Palette;
}

/** How long the position shows before the move, and the move's slide (styles/pages/settings-intro.css). */
const BEFORE_MS = 450;
const MOVE_MS = 300;

function playAnimation(host: HTMLElement, { pick, result, win }: EndShow): () => void {
  if (pick === 'confetti') return rainConfetti(host);
  const wrap = queryOne(host, '.cg-wrap', HTMLElement);
  const stop = new AbortController();
  const plan = endPlan({ result, square: FINAL_MOVES[result].mated }, 'white', win);
  if (wrap)
    void loadWave().then(playWave =>
      playWave?.(() => (wrap.isConnected ? wrap : null), plan, stop.signal),
    );
  return () => stop.abort();
}

/** Plays the last move then the animation on the preview's board in `host`; returns what stops it. */
export function playEndPreview(host: HTMLElement, board: HTMLElement, show: EndShow): () => void {
  const final = FINAL_MOVES[show.result];
  const pieces = setPosition(board, final.placement);
  let stopAnimation: (() => void) | null = null;
  const moved = setTimeout(() => {
    const piece = pieces.get(final.from);
    if (!piece) return;
    pieces.get(final.to)?.remove();
    piece.classList.add('ln-ext-preview-move');
    placeOn(piece, final.to);
    markSquare(board, final.from, 'last-move');
    markSquare(board, final.to, 'last-move');
  }, BEFORE_MS);
  const ended = setTimeout(() => {
    if (final.mated) markSquare(board, final.mated, 'check');
    if (show.pick !== 'none') stopAnimation = playAnimation(host, show);
  }, BEFORE_MS + MOVE_MS);
  return () => {
    clearTimeout(moved);
    clearTimeout(ended);
    stopAnimation?.();
  };
}
