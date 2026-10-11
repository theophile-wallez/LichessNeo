import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { labels } from './labels.ts';

const { dataset } = document.documentElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  setReadyState('complete');
  Reflect.deleteProperty(window, 'i18n');
  delete dataset.lrExtFlipLabel;
  delete dataset.lrExtToolsLabel;
  delete dataset.lrExtPointsLabel;
  document.body.replaceChildren();
});

describe('labels', () => {
  it('copies Lichess’s labels onto <html>', () => {
    Object.assign(window, {
      i18n: { site: { flipBoard: 'Tourner l’échiquier', tools: 'Outils' } },
    });
    labels.start();
    expect(dataset.lrExtFlipLabel).toBe('Tourner l’échiquier');
    expect(dataset.lrExtToolsLabel).toBe('Outils');
  });

  it('leaves out a label Lichess doesn’t have', () => {
    Object.assign(window, { i18n: { site: { tools: 'Werkzeuge' } } });
    labels.start();
    expect(dataset.lrExtToolsLabel).toBe('Werkzeuge');
    expect(dataset.lrExtFlipLabel).toBeUndefined();
  });

  it('waits for the translations while the page parses', () => {
    setReadyState('loading');
    labels.start();
    vi.advanceTimersByTime(500);
    expect(dataset.lrExtFlipLabel).toBeUndefined();
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(250);
    expect(dataset.lrExtFlipLabel).toBe('Flip board');
  });

  it.each([
    ['a game', '<main class="round"></main>'],
    ['an analysis', '<main class="analyse"></main>'],
  ])('keeps waiting on %s page, for 30 seconds', (_name, markup) => {
    document.body.innerHTML = markup;
    labels.start();
    vi.advanceTimersByTime(29_000);
    Object.assign(window, { i18n: { site: { tools: 'Tools' } } });
    vi.advanceTimersByTime(250);
    expect(dataset.lrExtToolsLabel).toBe('Tools');
  });

  it('keeps waiting on a tournament page, for the podium’s scores', () => {
    document.body.innerHTML = '<main class="tour"></main>';
    labels.start();
    vi.advanceTimersByTime(1000);
    Object.assign(window, { i18n: { site: { points: 'Punkte' } } });
    vi.advanceTimersByTime(250);
    expect(dataset.lrExtPointsLabel).toBe('Punkte');
  });

  it('gives up after 30 seconds', () => {
    document.body.innerHTML = '<main class="round"></main>';
    labels.start();
    vi.advanceTimersByTime(30_000);
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(1000);
    expect(dataset.lrExtFlipLabel).toBeUndefined();
  });

  it('gives up at once on a parsed page with no game', () => {
    labels.start();
    Object.assign(window, { i18n: { site: { flipBoard: 'Flip board' } } });
    vi.advanceTimersByTime(1000);
    expect(dataset.lrExtFlipLabel).toBeUndefined();
  });
});
