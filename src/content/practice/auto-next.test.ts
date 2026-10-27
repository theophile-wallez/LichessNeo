import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { practiceAutoNext } from './auto-next.ts';

const TICK_MS = 250;

beforeAll(() => {
  vi.useFakeTimers();
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  practiceAutoNext.start();
  startSyncLoop();
});

afterAll(() => {
  vi.useRealTimers();
});

describe('a drill’s “Load next exercise immediately”', () => {
  it('gets the line saying what it does, for the stylesheet to show', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="analyse__underboard"><label class="cmn-toggle-wrap">' +
      '<span class="cmn-toggle" role="button"><input id="cmn-tg-autoNext" type="checkbox">' +
      '<label for="cmn-tg-autoNext"></label></span>Load next exercise immediately</label>' +
      '</div></main>';
    vi.advanceTimersByTime(TICK_MS);
    const toggle = queryOne(document, '.cmn-toggle-wrap', HTMLLabelElement);
    expect(toggle?.dataset.lnExtHint).toBe('practiceAutoNextHint');
  });
});
