import { z } from 'zod/mini';
import { wrapOrientation } from '#shared/chessground.ts';
import { opposite, type Color } from '#shared/chess/types.ts';
import { isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { readPlayer } from '#shared/player-bar.ts';
import { freshGameId } from '#shared/round-init.ts';
import { readStored, SessionKey, writeStored } from '#shared/storage.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { computerRatings } from '#content/game/ai-players.ts';
import { syncAvatars } from '#content/ui/avatars.ts';
import { currentSettings, settingsRead } from '#content/settings/settings.ts';
import { decodeFaceoff, faceoffBoard } from './faceoff.ts';
import { playIntro, type Scene } from './play.ts';
import { avatarBox, readSetup, type Side } from './stage.ts';

// The players' intro, once per game, when a player opens a game that has just
// begun, in the kind the settings pick (play.ts). It never blocks the board:
// all of it lets the clicks through.

// Our layout's: below, the board isn't in the grid the face-off is placed in.
const DESKTOP = '(min-width: 1020px)';

const ShownSchema = z.string().check(z.minLength(1));

interface Pending {
  readonly gameId: string;
  /** The face-off's dropped board, as a CSS image. */
  readonly board: string;
  loaded: boolean;
}

let pending: Pending | null = null;

/** Readies the intro of the game `initData` opens, unless it has been shown already. */
export function prepareIntro(initData: string | null): void {
  const gameId = freshGameId(initData);
  if (gameId === null) return;
  if (readStored(SessionKey.gameIntro(gameId), ShownSchema, 'session') !== null) return;
  const next: Pending = { gameId, board: faceoffBoard(), loaded: false };
  pending = next;
  void decodeFaceoff().finally(() => {
    next.loaded = true;
  });
}

/** The game page's board and players, once drawn. */
function readScene(): Scene | null {
  const main = queryOne(document, 'main.round', HTMLElement);
  const wrap = main && queryOne(main, '.round__app__board .cg-wrap', HTMLElement);
  const board = wrap && queryOne(wrap, 'cg-board', HTMLElement);
  const top = main && queryOne(main, '.ruser-top', HTMLElement);
  const bottom = main && queryOne(main, '.ruser-bottom', HTMLElement);
  if (!main || !wrap || !board || !top || !bottom) return null;
  // The avatars' task runs after ours: a bar just drawn has no avatar yet.
  syncAvatars(main);
  const bottomColor = wrapOrientation(wrap);
  const ratings = computerRatings();
  const side = (bar: HTMLElement, color: Color): Side => ({
    bar,
    avatar: avatarBox(bar),
    player: readPlayer(bar, ratings.get(color)),
    color,
  });
  return {
    root: main,
    board,
    top: side(top, opposite(bottomColor)),
    bottom: side(bottom, bottomColor),
    setup: readSetup(main),
  };
}

export function syncIntro(): void {
  if (!pending?.loaded || document.visibilityState !== 'visible' || !settingsRead()) return;
  const kind = currentSettings().gameIntro;
  if (kind === 'off' || (kind === 'faceoff' && !window.matchMedia(DESKTOP).matches)) {
    pending = null;
    return;
  }
  const scene = readScene();
  if (!scene) return;
  writeStored(SessionKey.gameIntro(pending.gameId), '1', 'session');
  playIntro(scene, kind, { board: pending.board });
  pending = null;
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
