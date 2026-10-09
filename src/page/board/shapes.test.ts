import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { renderBoard } from './fixtures/board-markup.ts';
import { shapes } from './index.ts';
import { setReviewArrows } from './review-arrows.ts';
import labels from './fixtures/legacy-label.json' with { type: 'json' };

const layer = (): HTMLElement | null => queryOne(document, '#lr-ext-shapes', HTMLElement);
async function nextFrame(): Promise<void> {
  await vi.advanceTimersByTimeAsync(20);
}

// A draw that writes is a change the observer sees too, so it asks for one more
// frame. Wait for both, so the next draw a test sees is one it caused.
async function untilDrawn(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

// Fool's mate: White's king is mated on e1.
const FOOLS_MATE = {
  id: 'Cd',
  ply: 4,
  fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  san: 'Qh4#',
  children: [],
};

// A new node each time: the checkmate's clock restarts on a node it hasn't seen.
function showMate(): void {
  Object.assign(window, { site: { analysis: { node: { ...FOOLS_MATE } } } });
}

// Started once, as on a page. Each test then draws its own board.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'] });
  // The label is picked in the page's language when the script starts.
  document.documentElement.lang = 'fr';
  shapes.start();
  document.documentElement.lang = '';
});

afterEach(() => {
  setReviewArrows([]);
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

afterAll(() => {
  vi.useRealTimers();
});

describe('shapes', () => {
  it('draws on the next frame once a board appears', async () => {
    renderBoard({ orientation: 'white', shapes: [] });
    expect(layer()).toBeNull();
    await nextFrame();
    expect(layer()?.parentElement?.tagName).toBe('CG-CONTAINER');
    expect(document.querySelector('cg-container > svg.lr-ext-marks')).not.toBeNull();
  });

  it('draws the review’s arrows as soon as they change', async () => {
    renderBoard({ orientation: 'white', shapes: [] });
    await untilDrawn();
    setReviewArrows([{ orig: 'e2', dest: 'e4', brush: 'best' }]);
    expect(layer()?.innerHTML).toBe('');
    await untilDrawn();
    expect(layer()?.querySelectorAll('polygon')).toHaveLength(1);
    setReviewArrows([]);
    await untilDrawn();
    expect(layer()?.innerHTML).toBe('');
  });

  it('draws again when the board turns round', async () => {
    showMate();
    renderBoard({ orientation: 'white', shapes: [] });
    await untilDrawn();
    expect(layer()?.innerHTML).toContain('left:62.5%;top:87.5%');
    document.querySelector('.cg-wrap')?.classList.replace('orientation-white', 'orientation-black');
    await untilDrawn();
    expect(layer()?.innerHTML).toContain('left:50%;top:0%');
  });

  it('brings the checkmate label in, in the page’s language, after a moment', async () => {
    showMate();
    renderBoard({ orientation: 'white', shapes: [] });
    await untilDrawn();
    expect(layer()?.querySelector('.lr-ext-mate__badge')).not.toBeNull();
    expect(layer()?.querySelector('.lr-ext-mate__label')).toBeNull();
    // The label is due 2.5 s after the mate was first drawn, and drawn on the next frame.
    await vi.advanceTimersByTimeAsync(2500);
    await nextFrame();
    expect(layer()?.querySelector('.lr-ext-mate__label')?.textContent).toBe(labels.fr);
  });
});
