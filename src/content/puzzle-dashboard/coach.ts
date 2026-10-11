import { queryAll, queryOne, setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import type { Tip } from './coach-line.ts';
import { tipMarkup } from './summary.ts';

// The overview's coach, live: the player's mascot, over its still, says the
// period's tips one at a time, in the face each calls for. A click on it, or
// on the pager's arrows, turns to the next tip or back; the tip said slides
// out the way it goes, the new one in from the other side.

type Turn = 'next' | 'back';

/** The tip `turn` leads to from `at`, round the ends. */
export const turned = (at: number, turn: Turn, count: number): number =>
  (at + (turn === 'next' ? 1 : -1) + count) % count;

function slide(text: HTMLElement, tip: Tip, turn: Turn): void {
  for (const old of queryAll(text, ':scope > .lr-ext-pdash__say', HTMLElement)) {
    setData(old, 'lrExtLeave', turn);
    old.addEventListener('animationend', () => old.remove(), { once: true });
  }
  const holder = document.createElement('div');
  setHtml(holder, tipMarkup(tip));
  const said = holder.firstElementChild;
  if (!(said instanceof HTMLElement)) return;
  setData(said, 'lrExtEnter', turn);
  text.append(said);
}

export function startCoach(section: HTMLElement, tips: readonly Tip[], coachId: number): void {
  const mascot = queryOne(section, '.lr-ext-pdash__mascot', HTMLElement);
  const text = queryOne(section, '.lr-ext-pdash__tip', HTMLElement);
  const dots = queryAll(section, '.lr-ext-pdash__dots > i', HTMLElement);
  const first = tips[0];
  if (!mascot || !text || !first) return;
  let at = 0;
  // It comes in looking as its still does, then takes the tip's face: a mood from the start
  // would show as a jump from the still.
  const spot = new MascotSpot({
    className: 'lr-ext-pdash__live',
    framing: 'bust',
    whenIdle: true,
    onDrawn: holder => {
      setData(holder, 'lrExtLive', '');
      const tip = tips[at];
      if (tip) spot.sync(mascot, tip.mood, { coach: coachId });
    },
  });
  spot.sync(mascot, 'neutral', { coach: coachId });
  const turn = (to: Turn): void => {
    at = turned(at, to, tips.length);
    const tip = tips[at];
    if (!tip) return;
    slide(text, tip, to);
    for (const [i, dot] of dots.entries()) setData(dot, 'lrExtOn', i === at ? '' : null);
    spot.sync(mascot, tip.mood, { coach: coachId });
  };
  // The mascot pokes itself on a click (MascotSpot); the arrows ask it to.
  if (tips.length > 1) mascot.addEventListener('click', () => turn('next'));
  for (const button of queryAll(section, '.lr-ext-pdash__turn', HTMLButtonElement)) {
    button.addEventListener('click', () => {
      turn(button.dataset.lrExtTurn === 'back' ? 'back' : 'next');
      spot.poke();
    });
  }
}
