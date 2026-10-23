import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { StorageKey } from '#shared/storage.ts';
import {
  clickOn,
  coachWords,
  type PracticeBoard,
  practiceBoard,
  shown,
  textsIn,
  textsOf,
} from '#page/review/fixtures/fake-practice.ts';
import { noteDay, noteScore, toggleFavorite } from '#page/review/practice/progress.ts';
import { DAY_MS, type Entry, keepRepertoire } from '#page/review/practice/repertoire.ts';
import { renderOpenings } from './openings-page.ts';

// The practice page's home: the coach, the day's strip, the modes' tiles, the
// side and the settings, then the openings to start from.

const NOW = new Date(2026, 9, 23, 12).getTime();

const entry = (moves: readonly string[], fields: Partial<Entry> = {}): Entry => ({
  side: 'white',
  moves: [...moves],
  name: 'Italian Game',
  answers: ['Bc4'],
  seen: 4,
  missed: 0,
  level: 4,
  due: NOW + 3 * DAY_MS,
  last: NOW - DAY_MS,
  ...fields,
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  keepRepertoire([]);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
});

function home(options: { signedIn?: boolean } = {}): PracticeBoard {
  const board = practiceBoard(options);
  renderOpenings(board.session, board.facade);
  return board;
}

/** Each mode's tile as it reads, by its mode: "off" first when it can't start. */
const tiles = (board: PracticeBoard): Record<string, string> =>
  Object.fromEntries(
    queryAll(board.session.elements.panel, '.ln-ext-mode', HTMLButtonElement).map(
      (tile): [string, string] => [
        tile.dataset.lnExtMode ?? '',
        [tile.disabled ? 'off' : '', ...textsIn(tile, 'b, small, .ln-ext-mode__badge')]
          .filter(Boolean)
          .join(' '),
      ],
    ),
  );

describe('the practice page’s home', () => {
  it('asks a signed-out visitor to sign in, and offers nothing else', () => {
    const { session } = home({ signedIn: false });
    expect(textsOf(session, '.ln-ext-bubble__title')).toEqual(['Opening training']);
    expect(coachWords(session)).toBe(
      'Sign in to Lichess first: its opening explorer is for members.',
    );
    expect(session.elements.panel.querySelector('.ln-ext-modes')).toBeNull();
  });

  it('has the coach type its words out, not show them whole', () => {
    const { session } = home();
    const words = queryAll(session.elements.panel, '.ln-ext-bubble__sub .ln-ext-w', HTMLElement);
    expect(words.length).toBeGreaterThan(5);
    expect(words.every(word => word.classList.contains('ln-ext-w--off'))).toBe(true);
    expect(coachWords(session)).toBe(
      'Pick a line or play a few moves, then start. I’ll answer from the book!',
    );
  });

  it('shows no back button on its home, and one on its own pages', () => {
    const { session, facade } = home();
    expect(session.elements.panel.querySelector('.ln-ext-review__back')).toBeNull();
    clickOn(session, '[data-ln-ext="practice-mode-traps"]');
    expect(shown(session, '.ln-ext-review__back').dataset.lnExt).toBe('practice-home');
    clickOn(session, '.ln-ext-review__back');
    renderOpenings(session, facade);
    expect(session.view.openings.view).toBe('home');
    expect(session.elements.panel.querySelector('.ln-ext-review__back')).toBeNull();
  });

  it('starts a first visit’s strip at nothing, the review caught up', () => {
    const board = home();
    expect(textsOf(board.session, '.ln-ext-today__stat')).toEqual(['0 days', '0/20', '0']);
    expect(
      shown(board.session, '[data-ln-ext-today="goal"]').style.getPropertyValue(
        '--ln-ext-progress',
      ),
    ).toBe('0.00');
    expect(tiles(board)).toEqual({
      review: 'off Daily review All caught up',
      traps: 'Traps Punish the mistakes',
      blitz: 'Speed run 1 minute, go!',
      quiz: 'Name it Guess the opening',
      games: 'My games Fix your habits',
      repertoire: 'My repertoire Your lines, your studies',
    });
  });

  it('counts the days the goal was met, today’s moves and the positions known', () => {
    for (let i = 0; i < 20; i++) noteDay(NOW - DAY_MS);
    for (let i = 0; i < 5; i++) noteDay(NOW);
    keepRepertoire([entry(['e4', 'e5', 'Nf3', 'Nc6']), entry(['e4'], { level: 1 })]);
    const { session } = home();
    expect(textsOf(session, '.ln-ext-today__stat')).toEqual(['1 day', '5/20', '1']);
    expect(
      shown(session, '[data-ln-ext-today="goal"]').style.getPropertyValue('--ln-ext-progress'),
    ).toBe('0.25');
  });

  it('wakes the daily review once positions are due, and the coach calls for it', () => {
    keepRepertoire([entry(['e4', 'e5'], { due: NOW - 1 }), entry(['d4'], { due: NOW - 2 })]);
    const board = home();
    expect(tiles(board).review).toBe('Daily review 2 positions due 2');
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Time to review']);
    expect(coachWords(board.session)).toBe('2 positions want a look today!');
    expect(textsOf(board.session, '.ln-ext-review__nav .ln-ext-btn')).toEqual([
      'Daily review',
      'From here',
    ]);
    expect(tiles(board).repertoire).toBe('My repertoire 2 positions');
  });

  it('names the best scores of the challenge and the quiz', () => {
    noteScore('blitz', 7);
    noteScore('quiz', 9);
    const board = home();
    expect(tiles(board).blitz).toBe('Speed run 1 minute · best 7');
    expect(tiles(board).quiz).toBe('Name it Guess the opening · best 9');
  });
});

describe('the home’s openings', () => {
  it('offers the side’s popular openings, as cards of little boards', () => {
    const { session, facade } = home();
    expect(textsOf(session, '.ln-ext-openings__heading')).toEqual(['Popular openings for White']);
    const cards = queryAll(session.elements.panel, '.ln-ext-opening-card', HTMLElement);
    expect(cards.length).toBeGreaterThan(3);
    expect(cards.every(card => card.dataset.lnExt === 'practice-line')).toBe(true);
    expect(cards[0]?.querySelectorAll('.ln-ext-mini .ln-ext-pc')).toHaveLength(32);
    clickOn(session, '[data-ln-ext="practice-color"][data-ln-ext-value="black"]');
    renderOpenings(session, facade);
    expect(textsOf(session, '.ln-ext-openings__heading')).toEqual(['Popular openings for Black']);
  });

  it('rings a card by how well its line is known', () => {
    const { session } = home();
    const first = shown(session, '.ln-ext-opening-card');
    const moves = first.dataset.lnExtMoves?.split(' ') ?? [];
    keepRepertoire([entry(moves, { level: 5 }), entry([...moves, 'h6'], { level: 0 })]);
    const board = home();
    const chip = shown(board.session, '.ln-ext-opening-card .ln-ext-mastery');
    expect(chip.dataset.lnExtMastery).toBe('known');
    expect(chip.style.getPropertyValue('--ln-ext-progress')).toBe('0.50');
    expect(chip.dataset.lnExtTip).toBe('100% found at the first try, over 2 positions');
  });

  it('puts the side’s starred lines first, the other side’s aside', () => {
    toggleFavorite('white|e4 e5 Nf3');
    toggleFavorite('black|e4 c5');
    const { session } = home();
    expect(textsOf(session, '.ln-ext-openings__heading')).toEqual([
      'Your favorites',
      'Popular openings for White',
    ]);
    const [starred] = queryAll(session.elements.panel, '.ln-ext-openings__grid', HTMLElement);
    const cards = queryAll(starred ?? session.elements.panel, '.ln-ext-opening-card', HTMLElement);
    expect(cards.map(card => card.dataset.lnExtMoves)).toEqual(['e4 e5 Nf3']);
    toggleFavorite('white|e4 e5 Nf3');
    toggleFavorite('black|e4 c5');
  });

  it('starts a line from a card: the board takes its moves, the user its side', () => {
    const { session, ctrl } = home();
    const card = shown(session, '.ln-ext-opening-card');
    const moves = card.dataset.lnExtMoves ?? '';
    card.click();
    expect(ctrl.nodeList.slice(1).map(node => node.san)).toEqual(moves.split(' '));
    expect(session.view.practice).toMatchObject({ side: 'white', opening: card.dataset.lnExtName });
  });
});

describe('the home’s settings', () => {
  it('sums them up on one line, which opens on their choices', () => {
    const { session, facade } = home();
    const toggle = shown(session, '.ln-ext-openings__settings');
    expect(toggle.textContent).toBe('Masters · Main lines · Growing lines');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    renderOpenings(session, facade);
    expect(textsOf(session, '.ln-ext-openings__label')).toEqual([
      'You play',
      'Moves from',
      'Lines',
      'Line length',
      'Your moves',
      'Daily goal',
      'Progress',
    ]);
  });

  it('keeps a pick for the next visit, and marks it on its kept bar', () => {
    const { session, facade } = home();
    clickOn(session, '.ln-ext-openings__settings');
    renderOpenings(session, facade);
    const bar = shown(session, '[data-ln-ext="practice-goal"]').parentElement;
    clickOn(session, '[data-ln-ext="practice-goal"][data-ln-ext-value="40"]');
    expect(localStorage.getItem(StorageKey.practiceSettings)).toMatch(/"goal":40/);
    clickOn(session, '[data-ln-ext="practice-lines"][data-ln-ext-value="all"]');
    renderOpenings(session, facade);
    expect(shown(session, '[data-ln-ext="practice-goal"]').parentElement).toBe(bar);
    const picked = shown(session, '[data-ln-ext="practice-goal"].active');
    expect([picked.dataset.lnExtValue, picked.getAttribute('aria-pressed')]).toEqual([
      '40',
      'true',
    ]);
    expect(JSON.parse(localStorage.getItem(StorageKey.practiceSettings) ?? '{}')).toMatchObject({
      goal: 40,
      lines: 'all',
    });
    // The day's count is the file's so far: only the goal is this test's.
    expect(textsOf(session, '.ln-ext-today__stat')[1]).toMatch(/^\d+\/40$/);
  });

  it('reads the book from the explorer’s tab, and the level only for Lichess’s', () => {
    const { session, facade, explorer } = home();
    clickOn(session, '.ln-ext-openings__settings');
    clickOn(session, '[data-ln-ext="practice-book"][data-ln-ext-value="lichess"]');
    expect(explorer.db).toBe('lichess');
    renderOpenings(session, facade);
    expect(shown(session, '.ln-ext-openings__settings').textContent).toBe(
      'Lichess · My level · Main lines · Growing lines',
    );
    expect(textsOf(session, '[data-ln-ext="practice-level"]')).toEqual(['Everyone', 'My level']);
    explorer.color = 'black';
    clickOn(session, '[data-ln-ext="practice-book"][data-ln-ext-value="player"]');
    // The user's own games, read as the side they play.
    expect([explorer.db, explorer.color]).toEqual(['player', 'white']);
  });
});
