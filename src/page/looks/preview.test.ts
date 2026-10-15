import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePlacement } from '#shared/chess/fen.ts';
import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import { readBoard } from '#page/sounds/board-reader.ts';
import { fakeSoundPlayer, type PlayerCall } from '#page/sounds/fixtures/sound-player.ts';
import { LINE, START } from './line.ts';
import { createPreview } from './preview.ts';

// After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.O-O Nxe4 5.Bxf7+ Kxf7.
const END = 'r1bq1b1r/pppp1kpp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQ1RK1';
const PAUSE_MS = 450;
const STEP_MS = 1000;

let calls: PlayerCall[];
let host: HTMLElement;

function addHost(): HTMLElement {
  const added = createElement('div', { className: 'lr-ext-looks-preview__board' });
  document.body.append(added);
  return added;
}

const position = (): ReturnType<typeof parsePlacement> | undefined =>
  readBoard(queryOne(host, '.cg-wrap', HTMLElement))?.pieces;

/** What each move asked Lichess's player for. */
const sounded = (): unknown[] => calls.map(([, options]) => options);

const pieceOn = (square: string): HTMLElement | undefined =>
  queryAll(host, 'piece', HTMLElement).find(piece => cgKey(piece) === square);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const player = fakeSoundPlayer();
  calls = player.calls;
  Object.assign(window, { site: { sound: player.sound } });
  host = addHost();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

describe('the settings’ preview board', () => {
  it('is drawn as chessground draws a board, from the start, in silence', () => {
    const preview = createPreview();
    preview('draw');
    expect(position()).toEqual(parsePlacement(START));
    expect(
      queryOne(host, '.cg-wrap.orientation-white > cg-container > cg-board', Element),
    ).not.toBe(null);
    expect(pieceOn('e1')?.style.transform).toBe('translate(400%, 700%)');
    expect(pieceOn('a8')?.style.transform).toBe('translate(0%, 0%)');
    const board = queryOne(host, 'cg-board', HTMLElement);
    preview('draw');
    expect(queryOne(host, 'cg-board', HTMLElement)).toBe(board);
    expect(calls).toEqual([]);
  });

  it('steps one move on, marked and sounded through Lichess’s player', () => {
    const preview = createPreview();
    preview('step');
    expect(sounded()).toEqual([{ san: 'e4', uci: 'e2e4' }]);
    const marks = queryAll(host, 'square.last-move', HTMLElement);
    expect(marks.map(cgKey)).toEqual(['e2', 'e4']);
    // Before the pieces, as chessground puts them.
    expect(queryOne(host, 'cg-board', HTMLElement)?.firstElementChild).toBe(marks[0]);
    const pawn = pieceOn('e4');
    expect(pawn?.style.transform).toBe('translate(400%, 400%)');
    expect(pawn?.classList.contains('anim')).toBe(true);
    vi.advanceTimersByTime(STEP_MS * 5);
    expect(pawn?.classList.contains('anim')).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('plays its game through, a second apart, once it’s seen starting', () => {
    const preview = createPreview();
    preview('play');
    vi.advanceTimersByTime(PAUSE_MS - 1);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sounded()).toEqual([{ san: 'e4', uci: 'e2e4' }]);
    // Heard on the next move, not as one more.
    preview('step');
    vi.advanceTimersByTime(STEP_MS * LINE.length);
    expect(sounded()).toEqual(LINE.map(({ san, from, to }) => ({ san, uci: `${from}${to}` })));
    expect(position()).toEqual(parsePlacement(END));
    expect(queryAll(host, 'square.last-move', HTMLElement).map(cgKey)).toEqual(['e8', 'f7']);
  });

  it('starts again from the start once its game is over', () => {
    const preview = createPreview();
    for (let i = 0; i < LINE.length; i++) preview('step');
    expect(position()).toEqual(parsePlacement(END));
    preview('step');
    expect(position()).toEqual(parsePlacement(START));
    vi.advanceTimersByTime(PAUSE_MS);
    expect(calls).toHaveLength(LINE.length + 1);
    expect(sounded().at(-1)).toEqual({ san: 'e4', uci: 'e2e4' });
    vi.advanceTimersByTime(STEP_MS * 3);
    expect(calls).toHaveLength(LINE.length + 1);
  });

  it('stops once the settings close, and draws on the next board they show', () => {
    const preview = createPreview();
    preview('play');
    vi.advanceTimersByTime(PAUSE_MS + STEP_MS);
    expect(calls).toHaveLength(2);
    host.remove();
    vi.advanceTimersByTime(STEP_MS * LINE.length);
    expect(calls).toHaveLength(2);
    host = addHost();
    preview('draw');
    expect(position()).toEqual(parsePlacement(START));
  });

  it('does nothing without a board in the page', () => {
    host.remove();
    createPreview()('step');
    expect(calls).toEqual([]);
  });
});
