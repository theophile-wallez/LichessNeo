import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import { START_PLACEMENT } from '#shared/chess/fen.ts';
import type { Color } from '#shared/chess/types.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { avatarAttributes } from '#shared/own-avatar.ts';
import { shownName } from '#shared/own-name.ts';
import type { BarPlayer } from '#shared/player-bar.ts';
import { nonEmpty } from '#shared/text.ts';
import { message } from '#content/platform/runtime.ts';
import type { IntroKind } from '#content/game/intro/kinds.ts';
import { playIntro, type Scene } from '#content/game/intro/play.ts';
import { avatarBox, type Side } from '#content/game/intro/stage.ts';
import { playEndPreview, type EndShow } from './end-preview.ts';
import { drawBoard, setPosition } from './preview-board.ts';

// The game animations' preview, in their settings card (styles/pages/settings-intro.css):
// a little game page, the user against an opponent of ours, which plays the
// intro or the end picked as a game would.

// The speed's glyph in Lichess's font, as the game's info has it.
const BLITZ_ICON = '\u{e008}';
const OPPONENT_RATING = '1500';
// The opponent's avatar: a coach and its hues (styles/theme/avatars.css).
const OPPONENT_AVATAR = html` data-ln-ext-avatar-coach="9" data-ln-ext-avatar-color="orange"`;

export interface IntroPreview {
  readonly element: HTMLElement;
  /** Plays `kind`, stopping the one playing; nothing for none. */
  readonly play: (kind: IntroKind) => void;
  /** Plays an end, stopping what's playing; nothing for none. */
  readonly playEnd: (show: EndShow) => void;
}

const player = (name: string, user: string | undefined, rating?: string): BarPlayer => ({
  name,
  user,
  title: undefined,
  rating,
  flag: undefined,
  computer: false,
});

const sideOf = (bar: HTMLElement, who: BarPlayer, color: Color): Side => ({
  bar,
  avatar: avatarBox(bar),
  player: who,
  color,
});

export function buildIntroPreview(): IntroPreview {
  const user = document.body.dataset.user;
  const opponent = player(message('introPreviewOpponent'), undefined, OPPONENT_RATING);
  // The user's id is in lower case: their name as Lichess writes it is the account menu's.
  const tag = nonEmpty(document.getElementById('user_tag')?.textContent.trim());
  const you = player(user === undefined ? '' : shownName(user, tag ?? user), user);
  const element = createElement('div', { className: 'ln-ext-intro-preview' });
  setHtml(
    element,
    html`<div class="ln-ext-intro-preview__scene" aria-hidden="true">
        <div class="ln-ext-intro-preview__bar ln-ext-intro-preview__bar--top"${OPPONENT_AVATAR}>
          <b>${opponent.name}</b><span>${OPPONENT_RATING}</span><i>3:00</i>
        </div>
        <div class="ln-ext-intro-preview__board is2d"></div>
        <div class="ln-ext-intro-preview__bar ln-ext-intro-preview__bar--bottom"${avatarAttributes(user)}>
          <b>${you.name}</b><i>3:00</i>
        </div>
      </div>
      <button type="button" class="ln-ext-intro-preview__play">
        ${hugeicon(PlayIcon)}<span>${message('introPreviewPlay')}</span>
      </button>`,
  );
  const scene = queryOne(element, '.ln-ext-intro-preview__scene', HTMLElement);
  const host = queryOne(element, '.ln-ext-intro-preview__board', HTMLElement);
  const top = queryOne(element, '.ln-ext-intro-preview__bar--top', HTMLElement);
  const bottom = queryOne(element, '.ln-ext-intro-preview__bar--bottom', HTMLElement);
  const board = host && drawBoard(host, START_PLACEMENT);
  // An end's position stays until something else plays.
  let ended = false;
  let stop: (() => void) | null = null;
  const play = (kind: IntroKind): void => {
    stop?.();
    stop = null;
    if (board && ended) setPosition(board, START_PLACEMENT);
    ended = false;
    if (kind === 'off' || !scene || !board || !top || !bottom) return;
    const shown: Scene = {
      root: scene,
      board,
      top: sideOf(top, opponent, 'black'),
      bottom: sideOf(bottom, you, 'white'),
      setup: { icon: BLITZ_ICON, parts: ['3+2', message('speedBlitz')] },
    };
    stop = playIntro(shown, kind, { host: scene });
  };
  const playEnd = (show: EndShow): void => {
    stop?.();
    stop = null;
    if (show.pick === 'none' || !host || !board) return;
    ended = true;
    stop = playEndPreview(host, board, show);
  };
  return { element, play, playEnd };
}
