import { createElement, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { introBoardImage, introMarkup, type BarPlayers } from './markup.ts';

// The face-off, the extension's first intro: a board in other colors drops over
// the opponent's half with their card, faces the player's card for a second,
// then lifts (styles/game/intro/faceoff.css). In the board's grid area, which
// the game page has at every width, and the settings' preview too.

/** How long it lasts; the stylesheet's keyframes are shares of it. */
export const FACEOFF_MS = 1900;

// A Hugeicon by the "VS", in its color: styles/game/intro/faceoff.css names it, so `pnpm icons` writes it.
const SWORDS_PATH = 'img/hugeicons/swords--ffc689.svg';

/** The dropped board, picked as the page opens. */
export const faceoffBoard = (): string => introBoardImage(Math.random);

/** Decodes the swords, or their first frames would lack them. */
export const decodeFaceoff = (): Promise<void> => {
  const swords = new Image();
  swords.src = extensionUrl(SWORDS_PATH);
  return swords.decode().catch(() => undefined);
};

/** Plays the face-off over `root`'s board; `board` is the dropped one, as a CSS image. */
export function playFaceoff(root: HTMLElement, players: BarPlayers, board: string): () => void {
  const intro = createElement('div', {
    className: 'ln-ext-intro',
    attrs: { 'aria-hidden': 'true' },
  });
  setHtml(intro, introMarkup(players));
  setStyleProperty(root, '--ln-ext-intro-board', board);
  setStyleProperty(root, '--ln-ext-intro-swords', `url('${extensionUrl(SWORDS_PATH)}')`);
  setStyleProperty(root, '--ln-ext-intro-ms', `${FACEOFF_MS}ms`);
  root.append(intro);
  return () => {
    intro.remove();
    setStyleProperty(root, '--ln-ext-intro-board', null);
    setStyleProperty(root, '--ln-ext-intro-swords', null);
    setStyleProperty(root, '--ln-ext-intro-ms', null);
  };
}
