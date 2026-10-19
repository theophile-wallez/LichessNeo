import { setStyleProperty } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';
import { addPart, addScrim, aim, copyAvatar, place, type Intro, type Stage } from './stage.ts';

// The salute: both players' avatars leave their bars, meet on the board's
// middle line, high-five in a burst of sparks as a pill wishes a good game,
// then go home (styles/game/intro/salute.css).

const SPARKS = 10;

function play(stage: Stage): void {
  addScrim(stage);
  const { squares } = stage;
  const width = squares.width * 0.3;
  // The avatars' framing, as their stills are drawn.
  const height = (width * 114) / 124;
  const middle = { x: squares.x + squares.width / 2, y: squares.y + squares.height / 2 };
  const sides = [
    { side: stage.top, name: 'top', shift: -0.53 },
    { side: stage.bottom, name: 'bottom', shift: 0.53 },
  ] as const;
  for (const { side, name, shift } of sides) {
    const mascot = addPart(stage, `ln-ext-intro-salute ln-ext-intro-salute--${name}`);
    addPart(stage, 'ln-ext-intro-salute__tile', mascot);
    addPart(stage, 'ln-ext-intro-salute__face', mascot);
    copyAvatar(mascot, side);
    place(stage, mascot, {
      x: middle.x + shift * width - width / 2,
      y: middle.y - height / 2,
      width,
      height,
    });
    aim(stage, mascot, side.avatar);
  }
  const sparks = place(stage, addPart(stage, 'ln-ext-intro-salute__sparks'), {
    x: middle.x,
    y: middle.y - height * 0.12,
    width: 0,
    height: 0,
  });
  for (let i = 0; i < SPARKS; i++)
    setStyleProperty(
      addPart(stage, 'ln-ext-intro-salute__spark', sparks),
      '--ln-ext-intro-angle',
      `${(i * 360) / SPARKS + 8}deg`,
    );
  const pill = addPart(stage, 'ln-ext-intro-fx__pill');
  pill.textContent = message('introGoodGame');
  setStyleProperty(pill, 'top', `${squares.height / 2 + height / 2 + squares.width * 0.1}px`);
}

export const salute: Intro = { ms: 2460, play };
