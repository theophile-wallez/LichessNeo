import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { engineSettings } from './engine-settings.ts';

const ticks = vi.hoisted((): Array<() => void> => []);

vi.mock('#content/sync-loop.ts', () => ({
  onEveryTick: (_name: string, run: () => void) => ticks.push(run),
}));

const tick = (): void => {
  for (const run of ticks) run();
};

beforeAll(() => engineSettings.start());

afterEach(() => {
  document.body.innerHTML = '';
});

// Lichess's settings, as the cog opens them (ui/lib/src/ceval/view/settings.ts).
const SETTINGS =
  '<main class="analyse"><div class="ceval"><button class="settings-gear"></button></div>' +
  '<div id="ceval-settings-anchor"><div id="ceval-settings">' +
  '<div class="setting"><label for="analyse-multipv">Lines</label>' +
  '<input id="analyse-multipv" type="range" min="0" max="5" step="1" value="2">' +
  '<div class="range_value">2 / 5</div></div></div></div></main>';

const fill = (input: HTMLInputElement | null): string =>
  input?.style.getPropertyValue('--ln-ext-slider-fill') ?? '';

describe('the engine settings', () => {
  it('fill each slider up to its value once they open', () => {
    document.body.innerHTML = SETTINGS;
    tick();
    expect(fill(queryOne(document, '#analyse-multipv', HTMLInputElement))).toBe('40%');
  });

  it('follow a slider as it moves', () => {
    document.body.innerHTML = SETTINGS;
    const input = queryOne(document, '#analyse-multipv', HTMLInputElement);
    if (!input) throw new Error('no slider');
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fill(input)).toBe('100%');
  });

  it('leave the other sliders alone', () => {
    document.body.innerHTML = '<input id="volume" type="range" value="30">';
    const input = queryOne(document, '#volume', HTMLInputElement);
    tick();
    input?.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fill(input)).toBe('');
  });
});
