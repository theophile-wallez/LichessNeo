import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { chooseCoach } from '#content/bootstrap/coach-choice.ts';
import { buildHomeCoachCard } from './home-coach-card.ts';

// The card's markup names its messages as its module loads, and picking a coach
// decodes its still (bootstrap/coach-choice.ts).
const i18n = vi.hoisted(() => {
  const messages = {
    getMessage: (name: string, substitutions: readonly string[] = []): string =>
      [name, ...substitutions].join(':'),
  };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n,
    runtime: { getURL: (path: string): string => `chrome-extension://id/${path}` },
  });
  localStorage.setItem('ln-ext-coach', '3');
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.lnExtCoach;
});

const mode = (card: HTMLElement, name: string): HTMLElement | null =>
  queryOne(card, `[data-ln-ext-home-coach='${name}']`, HTMLElement);
const pressedMode = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, "[data-ln-ext-home-coach][aria-pressed='true']", HTMLElement).map(
    button => button.dataset.lnExtHomeCoach,
  );
const grid = (card: HTMLElement): HTMLElement | null =>
  queryOne(card, '.ln-ext-home-coach__grid', HTMLElement);
const followedFace = (card: HTMLElement): string | undefined =>
  queryOne(card, '.ln-ext-home-coach__face', HTMLElement)?.dataset.lnExtAvatarCoach;
const pressedCoach = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, ".ln-ext-coach-choice[aria-pressed='true']", HTMLElement).map(
    tile => tile.dataset.lnExtCoachChoice,
  );

function pickCoachTile(card: HTMLElement, coach: number): void {
  queryOne(
    card,
    `[data-ln-ext-coach-choice='${coach}'] .ln-ext-coach-choice__name`,
    HTMLElement,
  )?.click();
}

describe('the settings’ home coach card', () => {
  it('follows the coach, wearing its face, with no tile drawn', () => {
    const card = buildHomeCoachCard().element;
    expect(pressedMode(card)).toEqual(['follow']);
    expect(followedFace(card)).toBe('3');
    expect(grid(card)?.hidden).toBe(true);
    expect(queryAll(card, '.ln-ext-coach-choice', HTMLElement)).toEqual([]);
    expect(localStorage.getItem('ln-ext-home-coach')).toBeNull();
  });

  it('draws the tiles on the coach it followed as the home takes its own', () => {
    const card = buildHomeCoachCard().element;
    mode(card, 'own')?.click();
    expect(pressedMode(card)).toEqual(['own']);
    expect(grid(card)?.hidden).toBe(false);
    expect(queryAll(card, '.ln-ext-coach-choice', HTMLElement)).toHaveLength(26);
    expect(pressedCoach(card)).toEqual(['3']);
    expect(localStorage.getItem('ln-ext-home-coach')).toBe('3');
  });

  it('keeps the coach a tile picks for the home alone', () => {
    const card = buildHomeCoachCard().element;
    mode(card, 'own')?.click();
    pickCoachTile(card, 8);
    expect(localStorage.getItem('ln-ext-home-coach')).toBe('8');
    expect(localStorage.getItem('ln-ext-coach')).toBe('3');
    expect(pressedCoach(card)).toEqual(['8']);
    // Picking its own mode again leaves the coach it holds alone.
    mode(card, 'own')?.click();
    expect(localStorage.getItem('ln-ext-home-coach')).toBe('8');
  });

  it('follows the coach again, tiles away, as the first mode is picked', () => {
    const card = buildHomeCoachCard().element;
    mode(card, 'own')?.click();
    pickCoachTile(card, 8);
    mode(card, 'follow')?.click();
    expect(pressedMode(card)).toEqual(['follow']);
    expect(grid(card)?.hidden).toBe(true);
    expect(localStorage.getItem('ln-ext-home-coach')).toBeNull();
  });

  it('wears the coach picked in the card above', () => {
    const card = buildHomeCoachCard().element;
    chooseCoach(5);
    expect(followedFace(card)).toBe('5');
  });

  it('reads the picks again as its page shows, changed in another tab', () => {
    const { element, show } = buildHomeCoachCard();
    show(true);
    show(false);
    localStorage.setItem('ln-ext-coach', '5');
    localStorage.setItem('ln-ext-home-coach', '8');
    show(true);
    expect(followedFace(element)).toBe('5');
    expect(pressedMode(element)).toEqual(['own']);
    expect(pressedCoach(element)).toEqual(['8']);
  });
});
