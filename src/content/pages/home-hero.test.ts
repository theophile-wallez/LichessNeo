import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { heroText } from './hero-texts.ts';
import { addHero, homeHero } from './home-hero.ts';
// The hero as the original drew it, per language and player.
import legacy from './fixtures/legacy-home-hero.json' with { type: 'json' };

// The extension's APIs aren't here, nor WebGL: the mascots' bundle won't load.
vi.mock('#content/coach/load.ts', () => ({
  coachesMove: () => true,
  loadMascots: () => Promise.resolve(null),
  onCoachMotion: () => () => {},
}));

afterEach(() => {
  document.body.innerHTML = '';
  delete document.body.dataset.user;
  document.documentElement.lang = '';
  localStorage.clear();
});

const stillCoach = (): string | undefined =>
  queryOne(document, '.ln-ext-hero__coach--still', HTMLElement)?.dataset.lnExtAvatarCoach;

describe('home hero', () => {
  it.each(legacy)('draws what the original drew: "$lang", $user', scenario => {
    const header = scenario.header === null ? '' : `<a id="user_tag">${scenario.header}</a>`;
    document.body.innerHTML = `${header}<main class="lobby"><div class="lobby__app"></div></main>`;
    if (scenario.bodyUser !== null) document.body.dataset.user = scenario.bodyUser;
    const text = heroText(scenario.lang);
    // The first greeting is the one the original always showed.
    addHero(text, () => 0);
    addHero(text, () => 0);
    expect(document.querySelector('main.lobby')?.innerHTML).toBe(scenario.main);
  });

  it('greets with every line once before one comes back, across loads', () => {
    document.body.dataset.user = 'eresy';
    const greetings = heroText('en').greetings.length;
    const titles = Array.from({ length: greetings * 2 }, () => {
      document.body.innerHTML = '<main class="lobby"></main>';
      addHero(heroText('en'), Math.random);
      return document.querySelector('.ln-ext-hero__title')?.textContent;
    });
    expect(new Set(titles.slice(0, greetings)).size).toBe(greetings);
    expect(new Set(titles.slice(greetings)).size).toBe(greetings);
    expect(titles[greetings]).not.toBe(titles[greetings - 1]);
  });

  it('reads the language when it starts, and adds the hero once the page is parsed', () => {
    document.documentElement.lang = 'de';
    document.body.innerHTML = '<main class="lobby"></main>';
    homeHero.start();
    expect(document.querySelector('.ln-ext-hero__title')?.textContent).toBe(
      'Schach online spielen',
    );
  });

  it('shows the coach’s still when the mascots won’t load', async () => {
    localStorage.setItem('ln-ext-coach', '3');
    document.body.innerHTML = '<main class="lobby"></main>';
    addHero(heroText('en'));
    await flush();
    expect(document.querySelector('.ln-ext-hero__coach--still')).not.toBeNull();
    expect(stillCoach()).toBe('3');
  });

  it('shows the coach the settings gave the home, not the one of the other pages', async () => {
    localStorage.setItem('ln-ext-coach', '3');
    localStorage.setItem('ln-ext-home-coach', '8');
    document.body.innerHTML = '<main class="lobby"></main>';
    addHero(heroText('en'));
    await flush();
    expect(stillCoach()).toBe('8');
  });

  it.each([
    ['the home’s own pick', '3', 'none'],
    ['the pick the home follows', 'none', null],
  ])('has no coach when %s is none', async (_pick, coach, home) => {
    localStorage.setItem('ln-ext-coach', coach);
    if (home !== null) localStorage.setItem('ln-ext-home-coach', home);
    document.body.innerHTML = '<main class="lobby"></main>';
    addHero(heroText('en'));
    await flush();
    expect(document.querySelector('.ln-ext-hero__title')).not.toBeNull();
    expect(document.querySelector('.ln-ext-hero__coach')).toBeNull();
  });
});
