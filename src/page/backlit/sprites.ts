import type { KeyBox } from '#shared/backlit.ts';
import { createElement } from '#shared/dom.ts';

// A lit key, drawn once for each color and size, then stamped on the board's
// canvas at the level it shines with: a canvas blur on every key of every
// frame would cost far more. Its glow spills past the key, over the gaps. The
// key is the shape the settings give the board's (content/packs/backlit-keys.ts).

/** How far the glow spills past the square, in squares. */
export const BLEED = 0.3;
const GLOW_BLUR = 0.28;

export interface Sprites {
  /** The lit key for `color`, its square `size` pixels wide, in the shape `box`. */
  readonly key: (color: string, size: number, box: KeyBox) => HTMLCanvasElement;
}

function drawKey(color: string, size: number, box: KeyBox): HTMLCanvasElement {
  const canvas = createElement('canvas');
  const side = Math.ceil(size * (1 + 2 * BLEED));
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const offset = size * (BLEED + box.inset);
  const keySize = size * box.size;
  const key = (): void => {
    context.beginPath();
    context.roundRect(offset, offset, keySize, keySize, size * box.radius);
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
  let drawnFor = '';
  return {
    key(color, size, box) {
      const shape = `${size} ${box.inset} ${box.radius}`;
      if (shape !== drawnFor) {
        drawn.clear();
        drawnFor = shape;
      }
      let sprite = drawn.get(color);
      if (!sprite) {
        sprite = drawKey(color, size, box);
        drawn.set(color, sprite);
      }
      return sprite;
    },
  };
}
