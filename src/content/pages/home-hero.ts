import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pageLang } from '#shared/lang.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { mountHeroCoach } from './hero-coach.ts';
import { heroText, type HeroText } from './hero-texts.ts';

// The home page's hero card (styles/home/hero.css), in the page's language.

function buildHero(text: HeroText, user: string | undefined): HTMLElement {
  const hero = createElement('section', { className: 'cdc-hero' });
  hero.append(
    createElement('p', { className: 'cdc-hero__eyebrow', text: text.eyebrow }),
    createElement('h1', {
      className: 'cdc-hero__title',
      text: user ? text.greeting(user) : text.title,
    }),
    createElement('p', { className: 'cdc-hero__sub', text: text.sub }),
    createElement('div', { className: 'cdc-hero__coach', attrs: { 'aria-hidden': 'true' } }),
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
  if (!main || main.querySelector(':scope > .cdc-hero')) return;
  const hero = buildHero(text, userName());
  main.prepend(hero);
  const coach = hero.querySelector('.cdc-hero__coach');
  if (coach instanceof HTMLElement) void mountHeroCoach(coach);
}

export const homeHero: Feature = {
  name: 'home hero',
  start: () => {
    const text = heroText(pageLang());
    onDomReady(() => addHero(text));
    onEveryTick('home hero', () => addHero(text));
  },
};
