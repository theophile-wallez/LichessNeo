import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  onCoachState,
  onLichessLook,
  onLooksPreview,
  onPageReady,
  onSounds,
  postLichessLook,
  postLooksPreview,
} from './protocol.ts';

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
    receive({ type: 'lr-ext:coach', coach: 2, mood: 'furious', talking: true });
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

  it('passes the extension’s sound set on, and drops a placement it doesn’t know', () => {
    const received: unknown[] = [];
    stops.push(onSounds((_, synth) => received.push(synth)));
    receive({ type: 'lr-ext:sounds', sounds: {} });
    receive({ type: 'lr-ext:sounds', sounds: {}, synth: { place: 'stereo' } });
    receive({ type: 'lr-ext:sounds', sounds: {}, synth: { place: 'surround' } });
    expect(received).toEqual([null, { place: 'stereo' }]);
  });

  it('carries a Lichess look’s pick across, and drops a part it doesn’t know', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const picks: unknown[] = [];
    stops.push(onLichessLook(pick => picks.push(pick)));
    postLichessLook({ part: 'piece', id: 'merida' });
    for (const [data] of post.mock.calls) receive(data);
    receive({ type: 'lr-ext:lichess-look', part: 'clock', id: 'merida' });
    expect(picks).toEqual([{ part: 'piece', id: 'merida' }]);
  });

  it('carries the preview board’s actions across, and drops others', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const actions: unknown[] = [];
    stops.push(onLooksPreview(action => actions.push(action)));
    postLooksPreview('play');
    postLooksPreview('step');
    for (const [data] of post.mock.calls) receive(data);
    receive({ type: 'lr-ext:looks-preview', action: 'pause' });
    expect(actions).toEqual(['play', 'step']);
  });

  it('stops listening once told', () => {
    const ready = vi.fn<() => void>();
    const stop = onPageReady(ready);
    stop();
    receive({ type: 'lr-ext:page-ready' });
    expect(ready).not.toHaveBeenCalled();
  });
});
