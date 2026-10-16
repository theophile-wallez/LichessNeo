import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions } from '#content/coach/mascot/index.ts';
import { buildCoachCard, coachName } from './coach-card.ts';

// WebGL isn't in happy-dom: the mascots' bundle mounts a stand-in that keeps
// what it was told to show, and draws when the test says so.
const mascot = vi.hoisted(() => {
  const shown: { coach: number; mood: CoachMood }[] = [];
  return { shown, draw: (): void => {} };
});
vi.mock('#content/coach/load.ts', () => ({
  loadMascots: () =>
    Promise.resolve((_host: HTMLElement, options: MascotOptions = {}) => {
      let coach = 0;
      mascot.draw = () => options.onDrawn?.();
      return {
        setCoach: (next: number) => {
          coach = next;
        },
        setComputer: () => {},
        setMood: (mood: CoachMood) => mascot.shown.push({ coach, mood }),
        setTalking: () => {},
        enter: () => {},
        poke: () => {},
        destroy: () => {},
      };
    }),
}));

// The card's markup names its messages as its module loads.
const i18n = vi.hoisted(() => {
  const messages = {
    getMessage: (name: string, substitutions: readonly string[] = []): string =>
      [name, ...substitutions].join(':'),
  };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

// Picking a coach decodes its still (bootstrap/coach-choice.ts).
const runtime = { getURL: (path: string): string => `chrome-extension://id/${path}` };

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n, runtime });
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => setTimeout(callback, 0));
  localStorage.setItem('lr-ext-coach', '3');
  mascot.shown.splice(0);
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete document.documentElement.dataset.lrExtCoach;
});

const pressed = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, '.lr-ext-coach-choice[aria-pressed=true]', HTMLElement).map(
    choice => choice.dataset.lrExtCoachChoice,
  );
const bubble = (card: HTMLElement): string | null | undefined =>
  queryOne(card, '.lr-ext-coach-pick__bubble', HTMLElement)?.textContent;

function pick(card: HTMLElement, coach: number): void {
  queryOne(
    card,
    `[data-lr-ext-coach-choice='${coach}'] .lr-ext-coach-choice__name`,
    HTMLElement,
  )?.click();
}

describe('the settings’ coach card', () => {
  it('names every coach, the robot after the animals', () => {
    expect(coachName(1)).toBe('coachPawn');
    expect(coachName(8)).toBe('coachRobot');
    expect(coachName(9)).toBe('coachMushroom');
    expect(coachName(27)).toBe('coachPawn');
    const card = buildCoachCard().element;
    expect(
      queryAll(card, '.lr-ext-coach-choice__name', HTMLElement).map(name => name.textContent),
    ).toEqual([
      'coachPawn',
      'coachFennec',
      'coachDino',
      'coachAxolotl',
      'coachFrog',
      'coachBee',
      'coachOctopus',
      'coachRobot',
      'coachMushroom',
      'coachSnail',
      'coachGhost',
      'coachCactus',
      'coachToast',
      'coachRook',
      'coachKnight',
      'coachBishop',
      'coachKing',
      'coachQueen',
      'coachBunny',
      'coachCat',
      'coachDragon',
      'coachBoiledEgg',
      'coachSoda',
      'coachCloud',
      'coachSlime',
      'coachStar',
    ]);
  });

  it('starts on the coach kept, which says hello', () => {
    const card = buildCoachCard().element;
    expect(pressed(card)).toEqual(['3']);
    expect(bubble(card)).toBe('coachPickHello:coachDino');
  });

  it('keeps the coach picked for every page, the robot too', () => {
    const card = buildCoachCard().element;
    pick(card, 8);
    expect(localStorage.getItem('lr-ext-coach')).toBe('8');
    expect(document.documentElement.dataset.lrExtCoach).toBe('8');
    expect(pressed(card)).toEqual(['8']);
    expect(bubble(card)).toBe('coachPickHello:coachRobot');
    expect(
      queryOne(card, '.lr-ext-coach-pick__mascot', HTMLElement)?.dataset.lrExtAvatarCoach,
    ).toBe('8');
  });

  it('shows the coach picked since in another page as it shows again', () => {
    const { element, show } = buildCoachCard();
    show(true);
    show(false);
    localStorage.setItem('lr-ext-coach', '5');
    show(true);
    expect(pressed(element)).toEqual(['5']);
  });

  it('comes in live only while shown, neutral, and smiles once drawn', async () => {
    const { element, show } = buildCoachCard();
    document.body.append(element);
    const live = (): HTMLElement | null =>
      queryOne(element, '.lr-ext-coach-pick__mascot > .lr-ext-mascot', HTMLElement);
    show(true);
    expect(live()).not.toBeNull();
    await flush();
    await flush();
    expect(mascot.shown).toEqual([{ coach: 3, mood: 'neutral' }]);
    mascot.draw();
    const stage = queryOne(element, '.lr-ext-coach-pick__mascot', HTMLElement);
    expect(stage?.dataset.lrExtLive).toBe('');
    expect(mascot.shown.at(-1)).toEqual({ coach: 3, mood: 'happy' });
    pick(element, 8);
    expect(mascot.shown.at(-1)).toEqual({ coach: 8, mood: 'happy' });
    show(false);
    expect(live()).toBeNull();
    expect(stage?.dataset.lrExtLive).toBeUndefined();
  });
});
