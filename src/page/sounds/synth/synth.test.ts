import { play, playSpec, set } from '@foleyjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Color, Square } from '#shared/chess/types.ts';
import { renderBoard } from '#shared/testing/boards.ts';
import { CHECK, IMPACT, PIECE_SPECS } from './specs.ts';
import { createSynth } from './synth.ts';

// Foley plays through Web Audio, which happy-dom hasn't: what it's asked to play is checked.
vi.mock('@foleyjs/core', () => ({
  play: vi.fn<typeof play>(),
  playSpec: vi.fn<typeof playSpec>(),
  set: vi.fn<typeof set>(),
}));

interface Shown {
  readonly placement: string;
  readonly lastMove: readonly Square[];
  readonly orientation?: Color;
}

const show = ({ placement, lastMove, orientation = 'white' }: Shown): void => {
  renderBoard({ placement, lastMove, orientation });
};

/** The specs played, by the id each was played with. */
const specsPlayed = (): unknown[] =>
  vi.mocked(playSpec).mock.calls.map(([, options]) => options?.id);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the extension’s sound set', () => {
  it('plays Foley’s own cue for what isn’t a move, and nothing at no volume', () => {
    const synth = createSynth('none');
    synth.play('notify', 0.5);
    synth.play('game-start', 0);
    expect(vi.mocked(play).mock.calls).toEqual([['chime', { volume: 0.5 }]]);
  });

  it('plays the piece that moved, higher as it nears the other side, once the board shows it', () => {
    const synth = createSynth('none');
    show({ placement: '4k3/8/8/8/8/5N2/8/4K3', lastMove: ['g1', 'f3'] });
    synth.play('move-self', 0.5);
    expect(playSpec).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    expect(vi.mocked(playSpec).mock.calls).toEqual([
      [PIECE_SPECS.knight, { id: 'knight', pitch: -3, volume: 0.5 }],
    ]);
  });

  it('plays the other side’s moves lower and softer', () => {
    const synth = createSynth('none');
    show({ placement: '4k3/8/5n2/8/8/8/8/4K3', lastMove: ['g8', 'f6'] });
    synth.play('move-opponent', 1);
    vi.advanceTimersToNextFrame();
    expect(vi.mocked(playSpec).mock.calls).toEqual([
      [PIECE_SPECS.knight, { id: 'knight', pitch: -6, volume: 0.7 }],
    ]);
  });

  it('adds a blow to a capture, and a ping just after a check', () => {
    const synth = createSynth('none');
    show({ placement: '4k3/8/8/3R4/8/8/8/4K3', lastMove: ['d1', 'd5'] });
    synth.play('capture', 1);
    vi.advanceTimersToNextFrame();
    show({ placement: '3Rk3/8/8/8/8/8/8/4K3', lastMove: ['d5', 'd8'] });
    synth.play('move-check', 1);
    vi.advanceTimersToNextFrame();
    vi.advanceTimersByTime(20);
    expect(specsPlayed()).toEqual(['rook', 'impact', 'rook']);
    vi.advanceTimersByTime(20);
    expect(specsPlayed()).toEqual(['rook', 'impact', 'rook', 'check']);
    expect(vi.mocked(playSpec).mock.calls.map(([spec]) => spec)).toEqual([
      PIECE_SPECS.rook,
      IMPACT,
      PIECE_SPECS.rook,
      CHECK,
    ]);
  });

  it('castles the king, then the rook a beat later', () => {
    const synth = createSynth('none');
    show({ placement: '4k3/8/8/8/8/8/8/5RK1', lastMove: ['e1', 'g1'] });
    synth.play('castle', 1);
    vi.advanceTimersToNextFrame();
    vi.advanceTimersByTime(60);
    expect(specsPlayed()).toEqual(['king']);
    vi.advanceTimersByTime(30);
    expect(specsPlayed()).toEqual(['king', 'castling-rook']);
  });

  it('jumps a knight: a lift of air, then its landing', () => {
    const synth = createSynth('none');
    show({ placement: '4k3/8/8/8/8/5N2/8/4K3', lastMove: ['g1', 'f3'] });
    synth.play('move-self', 1);
    vi.advanceTimersToNextFrame();
    const [lift, ...landing] = vi.mocked(playSpec).mock.calls[0]?.[0] ?? [];
    expect(lift?.at).toBe(0);
    const rising = (layer: typeof lift): boolean =>
      layer?.kind === 'noise' && (layer.f2 ?? 0) > layer.f;
    expect(rising(lift)).toBe(true);
    expect(landing.length).toBeGreaterThan(0);
    for (const layer of landing) expect(layer.at).toBeGreaterThanOrEqual(lift?.d ?? Infinity);
  });

  it('slides a bishop in from where it left, its swoosh going forward, its whoosh back, and nothing more', () => {
    const synth = createSynth('stereo');
    show({ placement: '4k3/8/8/8/2B5/8/8/4K3', lastMove: ['f1', 'c4'] });
    synth.play('move-self', 1);
    vi.advanceTimersToNextFrame();
    show({ placement: '4k3/8/8/8/8/8/8/4KB2', lastMove: ['c4', 'f1'] });
    synth.play('move-self', 1);
    vi.advanceTimersToNextFrame();
    const slides = vi.mocked(play).mock.calls;
    expect(slides.map(([name]) => name)).toEqual(['swoosh', 'whoosh']);
    // The slide is all a bishop makes.
    expect(playSpec).not.toHaveBeenCalled();
    // From f1, on the right, for the first; from c4, on the left, for the second.
    expect(slides[0]?.[1]?.pan).toBeGreaterThan(0);
    expect(slides[1]?.[1]?.pan).toBeLessThan(0);
  });

  it('makes the whole set louder in space, where distance takes some level off', () => {
    const synth = createSynth('space');
    synth.setPlace('stereo');
    expect(vi.mocked(set).mock.calls).toEqual([[{ volume: 1 }], [{ volume: 0.8 }]]);
  });
});
