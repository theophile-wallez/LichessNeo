import { afterEach, describe, expect, it } from 'vitest';
import { clickOn, type PracticeBoard, practiceBoard } from '#page/review/fixtures/fake-practice.ts';
import { fakeGame, newSession } from '#page/review/fixtures/unit-review.ts';
import { BOOK_PLIES } from '#page/review/live/judging.ts';
import { en } from '#page/review/i18n/en.ts';
import { renderLive } from './live-panel.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** The free board's panel as drawn: the coach's mood, then its words. */
function drawn(path: string): { mood: string | undefined; panel: HTMLElement } {
  const { ctrl, facade } = fakeGame('opera');
  ctrl.userJump(path);
  const session = newSession();
  renderLive(session, facade);
  const { panel } = session.elements;
  const avatar = panel.querySelector('.ln-ext-coach__avatar');
  return { mood: avatar instanceof HTMLElement ? avatar.dataset.lnExtMood : undefined, panel };
}

const texts = (panel: HTMLElement, selector: string): (string | null)[] =>
  Array.from(panel.querySelectorAll(selector), element => element.textContent);

describe('the free board’s coach', () => {
  it('says what it will do before a move is played', () => {
    const { mood, panel } = drawn('');
    expect(mood).toBe('neutral');
    expect(texts(panel, '.ln-ext-bubble__title')).toEqual(['Play a move.']);
    expect(texts(panel, '.ln-ext-bubble__sub')).toEqual([
      'I’ll tell you if it’s the best, an inaccuracy or a blunder.',
    ]);
  });

  it('thinks the move over while the engine judges it, where its verdict will land', () => {
    const { ctrl } = fakeGame('opera');
    const first = ctrl.mainline[1]?.id ?? '';
    const { mood, panel } = drawn(first);
    expect(mood).toBe('thinking');
    const [title] = texts(panel, '.ln-ext-bubble__row .ln-ext-bubble__title');
    expect(en.ui.thinking).toContain(title);
    expect(panel.querySelector('.ln-ext-bubble__row .ln-ext-bubble__spin')).not.toBeNull();
    expect(panel.querySelectorAll('.ln-ext-bubble__wait > span')).toHaveLength(2);
  });
});

function liveBoard(options: { signedIn?: boolean } = {}): PracticeBoard {
  const board = practiceBoard(options);
  board.session.view.mode = 'live';
  renderLive(board.session, board.facade);
  return board;
}

const practiceButton = ({ session }: PracticeBoard): Element | null =>
  session.elements.panel.querySelector('.ln-ext-bubble__practice');

describe('the free board’s way to opening practice', () => {
  it('offers it on the coach’s card while the board is in the opening', () => {
    const board = liveBoard();
    expect(practiceButton(board)?.textContent).toBe('Practice openings');
  });

  it('opens the practice page when clicked', () => {
    const board = liveBoard();
    clickOn(board.session, '[data-ln-ext="openings"]');
    expect(board.modes).toEqual(['openings']);
  });

  it('offers none to a signed-out user, whom the explorer doesn’t answer', () => {
    expect(practiceButton(liveBoard({ signedIn: false }))).toBeNull();
  });

  it('offers none past the opening', () => {
    const board = practiceBoard();
    board.ctrl.tree.root.ply = BOOK_PLIES;
    renderLive(board.session, board.facade);
    expect(practiceButton(board)).toBeNull();
  });
});
