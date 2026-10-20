import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  onCoachPicked,
  onCoachPicker,
  onCoachState,
  onLichessLook,
  onLooksPreview,
  onPageReady,
  onSounds,
  postCoachPicked,
  postCoachPicker,
  postLichessLook,
  postLooksPreview,
} from './protocol.ts';

const stops: (() => void)[] = [];

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.restoreAllMocks();
});

const receive = (data: unknown, source: MessageEventSource | null = window): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
};

describe('protocol', () => {
  it('takes only its own messages, from this window', () => {
    const ready = vi.fn<() => void>();
    stops.push(onPageReady(ready));
    receive({ type: 'ln-ext:page-ready' }, null);
    receive({ type: 'other' });
    expect(ready).not.toHaveBeenCalled();
    receive({ type: 'ln-ext:page-ready' });
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('passes the coach’s state on without its type, and drops one out of shape', () => {
    const states: unknown[] = [];
    stops.push(onCoachState(state => states.push(state)));
    receive({ type: 'ln-ext:coach', coach: 2, mood: 'happy', talking: true });
    receive({ type: 'ln-ext:coach', coach: 2, mood: 'furious', talking: true });
    expect(states).toEqual([{ coach: 2, mood: 'happy', talking: true }]);
  });

  it('refuses sounds that aren’t ours, or aren’t bytes', () => {
    const received: unknown[] = [];
    stops.push(onSounds(sounds => received.push(Object.keys(sounds))));
    const bytes = new ArrayBuffer(4);
    receive({ type: 'ln-ext:sounds', sounds: { capture: [bytes] } });
    receive({ type: 'ln-ext:sounds', sounds: { boom: [bytes] } });
    receive({ type: 'ln-ext:sounds', sounds: { capture: ['bytes'] } });
    expect(received).toEqual([['capture']]);
  });

  it('passes the extension’s sound set on, and drops a placement it doesn’t know', () => {
    const received: unknown[] = [];
    stops.push(onSounds((_, synth) => received.push(synth)));
    receive({ type: 'ln-ext:sounds', sounds: {} });
    receive({ type: 'ln-ext:sounds', sounds: {}, synth: { place: 'stereo' } });
    receive({ type: 'ln-ext:sounds', sounds: {}, synth: { place: 'surround' } });
    expect(received).toEqual([null, { place: 'stereo' }]);
  });

  it('carries a Lichess look’s pick across, and drops a part it doesn’t know', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const picks: unknown[] = [];
    stops.push(onLichessLook(pick => picks.push(pick)));
    postLichessLook({ part: 'piece', id: 'merida' });
    for (const [data] of post.mock.calls) receive(data);
    receive({ type: 'ln-ext:lichess-look', part: 'clock', id: 'merida' });
    expect(picks).toEqual([{ part: 'piece', id: 'merida' }]);
  });

  it('carries the preview board’s actions across, and drops others', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const actions: unknown[] = [];
    stops.push(onLooksPreview(action => actions.push(action)));
    postLooksPreview('play');
    postLooksPreview('step');
    for (const [data] of post.mock.calls) receive(data);
    receive({ type: 'ln-ext:looks-preview', action: 'pause' });
    expect(actions).toEqual(['play', 'step']);
  });

  it('carries the coach picker’s opening and its pick across, each its own way', () => {
    // happy-dom's messages come from its own window object, not the test's: hand them over.
    vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => receive(data));
    const opened: number[] = [];
    const picked: number[] = [];
    stops.push(onCoachPicker(coach => opened.push(coach)));
    stops.push(onCoachPicked(coach => picked.push(coach)));
    postCoachPicker(3);
    postCoachPicked(5);
    expect(opened).toEqual([3]);
    expect(picked).toEqual([5]);
    receive({ type: 'ln-ext:coach-picked', coach: 'fox' });
    expect(picked).toEqual([5]);
  });

  it('stops listening once told', () => {
    const ready = vi.fn<() => void>();
    const stop = onPageReady(ready);
    stop();
    receive({ type: 'ln-ext:page-ready' });
    expect(ready).not.toHaveBeenCalled();
  });
});
