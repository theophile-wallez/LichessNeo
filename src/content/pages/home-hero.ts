import { homeCoach } from '#shared/coach.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { pageLang } from '#shared/lang.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { mountHeroCoach } from './hero-coach.ts';
import { heroText, type HeroText } from './hero-texts.ts';

// The home page's hero card (styles/home/hero.css), in the page's language.

function buildHero(text: HeroText, user: string | undefined): HTMLElement {
  const hero = createElement('section', { className: 'ln-ext-hero' });
  hero.append(
    createElement('p', { className: 'ln-ext-hero__eyebrow', text: text.eyebrow }),
    createElement('h1', {
      className: 'ln-ext-hero__title',
      text: user ? text.greeting(user) : text.title,
    }),
    createElement('p', { className: 'ln-ext-hero__sub', text: text.sub }),
  );
  return hero;
}

// The header's name keeps its capitals, unlike body's user id.
function userName(): string | undefined {
  const tag = document.getElementById('user_tag')?.textContent.trim();
  return nonEmpty(tag) ?? document.body.dataset.user;
}

export function addHero(text: HeroText): void {
  const main = queryOne(document, 'main.lobby', HTMLElement);
  if (!main || main.querySelector(':scope > .ln-ext-hero')) return;
  const hero = buildHero(text, userName());
  main.prepend(hero);
  // With no coach, the hero has none: its title alone.
  const coach = homeCoach();
  if (coach === null) return;
  const host = createElement('div', {
    className: 'ln-ext-hero__coach',
    attrs: { 'aria-hidden': 'true' },
  });
  hero.append(host);
  mountHeroCoach(host, coach);
}

export const homeHero: Feature = {
  name: 'home hero',
  start: () => {
    const text = heroText(pageLang());
    // As the page comes in: added once it's drawn, the hero pushed the whole lobby down.
    syncWhileParsing(() => addHero(text));
    onEveryTick('home hero', () => addHero(text));
  },
};
