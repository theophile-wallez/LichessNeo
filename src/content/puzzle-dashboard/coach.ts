import type { CoachMood } from '#shared/coach.ts';
import { queryAll, queryOne, setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import type { Tip } from './coach-line.ts';
import { tipMarkup } from './summary.ts';

// The overview's coach, live: the player's mascot, over its still, says the
// period's tips one at a time, in the face each calls for. A click on it, or
// on the pager's arrows, turns to the next tip or back; the tip said slides
// out the way it goes, the new one in from the other side.

/**
 * The player's mascot, live over its still in `holder`: it comes in neutral,
 * as its still looks, then takes `mood()` once drawn, so the swap never shows.
 */
export function liveMascot(
  holder: HTMLElement,
  coachId: number,
  mood: () => CoachMood,
): MascotSpot {
  const spot = new MascotSpot({
    className: 'ln-ext-pdash__live',
    framing: 'bust',
    whenIdle: true,
    onDrawn: drawn => {
      setData(drawn, 'lnExtLive', '');
      spot.sync(holder, mood(), { coach: coachId });
    },
  });
  spot.sync(holder, 'neutral', { coach: coachId });
  return spot;
}

type Turn = 'next' | 'back';

/** The tip `turn` leads to from `at`, round the ends. */
export const turned = (at: number, turn: Turn, count: number): number =>
  (at + (turn === 'next' ? 1 : -1) + count) % count;

function slide(text: HTMLElement, tip: Tip, turn: Turn): void {
  for (const old of queryAll(text, ':scope > .ln-ext-pdash__say', HTMLElement)) {
    setData(old, 'lnExtLeave', turn);
    old.addEventListener('animationend', () => old.remove(), { once: true });
  }
  const holder = document.createElement('div');
  setHtml(holder, tipMarkup(tip));
  const said = holder.firstElementChild;
  if (!(said instanceof HTMLElement)) return;
  setData(said, 'lnExtEnter', turn);
  text.append(said);
}

/** The tips said in turn on the overview's card, by the mascot unless there's no coach. */
export function startCoach(
  section: HTMLElement,
  tips: readonly Tip[],
  coachId: number | null,
): void {
  const mascot = queryOne(section, '.ln-ext-pdash__mascot', HTMLElement);
  const text = queryOne(section, '.ln-ext-pdash__tip', HTMLElement);
  const dots = queryAll(section, '.ln-ext-pdash__dots > i', HTMLElement);
  const first = tips[0];
  if (!text || !first) return;
  let at = 0;
  const spot =
    mascot && coachId !== null
      ? liveMascot(mascot, coachId, () => tips[at]?.mood ?? 'neutral')
      : null;
  const turn = (to: Turn): void => {
    at = turned(at, to, tips.length);
    const tip = tips[at];
    if (!tip) return;
    slide(text, tip, to);
    for (const [i, dot] of dots.entries()) setData(dot, 'lnExtOn', i === at ? '' : null);
    if (coachId !== null) spot?.sync(mascot, tip.mood, { coach: coachId });
  };
  // The mascot pokes itself on a click (MascotSpot); the arrows ask it to.
  if (tips.length > 1) mascot?.addEventListener('click', () => turn('next'));
  for (const button of queryAll(section, '.ln-ext-pdash__turn', HTMLButtonElement)) {
    button.addEventListener('click', () => {
      turn(button.dataset.lnExtTurn === 'back' ? 'back' : 'next');
      spot?.poke();
    });
  }
}
