import { describe, expect, it } from 'vitest';
import { serverAnalysis, type PageAnalysis } from './state.ts';

const SIDE = { inaccuracy: 1, mistake: 0, blunder: 0, acpl: 20 };
const SUMMARY = { white: SIDE, black: SIDE };

const page = (overrides: Partial<PageAnalysis>): PageAnalysis => ({
  requestable: false,
  started: false,
  full: false,
  positions: 40,
  scored: 0,
  summary: null,
  ...overrides,
});

describe('serverAnalysis', () => {
  it('offers the request while Lichess has its form', () => {
    expect(serverAnalysis(page({ requestable: true }))).toEqual({ kind: 'request' });
  });

  it('shows nothing for a game Lichess makes none of', () => {
    expect(serverAnalysis(page({}))).toEqual({ kind: 'none' });
  });

  it('counts the positions scored while it runs', () => {
    expect(serverAnalysis(page({ started: true, scored: 10 }))).toEqual({
      kind: 'running',
      share: 0.25,
    });
    // A partial analysis brings its data before it's whole.
    expect(serverAnalysis(page({ summary: SUMMARY, scored: 20 }))).toEqual({
      kind: 'running',
      share: 0.5,
    });
  });

  it('is done once every position has its score', () => {
    expect(serverAnalysis(page({ full: true, summary: SUMMARY, started: true }))).toEqual({
      kind: 'done',
      summary: SUMMARY,
    });
  });
});
