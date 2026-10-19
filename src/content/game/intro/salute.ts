import { setStyleProperty } from '#shared/dom.ts';
import { setHtml, trustedHtml } from '#shared/html.ts';
import {
  addPart,
  addScrim,
  aim,
  copyAvatar,
  place,
  type Box,
  type Intro,
  type Stage,
} from './stage.ts';

// The salute: both players' avatars leave their bars and meet on the board's
// middle line, where their swords cross in a burst of sparks, then go home (styles/game/intro/salute.css).

const SPARKS = 10;
// The sword's tilt once crossed; its grip's height in its box, which it swings about, and the
// height the two cross at: a little below halfway, closer to the guard, the cross's arms nearly even.
const CROSSED = Math.PI / 4;
const GRIP = 0.83;
const CROSSING = 0.56;

// Our own drawing, blade up, in a 24 × 96 box; its colors are its stylesheet's.
const SWORD = trustedHtml(
  '<svg viewBox="0 0 24 96" aria-hidden="true">' +
    '<path class="ln-ext-intro-salute__blade" d="M12 0 18 10v56H6V10z"/>' +
    '<path class="ln-ext-intro-salute__edge" d="M12 0 18 10v56h-6z"/>' +
    '<rect class="ln-ext-intro-salute__guard" x="0" y="63" width="24" height="8" rx="4"/>' +
    '<rect class="ln-ext-intro-salute__grip" x="9" y="70" width="6" height="17" rx="2.5"/>' +
    '<circle class="ln-ext-intro-salute__guard" cx="12" cy="90.5" r="5"/>' +
    '</svg>',
);

/** A sword held at `grip`, which its stylesheet swings in from its side. */
function addSword(
  stage: Stage,
  name: string,
  grip: { x: number; y: number },
  length: number,
): void {
  const sword = addPart(stage, `ln-ext-intro-salute__sword ln-ext-intro-salute__sword--${name}`);
  setHtml(sword, SWORD);
  const width = (length * 24) / 96;
  place(stage, sword, { x: grip.x - width / 2, y: grip.y - length * GRIP, width, height: length });
}

function addSparks(stage: Stage, at: { x: number; y: number }): void {
  const box: Box = { ...at, width: 0, height: 0 };
  const sparks = place(stage, addPart(stage, 'ln-ext-intro-salute__sparks'), box);
  addPart(stage, 'ln-ext-intro-salute__clash', sparks);
  for (let i = 0; i < SPARKS; i++)
    setStyleProperty(
      addPart(stage, 'ln-ext-intro-salute__spark', sparks),
      '--ln-ext-intro-angle',
      `${(i * 360) / SPARKS + 8}deg`,
    );
}

function play(stage: Stage): void {
  addScrim(stage);
  const { squares } = stage;
  const width = squares.width * 0.24;
  // The avatars' framing, as their stills are drawn.
  const height = (width * 114) / 124;
  const middle = { x: squares.x + squares.width / 2, y: squares.y + squares.height / 2 };
  // The blades cross level with the avatars, in the gap between them, which
  // leaves room on each side of the swords.
  const length = width * 0.8;
  const toCrossing = (GRIP - CROSSING) * length;
  const reach = toCrossing * Math.sin(CROSSED);
  const swordsHalf = (1 - CROSSING) * length * Math.sin(CROSSED);
  const apart = width / 2 + swordsHalf + width * 0.14;
  const sides = [
    { side: stage.top, name: 'top', shift: -apart },
    { side: stage.bottom, name: 'bottom', shift: apart },
  ] as const;
  for (const { side, name, shift } of sides) {
    const mascot = addPart(stage, `ln-ext-intro-salute ln-ext-intro-salute--${name}`);
    addPart(stage, 'ln-ext-intro-salute__tile', mascot);
    copyAvatar(mascot, side);
    place(stage, mascot, {
      x: middle.x + shift - width / 2,
      y: middle.y - height / 2,
      width,
      height,
    });
    aim(stage, mascot, side.avatar);
  }
  const grip = middle.y + toCrossing * Math.cos(CROSSED);
  addSword(stage, 'top', { x: middle.x - reach, y: grip }, length);
  addSword(stage, 'bottom', { x: middle.x + reach, y: grip }, length);
  addSparks(stage, middle);
}

export const salute: Intro = { ms: 2460, play };
