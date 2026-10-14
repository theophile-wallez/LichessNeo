import { createElement } from '#shared/dom.ts';

// A lit key, drawn once for each color and size, then stamped on the board's
// canvas at the level it shines with: a canvas blur on every key of every
// frame would cost far more. Its glow spills past the key, over the gaps.

/** The key's inset in its square and its corners, as styles/board/backlit.css draws it. */
export const KEY_INSET = 0.0275;
const KEY_RADIUS = 0.096;
/** How far the glow spills past the square, in squares. */
export const BLEED = 0.3;
const GLOW_BLUR = 0.28;

export interface Sprites {
  /** The lit key for `color`, its square `size` pixels wide. */
  readonly key: (color: string, size: number) => HTMLCanvasElement;
}

function drawKey(color: string, size: number): HTMLCanvasElement {
  const canvas = createElement('canvas');
  const side = Math.ceil(size * (1 + 2 * BLEED));
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const offset = size * (BLEED + KEY_INSET);
  const keySize = size * (1 - 2 * KEY_INSET);
  const key = (): void => {
    context.beginPath();
    context.roundRect(offset, offset, keySize, keySize, size * KEY_RADIUS);
    context.fill();
  };
  context.shadowColor = color;
  context.shadowBlur = size * GLOW_BLUR;
  context.fillStyle = color;
  key();
  // A hot center, as a backlight shines brightest under the key's middle.
  context.shadowBlur = 0;
  const center = side / 2;
  const glare = context.createRadialGradient(
    center,
    center * 1.05,
    0,
    center,
    center,
    keySize * 0.7,
  );
  glare.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  glare.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  glare.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = glare;
  key();
  return canvas;
}

export function createSprites(): Sprites {
  const drawn = new Map<string, HTMLCanvasElement>();
  let drawnSize = 0;
  return {
    key(color, size) {
      if (size !== drawnSize) {
        drawn.clear();
        drawnSize = size;
      }
      let sprite = drawn.get(color);
      if (!sprite) {
        sprite = drawKey(color, size);
        drawn.set(color, sprite);
      }
      return sprite;
    },
  };
}
