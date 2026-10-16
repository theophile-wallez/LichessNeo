import { describe, expect, it } from 'vitest';
import { Reactions } from './reactions.ts';

describe('Reactions', () => {
  it('picks among a hop, a wave, a laugh, a twirl and a blush, never the same twice running', () => {
    let draw = 0;
    const reactions = new Reactions(() => (draw++ * 0.37) % 1);
    const picked: string[] = [];
    for (let i = 0; i < 40; i++) picked.push(reactions.start(i * 10));
    expect(new Set(picked)).toEqual(new Set(['hop', 'wave', 'laugh', 'twirl', 'shy']));
    const repeats = picked.filter((kind, i) => kind === picked[i - 1]);
    expect(repeats).toEqual([]);
  });

  it('blushes shy, twisting from side to side, then goes back to its mood', () => {
    const reactions = new Reactions();
    reactions.play('shy', 0);
    expect(reactions.mood(0.5, 'neutral')).toBe('shy');
    const twists = [0.3, 0.6, 0.9, 1.2].map(time => reactions.sway(time).twist);
    expect(Math.max(...twists.map(Math.abs))).toBeGreaterThan(0.05);
    expect(reactions.sway(0.6).wiggle).toBe(0);
    expect(reactions.mood(3, 'neutral')).toBe('neutral');
    expect(reactions.sway(3)).toEqual({ wiggle: 0, twist: 0 });
  });

  it('wiggles while tickled, and spins as it hops for joy', () => {
    const reactions = new Reactions();
    reactions.play('tickle', 0);
    const wiggles = [0.2, 0.4, 0.6].map(time => reactions.sway(time).wiggle);
    expect(Math.max(...wiggles.map(Math.abs))).toBeGreaterThan(0.03);
    reactions.play('spinHop', 5);
    expect(reactions.spin(5.45)).toBeGreaterThan(1);
  });
});
