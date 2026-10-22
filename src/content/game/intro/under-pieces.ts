import { createElement, setStyleProperty } from '#shared/dom.ts';
import type { Stage } from './stage.ts';

// A layer of ours in the board's container, over its drawing and under its
// pieces, for the intros that move or light the squares themselves.

/** A layer in the board's container, first as page/backlit's canvas; gone as the intro ends. */
export function addUnderPieces(stage: Stage, className: string): HTMLElement | undefined {
  const container = stage.board.parentElement;
  if (!container) return undefined;
  const layer = createElement('div', { className });
  container.prepend(layer);
  stage.onEnd(() => layer.remove());
  return layer;
}

/** Gives `layer` the board's own drawing (cg-board::before), for windows onto it. */
export function copyDrawing(stage: Stage, layer: HTMLElement): void {
  const drawing = getComputedStyle(stage.board, '::before');
  setStyleProperty(layer, '--ln-ext-intro-board-image', drawing.backgroundImage);
  setStyleProperty(layer, '--ln-ext-intro-board-size', drawing.backgroundSize);
  setStyleProperty(layer, '--ln-ext-intro-board-position', drawing.backgroundPosition);
  setStyleProperty(layer, '--ln-ext-intro-board-repeat', drawing.backgroundRepeat);
  // A textured board is three layers blended, not one image: without the blend mode the
  // relief lies flat over the squares and hides their colors (styles/board/pieces.css).
  setStyleProperty(layer, '--ln-ext-intro-board-blend', drawing.backgroundBlendMode);
  // Lichess's brightness and hue settings, on its own boards.
  setStyleProperty(layer, '--ln-ext-intro-board-filter', drawing.filter);
}

/** A window of `layer` onto the board's drawing, at file `x` and rank `y`. */
export function addWindow(
  layer: HTMLElement,
  className: string,
  x: number,
  y: number,
): HTMLElement {
  const pane = createElement('i', { className });
  pane.append(createElement('i'));
  setStyleProperty(pane, '--ln-ext-intro-x', String(x));
  setStyleProperty(pane, '--ln-ext-intro-y', String(y));
  layer.append(pane);
  return pane;
}
