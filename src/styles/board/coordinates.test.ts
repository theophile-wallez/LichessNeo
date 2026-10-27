import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's "outside" coordinates (site.css, from 799.3px or in landscape): past the board's
// right and bottom edges, where a board as wide as a tablet's screen left them off it.
const LICHESS_RULES =
  '@media (min-width: 799.3px), (orientation: landscape) {' +
  '.coords-out coords.ranks { width: 12px; top: 0; right: -15px; }' +
  '.coords-out coords.ranks coord { transform: translateY(42%); }' +
  '.coords-out coords.files { text-align: center; bottom: -15px; left: 0; }' +
  '.coords-out .main-board { margin-bottom: 12px; } }';

// happy-dom drops a selector whose `:is()` runs over several lines.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

interface Board {
  readonly ranks: CSSStyleDeclaration;
  readonly files: CSSStyleDeclaration;
  readonly mainBoard: CSSStyleDeclaration;
}

/** A board under Lichess's `coords` class, in a window `width` wide. */
function render(coords: 'coords-in' | 'coords-out', width: number): Board {
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULES + oneLine(readFileSync(join(import.meta.dirname, 'coordinates.css'), 'utf8'));
  document.head.append(style);
  document.body.className = coords;
  document.body.innerHTML =
    '<div class="main-board"><div class="cg-wrap is2d"><cg-container>' +
    '<coords class="ranks"><coord>1</coord></coords>' +
    '<coords class="files"><coord>a</coord></coords></cg-container></div></div>';
  const ranks = queryOne(document, 'coords.ranks', HTMLElement);
  const files = queryOne(document, 'coords.files', HTMLElement);
  const mainBoard = queryOne(document, '.main-board', HTMLElement);
  if (!ranks || !files || !mainBoard) throw new Error('no board');
  return {
    ranks: getComputedStyle(ranks),
    files: getComputedStyle(files),
    mainBoard: getComputedStyle(mainBoard),
  };
}

/** Where the ranks and files stand on a tablet's board, read before the next render. */
function placement(coords: 'coords-in' | 'coords-out'): string[] {
  const { ranks, files } = render(coords, 820);
  return [ranks.left, ranks.width, ranks.top, files.bottom, files.left];
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
  delete document.documentElement.dataset.lnExtPrefs;
});

describe('the board’s coordinates', () => {
  it.each([768, 820, 1019, 390])('are drawn inside an "outside" board %ipx wide', width => {
    const { ranks, files, mainBoard } = render('coords-out', width);
    expect(ranks.left).toBe('0px');
    expect(ranks.right).toBe('auto');
    expect(files.bottom).toBe('0px');
    expect(mainBoard.marginBottom).toBe('0px');
  });

  it('are drawn alike under both classes below 1020px', () => {
    expect(placement('coords-out')).toEqual(placement('coords-in'));
  });

  it('stay outside on a desktop', () => {
    const { ranks, files } = render('coords-out', 1280);
    expect(ranks.left).toMatch(/^calc\(-/);
    expect(files.top).toBe('calc(100% + 6px)');
  });

  // The user's pick, which only the body the server sent says (content/layout/lichess-prefs.ts).
  it.each(['coords-in', 'coords-out'] as const)(
    'are drawn inside on a desktop when the user picked inside, under %s',
    coords => {
      document.documentElement.dataset.lnExtPrefs = 'coords-in';
      const { ranks, files } = render(coords, 1280);
      expect(ranks.left).toBe('0px');
      expect(files.bottom).toBe('0px');
      expect(files.top).not.toBe('calc(100% + 6px)');
    },
  );
});
