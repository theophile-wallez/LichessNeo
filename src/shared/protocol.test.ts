import { afterEach, describe, expect, it, vi } from 'vitest';
import { onCoachState, onPageReady, onSounds } from './protocol.ts';

const stops: (() => void)[] = [];

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});

const receive = (data: unknown, source: MessageEventSource | null = window): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
};

describe('protocol', () => {
  it('takes only its own messages, from this window', () => {
    const ready = vi.fn<() => void>();
    stops.push(onPageReady(ready));
    receive({ type: 'lr-ext:page-ready' }, null);
    receive({ type: 'other' });
    expect(ready).not.toHaveBeenCalled();
    receive({ type: 'lr-ext:page-ready' });
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('passes the coach’s state on without its type, and drops one out of shape', () => {
    const states: unknown[] = [];
    stops.push(onCoachState(state => states.push(state)));
    receive({ type: 'lr-ext:coach', coach: 2, mood: 'happy', talking: true });
    receive({ type: 'lr-ext:coach', coach: 2, mood: 'angry', talking: true });
    expect(states).toEqual([{ coach: 2, mood: 'happy', talking: true }]);
  });

  it('refuses sounds that aren’t ours, or aren’t bytes', () => {
    const received: unknown[] = [];
    stops.push(onSounds(sounds => received.push(Object.keys(sounds))));
    const bytes = new ArrayBuffer(4);
    receive({ type: 'lr-ext:sounds', sounds: { capture: bytes } });
    receive({ type: 'lr-ext:sounds', sounds: { boom: bytes } });
    receive({ type: 'lr-ext:sounds', sounds: { capture: 'bytes' } });
    expect(received).toEqual([['capture']]);
  });

  it('stops listening once told', () => {
    const ready = vi.fn<() => void>();
    const stop = onPageReady(ready);
    stop();
    receive({ type: 'lr-ext:page-ready' });
    expect(ready).not.toHaveBeenCalled();
  });
});
