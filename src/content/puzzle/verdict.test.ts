import { afterEach, describe, expect, it } from 'vitest';
import { readVerdict } from './verdict.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

const session = (chips: string): void => {
  document.body.innerHTML = `<main class="puzzle"><div class="puzzle__session">${chips}</div></main>`;
};

describe('readVerdict', () => {
  it("reads the current puzzle's chip, not the others'", () => {
    session('<a class="result-false"></a><a class="result-true current"></a>');
    expect(readVerdict(document)).toBe('solved');
    session('<a class="result-true"></a><a class="result-false current result-empty"></a>');
    expect(readVerdict(document)).toBe('failed');
  });

  it('gives nothing while the current chip has no result, or without a session', () => {
    session('<a class="result-true"></a><a class="current"></a>');
    expect(readVerdict(document)).toBeNull();
    document.body.innerHTML = '<main class="puzzle"></main>';
    expect(readVerdict(document)).toBeNull();
  });
});
