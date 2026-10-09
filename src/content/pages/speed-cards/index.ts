import { closestTo, createElement, onDomReady, queryAll, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { pageLang } from '#shared/lang.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import type { Card } from './data.ts';
import {
  clickPool,
  isDriving,
  leavePoolsTab,
  openCustomGame,
  quickPairingName,
  seekingElsewhere,
  shownSeekingPool,
} from './lobby-pools.ts';
import { cardsMarkup, sectionMarkup } from './markup.ts';
import { CARD_SPEEDS } from './pools.ts';
import { fetchCards, keepLastPool, keptCards } from './store.ts';
import { speedTexts, type SpeedTexts } from './texts.ts';

// The home's quick pairing as a card per speed (styles/home/speed-cards.css),
// under the hero, in place of Lichess's pools tab: signed in, each shows the
// player's rating and its curve, and the pool last played as the primary.

interface State {
  readonly texts: SpeedTexts;
  readonly user: string | undefined;
  cards: Card[] | null;
  drawn: string | null;
  // The pool a card joined, while Lichess seeks a game there.
  seeking: string | null;
}

function draw(section: HTMLElement, state: State): void {
  const key = JSON.stringify(state.cards);
  const holder = queryOne(section, '.lr-ext-speeds__cards', HTMLElement);
  if (!holder || key === state.drawn) return;
  state.drawn = key;
  setHtml(holder, cardsMarkup(state));
}

function onClick(event: MouseEvent, state: State): void {
  if (!(event.target instanceof Element)) return;
  if (closestTo(event.target, '.lr-ext-speeds__custom', HTMLElement)) return openCustomGame();
  const id = closestTo(event.target, '[data-lr-ext-pool]', HTMLElement)?.dataset.lrExtPool;
  if (!id) return;
  const joining = state.seeking !== id;
  state.seeking = joining ? id : null;
  const card = closestTo(event.target, '[data-lr-ext-speed]', HTMLElement)?.dataset.lrExtSpeed;
  const speed = CARD_SPEEDS.find(candidate => candidate === card);
  if (joining && state.user && speed)
    state.cards = keepLastPool(state.user, speed, id) ?? state.cards;
  void clickPool(id);
}

function buildSection(state: State): HTMLElement {
  const section = createElement('section', { className: 'lr-ext-speeds' });
  setHtml(section, sectionMarkup(state.texts));
  section.addEventListener('click', event => onClick(event, state));
  return section;
}

// Lichess's own state wins: it may have left the pool (Esc, a game found) or
// joined one itself (a game's "New opponent" opens /#pool/<id>).
function syncSeeking(section: HTMLElement, state: State): void {
  if (!isDriving()) {
    const shown = shownSeekingPool();
    if (shown) state.seeking = shown;
    else if (!seekingElsewhere()) state.seeking = null;
    leavePoolsTab();
  }
  section.classList.toggle('lr-ext-speeds--seeking', state.seeking !== null);
  for (const button of queryAll(section, '[data-lr-ext-pool]', HTMLElement)) {
    button.classList.toggle(
      'lr-ext-speed__pool--seeking',
      button.dataset.lrExtPool === state.seeking,
    );
  }
}

function sync(state: State): void {
  const main = queryOne(document, 'main.lobby', HTMLElement);
  if (!main) return;
  let section = queryOne(main, ':scope > .lr-ext-speeds', HTMLElement);
  if (!section) {
    section = buildSection(state);
    const hero = main.querySelector(':scope > .lr-ext-hero');
    if (hero) hero.after(section);
    else main.prepend(section);
  }
  const title = queryOne(section, '.lr-ext-speeds__title', HTMLElement);
  const name = quickPairingName();
  if (title && name && title.textContent !== name) title.textContent = name;
  draw(section, state);
  syncSeeking(section, state);
}

async function refresh(state: State, user: string): Promise<void> {
  const kept = keptCards(user);
  state.cards = kept?.cards ?? null;
  if (kept && !kept.stale) return;
  // Offline, or Lichess busy: the kept cards stay.
  state.cards = (await fetchCards(user).catch(() => null)) ?? state.cards;
}

// Signed in, the header has the user's tag; body's id alone stays when signed out.
function signedInUser(): string | undefined {
  return document.getElementById('user_tag') ? document.body.dataset.user : undefined;
}

/** The home's cards for this player (none signed out): call it on every tick. */
export function createSpeedCards(user: string | undefined, lang: string): () => void {
  const state: State = { texts: speedTexts(lang), user, cards: null, drawn: null, seeking: null };
  if (user) void refresh(state, user);
  return () => sync(state);
}

export const speedCards: Feature = {
  name: 'speed cards',
  start: () =>
    onDomReady(() => {
      if (!queryOne(document, 'main.lobby', HTMLElement)) return;
      const sync = createSpeedCards(signedInUser(), pageLang());
      sync();
      onEveryTick('speed cards', sync);
    }),
};
