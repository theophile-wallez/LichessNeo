import { z } from 'zod/mini';
import { wrapOrientation } from '#shared/chessground.ts';
import { opposite } from '#shared/chess/types.ts';
import { createElement, isParsing, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { freshGameId } from '#shared/round-init.ts';
import { readStored, SessionKey, writeStored } from '#shared/storage.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { computerRatings } from '#content/game/ai-players.ts';
import { introBoardImage, introMarkup } from './markup.ts';
import { readPlayer } from '#shared/player-bar.ts';

// The players' intro, once per game, when a player opens a game that has just
// begun: a board in other colors drops over the opponent's half with their
// card, faces the player's card for a second, then lifts
// (styles/game/intro.css). It never blocks the board.

/** How long the whole intro lasts; the stylesheet's keyframes are shares of it. */
export const INTRO_MS = 1900;

// Our layout's: below, the board isn't in the grid the intro is placed in.
const DESKTOP = '(min-width: 1020px)';

// A Hugeicon by the "VS", in its color: styles/game/intro.css names it, so `pnpm icons` writes it.
const SWORDS_PATH = 'img/hugeicons/swords--ffc689.svg';

const ShownSchema = z.string().check(z.minLength(1));

interface Pending {
  readonly gameId: string;
  /** The dropped board, as a CSS image. */
  readonly board: string;
  loaded: boolean;
}

let pending: Pending | null = null;

/** Readies the intro of the game `initData` opens, unless it has been shown already. */
export function prepareIntro(initData: string | null): void {
  const gameId = freshGameId(initData);
  if (gameId === null) return;
  if (readStored(SessionKey.gameIntro(gameId), ShownSchema, 'session') !== null) return;
  const next: Pending = { gameId, board: introBoardImage(Math.random), loaded: false };
  pending = next;
  // Decoded before it shows, or its first frames would lack it.
  const swords = new Image();
  swords.src = extensionUrl(SWORDS_PATH);
  void swords
    .decode()
    .catch(() => undefined)
    .finally(() => {
      next.loaded = true;
    });
}

function clear(main: HTMLElement, intro: HTMLElement): void {
  intro.remove();
  setData(main, 'cdcIntro', null);
  setStyleProperty(main, '--cdc-intro-board', null);
  setStyleProperty(main, '--cdc-intro-swords', null);
  setStyleProperty(main, '--cdc-intro-ms', null);
}

/** Plays the intro if the game page is drawn; false when it isn't yet. */
function play(next: Pending): boolean {
  const main = queryOne(document, 'main.round', HTMLElement);
  const wrap = main && queryOne(main, '.round__app__board .cg-wrap', HTMLElement);
  const top = main && queryOne(main, '.ruser-top', HTMLElement);
  const bottom = main && queryOne(main, '.ruser-bottom', HTMLElement);
  if (!main || !wrap?.querySelector('cg-board') || !top || !bottom) return false;
  const bottomColor = wrapOrientation(wrap);
  const ratings = computerRatings();
  const intro = createElement('div', { className: 'cdc-intro', attrs: { 'aria-hidden': 'true' } });
  setHtml(
    intro,
    introMarkup({
      top: readPlayer(top, ratings.get(opposite(bottomColor))),
      bottom: readPlayer(bottom, ratings.get(bottomColor)),
    }),
  );
  writeStored(SessionKey.gameIntro(next.gameId), '1', 'session');
  setStyleProperty(main, '--cdc-intro-board', next.board);
  setStyleProperty(main, '--cdc-intro-swords', `url('${extensionUrl(SWORDS_PATH)}')`);
  setStyleProperty(main, '--cdc-intro-ms', `${INTRO_MS}ms`);
  setData(main, 'cdcIntro', '');
  main.append(intro);
  // A timer rather than `animationend`: with animations off, none would come.
  window.setTimeout(() => clear(main, intro), INTRO_MS);
  return true;
}

export function syncIntro(): void {
  if (!pending?.loaded || document.visibilityState !== 'visible') return;
  if (!window.matchMedia(DESKTOP).matches || play(pending)) pending = null;
}

export const gameIntro: Feature = {
  name: 'game intro',
  start: () => {
    // Lichess removes its init data once read: only a script running while
    // the page parses sees it.
    if (!isParsing()) return;
    readPageInitData(prepareIntro);
    onEveryTick('game intro', syncIntro);
  },
};
