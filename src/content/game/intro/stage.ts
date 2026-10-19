import type { Color } from '#shared/chess/types.ts';
import { createElement, queryOne, setStyleProperty } from '#shared/dom.ts';
import { shownName } from '#shared/own-name.ts';
import type { BarPlayer } from '#shared/player-bar.ts';
import { infoParts } from '#content/game/game-meta.ts';

// What every intro but the face-off plays on: a layer of ours, fixed over
// the page, with a box over the board's squares whose parts are sized in its
// container's units, and the players' avatars measured, for what flies to or
// from them. All is measured once, as the intro starts.

/** A box in the window, in pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Side {
  readonly bar: HTMLElement;
  readonly avatar: Box;
  readonly player: BarPlayer;
  readonly color: Color;
}

/** The game's speed glyph and its setup's parts, as the game's info writes them: "3+2", "Rated", "Blitz". */
export interface GameSetup {
  readonly icon: string | undefined;
  readonly parts: readonly string[];
}

export interface Stage {
  /** The game page's main, or the settings' preview: what carries `data-ln-ext-intro`. */
  readonly root: HTMLElement;
  /** Chessground's board, which holds the pieces. */
  readonly board: HTMLElement;
  readonly squares: Box;
  /** Ours, over the squares. */
  readonly over: HTMLElement;
  readonly top: Side;
  readonly bottom: Side;
  readonly setup: GameSetup;
  /** Runs `undo` as the intro ends. */
  readonly onEnd: (undo: () => void) => void;
}

export interface Intro {
  /** How long it lasts: its stylesheet's last animation ends by then. */
  readonly ms: number;
  readonly play: (stage: Stage) => void;
}

export const boxOf = (element: Element): Box => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
};

const px = (value: string, fallback: number): number => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

/** A bar's avatar, which its `::before` draws (styles/playerbar.css). */
export function avatarBox(bar: HTMLElement): Box {
  const box = boxOf(bar);
  const avatar = getComputedStyle(bar, '::before');
  return {
    x: box.x + px(avatar.left, 0),
    y: box.y + px(avatar.top, 0),
    width: px(avatar.width, 40),
    height: px(avatar.height, 40),
  };
}

export function readSetup(main: HTMLElement): GameSetup {
  const infos = queryOne(main, '.game__meta__infos', HTMLElement);
  const line = infos && queryOne(infos, '.setup', HTMLElement);
  // Text runs as Lichess writes them, or the spans content/game/game-meta.ts made of them.
  const parts = [...(line?.childNodes ?? [])].flatMap(node =>
    node instanceof Text ? infoParts(node.data) : infoParts(node.textContent ?? ''),
  );
  return { icon: infos?.dataset.icon, parts };
}

/** Places `element` at `box`, from the squares' corner. */
export function place(stage: Stage, element: HTMLElement, box: Box): HTMLElement {
  setStyleProperty(element, 'left', `${box.x - stage.squares.x}px`);
  setStyleProperty(element, 'top', `${box.y - stage.squares.y}px`);
  setStyleProperty(element, 'width', `${box.width}px`);
  setStyleProperty(element, 'height', `${box.height}px`);
  return element;
}

/** A part of ours over the board, its look and its timing in styles/game/intro. */
export function addPart(stage: Stage, className: string, parent?: HTMLElement): HTMLElement {
  const part = createElement('div', { className });
  (parent ?? stage.over).append(part);
  return part;
}

/** Where `element` stands once its animations are over: offsets leave transforms out. */
export function restingBox(stage: Stage, element: HTMLElement): Box {
  let x = 0;
  let y = 0;
  for (let node: Element | null = element; node instanceof HTMLElement && node !== stage.over;) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return {
    x: stage.squares.x + x,
    y: stage.squares.y + y,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}

/** The veil over the board (styles/game/intro/stage.css), its fill apart from itself. */
export function addScrim(stage: Stage): void {
  addPart(stage, 'ln-ext-intro-fx__scrim').append(createElement('i'));
}

/** Gives `element` the move that takes it onto `target`, for its stylesheet's flight. */
export function aim(stage: Stage, element: HTMLElement, target: Box): void {
  const from = restingBox(stage, element);
  const dx = target.x + target.width / 2 - (from.x + from.width / 2);
  const dy = target.y + target.height / 2 - (from.y + from.height / 2);
  setStyleProperty(element, '--ln-ext-intro-dx', `${dx}px`);
  setStyleProperty(element, '--ln-ext-intro-dy', `${dy}px`);
  setStyleProperty(element, '--ln-ext-intro-to', String(target.width / Math.max(1, from.width)));
}

/** A ring that spreads from the middle of `box`, `name` for its color and its delay. */
export function ring(stage: Stage, box: Box, name: string): HTMLElement {
  const size = Math.max(box.width, box.height) * 1.15;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return place(stage, addPart(stage, `ln-ext-intro-fx__ring ln-ext-intro-fx__ring--${name}`), {
    x: center.x - size / 2,
    y: center.y - size / 2,
    width: size,
    height: size,
  });
}

/** A ring around a player's avatar, in its hue, as their bar's avatar swells. */
export function ringAvatar(stage: Stage, side: Side, name: 'top' | 'bottom'): void {
  copyAvatarData(ring(stage, side.avatar, name), side);
}

/** A player's name as their bar shows it, the user's own if they picked one. */
export const playerName = ({ user, name }: BarPlayer): string =>
  user === undefined ? name : shownName(user, name);

const AVATAR_DATA = ['lnExtAvatarCoach', 'lnExtAvatarColor', 'lnExtAvatarPicture'] as const;

/** A bar's avatar's coach and hues (styles/theme/avatars.css), for `element`'s stylesheet. */
export function copyAvatarData(element: HTMLElement, side: Side): void {
  for (const key of AVATAR_DATA) {
    const value = side.player.computer ? undefined : side.bar.dataset[key];
    if (value !== undefined) element.dataset[key] = value;
  }
}

/** Draws a bar's avatar on `element`, as its `::before` does, with its data. */
export function copyAvatar(element: HTMLElement, side: Side): void {
  copyAvatarData(element, side);
  const avatar = getComputedStyle(side.bar, '::before');
  setStyleProperty(element, '--ln-ext-intro-avatar-image', avatar.backgroundImage);
  // The silhouette's tile is its color, under the image.
  setStyleProperty(element, '--ln-ext-intro-avatar-color', avatar.backgroundColor);
  setStyleProperty(element, '--ln-ext-intro-avatar-size', avatar.backgroundSize);
  setStyleProperty(element, '--ln-ext-intro-avatar-position', avatar.backgroundPosition);
  setStyleProperty(element, '--ln-ext-intro-avatar-repeat', avatar.backgroundRepeat);
}
