import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildRoundnessRow } from './roundness-row.ts';

const root = document.documentElement;

function row(): { slider: HTMLInputElement; value: HTMLElement; reset: HTMLButtonElement } {
  const card = buildRoundnessRow();
  document.body.append(card);
  const slider = queryOne(card, '.ln-ext-roundness input[type="range"]', HTMLInputElement);
  const value = queryOne(card, '.ln-ext-roundness output', HTMLElement);
  const reset = queryOne(card, '.ln-ext-roundness button', HTMLButtonElement);
  if (!slider || !value || !reset) throw new Error('no slider');
  return { slider, value, reset };
}

const roundness = (): string => root.style.getPropertyValue('---ui-roundness');

const posted = (): unknown[] =>
  vi.mocked(window.postMessage).mock.calls.map(([data]): unknown => data);

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string): string => name } });
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  root.removeAttribute('style');
  document.body.replaceChildren();
});

describe('the settings’ Roundness', () => {
  it('shows the page’s, in Lichess’s range', () => {
    root.style.setProperty('---ui-roundness', '4px');
    const { slider, value, reset } = row();
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['0', '15', '1', '4']);
    expect([value.textContent, reset.disabled]).toEqual(['4px', false]);
  });

  it('sets the page’s as it’s dragged, and asks the page world to keep it', () => {
    const { slider, value, reset } = row();
    expect([slider.value, reset.disabled]).toEqual(['8', true]);
    slider.value = '12';
    slider.dispatchEvent(new Event('input'));
    expect([roundness(), value.textContent]).toEqual(['12px', '12px']);
    reset.click();
    expect(roundness()).toBe('8px');
    expect(posted()).toEqual([
      { type: 'ln-ext:roundness', radius: 12 },
      { type: 'ln-ext:roundness', radius: 8 },
    ]);
  });

  it('follows Lichess’s own slider, without setting it again', async () => {
    const { slider, value } = row();
    root.style.setProperty('---ui-roundness', '2px');
    await flush();
    expect([slider.value, value.textContent]).toEqual(['2', '2px']);
    expect(posted()).toEqual([]);
  });
});
