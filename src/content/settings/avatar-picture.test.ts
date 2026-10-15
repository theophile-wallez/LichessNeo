import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pictureFrom } from './avatar-picture.ts';

// happy-dom decodes no image and has no 2D canvas: the bitmap is a stand-in of
// the size the test says, and the canvas keeps what's drawn on it.
const drawn: unknown[][] = [];
const context = {
  imageSmoothingQuality: 'low',
  drawImage: (...args: unknown[]): void => {
    drawn.push(args.slice(1));
  },
};
const getContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');

function decodeAs(width: number, height: number): void {
  vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width, height, close: () => {} }));
}

beforeEach(() => {
  drawn.splice(0);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => context,
  });
});

afterEach(() => {
  if (getContext) Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', getContext);
});

const file = (bytes = 3): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' });

describe('an avatar’s picture', () => {
  it('is cut to a square at the center, shrunk, as WebP', async () => {
    decodeAs(300, 200);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/webp;base64,UklGRg==');
    expect(await pictureFrom(file())).toBe('data:image/webp;base64,UklGRg==');
    expect(drawn).toEqual([[50, 0, 200, 200, 0, 0, 192, 192]]);
    expect(toDataURL.mock.calls[0]?.[0]).toBe('image/webp');
  });

  it('keeps PNG where the browser can’t write WebP, and nothing it can’t keep', async () => {
    decodeAs(100, 160);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
    toDataURL.mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    expect(await pictureFrom(file())).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(drawn).toEqual([[0, 30, 100, 100, 0, 0, 192, 192]]);
    toDataURL.mockReturnValue('data:,');
    expect(await pictureFrom(file())).toBeNull();
  });

  it('is none for a file that won’t decode, an empty image or a file far too big', async () => {
    vi.stubGlobal('createImageBitmap', () =>
      Promise.reject(new DOMException('bad', 'InvalidStateError')),
    );
    expect(await pictureFrom(file())).toBeNull();
    decodeAs(0, 0);
    expect(await pictureFrom(file())).toBeNull();
    decodeAs(100, 100);
    expect(await pictureFrom(file(20_000_001))).toBeNull();
    expect(drawn).toEqual([]);
  });
});
