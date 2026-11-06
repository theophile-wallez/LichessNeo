import { describe, expect, it } from 'vitest';
import { drawsTopic, HiddenDrawingsSchema } from './coach-drawings.ts';

describe('the coach’s drawings', () => {
  it('draws a kind while the drawings are on and it isn’t hidden', () => {
    expect(drawsTopic({ board: true, hidden: ['pins'] }, 'forks')).toBe(true);
    expect(drawsTopic({ board: true, hidden: ['pins'] }, 'pins')).toBe(false);
    expect(drawsTopic({ board: false, hidden: [] }, 'forks')).toBe(false);
  });

  it('reads a kind it doesn’t know as hiding none, rather than all', () => {
    expect(HiddenDrawingsSchema.parse(['pins', 'mates'])).toEqual(['pins', 'mates']);
    expect(HiddenDrawingsSchema.parse(['pins', 'sparkles'])).toEqual([]);
    expect(HiddenDrawingsSchema.parse(undefined)).toEqual([]);
  });
});
