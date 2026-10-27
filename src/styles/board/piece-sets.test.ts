import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { PIECE_NAMES, pieceVariable } from '#shared/packs/pack.ts';
import { PIECE_SETS } from '#content/packs/piece-sets.ts';

const ROOT = join(import.meta.dirname, '../../..');
const read = (sheet: string): string => readFileSync(join(import.meta.dirname, sheet), 'utf8');
const CSS = read('piece-sets.css');
const BASE = 'chrome-extension://__MSG_@@extension_id__/';

// The rule a set's name on <html> turns on, its declarations one per line.
function setRule(id: string): string {
  const head = `:root[data-ln-ext-pieces='${id}'],\n:root[data-ln-ext-pieces='${id}'] body {\n`;
  const start = CSS.indexOf(head);
  if (start === -1) throw new Error(`no rule for ${id}`);
  return CSS.slice(start + head.length, CSS.indexOf('}', start));
}

// The filter on a black knight captured, under the data on <html>.
const filter = (data: Record<string, string>): string => {
  Object.assign(document.documentElement.dataset, data);
  document.body.innerHTML =
    '<main class="round"><div class="ln-ext-captured__group">' +
    '<i class="ln-ext-pc ln-ext-pc-bn"></i></div></main>';
  const knight = queryOne(document, '.ln-ext-pc-bn', HTMLElement);
  if (!knight) throw new Error('no knight');
  return getComputedStyle(knight).filter;
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtPieces;
  delete document.documentElement.dataset.lnExtBlackPieces;
});

describe('the extension’s piece sets', () => {
  it('give each of Lichess’s piece variables a bundled image, unquoted as Lichess reads them', () => {
    for (const { id } of PIECE_SETS) {
      const declared = new Map(
        [...setRule(id).matchAll(/(---[\w-]+): url\(([^)'"]+)\) !important;/g)].map(
          ([, variable, url]) => [variable, url ?? ''],
        ),
      );
      expect(new Set(declared.keys())).toEqual(new Set(PIECE_NAMES.map(pieceVariable)));
      for (const name of PIECE_NAMES) {
        const file = `img/pieces/${id}/${name}.webp`;
        expect(declared.get(pieceVariable(name))).toBe(BASE + file);
        expect(existsSync(join(ROOT, 'public', file))).toBe(true);
      }
    }
  });

  it('show each set’s white knight on its tile', () => {
    for (const { id } of PIECE_SETS)
      expect(CSS).toContain(
        `.ln-ext-src-thumb[data-ln-ext-theme='${id}'] {\n` +
          `  --ln-ext-piece-thumb: url('${BASE}img/pieces/${id}/wN.webp');`,
      );
  });

  it('take the light edge off the black pieces captured, which the sets edge dark already', () => {
    const style = document.createElement('style');
    // The edge's color, from styles/theme/base.css. happy-dom drops a selector whose `:is()`
    // runs over several lines: one space for each run of them.
    const sheets = `:root { --ln-ext-text-dim: #aaa; }\n${read('../playerbar.css')}${CSS}`;
    style.textContent = sheets.replaceAll(/\s+/g, ' ');
    document.head.append(style);
    expect(filter({})).toContain('drop-shadow(1px 0 0 #aaa)');
    expect(filter({ lnExtPieces: 'mochi' })).toBe('none');
    expect(filter({ lnExtBlackPieces: '' })).toBe("url('#ln-ext-black-pieces')");
  });
});
