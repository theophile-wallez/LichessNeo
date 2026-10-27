import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions } from '#content/coach/mascot/index.ts';
import { coachName } from '#content/coach/names.ts';
import { buildCoachCard, buildCoachSwitches } from './coach-card.ts';

// WebGL isn't in happy-dom: the mascots' bundle mounts a stand-in that keeps
// what it was told to show, and draws when the test says so.
const mascot = vi.hoisted(() => {
  const shown: { coach: number; mood: CoachMood }[] = [];
  return { shown, draw: (): void => {} };
});
vi.mock(import('#content/coach/load.ts'), async importOriginal => ({
  ...(await importOriginal()),
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
  localStorage.setItem('ln-ext-coach', '3');
  mascot.shown.splice(0);
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete document.documentElement.dataset.lnExtCoach;
});

const pressed = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, '.ln-ext-coach-choice[aria-pressed=true]', HTMLElement).map(
    choice => choice.dataset.lnExtCoachChoice,
  );
const bubble = (card: HTMLElement): string | null | undefined =>
  queryOne(card, '.ln-ext-coach-pick__bubble', HTMLElement)?.textContent;

function pick(card: HTMLElement, coach: number | string): void {
  queryOne(
    card,
    `[data-ln-ext-coach-choice='${coach}'] .ln-ext-coach-choice__name`,
    HTMLElement,
  )?.click();
}

describe('the settings’ coach card', () => {
  it('names every coach offered after no coach and one at random, the robot after the animals', () => {
    expect(coachName(1)).toBe('coachPawn');
    expect(coachName(8)).toBe('coachRobot');
    expect(coachName(9)).toBe('coachMushroom');
    expect(coachName(27)).toBe('coachPawn');
    const card = buildCoachCard().element;
    expect(
      queryAll(card, '.ln-ext-coach-choice__name', HTMLElement).map(name => name.textContent),
    ).toEqual([
      'coachNone',
      'coachRandom',
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
    expect(localStorage.getItem('ln-ext-coach')).toBe('8');
    expect(document.documentElement.dataset.lnExtCoach).toBe('8');
    expect(pressed(card)).toEqual(['8']);
    expect(bubble(card)).toBe('coachPickHello:coachRobot');
    expect(
      queryOne(card, '.ln-ext-coach-pick__mascot', HTMLElement)?.dataset.lnExtAvatarCoach,
    ).toBe('8');
  });

  it('keeps no coach, with no mascot on the stage', async () => {
    const { element, show } = buildCoachCard();
    document.body.append(element);
    show(true);
    await flush();
    await flush();
    pick(element, 'none');
    expect(localStorage.getItem('ln-ext-coach')).toBe('none');
    expect(document.documentElement.dataset.lnExtCoach).toBe('none');
    expect(pressed(element)).toEqual(['none']);
    expect(bubble(element)).toBe('coachPickNone');
    const stage = queryOne(element, '.ln-ext-coach-pick__mascot', HTMLElement);
    expect(stage?.hidden).toBe(true);
    expect(stage?.dataset.lnExtAvatarCoach).toBeUndefined();
    expect(queryOne(element, '.ln-ext-mascot', HTMLElement)).toBeNull();
    pick(element, 5);
    expect(stage?.hidden).toBe(false);
    expect(queryOne(element, '.ln-ext-mascot', HTMLElement)).not.toBeNull();
  });

  it('keeps one at random, and names the one this page drew', () => {
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(7);
    const card = buildCoachCard().element;
    pick(card, 'random');
    expect(localStorage.getItem('ln-ext-coach')).toBe('random');
    expect(document.documentElement.dataset.lnExtCoach).toBe('8');
    expect(pressed(card)).toEqual(['random']);
    expect(bubble(card)).toBe('coachPickRandom:coachRobot');
  });

  it('shows the coach picked since in another page as it shows again', () => {
    const { element, show } = buildCoachCard();
    show(true);
    show(false);
    localStorage.setItem('ln-ext-coach', '5');
    show(true);
    expect(pressed(element)).toEqual(['5']);
  });

  it('comes in live only while shown, neutral, and smiles once drawn', async () => {
    const { element, show } = buildCoachCard();
    document.body.append(element);
    const live = (): HTMLElement | null =>
      queryOne(element, '.ln-ext-coach-pick__mascot > .ln-ext-mascot', HTMLElement);
    show(true);
    expect(live()).not.toBeNull();
    await flush();
    await flush();
    expect(mascot.shown).toEqual([{ coach: 3, mood: 'neutral' }]);
    mascot.draw();
    const stage = queryOne(element, '.ln-ext-coach-pick__mascot', HTMLElement);
    expect(stage?.dataset.lnExtLive).toBe('');
    expect(mascot.shown.at(-1)).toEqual({ coach: 3, mood: 'happy' });
    pick(element, 8);
    expect(mascot.shown.at(-1)).toEqual({ coach: 8, mood: 'happy' });
    show(false);
    expect(live()).toBeNull();
    expect(stage?.dataset.lnExtLive).toBeUndefined();
  });
});

const switchOf = (list: HTMLElement, key: string): HTMLButtonElement | null =>
  queryOne(list, `[data-ln-ext-setting='${key}'] .ln-ext-switch`, HTMLButtonElement);

describe('the coach’s switches', () => {
  // chrome.storage.sync, as the settings read and write it.
  const synced = new Map<string, unknown>();

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      i18n,
      runtime: { ...runtime, id: 'test' },
      storage: {
        sync: {
          get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
          set: (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) synced.set(key, value);
            return Promise.resolve();
          },
        },
        onChanged: { addListener: () => {} },
      },
    });
  });

  it('turns the 3D and the analysis board’s coach on and off', async () => {
    const list = buildCoachSwitches();
    await flush();
    expect(switchOf(list, 'coachMotion')?.getAttribute('aria-checked')).toBe('true');
    expect(switchOf(list, 'analysisCoach')?.getAttribute('aria-checked')).toBe('true');
    switchOf(list, 'analysisCoach')?.click();
    expect(synced.get('ln-ext-settings')).toMatchObject({
      coachMotion: true,
      analysisCoach: false,
    });
    expect(switchOf(list, 'analysisCoach')?.getAttribute('aria-checked')).toBe('false');
  });

  it('turns the coach’s drawings on the board on and off', async () => {
    const list = buildCoachSwitches();
    await flush();
    expect(switchOf(list, 'coachBoard')?.getAttribute('aria-checked')).toBe('true');
    switchOf(list, 'coachBoard')?.click();
    expect(synced.get('ln-ext-settings')).toMatchObject({ coachBoard: false });
    expect(switchOf(list, 'coachBoard')?.getAttribute('aria-checked')).toBe('false');
  });

  it('takes the card’s live coach off as the 3D is switched off', async () => {
    const { element, show } = buildCoachCard();
    document.body.append(element);
    const list = buildCoachSwitches();
    show(true);
    await flush();
    await flush();
    mascot.draw();
    const stage = queryOne(element, '.ln-ext-coach-pick__mascot', HTMLElement);
    expect(stage?.dataset.lnExtLive).toBe('');
    switchOf(list, 'coachMotion')?.click();
    expect(stage?.dataset.lnExtLive).toBeUndefined();
  });
});
