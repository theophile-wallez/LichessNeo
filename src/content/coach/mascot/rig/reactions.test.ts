import { describe, expect, it } from 'vitest';
import { REACTION_KINDS, Reactions } from './reactions.ts';

describe('Reactions', () => {
  it('picks among every reaction but the entrance’s hello, never the same twice running', () => {
    let draw = 0;
    const reactions = new Reactions(() => (draw++ * 0.37) % 1);
    const picked: string[] = [];
    for (let i = 0; i < 60; i++) picked.push(reactions.start(i * 10));
    expect(new Set(picked)).toEqual(new Set(REACTION_KINDS.filter(kind => kind !== 'hello')));
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

  it('starts no turn while one turns', () => {
    for (const turn of ['twirl', 'spinHop'] as const)
      for (const random of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
        const reactions = new Reactions(() => random);
        reactions.play(turn, 0);
        expect(['twirl', 'spinHop']).not.toContain(reactions.start(0.3));
      }
  });
});
