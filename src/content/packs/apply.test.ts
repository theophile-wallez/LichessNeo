import { afterEach, describe, expect, it } from 'vitest';
import { packRules, setLoading, showLooks, soundFiles } from './apply.ts';
import { fakePack, IMAGE, SOUND } from '#shared/testing/packs.ts';
import { deleteBoard, saveBoard } from './saved-boards.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const named = (): string | undefined => document.documentElement.dataset.lnExtPieces;
const style = (): HTMLStyleElement | null => document.querySelector('style#ln-ext-packs');
const flatColors = (): string[] =>
  ['--ln-ext-board-flat-light', '--ln-ext-board-flat-dark'].map(name =>
    document.documentElement.style.getPropertyValue(name),
  );

afterEach(() => {
  style()?.remove();
  delete document.documentElement.dataset.lnExtBoard;
  delete document.documentElement.dataset.lnExtPieces;
  delete document.documentElement.dataset.lnExtLoading;
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});

describe('packRules', () => {
  it('is empty with Lichess’s own board and pieces', () => {
    expect(packRules({ board: null, pieces: null })).toBe('');
  });

  it('overrides the variables Lichess draws its pieces from', () => {
    const rules = packRules({ board: null, pieces: WOOD });
    // Unquoted, as Lichess slices `url(` and `)` off to decode them.
    expect(rules).toMatch(
      /^:root,body\{---white-king:url\(data:image\/svg\+xml;base64,[\w+/=]+\) !important;/,
    );
    const pairs = [
      ['---white-pawn', WOOD.pieces?.wP],
      ['---white-knight', WOOD.pieces?.wN],
      ['---black-queen', WOOD.pieces?.bQ],
      ['---black-king', WOOD.pieces?.bK],
    ];
    for (const [variable, image] of pairs)
      expect(rules).toContain(`${variable}:url(${image}) !important`);
  });

  it('wins over the values Lichess sets inline on <body> once its menu is used', () => {
    expect(packRules({ board: null, pieces: WOOD })).toMatch(/^:root,body\{/);
  });

  it('reads back as Lichess reads it, to decode each piece before drawing the board', () => {
    const style = document.createElement('style');
    style.textContent = packRules({ board: null, pieces: WOOD });
    document.head.append(style);
    const [rule] = style.sheet?.cssRules ?? [];
    const declared =
      rule instanceof CSSStyleRule ? rule.style.getPropertyValue('---white-pawn') : '';
    style.remove();
    // ui/site/src/asset.ts: `.slice(4, -1) // strip 'url(' + ... + ')'`
    expect(declared.trim().slice(4, -1)).toBe(WOOD.pieces?.wP);
  });

  it('gives the board its image, and the coordinates its colors when it has them', () => {
    expect(packRules({ board: WOOD, pieces: null })).toBe(
      `:root{--ln-ext-board-img:url("${IMAGE}");--ln-ext-sq-light:#eeeeee;--ln-ext-sq-dark:#333333}\n` +
        'html body .is2d coords{---cg-ccw:#eeeeee !important;---cg-ccb:#333333 !important}',
    );
    const colorless = { ...WOOD, board: { image: IMAGE } };
    expect(packRules({ board: colorless, pieces: null })).toBe(
      `:root{--ln-ext-board-img:url("${IMAGE}")}`,
    );
  });
});

describe('showLooks', () => {
  it('puts the rules in our stylesheet and marks a pack’s board on <html>', () => {
    showLooks({ board: null, pieces: null });
    expect(style()).toBeNull();
    showLooks({ board: WOOD, pieces: WOOD });
    expect(document.documentElement.dataset.lnExtBoard).toBe('pack');
    expect(style()?.textContent).toBe(packRules({ board: WOOD, pieces: WOOD }));
    showLooks({ board: null, pieces: null });
    expect(document.documentElement.dataset.lnExtBoard).toBeUndefined();
    expect(style()?.textContent).toBe('');
  });

  it('names a two-tone board flat, its colors on <html>, and another board by its id', () => {
    showLooks({ board: 'tone-ocean', pieces: null });
    expect(document.documentElement.dataset.lnExtBoard).toBe('flat');
    expect(flatColors()).toEqual(['#f7f8f8', '#2f9bea']);
    const saved = saveBoard('Sea', { light: '#ffffff', dark: '#123456' }) ?? '';
    showLooks({ board: saved, pieces: null });
    expect(document.documentElement.dataset.lnExtBoard).toBe('flat');
    expect(flatColors()).toEqual(['#ffffff', '#123456']);
    deleteBoard(saved);
    showLooks({ board: 'accent', pieces: null });
    expect(document.documentElement.dataset.lnExtBoard).toBe('accent');
    expect(flatColors()).toEqual(['', '']);
    showLooks({ board: WOOD, pieces: null });
    expect(flatColors()).toEqual(['', '']);
  });
});

describe('showLooks’s pieces', () => {
  it('names a piece set of ours on <html>, and none for a pack’s, Lichess’s or an unknown one', () => {
    showLooks({ board: null, pieces: 'mochi' });
    expect(named()).toBe('mochi');
    // Drawn by styles/board/piece-sets.css alone: no rule of ours.
    expect(style()).toBeNull();
    showLooks({ board: null, pieces: WOOD });
    expect(named()).toBeUndefined();
    showLooks({ board: null, pieces: 'bitty' });
    showLooks({ board: null, pieces: null });
    expect(named()).toBeUndefined();
    showLooks({ board: null, pieces: 'neo' });
    expect(named()).toBeUndefined();
  });
});

describe('soundFiles', () => {
  it('gives the pack’s sounds as bytes, and none for Lichess’s', () => {
    const files = soundFiles(WOOD);
    expect(Object.keys(files)).toEqual(['capture']);
    expect(files.capture?.map(take => new TextDecoder().decode(take))).toEqual([
      atob(SOUND.split(',')[1] ?? ''),
    ]);
    expect(soundFiles(null)).toEqual({});
  });
});

describe('setLoading', () => {
  it('names what the page hides, and clears it', () => {
    setLoading(['board', 'pieces']);
    expect(document.documentElement.dataset.lnExtLoading).toBe('board pieces');
    setLoading([]);
    expect(document.documentElement.dataset.lnExtLoading).toBeUndefined();
  });
});
