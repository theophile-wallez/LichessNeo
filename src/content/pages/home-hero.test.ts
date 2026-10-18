import { afterEach, describe, expect, it } from 'vitest';
import { heroText } from './hero-texts.ts';
import { addHero, homeHero } from './home-hero.ts';
// The hero as the original drew it, per language and player.
import legacy from './fixtures/legacy-home-hero.json' with { type: 'json' };

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
});
