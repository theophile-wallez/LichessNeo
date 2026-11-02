import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PIECE_SETS } from '#content/packs/piece-sets.ts';
import { RINGED_SETS } from '#shared/piece-rings.ts';

const ROOT = join(import.meta.dirname, '../../..');
const CSS = readFileSync(join(import.meta.dirname, 'piece-ring-sets.css'), 'utf8');
const BASE = 'chrome-extension://__MSG_@@extension_id__/';
const ROLES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const SIDES = { w: 'white', b: 'black' };

describe('the ringed sets', () => {
  it('are sets of ours', () => {
    const ours = PIECE_SETS.map(set => set.id);
    expect(RINGED_SETS.filter(id => !ours.some(set => set === id))).toEqual([]);
  });

  it('give each side’s edges, a lightness', () => {
    for (const id of RINGED_SETS) {
      const rule = CSS.slice(CSS.indexOf(`html[data-ln-ext-pieces='${id}'] {`));
      expect(rule).toMatch(/^[^}]*--ln-ext-ring-edge-white: 0\.\d+;[^}]*}/);
      expect(rule).toMatch(/^[^}]*--ln-ext-ring-edge-black: 0\.\d+;[^}]*}/);
    }
  });

  it('give each piece a bundled mask', () => {
    for (const id of RINGED_SETS)
      for (const [letter, side] of Object.entries(SIDES))
        for (const [initial, role] of Object.entries(ROLES)) {
          const file = `img/pieces/${id}/rings/${letter}${initial}.webp`;
          expect(CSS).toContain(
            `html[data-ln-ext-pieces='${id}'] piece.${side}.${role} {\n` +
              `  --ln-ext-ring-mask: url(${BASE}${file});`,
          );
          expect(existsSync(join(ROOT, 'public', file))).toBe(true);
        }
  });
});
