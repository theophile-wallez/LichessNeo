import { type SafeHtml, setHtml } from './html.ts';

// SVG helpers. An SVG element has to be made in its namespace:
// document.createElement('svg') makes an unknown HTML element instead.

const SVG_NS = 'http://www.w3.org/2000/svg';

type Attributes = Readonly<Record<string, string | number>>;

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
}

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  setAttributes(element, attributes);
  return element;
}

/** Sizes an SVG to `width` × `height` pixels, with a viewBox in pixels too. */
export function sizeSvg(svg: SVGSVGElement, width: number, height: number): void {
  setAttributes(svg, { width, height });
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

/**
 * Parses SVG markup into the start of `parent`. The markup is parsed inside an
 * SVG element, so it's SVG in any DOM (happy-dom reads insertAdjacentHTML on
 * an SVG element as HTML).
 */
export function prependSvg(parent: Element, markup: SafeHtml): void {
  const scratch = createSvgElement('g');
  setHtml(scratch, markup);
  parent.prepend(...scratch.childNodes);
}

/** The pointer's x from the element's left edge. */
export const pointerX = (event: MouseEvent, element: Element): number =>
  event.clientX - element.getBoundingClientRect().left;

/** The pointer's y from the element's top edge. */
export const pointerY = (event: MouseEvent, element: Element): number =>
  event.clientY - element.getBoundingClientRect().top;
