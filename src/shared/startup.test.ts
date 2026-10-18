import { afterEach, describe, expect, it, vi } from 'vitest';
import { startFeatures } from './features.ts';
import { oncePerFrame } from './frame.ts';
import { readPageInitData } from './page-init-data.ts';
import { setReadyState } from './testing/ready-state.ts';

afterEach(() => {
  vi.useRealTimers();
  setReadyState('complete');
  document.body.replaceChildren();
});

describe('startFeatures', () => {
  it('starts each in order, and one that throws doesn’t stop the others', () => {
    const started: string[] = [];
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    startFeatures([
      { name: 'first', start: () => started.push('first') },
      {
        name: 'broken',
        start: () => {
          throw new Error('no');
        },
      },
      { name: 'last', start: () => started.push('last') },
    ]);
    expect(started).toEqual(['first', 'last']);
    expect(error).toHaveBeenCalledWith('[LichessNeo] broken failed to start', expect.any(Error));
  });
});

describe('oncePerFrame', () => {
  it('runs the task once on the next frame, however often it was asked', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    const task = vi.fn<() => void>();
    const queue = oncePerFrame(task);
    queue();
    queue();
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    expect(task).toHaveBeenCalledTimes(1);
    queue();
    vi.advanceTimersToNextFrame();
    expect(task).toHaveBeenCalledTimes(2);
  });
});

function addInitData(text: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.id = 'page-init-data';
  script.textContent = text;
  document.body.append(script);
  return script;
}

describe('readPageInitData', () => {
  it('reads what is in the document on a parsed page', () => {
    addInitData('{"a":1}');
    const read = vi.fn<(text: string | null) => void>();
    readPageInitData(read);
    expect(read).toHaveBeenCalledExactlyOnceWith('{"a":1}');
  });

  it('keeps the node while the page parses, for every reader, at DOMContentLoaded', async () => {
    setReadyState('loading');
    const first = vi.fn<(text: string | null) => void>();
    const second = vi.fn<(text: string | null) => void>();
    readPageInitData(first);
    const script = addInitData('{"b":2}');
    readPageInitData(second);
    await Promise.resolve();
    // Lichess takes it out once its module has read it.
    script.remove();
    expect(first).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(first).toHaveBeenCalledExactlyOnceWith('{"b":2}');
    expect(second).toHaveBeenCalledExactlyOnceWith('{"b":2}');
  });

  it('still hands the data to the other readers when one of them throws', async () => {
    setReadyState('loading');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = vi.fn<(text: string | null) => void>(() => {
      throw new Error('no');
    });
    const next = vi.fn<(text: string | null) => void>();
    readPageInitData(broken);
    readPageInitData(next);
    addInitData('{"c":3}');
    await Promise.resolve();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(broken).toHaveBeenCalledExactlyOnceWith('{"c":3}');
    expect(next).toHaveBeenCalledExactlyOnceWith('{"c":3}');
    expect(error).toHaveBeenCalledExactlyOnceWith(
      '[LichessNeo] page init data reader failed',
      expect.any(Error),
    );
  });

  it('hands null over when the page has none', () => {
    const read = vi.fn<(text: string | null) => void>();
    readPageInitData(read);
    expect(read).toHaveBeenCalledExactlyOnceWith(null);
  });
});
