import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { heroText } from './hero-texts.ts';
import { addHero, homeHero } from './home-hero.ts';
// The hero as the original drew it, per language and player.
import legacy from './fixtures/legacy-home-hero.json' with { type: 'json' };

// The extension's APIs aren't here, nor WebGL: the mascots' bundle won't load.
vi.mock('#content/coach/load.ts', () => ({ loadMascots: () => Promise.resolve(null) }));

afterEach(() => {
  document.body.innerHTML = '';
  delete document.body.dataset.user;
  document.documentElement.lang = '';
});

describe('home hero', () => {
  it.each(legacy)('draws what the original drew: "$lang", $user', scenario => {
    const header = scenario.header === null ? '' : `<a id="user_tag">${scenario.header}</a>`;
    document.body.innerHTML = `${header}<main class="lobby"><div class="lobby__app"></div></main>`;
    if (scenario.bodyUser !== null) document.body.dataset.user = scenario.bodyUser;
    const text = heroText(scenario.lang);
    addHero(text);
    addHero(text);
    expect(document.querySelector('main.lobby')?.innerHTML).toBe(scenario.main);
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
    document.body.innerHTML = '<main class="lobby"></main>';
    addHero(heroText('en'));
    await flush();
    expect(document.querySelector('.ln-ext-hero__coach--still')).not.toBeNull();
  });
});
