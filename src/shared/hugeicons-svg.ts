import { escapeHtml } from './escape.ts';

// An icon of Hugeicons' free set (@hugeicons/core-free-icons, MIT) as an SVG
// document's markup: inline on the page (hugeicons.ts), or a file for the
// stylesheets (scripts/icons.ts).

/** An icon as the package exports it: its SVG elements, their attributes camelCased. */
export type HugeIcon = readonly (readonly [string, Readonly<Record<string, string | number>>])[];

export interface IconOptions {
  readonly className?: string;
  /** In the icon's 24-unit grid. */
  readonly strokeWidth?: number;
}

// Thicker than the package's 1.5: ours show at 14 to 24px, beside bold text.
const STROKE_WIDTH = 2;

const TAGS: ReadonlySet<string> = new Set([
  'path',
  'circle',
  'ellipse',
  'line',
  'polygon',
  'polyline',
  'rect',
]);
// React's names for the attributes, which SVG writes kebab-cased.
const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

function elementMarkup([tag, attributes]: HugeIcon[number], strokeWidth: number): string {
  if (!TAGS.has(tag)) return '';
  const pairs = Object.entries(attributes).flatMap(([name, value]) => {
    if (name === 'key') return [];
    const attribute = kebab(name);
    const written = attribute === 'stroke-width' ? strokeWidth : value;
    return [`${attribute}="${escapeHtml(String(written))}"`];
  });
  return `<${tag} ${pairs.join(' ')}/>`;
}

/** The icon as an SVG document's markup, for a file or for the page. */
export function hugeiconMarkup(icon: HugeIcon, options: IconOptions = {}): string {
  const { className, strokeWidth = STROKE_WIDTH } = options;
  const body = icon.map(element => elementMarkup(element, strokeWidth)).join('');
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg"${classAttribute} viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">${body}</svg>`;
}
