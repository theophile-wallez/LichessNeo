import { describe, expect, it } from 'vitest';
import { reasonTopic } from './drawing-topic.ts';

describe('reasonTopic', () => {
  it('files a reason’s drawing under its kind, a plan when it has none of its own', () => {
    expect(reasonTopic({ kind: 'keySquare' })).toBe('endings');
    expect(reasonTopic({ kind: 'checks' })).toBe('checks');
    expect(reasonTopic({ kind: 'seventhRank' })).toBe('plans');
    expect(reasonTopic(null)).toBe('plans');
  });

  it('files two reasons under the first’s', () => {
    const both = {
      kind: 'both',
      first: { kind: 'keySquare' },
      second: { kind: 'seventhRank' },
    } as const;
    expect(reasonTopic(both)).toBe('endings');
  });
});
