import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupWarmup } from './index.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
  vi.useRealTimers();
});

function fakeSite(): ReturnType<typeof vi.fn<(location: { readonly key: string }) => void>> {
  const loadCss = vi.fn<(location: { readonly key: string }) => void>();
  Object.assign(window, {
    site: { asset: { loadCss, jsModule: (name: string) => name, url: (path: string) => path } },
  });
  return loadCss;
}

describe('the game setup’s warm-up', () => {
  it('loads the setup dialog’s stylesheets on the home once idle', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main class="lobby"></main>';
    const loadCss = fakeSite();
    setupWarmup.start();
    vi.advanceTimersByTime(3000);
    expect(loadCss.mock.calls).toEqual([[{ key: 'bits.dialog' }], [{ key: 'lobby.setup' }]]);
  });

  it('waits for `site.asset`, and loads each sheet once', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main class="lobby"></main>';
    setupWarmup.start();
    vi.advanceTimersByTime(3000);
    const loadCss = fakeSite();
    vi.advanceTimersByTime(1000);
    expect(loadCss).toHaveBeenCalledTimes(2);
  });

  it('loads nothing off the home', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main class="analyse"></main>';
    const loadCss = fakeSite();
    setupWarmup.start();
    vi.advanceTimersByTime(3000);
    expect(loadCss).not.toHaveBeenCalled();
  });
});
