import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { addOpeningsLink } from './openings-link.ts';

// Lichess's Learn section, and the phone's drawer toggle beside the nav.
const NAV = `<input type="checkbox" id="tn-tg"><nav id="topnav"><section><a href="/learn">Learn</a>
<div role="group"><a href="/learn">Chess basics</a><a href="/practice">Practice</a>
<a href="/coordinate">Coordinates</a></div></section></nav>`;

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
});

afterEach(() => {
  document.body.replaceChildren();
});

const learnLinks = (): HTMLAnchorElement[] =>
  queryAll(document, '#topnav div a', HTMLAnchorElement);

describe('the sidebar’s opening training', () => {
  it('stands after Lichess’s Practice, and leads to the practice page', () => {
    document.body.innerHTML = NAV;
    addOpeningsLink();
    expect(learnLinks().map(link => link.getAttribute('href'))).toEqual([
      '/learn',
      '/practice',
      '/analysis#ln-ext-practice',
      '/coordinate',
    ]);
    expect(learnLinks()[2]?.textContent).toBe('[openingTraining]');
  });

  it('is added once', () => {
    document.body.innerHTML = NAV;
    addOpeningsLink();
    addOpeningsLink();
    expect(learnLinks()).toHaveLength(4);
  });

  it('closes the phone’s drawer when followed', () => {
    document.body.innerHTML = NAV;
    addOpeningsLink();
    const toggle = queryOne(document, '#tn-tg', HTMLInputElement);
    if (toggle) toggle.checked = true;
    const link = queryOne(document, '.ln-ext-nav-openings', HTMLAnchorElement);
    link?.addEventListener('click', event => event.preventDefault());
    link?.click();
    expect(toggle?.checked).toBe(false);
  });

  it('stays out of a nav without Practice', () => {
    document.body.innerHTML = NAV.replace('/practice', '/puzzle');
    addOpeningsLink();
    expect(document.querySelector('.ln-ext-nav-openings')).toBeNull();
  });
});
