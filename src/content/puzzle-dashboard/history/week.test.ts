import { afterEach, describe, expect, it } from 'vitest';
import {
  historyPage,
  lichessSession,
  type LichessRound,
} from '#content/puzzle-dashboard/fixtures/history.ts';
import { readSessions, type Session } from './read.ts';
import { bestRun, toRetry } from './week.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

const NOW = new Date(2026, 9, 12, 12);
const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * 3_600_000);

const solved = (id: string): LichessRound => ({ id, solved: true });
const missed = (id: string): LichessRound => ({ id, solved: false });

const sessions = (...markups: Parameters<typeof lichessSession>[]): Session[] =>
  readSessions(historyPage(...markups.map(([at, rounds]) => lichessSession(at, rounds))));

describe('the history’s sessions', () => {
  it('read each round’s puzzle, result and board', () => {
    const [session] = sessions([hoursAgo(1), [solved('aaaaa'), missed('bbbbb')]]);
    expect(session?.at).toEqual(hoursAgo(1));
    expect(session?.rounds.map(({ href, solved }) => `${href} ${solved}`)).toEqual([
      '/training/aaaaa true',
      '/training/bbbbb false',
    ]);
    expect(session?.rounds[0]?.board?.lastMove).toEqual(['e1', 'e2']);
  });

  it('keep a round whose board can’t be read, and a session whose time can’t', () => {
    const page = historyPage(lichessSession(NOW, [{ id: 'aaaaa', solved: true, state: 'x' }]));
    page.querySelector('time')?.setAttribute('datetime', 'soon');
    const [session] = readSessions(page);
    expect(session?.at).toBeNull();
    expect(session?.rounds[0]?.board).toBeNull();
  });
});

describe('the puzzles to retry', () => {
  it('are the missed ones not solved since, newest first, each once', () => {
    const history = sessions(
      [hoursAgo(1), [missed('later'), solved('fixed')]],
      [hoursAgo(5), [missed('fixed'), missed('twice'), missed('older')]],
      [hoursAgo(30), [missed('twice')]],
    );
    expect(toRetry(history).map(round => round.href)).toEqual([
      '/training/later',
      '/training/twice',
      '/training/older',
    ]);
  });
});

describe('the best run', () => {
  it('is the longest run solved in one session, the latest if tied', () => {
    const history = sessions(
      [hoursAgo(1), [solved('a'), solved('b'), missed('c'), solved('d')]],
      [hoursAgo(5), [solved('e'), solved('f'), solved('g')]],
      [hoursAgo(30), [solved('h'), solved('i'), solved('j')]],
    );
    expect(bestRun(history, hoursAgo(48))).toEqual({ length: 3, at: hoursAgo(5) });
  });

  it('doesn’t run across sessions, nor count the ones before `since`', () => {
    const history = sessions(
      [hoursAgo(1), [solved('a')]],
      [hoursAgo(5), [solved('b')]],
      [hoursAgo(300), [solved('c'), solved('d'), solved('e')]],
    );
    expect(bestRun(history, hoursAgo(48))).toEqual({ length: 1, at: hoursAgo(1) });
    expect(bestRun(sessions([hoursAgo(1), [missed('a')]]), hoursAgo(48))).toBeNull();
  });
});
