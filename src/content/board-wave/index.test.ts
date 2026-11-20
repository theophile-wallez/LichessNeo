import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playEndWave } from './index.ts';
import { PALETTES } from './wave/color.ts';

// The settings' end animation.
const settings = vi.hoisted(() => ({ endAnimation: 'wave', endWinColor: 'rainbow' }));

vi.mock('#content/settings/settings.ts', () => ({
  currentSettings: () => settings,
  onSettings: () => {},
}));

const playWave = vi.hoisted(() =>
  vi.fn<(findBoard: unknown, plan: unknown) => Promise<void>>(() => Promise.resolve()),
);

vi.mock('./load.ts', () => ({
  loadWave: () => Promise.resolve(playWave),
  warmWave: () => Promise.resolve(),
}));

// The game page as Lichess serves it, seen from Black.
const ROUND =
  '<main class="round"><div class="round__app">' +
  '<div class="round__app__board main-board"><div class="cg-wrap orientation-black">' +
  '<cg-container><cg-board><piece class="white king"></piece></cg-board></cg-container></div></div>' +
  '</div></main>';

beforeEach(() => {
  document.body.innerHTML = ROUND;
});

afterEach(() => {
  settings.endAnimation = 'wave';
  playWave.mockClear();
  document.body.innerHTML = '';
});

const plans = (): unknown[] => playWave.mock.calls.map(([, plan]) => plan);

describe('the end’s wave', () => {
  it('rings out of the square the page world names, in the result’s colour, as the board is turned', async () => {
    await playEndWave({ result: 'win', square: 'g8' });
    // g8 is the second column of the bottom row, seen from Black.
    expect(plans()).toEqual([
      expect.objectContaining({
        type: 'center',
        palette: PALETTES.colorful,
        source: { x: 1 / 8, y: 7 / 8, width: 1 / 8, height: 1 / 8 },
      }),
    ]);
  });

  it('plays none when the settings pick another animation, or without a board', async () => {
    settings.endAnimation = 'confetti';
    await playEndWave({ result: 'win', square: 'g8' });
    settings.endAnimation = 'wave';
    document.body.innerHTML = '';
    await playEndWave({ result: 'win', square: 'g8' });
    expect(playWave).not.toHaveBeenCalled();
  });
});
