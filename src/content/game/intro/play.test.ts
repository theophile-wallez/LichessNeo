import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { BarPlayer } from '#shared/player-bar.ts';
import { playIntro, type Scene, type ShownKind } from './play.ts';
import type { Side } from './stage.ts';

// A board and its bars, as the game page's or the settings' preview has them.
const SCENE =
  '<div class="root">' +
  '<div class="bar-top" data-ln-ext-avatar-coach="9" data-ln-ext-avatar-color="orange"></div>' +
  '<div class="is2d"><cg-container><cg-board>' +
  '<piece class="black king"></piece><piece class="black pawn"></piece>' +
  '<piece class="white pawn"></piece><piece class="white king"></piece>' +
  '</cg-board></cg-container></div>' +
  '<div class="bar-bottom"></div>' +
  '</div>';

const player = (name: string): BarPlayer => ({
  name,
  user: undefined,
  title: undefined,
  rating: '1500',
  flag: undefined,
  computer: false,
});

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

function scene(): Scene {
  document.body.innerHTML = SCENE;
  const side = (selector: string, name: string, color: Side['color']): Side => ({
    bar: element(selector),
    avatar: { x: 0, y: 0, width: 40, height: 40 },
    player: player(name),
    color,
  });
  return {
    root: element('.root'),
    board: element('cg-board'),
    top: side('.bar-top', 'alice', 'black'),
    bottom: side('.bar-bottom', 'bob', 'white'),
    setup: { icon: undefined, parts: ['3+2', 'Rated', 'Blitz'] },
  };
}

const layer = (): HTMLElement | null => queryOne(document, '.ln-ext-intro-fx', HTMLElement);
const texts = (selector: string): string[] =>
  queryAll(document, selector, HTMLElement).map(element => element.textContent.trim());

// A part's place over the squares, as its style sets it.
const left = (selector: string): number =>
  Number.parseFloat(queryOne(document, selector, HTMLElement)?.style.left ?? '');
const width = (selector: string): number =>
  Number.parseFloat(queryOne(document, selector, HTMLElement)?.style.width ?? '');
const middle = (selector: string): number => left(selector) + width(selector) / 2;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('an intro', () => {
  it.each<[ShownKind, number]>([
    ['salute', 2460],
    ['setup', 2250],
    ['ticket', 2450],
    ['camps', 2000],
    ['credits', 2650],
  ])('plays %s over the page, then leaves nothing behind after %i ms', (kind, ms) => {
    const shown = scene();
    playIntro(shown, kind);
    expect(layer()?.parentElement).toBe(document.body);
    expect(layer()?.dataset.lnExtIntro).toBe(kind);
    expect(shown.root.dataset.lnExtIntro).toBe(kind);
    vi.advanceTimersByTime(ms - 1);
    expect(layer()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(layer()).toBeNull();
    expect(shown.root.dataset.lnExtIntro).toBeUndefined();
  });

  it('plays in a host of its own, for the settings’ preview', () => {
    const shown = scene();
    playIntro(shown, 'salute', { host: shown.root });
    expect(layer()?.parentElement).toBe(shown.root);
    expect(layer()?.classList.contains('ln-ext-intro-fx--inline')).toBe(true);
  });

  it('ends at once when asked, and only once', () => {
    const shown = scene();
    const end = playIntro(shown, 'ticket');
    end();
    expect(layer()).toBeNull();
    expect(shown.root.dataset.lnExtIntro).toBeUndefined();
    shown.root.dataset.lnExtIntro = 'salute';
    vi.runAllTimers();
    expect(shown.root.dataset.lnExtIntro).toBe('salute');
  });

  it('brings both avatars to the board for the salute, with their coach, and crosses swords', () => {
    playIntro(scene(), 'salute');
    const mascots = queryAll(document, '.ln-ext-intro-salute', HTMLElement);
    expect(mascots.map(mascot => mascot.dataset.lnExtAvatarCoach)).toEqual(['9', undefined]);
    const swords = queryAll(document, '.ln-ext-intro-salute__sword', HTMLElement);
    expect(swords.map(sword => sword.querySelector('svg') !== null)).toEqual([true, true]);
    expect(queryAll(document, '.ln-ext-intro-salute__spark', HTMLElement)).toHaveLength(10);
    expect(document.querySelector('.ln-ext-intro-fx__pill')).toBeNull();
  });

  it('crosses the swords between the avatars, level with them', () => {
    const shown = scene();
    vi.spyOn(shown.board, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 400 }),
    );
    playIntro(shown, 'salute');
    const sparks = queryOne(document, '.ln-ext-intro-salute__sparks', HTMLElement);
    expect(sparks?.style.left).toBe('200px');
    expect(sparks?.style.top).toBe('200px');
    expect(
      middle('.ln-ext-intro-salute__sword--top') + middle('.ln-ext-intro-salute__sword--bottom'),
    ).toBeCloseTo(400);
    // Room for the swords between the avatars, and on either side of them.
    const avatar = width('.ln-ext-intro-salute--top');
    const gap = left('.ln-ext-intro-salute--bottom') - left('.ln-ext-intro-salute--top') - avatar;
    expect(gap).toBeGreaterThan(avatar / 2);
  });

  it('writes both players and the game’s setup on the ticket', () => {
    playIntro(scene(), 'ticket');
    expect(texts('.ln-ext-intro-ticket__who b')).toEqual(['alice', 'bob']);
    expect(texts('.ln-ext-intro-ticket__setup em')).toEqual(['Rated · Blitz']);
  });

  it('runs the names across the board for the credits, the setup between them', () => {
    playIntro(scene(), 'credits');
    expect(texts('.ln-ext-intro-credits__name')).toEqual(['alice', 'bob']);
    expect(texts('.ln-ext-intro-credits__setup')).toEqual(['3+2 · Rated · Blitz']);
  });

  it('lays the board out for the setup: its squares, then the pieces, the kings last', () => {
    const shown = scene();
    playIntro(shown, 'setup');
    expect(
      queryAll(document, 'cg-container > .ln-ext-intro-squares > i', HTMLElement),
    ).toHaveLength(64);
    const delays = queryAll(shown.board, 'piece', HTMLElement).map(piece =>
      Number.parseInt(piece.style.getPropertyValue('--ln-ext-intro-delay'), 10),
    );
    const [blackKing = 0, blackPawn = 0, whitePawn = 0, whiteKing = 0] = delays;
    expect(blackKing).toBeGreaterThan(blackPawn);
    expect(whiteKing).toBeGreaterThan(whitePawn);
    expect(queryAll(document, '[class*="ln-ext-intro-fx__ring--king-"]', HTMLElement)).toHaveLength(
      2,
    );
    vi.runAllTimers();
    expect(document.querySelector('.ln-ext-intro-squares')).toBeNull();
    expect(queryAll(shown.board, 'piece[style*="--ln-ext-intro"]', HTMLElement)).toEqual([]);
  });

  it('leaves a 3D board’s pieces where they stand', () => {
    const shown = scene();
    queryOne(document, '.is2d', HTMLElement)?.classList.remove('is2d');
    playIntro(shown, 'setup');
    expect(document.querySelector('.ln-ext-intro-squares')).toBeNull();
    expect(queryAll(shown.board, 'piece[style*="--ln-ext-intro"]', HTMLElement)).toEqual([]);
  });

  it('washes each half in its player’s hue for the two camps', () => {
    playIntro(scene(), 'camps');
    const washes = queryAll(document, '.ln-ext-intro-camps__wash', HTMLElement);
    expect(washes.map(wash => wash.dataset.lnExtAvatarColor)).toEqual(['orange', undefined]);
  });

  it('drops the face-off’s board in the scene’s own grid', () => {
    const shown = scene();
    playIntro(shown, 'faceoff', { board: 'url("board.svg")' });
    expect(queryOne(shown.root, ':scope > .ln-ext-intro', HTMLElement)).not.toBeNull();
    expect(shown.root.style.getPropertyValue('--ln-ext-intro-board')).toBe('url("board.svg")');
    expect(shown.root.dataset.lnExtIntro).toBe('faceoff');
    vi.runAllTimers();
    expect(shown.root.querySelector('.ln-ext-intro')).toBeNull();
    expect(shown.root.style.getPropertyValue('--ln-ext-intro-board')).toBe('');
  });
});
