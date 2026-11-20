import { defaultsOf, prepareSandbox, propertyNames } from './defaults.ts';
import { Embeds } from './images.ts';
import { pageImage } from './page-image.ts';
import { type Walk, writeTree } from './serialize.ts';
import { xmlText } from './styles.ts';

// A picture of the board for the wave's lens (after distortion-waves'
// capture, MIT). The browser gives no way to read a page's pixels, so the
// board is drawn again: its tree, written out with its computed styles, in an
// SVG <foreignObject>, loaded as an image and drawn to a canvas. What it can't
// see (an image no CORS lets it read) is left out of the picture.

const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SnapshotRequest {
  readonly root: HTMLElement;
  /** The root's box, in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** Canvas pixels per CSS pixel. */
  readonly scale: number;
}

// Chromium lays the copy out at the canvas's scale with CSS zoom, so its text
// lands on the same device pixels as the board's. Firefox's zoom inside a
// <foreignObject> wraps text and drops images: it keeps the plain layout.
const FIREFOX = /Firefox\//.test(navigator.userAgent);
const ZOOMS = CSS.supports('zoom', '2') && !FIREFOX;
// Firefox draws a picture's own images only once it has decoded them, after
// the picture says it's loaded: the first picture of a board comes out without
// its pieces. It's loaded once to have them decoded, then again to be drawn.
const SETTLE_MS = 60;

// The root as it lies when nothing moves it, square at its corners: the canvas
// is cut to its shape, and where the lens reaches past the edge it finds the board.
const rootStyle = ({ width, height }: SnapshotRequest): string =>
  `position:absolute;left:0;top:0;margin:0;transform:none;translate:none;rotate:none;scale:none;` +
  `opacity:1;visibility:visible;border-radius:0;box-sizing:border-box;` +
  `width:${width}px;height:${height}px;min-width:0;min-height:0;max-width:none;max-height:none;`;

function walkOnce(request: SnapshotRequest, embeds: Embeds): Walk | null {
  const names = propertyNames();
  const plain = defaultsOf('div', false);
  if (!names || !plain) return null;
  const walk: Walk = {
    root: request.root,
    context: { names, plain, embeds },
    rootStyle: rootStyle(request),
    out: [],
    rules: [],
    classes: 0,
  };
  writeTree(walk);
  return walk;
}

const frame = (outer: string, inner: string): string =>
  `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" ${outer}>` +
  `<foreignObject x="0" y="0" width="100%" height="100%">${inner}</foreignObject></svg>`;

function svgMarkup(walk: Walk, { width, height, scale }: SnapshotRequest): string {
  const pixelWidth = Math.max(1, Math.round(width * scale));
  const pixelHeight = Math.max(1, Math.round(height * scale));
  const body = `<style>${xmlText(walk.rules.join(''))}</style>${walk.out.join('')}`;
  const box = `position:relative;width:${width}px;height:${height}px;overflow:hidden;`;
  if (ZOOMS && scale !== 1)
    return frame(
      `width="${pixelWidth}" height="${pixelHeight}" viewBox="0 0 ${pixelWidth} ${pixelHeight}"`,
      `<div xmlns="${XHTML_NS}" style="${box}zoom:${scale.toFixed(4)};">${body}</div>`,
    );
  return frame(
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`,
    `<div xmlns="${XHTML_NS}" style="${box}">${body}</div>`,
  );
}

async function loadSvg(markup: string): Promise<HTMLImageElement> {
  const image = pageImage();
  // A data URL rather than a blob: the canvas stays readable once drawn on.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  return image;
}

/** The colour behind `element`: its nearest ancestor's that shows one. */
function backgroundOf(element: Element): string {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== 'transparent' && !/(?:,|\/)\s*0(?:\.0+)?%?\s*\)$/.test(color))
      return color;
  }
  return '#000';
}

/** A picture of `request.root` as it is now, or null where it can't be drawn. */
export async function snapshot(request: SnapshotRequest): Promise<HTMLCanvasElement | null> {
  if (!(await prepareSandbox())) return null;
  const embeds = new Embeds();
  let walk = walkOnce(request, embeds);
  if (walk && !embeds.complete) {
    await embeds.loadMissing();
    walk = walkOnce(request, embeds);
  }
  if (!walk) return null;
  const markup = svgMarkup(walk, request);
  if (FIREFOX) {
    await loadSvg(markup);
    await new Promise(resolve => {
      setTimeout(resolve, SETTLE_MS);
    });
  }
  const image = await loadSvg(markup);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(request.width * request.scale));
  canvas.height = Math.max(1, Math.round(request.height * request.scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  context.fillStyle = backgroundOf(request.root);
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
