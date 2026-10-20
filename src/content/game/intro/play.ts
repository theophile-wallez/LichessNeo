import { createElement, setData, setStyleProperty } from '#shared/dom.ts';
import { camps } from './camps.ts';
import { credits } from './credits.ts';
import { FACEOFF_MS, faceoffBoard, playFaceoff } from './faceoff.ts';
import type { IntroKind } from './kinds.ts';
import { march } from './march.ts';
import { salute } from './salute.ts';
import { setup } from './setup.ts';
import { boxOf, type GameSetup, type Intro, type Side, type Stage } from './stage.ts';
import { ticket } from './ticket.ts';
import { wave } from './wave.ts';
import { weave } from './weave.ts';

// Plays an intro over a board and its players' bars: the game page's, or the
// settings' preview of it (content/settings/intro-preview.ts).

export type ShownKind = Exclude<IntroKind, 'off'>;

const INTROS: Readonly<Record<Exclude<ShownKind, 'faceoff'>, Intro>> = {
  salute,
  setup,
  march,
  weave,
  wave,
  ticket,
  camps,
  credits,
};

/** A board with its players, as an intro plays over them. */
export interface Scene {
  /** What carries `data-ln-ext-intro` while it plays, for the pieces' and the bars' animations. */
  readonly root: HTMLElement;
  /** Chessground's board, which holds the pieces. */
  readonly board: HTMLElement;
  readonly top: Side;
  readonly bottom: Side;
  readonly setup: GameSetup;
}

export interface PlayOptions {
  /** What the intro's layer goes in, over the scene; the page's body, fixed over it all, by default. */
  readonly host?: HTMLElement;
  /** The face-off's dropped board, as a CSS image; one picked now by default. */
  readonly board?: string;
}

// The corner the layer's boxes count from: the window's, or the host's padding box.
function originOf(host: HTMLElement | undefined): { x: number; y: number } {
  if (!host) return { x: 0, y: 0 };
  const box = boxOf(host);
  return { x: box.x + host.clientLeft, y: box.y + host.clientTop };
}

/** Sets the stage over the board and plays `intro` on it; the returned function ends it. */
function playOn(scene: Scene, kind: ShownKind, intro: Intro, host?: HTMLElement): () => void {
  const squares = boxOf(scene.board);
  const origin = originOf(host);
  const layer = createElement('div', {
    className: host ? 'ln-ext-intro-fx ln-ext-intro-fx--inline' : 'ln-ext-intro-fx',
    attrs: { 'aria-hidden': 'true', 'data-ln-ext-intro': kind },
  });
  const over = createElement('div', { className: 'ln-ext-intro-fx__board' });
  setStyleProperty(over, 'left', `${squares.x - origin.x}px`);
  setStyleProperty(over, 'top', `${squares.y - origin.y}px`);
  setStyleProperty(over, 'width', `${squares.width}px`);
  setStyleProperty(over, 'height', `${squares.height}px`);
  layer.append(over);
  (host ?? document.body).append(layer);
  const undos: (() => void)[] = [];
  intro.play({ ...scene, squares, over, onEnd: undo => undos.push(undo) } satisfies Stage);
  return () => {
    layer.remove();
    for (const undo of undos) undo();
  };
}

/** Plays `kind` over `scene`, which ends by itself; the returned function ends it sooner. */
export function playIntro(scene: Scene, kind: ShownKind, options: PlayOptions = {}): () => void {
  const intro = kind === 'faceoff' ? null : INTROS[kind];
  const end = intro
    ? playOn(scene, kind, intro, options.host)
    : playFaceoff(
        scene.root,
        { top: scene.top.player, bottom: scene.bottom.player },
        options.board ?? faceoffBoard(),
      );
  // Once all is measured: this sets the pieces and the bars moving.
  setData(scene.root, 'lnExtIntro', kind);
  let ended = false;
  const finish = (): void => {
    if (ended) return;
    ended = true;
    window.clearTimeout(timer);
    end();
    setData(scene.root, 'lnExtIntro', null);
  };
  // A timer rather than `animationend`: with animations off, none would come.
  const timer = window.setTimeout(finish, intro?.ms ?? FACEOFF_MS);
  return finish;
}
