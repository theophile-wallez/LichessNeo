import { describe, expect, it } from 'vitest';
import { planShots, selectTemplates } from './render-plan.ts';

const DIRS = { store: '/repo/store', icons: '/repo/public/icons' };

describe('planShots', () => {
  it('draws a page once, at its size', () => {
    const html = '<meta charset="utf-8">\n<meta name="size" content="1280x800">';
    expect(planShots('1-game', html, DIRS)).toEqual([
      {
        output: '/repo/store/1-game.png',
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        transparent: false,
        language: null,
        size: '1280×800',
      },
    ]);
  });

  it('draws a page once per language it lists, each in its folder', () => {
    const html = '<meta name="size" content="1280x800">\n<meta name="languages" content="en,fr">';
    expect(planShots('2-debrief', html, DIRS).map(shot => [shot.output, shot.language])).toEqual([
      ['/repo/store/en/2-debrief.png', 'en'],
      ['/repo/store/fr/2-debrief.png', 'fr'],
    ]);
  });

  it('draws the icon at each size it lists, on a transparent background', () => {
    const html = '<meta name="size" content="128x128">\n<meta name="icons" content="16,48,128">';
    const shots = planShots('icon', html, DIRS);
    expect(shots.map(shot => [shot.output, shot.deviceScaleFactor, shot.size])).toEqual([
      ['/repo/public/icons/icon16.png', 0.125, '16×16'],
      ['/repo/public/icons/icon48.png', 0.375, '48×48'],
      ['/repo/public/icons/icon128.png', 1, '128×128'],
    ]);
    expect(shots.every(shot => shot.transparent)).toBe(true);
  });

  it('says which page has no size', () => {
    expect(() => planShots('promo', '<title>x</title>', DIRS)).toThrow(/promo\.html has no/);
  });
});

describe('selectTemplates', () => {
  const files = ['store.css', '2-review.html', '1-game.html', 'icon.html', 'shots'];

  it('takes every page by default, in order', () => {
    expect(selectTemplates(files, [])).toEqual(['1-game', '2-review', 'icon']);
  });

  it('takes the pages named', () => {
    expect(selectTemplates(files, ['icon', '1-game'])).toEqual(['1-game', 'icon']);
  });

  it('refuses a name that is no page', () => {
    expect(() => selectTemplates(files, ['1-games'])).toThrow(/1-games/);
  });
});
