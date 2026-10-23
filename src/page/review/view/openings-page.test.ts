import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { PRACTICE_HASH } from '#shared/practice-page.ts';
import {
  type PracticeBoard,
  practiceBoard,
  shown,
  textsOf,
} from '#page/review/fixtures/fake-practice.ts';
import { keepSyncState, stopSync } from '#page/review/practice/sync.ts';
import { keepPage } from './openings-actions.ts';
import { openingsKey, renderOpenings } from './openings-page.ts';

// The practice page as a whole: its search of Lichess's openings, its copy in
// the user's studies, its address and title, and when it draws again.

/** Lichess's search's answer: one opening, and a family's page without moves. */
const RESULTS = `<a class="opening__search__result" href="/opening/Caro-Kann_Defense/e4_c6">
  <span class="opening__search__result__title">Caro-Kann Defense</span>
  <span data-state="rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR,white,c7c6"></span></a>
<a class="opening__search__result" href="/opening/Caro-Kann_Defense">
  <span class="opening__search__result__title">Caro-Kann Defense</span>
  <span data-state="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR,white,"></span></a>`;

const lichess = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', lichess);
});

afterEach(() => {
  vi.useRealTimers();
  stopSync();
  localStorage.clear();
  history.replaceState(null, '', '/');
  Reflect.deleteProperty(window, 'site');
});

function page(): PracticeBoard {
  const board = practiceBoard();
  renderOpenings(board.session, board.facade);
  return board;
}

function type(board: PracticeBoard, query: string): HTMLInputElement {
  const input = queryOne(
    shown(board.session, '.ln-ext-openings__search'),
    'input',
    HTMLInputElement,
  );
  if (!input) throw new Error('no search field');
  input.focus();
  input.value = query;
  input.dispatchEvent(new Event('input'));
  return input;
}

describe('the page’s search', () => {
  it('asks Lichess once the user stops typing, and shows what it found', async () => {
    lichess.mockResolvedValue(new Response(RESULTS));
    const board = page();
    const input = type(board, 'caro');
    expect(textsOf(board.session, '.ln-ext-openings__note')).toEqual(['…']);
    await vi.advanceTimersByTimeAsync(299);
    expect(lichess).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(lichess.mock.calls[0]?.[0]).toBe('/opening?q=caro');
    expect(textsOf(board.session, '.ln-ext-openings__heading')).toEqual(['Openings found']);
    expect(textsOf(board.session, '.ln-ext-opening-card__name')).toEqual(['Caro-Kann Defense']);
    // The field is kept across the redraw, its focus too.
    expect(shown(board.session, '.ln-ext-openings__search input')).toBe(input);
    expect(document.activeElement).toBe(input);
  });

  it('waits for three letters, and says when Lichess doesn’t answer', async () => {
    lichess.mockResolvedValue(new Response('', { status: 503 }));
    const board = page();
    type(board, 'ca');
    await vi.advanceTimersByTimeAsync(300);
    expect(lichess).not.toHaveBeenCalled();
    type(board, 'cat');
    await vi.advanceTimersByTimeAsync(300);
    expect(textsOf(board.session, '.ln-ext-openings__note')).toEqual([
      'The search isn’t answering.',
    ]);
  });

  it('names nothing found, and the popular openings again once cleared', async () => {
    lichess.mockResolvedValue(new Response(''));
    const board = page();
    type(board, 'zzz');
    await vi.advanceTimersByTimeAsync(300);
    expect(textsOf(board.session, '.ln-ext-openings__note')).toEqual(['No opening by that name.']);
    type(board, '');
    expect(textsOf(board.session, '.ln-ext-openings__heading')).toEqual([
      'Popular openings for White',
    ]);
  });
});

const syncLabel = (board: PracticeBoard): string[] => {
  renderOpenings(board.session, board.facade);
  return textsOf(board.session, '.ln-ext-openings__syncs');
};

function settingsOpen(): PracticeBoard {
  const board = page();
  shown(board.session, '.ln-ext-openings__settings').click();
  return board;
}

describe('the page’s copy in the user’s studies', () => {
  it('offers to save the progress while it’s off', () => {
    expect(syncLabel(settingsOpen())).toEqual(['Save it to my Lichess studies']);
  });

  it('reads the studies once the page shows, then links to the side’s', async () => {
    keepSyncState({ studies: { white: 'white001', black: 'black001' }, dirty: [] });
    // Each side's study answers once let.
    const answers: (() => void)[] = [];
    lichess.mockImplementation(
      () => new Promise(resolve => answers.push(() => resolve(new Response('')))),
    );
    const board = settingsOpen();
    await vi.waitFor(() => {
      expect(syncLabel(board)).toEqual(['Saving…']);
    });
    for (const send of answers) send();
    await vi.waitFor(() => {
      expect(syncLabel(board)).toEqual(['Saved in your studiesStop']);
    });
    expect(shown(board.session, '.ln-ext-openings__sync--on').getAttribute('href')).toBe(
      '/study/white001',
    );
    expect(shown(board.session, '.ln-ext-openings__settings').textContent).toMatch(/· Saved$/);
    shown(board.session, '[data-ln-ext="practice-unsync"]').click();
    expect(syncLabel(board)).toEqual(['Save it to my Lichess studies']);
  });

  it('says when the studies can’t be read', async () => {
    keepSyncState({ studies: { white: 'white002', black: 'black002' }, dirty: [] });
    lichess.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'warn').mockReturnValue(undefined);
    const board = settingsOpen();
    await vi.waitFor(() => {
      expect(syncLabel(board)).toEqual(['Not saved: try again']);
    });
  });
});

describe('the page’s address and title', () => {
  it('follow the page while it shows, and go back after', () => {
    history.replaceState(null, '', '/analysis');
    document.title = 'Analysis board • lichess.org';
    const board = page();
    keepPage(board.session);
    expect(location.hash).toBe(PRACTICE_HASH);
    expect(document.title).toBe('Opening training • lichess.org');
    board.session.view.mode = 'live';
    keepPage(board.session);
    expect([location.pathname, location.hash]).toEqual(['/analysis', '']);
    expect(document.title).toBe('Analysis board • lichess.org');
  });
});

describe('the page’s key', () => {
  it('changes with what the page shows, and only then', () => {
    const board = page();
    const { session, facade } = board;
    const before = openingsKey(session, facade);
    expect(openingsKey(session, facade)).toBe(before);
    session.view.openings.side = 'black';
    expect(openingsKey(session, facade)).not.toBe(before);
    session.view.openings.side = 'white';
    board.ctrl.orientation = 'black';
    expect(openingsKey(session, facade)).not.toBe(before);
  });
});
