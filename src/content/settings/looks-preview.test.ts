import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { buildLooksPreview } from './looks-preview.ts';

// The card's markup names its messages as its module loads.
vi.hoisted(() => vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } }));

const actions = (): unknown[] =>
  vi.mocked(window.postMessage).mock.calls.map(([message]): unknown => message);
const preview = (action: string): unknown => ({ type: 'ln-ext:looks-preview', action });

const pageReady = (): void => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'ln-ext:page-ready' }, source: window }),
  );
};

beforeEach(() => {
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  return trackListeners(window);
});

describe('the Board & sounds page’s preview', () => {
  it('asks the page world to draw it, play its game, or play a move', () => {
    const { element, show, step } = buildLooksPreview();
    show();
    queryOne(element, '.ln-ext-looks-preview__play', HTMLElement)?.click();
    step();
    expect(actions()).toEqual([preview('draw'), preview('play'), preview('step')]);
  });

  it('is drawn once the page script starts, if it’s on the page', () => {
    const { element } = buildLooksPreview();
    pageReady();
    expect(actions()).toEqual([]);
    document.body.append(element);
    pageReady();
    expect(actions()).toEqual([preview('draw')]);
    element.remove();
  });
});
