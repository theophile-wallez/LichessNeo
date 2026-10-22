import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXTURES } from '#content/packs/textures.ts';

const ROOT = join(import.meta.dirname, '../../..');

// The textures cut out of photographs of a real board rather than drawn from noise
// (tools/board-materials/photo.py). Written out here rather than read from the sources,
// which have no use for it: it's the list the license has to account for.
const PHOTOGRAPHED = [
  'burl-gloss',
  'burl',
  'vavona',
  'cocobolo',
  'amboyna',
  'olmo',
  'padauk',
  'palisander',
  'pomelle',
  'portoro',
] as const;

describe('the board textures', () => {
  it('are named in the stylesheet, each by a file the extension bundles', () => {
    const css = readFileSync(join(import.meta.dirname, 'textures.css'), 'utf8');
    const named = [
      ...css.matchAll(/--ln-ext-texture-([\w-]+): url\('[^']*\/(img\/boards\/[^']+)'\)/g),
    ];
    expect(named.map(([, id]) => id)).toEqual(TEXTURES.map(texture => texture.id));
    for (const [, , file] of named) expect(existsSync(join(ROOT, 'public', file ?? ''))).toBe(true);
  });

  // Ten textures are cut from photographs rather than drawn, and an earlier version of
  // the extension was taken off the Chrome Web Store over a file it had no right to: none
  // of them ships without the license that says where those photographs come from, and
  // that license names every one of them.
  it('ship the license of the ones made from photographs, which names each', () => {
    const license = join(ROOT, 'public/licenses/board-photographs.md');
    expect(existsSync(license)).toBe(true);
    const named = readFileSync(license, 'utf8');
    for (const id of PHOTOGRAPHED) {
      expect(TEXTURES.map(texture => texture.id)).toContain(id);
      expect(named).toContain(`\`${id}\``);
    }
  });
});
