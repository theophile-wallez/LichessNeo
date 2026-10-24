import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const read = (sheet: string): string => readFileSync(join(import.meta.dirname, sheet), 'utf8');
const SHEETS = ['layout.css', 'hero.css', 'chart-and-about.css', 'links-and-teams.css'];

// A profile as lila serves it (UserShow), cut to the hero, the ratings and the about card.
const PROFILE = (chart: string): string =>
  '<main class="page-menu"><aside class="page-menu__menu"><div class="side sub-ratings"></div></aside>' +
  '<div class="page-menu__content box user-show">' +
  '<div class="box__top user-show__header"><h1>Lance</h1><div class="trophies">' +
  '<a class="repeat" data-ln-ext-trophy-repeat=""><span class="trophy award"></span></a></div></div>' +
  '<div class="user-show__social"></div>' +
  `<div id="us_profile">${chart}<div class="profile-side"><div class="user-infos">` +
  '<div class="stats"><div class="social_links col2"><strong>Social</strong><a>Twitch</a></div>' +
  '<div class="teams col2"><strong>Teams</strong><a>Coaches</a></div></div>' +
  '</div></div></div></div></main>';
const CHART = '<div class="rating-history-container"></div>';

/** The profile at a window width, with or without its rating chart. */
function serve(width: number, chart = CHART): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(read).join('\n');
  document.head.append(style);
  document.body.innerHTML = PROFILE(chart);
}

const styleOf = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a profile', () => {
  it('leaves room between the hero and the rating cards', () => {
    serve(1600);
    expect(styleOf('.user-show__social').marginBottom).toBe('16px');
  });

  it('hides an award won again, its first tile counting it', () => {
    serve(1600);
    expect(styleOf('.trophies > .repeat').display).toBe('none');
  });

  it('sizes the about card by the chart beside it, scrolling it under pinned headings', () => {
    serve(1600);
    const card = styleOf('.profile-side');
    expect([card.getPropertyValue('contain'), card.overflowY]).toEqual(['size', 'auto']);
    expect(styleOf('.teams').overflowY).toBe('visible');
    expect(styleOf('.social_links > strong').position).toBe('sticky');
    expect(styleOf('.teams > strong').position).toBe('sticky');
  });

  it('lets the about card grow under the chart, or without one, its teams scrolling', () => {
    for (const [width, chart] of [
      [1259, CHART],
      [1600, ''],
      [1600, '<div class="rating-history-container ln-ext-rchart-none"></div>'],
    ] as const) {
      serve(width, chart);
      expect(styleOf('.profile-side').overflow).toBe('hidden');
      expect(styleOf('.teams').overflowY).toBe('auto');
      expect(styleOf('.social_links > strong').position).not.toBe('sticky');
      document.head.innerHTML = '';
    }
  });
});
