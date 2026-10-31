import { createElement, onHeadParsed } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { PIECE_NAMES, pieceVariable } from '#shared/packs/pack.ts';
import { PREFIX } from '#shared/prefix.ts';

// Lichess writes its pieces' variables as paths (`url(/assets/hashed/wP….svg)`), on :root
// and on <body> once its menu changes the set. Firefox resolves a url() a variable carries
// against the sheet that uses it: in ours, among the extension's files, where our pieces
// (captured pieces, the review's…) found nothing. They're written again as whole URLs.

const VARIABLES = PIECE_NAMES.map(pieceVariable);
const STYLE_ID = `${PREFIX}-piece-urls`;

/** `value`'s url() made whole against `base`, or null if it's whole already or not a url(). */
export function wholePieceUrl(value: string, base: string): string | null {
  const path = /^url\(\s*(['"]?)([^'"()\s]+)\1\s*\)$/.exec(value.trim())?.[2];
  if (path === undefined || /^[a-z][\w+.-]*:/i.test(path)) return null;
  // Unquoted, as Lichess decodes them by slicing off `url(` and `)` (packs/apply.ts).
  return `url(${new URL(path, base).href})`;
}

/** A :root rule giving whole URLs to the variables `declared` gives paths ('' for none). */
export function wholeUrlRule(declared: (name: string) => string, base: string): string {
  const declarations = VARIABLES.flatMap(name => {
    const url = wholePieceUrl(declared(name), base);
    return url === null ? [] : [`${name}:${url}`];
  });
  return declarations.length > 0 ? `:root{${declarations.join(';')}}` : '';
}

// Lichess's own <style>s, not its linked sheets, which have thousands of rules to walk.
function declaredOnRoot(name: string): string {
  for (const style of document.head.querySelectorAll('style')) {
    if (style.id.startsWith(PREFIX) || !style.sheet) continue;
    for (const rule of style.sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule) || rule.selectorText !== ':root') continue;
      const value = rule.style.getPropertyValue(name);
      if (value !== '') return value;
    }
  }
  return '';
}

// A pack's pieces, `!important` on <body>, still beat these.
function fixBody(body: HTMLElement): void {
  for (const name of VARIABLES) {
    const url = wholePieceUrl(body.style.getPropertyValue(name), document.baseURI);
    if (url !== null) body.style.setProperty(name, url);
  }
}

export const pieceUrls: Feature = {
  name: 'piece urls',
  start: () =>
    onHeadParsed(() => {
      const rule = wholeUrlRule(declaredOnRoot, document.baseURI);
      if (rule !== '') document.head.append(createElement('style', { id: STYLE_ID, text: rule }));
      const { body } = document;
      fixBody(body);
      new MutationObserver(() => fixBody(body)).observe(body, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }),
};
