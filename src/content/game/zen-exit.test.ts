import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncZenExit } from './zen-exit.ts';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('zen exit', () => {
  it('gives Lichess’s Zen button the words that leave Zen', () => {
    vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
    document.body.innerHTML = '<main class="round"><a id="zentog" class="text">Zen mode</a></main>';
    syncZenExit();
    const toggle = document.getElementById('zentog');
    expect(toggle?.dataset.lnExtLabel).toBe('[zenExit]');
    expect(toggle?.textContent).toBe('Zen mode');
  });

  it('does nothing where there is no Zen button', () => {
    document.body.innerHTML = '<main class="round"></main>';
    expect(() => syncZenExit()).not.toThrow();
  });
});
