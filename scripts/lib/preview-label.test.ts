import { describe, expect, it } from 'vitest';
import { previewName, previewUrl } from './preview-label.ts';

const draft = { worktree: '/w/a', branch: 't3/a', mainCheckout: '/w/main' };
const mainHere = { worktree: '/w/main', branch: 'main', mainCheckout: '/w/main' };

describe('previewName', () => {
  it("takes the name given, and main's for the main checkout only", () => {
    expect(previewName('  Eval bar ', draft)).toBe('Eval bar');
    expect(previewName(undefined, draft)).toBeNull();
    expect(previewName('   ', draft)).toBeNull();
    expect(previewName(undefined, mainHere)).toBe('main');
    expect(previewName('Hotfix', mainHere)).toBe('Hotfix');
  });
});

describe('previewUrl', () => {
  it('makes a full lichess.org address of a path or a URL', () => {
    expect(previewUrl('/analysis#3')).toBe('https://lichess.org/analysis#3');
    expect(previewUrl(' https://lichess.org/training/abc?x=1 ')).toBe(
      'https://lichess.org/training/abc?x=1',
    );
  });

  it('refuses a page off lichess.org', () => {
    expect(() => previewUrl('https://example.com/analysis')).toThrow('lichess.org');
    expect(() => previewUrl('//example.com/')).toThrow('lichess.org');
    expect(() => previewUrl('http://lichess.org/')).toThrow('lichess.org');
    expect(() => previewUrl('javascript:alert(1)')).toThrow('lichess.org');
  });
});
