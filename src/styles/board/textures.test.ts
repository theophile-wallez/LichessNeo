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
});
