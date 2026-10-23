import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { channelTip, markStillIntro, syncChannels } from './tv.ts';
// What the original did with TV's channels, and when it kept their intro still.
import legacy from './fixtures/legacy-tv.json' with { type: 'json' };
import start from './fixtures/legacy-start.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.classList.remove('ln-ext-tv-still');
  Reflect.deleteProperty(document, 'referrer');
  history.replaceState(null, '', '/');
});

function navigation(type: string): PerformanceEntry {
  const entry = { name: '', entryType: 'navigation', startTime: 0, duration: 0, type };
  return { ...entry, toJSON: () => entry };
}

describe('TV intro', () => {
  it.each(start.tv)(
    'keeps it still as the original did: $path from "$referrer" ($type)',
    scenario => {
      history.replaceState(null, '', scenario.path);
      const referrer = scenario.referrer.replace('<origin>', location.origin);
      Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
      vi.spyOn(performance, 'getEntriesByType').mockReturnValue([navigation(scenario.type)]);
      markStillIntro();
      expect(document.documentElement.classList.contains('ln-ext-tv-still')).toBe(scenario.still);
    },
  );

  // The current games load again for each channel too.
  it.each([
    { path: '/games/blitz', referrer: '/games', still: true },
    { path: '/games', referrer: '/games/bullet', still: true },
    { path: '/games', referrer: '/tv', still: false },
    { path: '/games', referrer: '/', still: false },
  ])('keeps it still on $path from $referrer: $still', ({ path, referrer, still }) => {
    history.replaceState(null, '', path);
    Object.defineProperty(document, 'referrer', {
      value: `${location.origin}${referrer}`,
      configurable: true,
    });
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([navigation('navigate')]);
    markStillIntro();
    expect(document.documentElement.classList.contains('ln-ext-tv-still')).toBe(still);
  });
});

function render(clientHeight: number, html = legacy.html): HTMLElement {
  document.body.innerHTML = html;
  const list = document.querySelector('.subnav__inner');
  const active = document.querySelector('a.tv-channel.active');
  if (!(list instanceof HTMLElement) || !active) throw new Error('no channels');
  Object.defineProperty(list, 'clientHeight', { value: clientHeight, configurable: true });
  Object.defineProperty(active, 'offsetTop', { value: legacy.offsetTop });
  Object.defineProperty(active, 'offsetHeight', { value: legacy.offsetHeight });
  return list;
}
const tips = (): (string | null)[] =>
  queryAll(document, 'a.tv-channel', HTMLElement).map(channel => channel.dataset.lnExtTip ?? null);

describe('TV channels', () => {
  it('gives each channel its tooltip and scrolls to the one on air, as the original did', () => {
    const list = render(legacy.clientHeight);
    syncChannels();
    expect(tips()).toEqual(legacy.tips);
    expect(list.scrollTop).toBe(legacy.scrollTop);
    expect(list.dataset.lnExtTv !== undefined).toBe(legacy.marked);
  });

  it('waits for the column to have a height', () => {
    const list = render(0);
    syncChannels();
    expect(list.dataset.lnExtTv).toBeUndefined();
    expect(tips().every(tip => tip === null)).toBe(true);
  });

  // Its column is wide enough for the names at every width.
  it('scrolls the current games’ channels too, with no tooltips', () => {
    const games = legacy.html
      .replace(
        '<main class="round tv-single"><div class="round__side">',
        '<main class="page-menu tv-games"><aside class="page-menu__menu">',
      )
      .replace(/<\/div><\/main>$/, '</aside></main>');
    const list = render(legacy.clientHeight, games);
    syncChannels();
    expect(list.scrollTop).toBe(legacy.scrollTop);
    expect(tips().every(tip => tip === null)).toBe(true);
  });

  it('writes a tooltip only for a named channel', () => {
    expect(channelTip('Blitz', '')).toBe('Blitz');
    expect(channelTip('', 'Bob')).toBeNull();
  });
});
