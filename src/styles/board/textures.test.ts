import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXTURES } from '#content/packs/textures.ts';

const ROOT = join(import.meta.dirname, '../../..');

describe('the board textures', () => {
  it('are named in the stylesheet, each by a file the extension bundles', () => {
    const css = readFileSync(join(import.meta.dirname, 'textures.css'), 'utf8');
    const named = [
      ...css.matchAll(/--ln-ext-texture-([\w-]+): url\('[^']*\/(img\/boards\/[^']+)'\)/g),
    ];
    expect(named.map(([, id]) => id)).toEqual(TEXTURES.map(texture => texture.id));
    for (const [, , file] of named) expect(existsSync(join(ROOT, 'public', file ?? ''))).toBe(true);
  });

  // Portoro is the one texture cut from photographs rather than drawn, and an earlier
  // version of the extension was taken off the Chrome Web Store over a file it had no
  // right to: it doesn't ship without the license that says where its own come from.
  it('ship the license of the one made from photographs', () => {
    expect(existsSync(join(ROOT, 'public/licenses/portoro-board-photographs.md'))).toBe(true);
    expect(TEXTURES.map(texture => texture.id)).toContain('portoro');
  });
});
