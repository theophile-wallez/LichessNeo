import { afterEach, describe, expect, it, vi } from 'vitest';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { queryAll } from '#shared/dom.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import { inChesscomRatings } from './chesscom.ts';
import { ratingChart } from './index.ts';
import type { Series } from './series.ts';

type Listener = (value: { chesscomRating: boolean }) => void;

const settings = vi.hoisted(() => {
  const listeners: Listener[] = [];
  return { chesscomRating: false, listeners };
});

vi.mock('#content/settings/settings.ts', () => ({
  currentSettings: () => settings,
  settingsRead: () => true,
  onSettings: (listener: Listener) => settings.listeners.push(listener),
}));

function switchChesscom(on: boolean): void {
  settings.chesscomRating = on;
  for (const listener of settings.listeners) listener(settings);
}

afterEach(() => {
  settings.chesscomRating = false;
  settings.listeners.splice(0);
  document.body.replaceChildren();
});

// The rating history's series in Lichess's order: Blitz is the third, Chess960 the eighth.
const series = (index: number, ratings: readonly number[]): Series => ({
  index,
  name: `series ${index}`,
  color: '#fff',
  points: ratings.map((rating, i) => [Date.UTC(2025, 0, i + 1), rating]),
});

const equivalent = (speed: string, rating: number): number | undefined =>
  chesscomRating(speed, rating)?.rating;

const labels = (): string[] =>
  queryAll(document, '.ln-ext-rchart__ylabel', SVGElement).map(label => label.textContent);

describe('the rating chart as on Chess.com', () => {
  it('draws the speeds Chess.com has a pool for in their equivalents, the others as they are', () => {
    const [blitz, chess960, puzzles] = inChesscomRatings([
      series(2, [1500, 1800]),
      series(7, [1500]),
      series(14, [2000]),
    ]);
    expect(blitz?.points.map(([, rating]) => rating)).toEqual([
      equivalent('blitz', 1500),
      equivalent('blitz', 1800),
    ]);
    expect(chess960?.points).toEqual([[Date.UTC(2025, 0, 1), 1500]]);
    expect(puzzles?.points).toEqual([[Date.UTC(2025, 0, 1), 2000]]);
  });

  it('draws itself again as the switch flips, in this tab or another', () => {
    const { resize } = fakeLayout((element, metric) =>
      metric === 'clientWidth' && element.matches('.ln-ext-rchart__plot') ? 640 : 0,
    );
    const history = {
      data: [
        { name: 'Bullet', points: [] },
        { name: 'UltraBullet', points: [] },
        {
          name: 'Blitz',
          points: [
            [2025, 0, 1, 1500],
            [2025, 5, 1, 2300],
          ],
        },
      ],
    };
    document.body.innerHTML =
      '<div class="rating-history-container"><div class="rating-history-container"><canvas></canvas></div></div>' +
      `<script id="page-init-data" type="application/json">${JSON.stringify(history)}</script>`;
    ratingChart.start();
    resize();
    const lichess = labels();
    expect(lichess.length).toBeGreaterThan(0);
    switchChesscom(true);
    expect(labels()).not.toEqual(lichess);
    switchChesscom(false);
    expect(labels()).toEqual(lichess);
  });
});
