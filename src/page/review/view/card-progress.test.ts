import { afterEach, describe, expect, it } from 'vitest';
import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { stubDevice } from '#shared/testing/device.ts';
import { fakeGame, newSession } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { cardProgress } from './card-progress.ts';
import { statesOf, statusOf } from './engine-status.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  localStorage.clear();
});

/** A game at depth 16 (the opera's 34 positions unless told): `deep` found, the first two by the cloud, `busy` searched. */
function analysing(deep: number, busy: readonly number[] = [], game = 'opera'): Session {
  const { fixture, facade } = fakeGame(game);
  const session = newSession();
  const { work } = session;
  work.nodes = facade.mainline;
  work.aim = { depth: 16, engine: 'light' };
  for (const [i, record] of fixture.records.slice(0, deep).entries()) work.deep[i] = record;
  work.cloud.add(0).add(1);
  for (const index of busy) work.pending.add(index);
  return session;
}

function drawn(session: Session): HTMLElement {
  const markup = cardProgress(session);
  if (!markup) throw new Error('no run on the card');
  const card = createElement('div');
  setHtml(card, markup);
  return card;
}

const textOf = (card: HTMLElement, selector: string): string | undefined =>
  queryOne(card, selector, HTMLElement)?.textContent;

describe('where the game’s analysis stands', () => {
  it('is the run going on until every record is in and kept', () => {
    const session = analysing(10);
    const aim = { depth: 16, engine: 'light' };
    expect(statusOf(session)).toEqual({
      analysed: null,
      running: { done: 10, total: 34, analysed: aim },
    });
    const { work } = session;
    work.deep.push(...Array.from({ length: 24 }, () => work.deep[2]));
    expect(statusOf(session).running?.done).toBe(34);
    work.analysed = { depth: 16, engine: 'light' };
    expect(statusOf(session)).toEqual({ analysed: aim, running: null });
  });

  it('is nothing running before the analysis has its settings', () => {
    const session = analysing(10);
    session.work.aim = null;
    expect(statusOf(session)).toEqual({ analysed: null, running: null });
    expect(cardProgress(session)).toBeNull();
  });

  it('gives each position its square: the cloud’s, the engines’, those searched, the rest', () => {
    const states = statesOf(analysing(4, [4, 5]));
    expect(states).toHaveLength(34);
    expect(states.slice(0, 7)).toEqual([
      'cloud',
      'cloud',
      'engine',
      'engine',
      'busy',
      'busy',
      'todo',
    ]);
    expect(new Set(states.slice(6))).toEqual(new Set(['todo']));
  });
});

describe('the closed panel’s card while the game is analysed', () => {
  it('shows the run, its share done and the time left', () => {
    stubDevice(2, 8);
    const card = drawn(analysing(10));
    expect(textOf(card, '.ln-ext-engine__run b')).toBe('Analysing at depth 16');
    expect(textOf(card, '.ln-ext-engine__run strong')).toBe('29%');
    expect(textOf(card, '.ln-ext-engine__run span')).toMatch(/left · 1 engine$/);
  });

  it('draws a square per position, in rows of about 32: the card is short of room', () => {
    // 61 positions: two rows of 31, where the popover has three of 21.
    const session = analysing(10, [10], 'random-0');
    const card = drawn(session);
    const grid = queryOne(card, '.ln-ext-engine__grid', HTMLElement);
    expect(grid?.style.getPropertyValue('--ln-ext-columns')).toBe('31');
    const squares = queryAll(card, '.ln-ext-engine__grid i', HTMLElement);
    expect(squares).toHaveLength(61);
    expect(squares.map(square => square.dataset.lnExtState)).toEqual(statesOf(session));
    expect(squares[10]?.dataset.lnExtState).toBe('busy');
  });
});
