import { describe, expect, it } from 'vitest';
import { namedAssets } from './site-assets.ts';

describe('the pictures the site names', () => {
  it('copies each from its folder of the repository', () => {
    const text =
      '<img src="shots/review.webp"> url("img/boards/blue.webp") coaches/coach-2-delight.webp';
    expect([...namedAssets(text)]).toEqual([
      ['shots/review.webp', 'store/templates/shots/review.webp'],
      ['coaches/coach-2-delight.webp', 'store/templates/coaches/coach-2-delight.webp'],
      ['img/boards/blue.webp', 'public/img/boards/blue.webp'],
    ]);
  });

  it('leaves a folder that only ends like one of them', () => {
    expect(namedAssets('img/coaches/mascot-4.webp')).toEqual(new Map());
  });

  it('copies a single file only where it is named', () => {
    expect(namedAssets('<meta content="img/social.png">')).toEqual(
      new Map([['img/social.png', 'store/en/promo-marquee.png']]),
    );
    expect(namedAssets('')).toEqual(new Map());
  });
});
