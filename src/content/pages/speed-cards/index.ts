import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { pageLang } from '#shared/lang.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import type { Card } from './data.ts';
import {
  clickPool,
  isDriving,
  keepPoolsTabForPoolLink,
  leavePoolsTab,
  openCustomGame,
  quickPairingName,
  seekingElsewhere,
  shownSeekingPool,
} from './lobby-pools.ts';
import { cardsMarkup, sectionMarkup } from './markup.ts';
import { createPlayButton } from './play-button.ts';
import { FIRST_POOL, poolLabel, speedOfPool } from './pools.ts';
import { fetchCards, keepLastPool, keptCards } from './store.ts';
import { speedTexts, type SpeedTexts } from './texts.ts';

// The home's quick pairing as a card per speed (styles/home/speed-cards.css),
// under the hero, in place of Lichess's pools tab: signed in, each shows the
// player's rating and its curve, and the pool last played as the primary. That pool is also
// the hero's first button (play-button.ts).

interface State {
  readonly texts: SpeedTexts;
  readonly user: string | undefined;
  cards: Card[] | null;
  /** The pool last played, of any speed. */
  last: string | null;
  drawn: string | null;
  // The pool a card joined, while Lichess seeks a game there.
  seeking: string | null;
}

function draw(section: HTMLElement, state: State): void {
  const key = JSON.stringify(state.cards);
  const holder = queryOne(section, '.ln-ext-speeds__cards', HTMLElement);
  if (!holder || key === state.drawn) return;
  state.drawn = key;
  setHtml(holder, cardsMarkup(state));
}

/** Joins the pool `id`, or leaves it if it's the one sought. */
function pickPool(state: State, id: string): void {
  const joining = state.seeking !== id;
  state.seeking = joining ? id : null;
  const speed = speedOfPool(id);
  if (joining) state.last = id;
  if (joining && state.user && speed)
    state.cards = keepLastPool(state.user, speed, id) ?? state.cards;
  void clickPool(id);
}

function onClick(event: MouseEvent, state: State): void {
  if (!(event.target instanceof Element)) return;
  if (closestTo(event.target, '.ln-ext-speeds__custom', HTMLElement)) return openCustomGame();
  const id = closestTo(event.target, '[data-ln-ext-pool]', HTMLElement)?.dataset.lnExtPool;
  if (id) pickPool(state, id);
}

function buildSection(state: State): HTMLElement {
  const section = createElement('section', { className: 'ln-ext-speeds' });
  setHtml(section, sectionMarkup(state.texts));
  section.addEventListener('click', event => onClick(event, state));
  return section;
}

// The heading says which pool Lichess seeks a game in, with a button to stop. Lichess's own
// state wins: it may have left the pool (Esc, a game found) or joined one itself (a game's
// "New opponent" opens /#pool/<id> and lands here seeking).
function syncBanner(section: HTMLElement, state: State): void {
  const text = queryOne(section, '.ln-ext-speeds__seeking-text', HTMLElement);
  const cancel = queryOne(section, '.ln-ext-speeds__cancel', HTMLElement);
  const label = state.seeking === null ? '' : state.texts.seeking(poolLabel(state.seeking));
  if (text && text.textContent !== label) text.textContent = label;
  if (cancel) setData(cancel, 'lnExtPool', state.seeking ?? '');
}

function syncSeeking(section: HTMLElement, state: State): void {
  if (!isDriving()) {
    const shown = shownSeekingPool();
    if (shown) state.seeking = shown;
    else if (!seekingElsewhere()) state.seeking = null;
    leavePoolsTab();
  }
  section.classList.toggle('ln-ext-speeds--seeking', state.seeking !== null);
  syncBanner(section, state);
  for (const button of queryAll(section, '.ln-ext-speed__pool', HTMLElement)) {
    button.classList.toggle(
      'ln-ext-speed__pool--seeking',
      button.dataset.lnExtPool === state.seeking,
    );
  }
}

function sync(state: State): void {
  const main = queryOne(document, 'main.lobby', HTMLElement);
  if (!main) return;
  let section = queryOne(main, ':scope > .ln-ext-speeds', HTMLElement);
  if (!section) {
    section = buildSection(state);
    const hero = main.querySelector(':scope > .ln-ext-hero');
    if (hero) hero.after(section);
    else main.prepend(section);
  }
  const title = queryOne(section, '.ln-ext-speeds__title', HTMLElement);
  const name = quickPairingName();
  if (title && name && title.textContent !== name) title.textContent = name;
  draw(section, state);
  syncSeeking(section, state);
}

async function refresh(state: State, user: string): Promise<void> {
  const kept = keptCards(user);
  state.cards = kept?.cards ?? null;
  state.last = kept?.last ?? null;
  if (kept && !kept.stale) return;
  // Offline, or Lichess busy: the kept cards stay.
  state.cards = (await fetchCards(user).catch(() => null)) ?? state.cards;
  state.last = keptCards(user)?.last ?? state.last;
}

// Signed in, the header has the user's tag; body's id alone stays when signed out.
function signedInUser(): string | undefined {
  return document.getElementById('user_tag') ? document.body.dataset.user : undefined;
}

/** The home's cards for this player (none signed out): call it on every tick. */
export function createSpeedCards(user: string | undefined, lang: string): () => void {
  const state: State = {
    texts: speedTexts(lang),
    user,
    cards: null,
    last: null,
    drawn: null,
    seeking: null,
  };
  if (user) void refresh(state, user);
  const play = createPlayButton(
    () => {
      const pool = state.last ?? FIRST_POOL;
      return { pool, label: state.texts.play(poolLabel(pool)), seeking: state.seeking === pool };
    },
    pool => pickPool(state, pool),
  );
  return () => {
    sync(state);
    play();
  };
}

export const speedCards: Feature = {
  name: 'speed cards',
  start: () => {
    keepPoolsTabForPoolLink();
    let sync: (() => void) | null = null;
    const run = (): void => {
      if (!sync && queryOne(document, 'main.lobby', HTMLElement))
        sync = createSpeedCards(signedInUser(), pageLang());
      sync?.();
    };
    // As the page comes in: added once it's drawn, the cards pushed the lobby down. The header,
    // whose tag says who's signed in, comes before the lobby.
    syncWhileParsing(run);
    onEveryTick('speed cards', run);
  },
};
