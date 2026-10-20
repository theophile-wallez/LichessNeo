import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { createShapeDrawer } from './draw.ts';
import { renderBoard } from './fixtures/board-markup.ts';
import { LegacySchema } from './fixtures/schema.ts';
import { setReviewArrows } from './review-arrows.ts';
// What the original script drew for each frame, in this order.
import legacyJson from './fixtures/legacy.json' with { type: 'json' };

const legacy = LegacySchema.parse(legacyJson);

// The original's markup had line breaks between some tags, which draw nothing.
const tight = (markup: string): string => markup.replaceAll(/>\s+</g, '><');

const marks = (): string => queryOne(document, 'svg.ln-ext-marks', SVGElement)?.innerHTML ?? '';
const layer = (): string => queryOne(document, '#ln-ext-shapes', HTMLElement)?.innerHTML ?? '';
const mateLayer = (): string => queryOne(document, '#ln-ext-mate', HTMLElement)?.innerHTML ?? '';

/** What a new drawer puts in its layer on the board `setUp` draws. */
function drawOn(setUp: () => void): string {
  const draw = createShapeDrawer({ mateLabel: 'Checkmate' });
  setUp();
  draw();
  return layer();
}

const SCHOLAR_MATE = {
  id: 'Ab',
  ply: 7,
  fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  san: 'Qxf7#',
  children: [],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  setReviewArrows([]);
  Reflect.deleteProperty(window, 'site');
  document.documentElement.className = '';
  document.body.replaceChildren();
});

describe('createShapeDrawer', () => {
  it('draws each frame as the original did', () => {
    const draw = createShapeDrawer({ mateLabel: legacy.mateLabel });
    const drawn = [];
    for (const frame of legacy.frames) {
      document.documentElement.className = frame.review ?? '';
      Object.assign(window, { site: frame.node ? { analysis: { node: frame.node } } : undefined });
      setReviewArrows(frame.reviewArrows ?? []);
      renderBoard(frame);
      vi.advanceTimersByTime(10);
      draw();
      if (frame.laterMs !== undefined) {
        vi.advanceTimersByTime(frame.laterMs);
        draw();
      }
      const { className } = document.documentElement;
      drawn.push({ name: frame.name, marks: marks(), layer: layer(), className });
      vi.advanceTimersByTime(100_000);
    }
    expect(drawn).toEqual(
      legacy.frames.map(frame => ({
        name: frame.name,
        marks: frame.marks,
        // The mate is drawn in its own layer now, the crown flying to its mater.
        layer: frame.node?.san?.endsWith('#') ? '' : tight(frame.layer),
        className: frame.htmlClass,
      })),
    );
  });

  it('waits for chessground’s svg', () => {
    const draw = createShapeDrawer({ mateLabel: 'Checkmate' });
    document.body.innerHTML =
      '<main><div class="main-board"><cg-container></cg-container></div></main>';
    draw();
    expect(document.querySelector('#ln-ext-shapes')).toBeNull();
    expect(document.documentElement.classList.contains('ln-ext-shapes')).toBe(false);
  });

  // The original compared the squares, not where they're drawn, and left the
  // badge on the old side after a flip.
  it('moves the checkmate when the board is flipped', () => {
    const draw = createShapeDrawer({ mateLabel: 'Checkmate' });
    Object.assign(window, { site: { analysis: { node: SCHOLAR_MATE } } });
    renderBoard({ orientation: 'white' });
    draw();
    expect(mateLayer()).toContain('--ln-ext-king-column:4;--ln-ext-king-row:0');
    renderBoard({ orientation: 'black' });
    draw();
    expect(mateLayer()).toContain('--ln-ext-king-column:3;--ln-ext-king-row:7');
  });

  it('leaves the checkmate be as arrows come and go, so it doesn’t play again', () => {
    const draw = createShapeDrawer({ mateLabel: 'Checkmate' });
    Object.assign(window, { site: { analysis: { node: SCHOLAR_MATE } } });
    renderBoard({ orientation: 'white' });
    draw();
    const badge = document.querySelector('#ln-ext-mate > .ln-ext-mate');
    expect(badge?.querySelector('.ln-ext-mate__crown')?.getAttribute('style')).toBe(
      '--ln-ext-by-column:5;--ln-ext-by-row:1',
    );
    setReviewArrows([{ orig: 'e2', dest: 'e4', brush: 'best' }]);
    draw();
    expect(layer()).not.toBe('');
    expect(document.querySelector('#ln-ext-mate > .ln-ext-mate')).toBe(badge);
  });

  it('draws a board outside a .cg-wrap as seen from White', () => {
    setReviewArrows([{ orig: 'b1', dest: 'c3', brush: 'best' }]);
    const white = drawOn(() => renderBoard({ orientation: 'white' }));
    const black = drawOn(() => renderBoard({ orientation: 'black' }));
    const unwrapped = drawOn(() => {
      document.body.innerHTML =
        '<main><div class="main-board"><cg-container><svg class="cg-shapes"></svg></cg-container></div></main>';
    });
    expect(white).not.toBe(black);
    expect(unwrapped).toBe(white);
  });

  it('only writes when something changed', () => {
    const draw = createShapeDrawer({ mateLabel: 'Checkmate' });
    renderBoard({ orientation: 'white' });
    setReviewArrows([{ orig: 'e2', dest: 'e4', brush: 'best' }]);
    draw();
    const records: MutationRecord[] = [];
    const observer = new MutationObserver(found => records.push(...found));
    observer.observe(document, { subtree: true, childList: true, attributes: true });
    draw();
    observer.disconnect();
    expect(records.concat(observer.takeRecords())).toEqual([]);
  });
});
