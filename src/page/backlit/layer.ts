import { squareAt, squareCoords } from '#shared/chess/squares.ts';
import type { KeyBox } from '#shared/backlit.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import { createElement } from '#shared/dom.ts';
import { oncePerFrame } from '#shared/frame.ts';
import type { Scene } from './scene.ts';
import { BLEED, createSprites } from './sprites.ts';

// The board's light: a canvas of ours in chessground's container, over the
// board's keys and under its pieces (styles/board/backlit.css). It draws only
// while something is lit, then stops: a board at rest costs nothing.

interface Board {
  readonly container: HTMLElement;
  readonly orientation: () => Color;
}

export interface Layer {
  readonly attach: (board: Board) => void;
  /** Draws from the next frame on, until nothing is lit. */
  readonly wake: () => void;
  readonly remove: () => void;
  /** The color the stylesheet gives the light: the theme's accent, lightened, or the board's. */
  readonly glow: () => string;
  /** The light of a side's moves, from the stylesheet: deeper on light keys. */
  readonly side: (color: Color) => string;
}

export interface LayerOptions {
  readonly scene: Scene;
  /** The key under the pointer's color. */
  readonly hoverColor: () => string;
  /** The keys' shape, as the board draws them. */
  readonly keyBox: () => KeyBox;
}

const corner = (square: Square, orientation: Color): readonly [number, number] => {
  const [file, rank] = squareCoords(square);
  return orientation === 'white' ? [file, 7 - rank] : [7 - file, rank];
};

function squareUnder(x: number, y: number, rect: DOMRect, orientation: Color): Square | null {
  const column = Math.floor(((x - rect.left) / rect.width) * 8);
  const row = Math.floor(((y - rect.top) / rect.height) * 8);
  if (column < 0 || column > 7 || row < 0 || row > 7) return null;
  return orientation === 'white' ? squareAt(column, 7 - row) : squareAt(7 - column, row);
}

type Pointer = { readonly x: number; readonly y: number } | null;

/** Follows the mouse over `container` (a touch has no hover); stopped with `signal`. */
function trackPointer(
  container: HTMLElement,
  signal: AbortSignal,
  onPointer: (pointer: Pointer) => void,
): void {
  const track = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    onPointer(event.type === 'pointerleave' ? null : { x: event.clientX, y: event.clientY });
  };
  container.addEventListener('pointermove', track, { passive: true, signal });
  container.addEventListener('pointerleave', track, { passive: true, signal });
}

/** Keeps the canvas's pixels at its size on screen. */
function fitCanvas(canvas: HTMLCanvasElement, onResize: () => void): ResizeObserver {
  const resize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const ratio = window.devicePixelRatio;
    canvas.width = Math.round(entry.contentRect.width * ratio);
    canvas.height = Math.round(entry.contentRect.height * ratio);
    onResize();
  });
  resize.observe(canvas);
  return resize;
}

interface Drawing {
  readonly canvas: HTMLCanvasElement;
  readonly scene: Scene;
  readonly board: () => Board | null;
  readonly keyBox: () => KeyBox;
}

/** The draw loop: a frame while something is lit, then none until woken. */
function createLoop({ canvas, scene, board, keyBox }: Drawing): {
  wake: () => void;
  stop: () => void;
} {
  const context = canvas.getContext('2d');
  const sprites = createSprites();
  let frame = 0;
  const draw = (now: number): void => {
    frame = 0;
    const shown = board();
    if (!context || !shown) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'lighter';
    const size = canvas.width / 8;
    const orientation = shown.orientation();
    const box = keyBox();
    for (const { square, level, color } of scene.lights(now)) {
      const [column, row] = corner(square, orientation);
      context.globalAlpha = level;
      context.drawImage(
        sprites.key(color, size, box),
        (column - BLEED) * size,
        (row - BLEED) * size,
      );
    }
    context.globalAlpha = 1;
    if (scene.busy(now)) frame = requestAnimationFrame(draw);
  };
  return {
    wake: () => {
      frame ||= requestAnimationFrame(draw);
    },
    stop: () => {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}

export function createLayer({ scene, hoverColor, keyBox }: LayerOptions): Layer {
  const canvas = createElement('canvas', { className: 'ln-ext-backlit' });
  let board: Board | null = null;
  let listening: AbortController | null = null;
  let pointer: Pointer = null;
  const loop = createLoop({ canvas, scene, board: () => board, keyBox });
  const resize = fitCanvas(canvas, loop.wake);

  // At most once a frame, however fast the pointer moves.
  const hover = oncePerFrame(() => {
    if (!board) return;
    const rect = board.container.getBoundingClientRect();
    const square = pointer && squareUnder(pointer.x, pointer.y, rect, board.orientation());
    scene.hover(square, hoverColor(), performance.now());
    loop.wake();
  });

  return {
    attach(next) {
      board = next;
      if (canvas.parentNode !== next.container) {
        next.container.prepend(canvas);
        listening?.abort();
        listening = new AbortController();
        trackPointer(next.container, listening.signal, moved => {
          pointer = moved;
          hover();
        });
      }
      loop.wake();
    },
    wake: loop.wake,
    remove() {
      loop.stop();
      listening?.abort();
      resize.disconnect();
      canvas.remove();
      board = null;
    },
    glow: () => getComputedStyle(canvas).color,
    side: color => getComputedStyle(canvas).getPropertyValue(`--ln-ext-backlit-${color}`).trim(),
  };
}
