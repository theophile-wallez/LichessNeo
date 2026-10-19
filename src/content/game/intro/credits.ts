import { setStyleProperty } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { addPart, copyAvatar, playerName, type Intro, type Side, type Stage } from './stage.ts';

// The credits: the players' names, in big type, cross the board the opposite
// ways over a dark veil, as a film's credits, the opponent's outlined, the
// player's filled, with the game's setup between them, then fade away
// (styles/game/intro/credits.css).

// The names' size: both as wide, at most a fifth of the board's height, and room at the sides.
const MAX_SIZE = 0.2;
const WIDTH = 0.86;
const PROBE_SIZE = 100;

interface Line {
  readonly name: HTMLElement;
  readonly caption: HTMLElement;
  readonly sign: number;
}

function addLine(stage: Stage, credits: HTMLElement, side: Side, place: 'top' | 'bottom'): Line {
  const name = addPart(
    stage,
    `ln-ext-intro-credits__name ln-ext-intro-credits__name--${place}`,
    credits,
  );
  name.textContent = playerName(side.player);
  const caption = addPart(
    stage,
    `ln-ext-intro-credits__caption ln-ext-intro-credits__caption--${place}`,
    credits,
  );
  setHtml(
    caption,
    html`<span class="ln-ext-intro-credits__avatar"></span>${side.player.rating ?? ''}<span class="ln-ext-intro-credits__chip ln-ext-intro-credits__chip--${side.color}"></span>`,
  );
  const avatar = caption.firstElementChild;
  if (avatar instanceof HTMLElement) copyAvatar(avatar, side);
  return { name, caption, sign: place === 'top' ? 1 : -1 };
}

/** Sets each line's drift across the board, centered on its middle. */
function drift(lines: readonly Line[], width: number): void {
  for (const { name, caption, sign } of lines) {
    const left = (width - name.offsetWidth) / 2;
    const moves = [
      [name, 0.3, -0.06],
      [caption, 0.18, -0.03],
    ] as const;
    for (const [element, from, to] of moves) {
      setStyleProperty(element, '--ln-ext-intro-from', `${left + sign * from * width}px`);
      setStyleProperty(element, '--ln-ext-intro-to', `${left + sign * to * width}px`);
    }
  }
}

function play(stage: Stage): void {
  const credits = addPart(stage, 'ln-ext-intro-credits');
  addPart(stage, 'ln-ext-intro-credits__veil', credits);
  const top = addLine(stage, credits, stage.top, 'top');
  const middle = addPart(stage, 'ln-ext-intro-credits__setup', credits);
  setHtml(middle, html`<span></span>${stage.setup.parts.join(' · ')}<span></span>`);
  const bottom = addLine(stage, credits, stage.bottom, 'bottom');
  const { width, height } = stage.squares;
  setStyleProperty(credits, '--ln-ext-intro-size', `${PROBE_SIZE}px`);
  const widest = Math.max(1, top.name.offsetWidth, bottom.name.offsetWidth);
  const size = Math.min(height * MAX_SIZE, (PROBE_SIZE * width * WIDTH) / widest);
  setStyleProperty(credits, '--ln-ext-intro-size', `${size}px`);
  drift([top, bottom], width);
}

export const credits: Intro = { ms: 2650, play };
