import { queryAll } from '#shared/dom.ts';
import type { Point } from '#shared/geometry.ts';
import { arrowColor, squareColor } from './colors.ts';

// Chessground's own shapes, read back from its svg: a circle per marked
// square, a line per arrow. Their coordinates are already in square units
// with the orientation applied, and a game page has no other source (it
// exposes no controller, so no `state.drawable`).

interface Shape {
  /** "r,g,b" */
  readonly color: string;
  readonly opacity: number;
}

export interface SquareFill extends Shape {
  readonly at: Point;
}

export interface Arrow extends Shape {
  readonly from: Point;
  readonly to: Point;
}

const DEFAULT_VIEW_BOX = '-4 -4 8 8';

// Chessground draws its engine arrows in pale brushes (opacity 0.4) and the
// shape being dragged at 0.9: only the former should look faint.
const opacityOf = (element: Element): number =>
  Number(element.getAttribute('opacity') ?? 1) < 0.7 ? 0.5 : 0.8;

// Each shape's group is hashed as width, height, then whether it's
// "hilited": how chessground draws the one being dragged.
const isBeingDrawn = (element: Element): boolean =>
  (element.parentElement?.getAttribute('cgHash') ?? '').split(',')[2] === 'true';

export interface ReadOptions {
  /** During the Game Review, Lichess's engine arrows give way to the review's. */
  readonly reviewing: boolean;
}

export function readShapes(
  svg: Element,
  { reviewing }: ReadOptions,
): { fills: SquareFill[]; arrows: Arrow[] } {
  const viewBox = svg.getAttribute('viewBox') ?? '';
  const [originX = 0, originY = 0] = (viewBox === '' ? DEFAULT_VIEW_BOX : viewBox)
    .split(/\s+/)
    .map(Number);
  // An arrow's ends are pulled in from the square centers: round back to them.
  const center = (element: Element, xName: string, yName: string): Point => [
    Math.floor(Number(element.getAttribute(xName)) - originX) + 0.5,
    Math.floor(Number(element.getAttribute(yName)) - originY) + 0.5,
  ];
  const isEngineShape = (element: Element): boolean => reviewing && opacityOf(element) < 0.8;

  const fills = queryAll(svg, 'circle', Element)
    .filter(circle => !isEngineShape(circle))
    .map(circle => ({
      at: center(circle, 'cx', 'cy'),
      color: squareColor(circle.getAttribute('stroke')),
      opacity: opacityOf(circle),
    }));
  // Skip the arrow being dragged: Lichess draws it as you drag, we wait for the release.
  const arrows = queryAll(svg, 'line', Element)
    .filter(line => !isBeingDrawn(line) && !isEngineShape(line))
    .map(line => ({
      from: center(line, 'x1', 'y1'),
      to: center(line, 'x2', 'y2'),
      color: arrowColor(line.getAttribute('stroke')),
      opacity: opacityOf(line),
    }));
  return { fills, arrows };
}
