import { describe, expect, it } from 'vitest';
import { isWritten } from './properties.ts';
import { xmlText } from './styles.ts';

describe('a picture of the board’s markup', () => {
  it('escapes text for XML, and drops the control characters XML can’t carry', () => {
    expect(xmlText('a < b & "c"')).toBe('a &lt; b &amp; &quot;c&quot;');
    expect(xmlText('rank\u0000\u0008 8\n')).toBe('rank 8\n');
  });

  it('writes what a still picture shows, each by its physical name', () => {
    expect(isWritten('background-image')).toBe(true);
    expect(isWritten('transform')).toBe(true);
    expect(isWritten('margin-inline-start')).toBe(false);
    expect(isWritten('transition-duration')).toBe(false);
    expect(isWritten('cursor')).toBe(false);
    expect(isWritten('--ln-ext-accent')).toBe(false);
  });
});
