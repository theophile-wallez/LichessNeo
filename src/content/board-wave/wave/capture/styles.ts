import { escapeHtml } from '#shared/escape.ts';
import type { Defaults, PropertyNames } from './defaults.ts';
import { embedUrls, type Embeds } from './images.ts';
import { FOLLOWS_COLOR } from './properties.ts';

// An element's computed style as the declarations its copy needs (after
// distortion-waves' capture, MIT): an inherited property where it parts from
// the parent's, any other where it parts from what the browser alone gives
// that kind of element.

/** The characters XML can't carry: control characters other than tabs and line breaks. */
const NOT_XML = /(?![\t\n\r])\p{Cc}|[\uFFFE\uFFFF]/gu;

export const xmlText = (text: string): string => escapeHtml(text.replace(NOT_XML, ''));

export interface StyleContext {
  readonly names: PropertyNames;
  readonly embeds: Embeds;
  /** A bare `div`'s defaults: a property its tag gives the same way is written only where it differs. */
  readonly plain: Defaults;
}

export interface Written {
  readonly css: string;
  /** The inherited values, in `names.inherited`'s order, for the children. */
  readonly inherited: readonly string[];
}

const isFlat = (style: CSSStyleDeclaration): boolean =>
  ['transform', 'translate', 'rotate', 'scale', 'offset-path'].every(
    name => (style.getPropertyValue(name) || 'none') === 'none',
  );

function inheritedCss(
  style: CSSStyleDeclaration,
  own: Defaults,
  { context, parent }: { context: StyleContext; parent: readonly string[] | null },
): Written {
  const { names, plain } = context;
  const inherited = names.inherited.map(name => style.getPropertyValue(name));
  let css = '';
  for (const [i, name] of names.inherited.entries()) {
    const value = inherited[i] ?? '';
    // A tag the browser styles itself (a heading's size) would override what it inherits.
    if (parent === null || own.inherited[i] !== plain.inherited[i] || value !== parent[i])
      css += `${name}:${value};`;
  }
  return { css, inherited };
}

function skipsOther(name: string, value: string, style: CSSStyleDeclaration): boolean {
  if (FOLLOWS_COLOR.has(name) && value === style.getPropertyValue('color')) return true;
  if (name === 'transform-origin' && isFlat(style)) return true;
  return name === 'perspective-origin' && style.getPropertyValue('perspective') === 'none';
}

function otherCss(style: CSSStyleDeclaration, own: Defaults, context: StyleContext): string {
  const { names, plain, embeds } = context;
  let css = '';
  for (const [i, name] of names.other.entries()) {
    let value = style.getPropertyValue(name);
    const initial = plain.other[i];
    if (own.other[i] === initial && (value === initial || skipsOther(name, value, style))) continue;
    if (value.includes('url(')) value = embedUrls(value, embeds);
    css += `${name}:${value};`;
  }
  return css;
}

/** The declarations of `style`, an element's own, for a copy under `parent`'s inherited values. */
export function writtenStyle(
  style: CSSStyleDeclaration,
  own: Defaults,
  { context, parent }: { context: StyleContext; parent: readonly string[] | null },
): Written {
  const inherited = inheritedCss(style, own, { context, parent });
  return { css: inherited.css + otherCss(style, own, context), inherited: inherited.inherited };
}

/** A pseudo-element's declarations, or null where it draws nothing. */
export function pseudoStyle(
  style: CSSStyleDeclaration,
  parentValues: readonly string[],
  context: StyleContext,
): string | null {
  const content = style.getPropertyValue('content');
  if (!content || content === 'none' || content === 'normal') return null;
  if (style.getPropertyValue('display') === 'none') return null;
  return writtenStyle(style, context.plain, { context, parent: parentValues }).css;
}
