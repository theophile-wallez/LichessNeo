import { afterEach, expect, it, vi } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { mountGraph } from './graph.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  vi.unstubAllGlobals();
});

it('lets a graph the panel drew over go, once it shrinks away', () => {
  const observed = new Set<Element>();
  const notified: ((entries: ResizeObserverEntry[]) => void)[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class FakeObserver {
      constructor(callback: ResizeObserverCallback) {
        notified.push(entries => callback(entries, this));
      }
      observe(target: Element): void {
        observed.add(target);
      }
      unobserve(target: Element): void {
        observed.delete(target);
      }
      disconnect(): void {}
    },
  );
  const { session, facade } = judgedGame('opera');
  const container = document.createElement('div');
  document.body.append(container);
  mountGraph(session, facade, { container, kind: 'summary' });
  expect(observed.has(container)).toBe(true);
  container.remove();
  const gone = {
    target: container,
    contentRect: container.getBoundingClientRect(),
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
  };
  for (const notify of notified) notify([gone]);
  expect(observed.has(container)).toBe(false);
});
