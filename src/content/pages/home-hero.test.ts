import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
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
});
