import { describe, expect, it } from 'vitest';
import { previewLink, previewName } from './preview-label.ts';

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

describe('previewLink', () => {
  it('makes a full lichess.org address of a path or a URL, labeled by its path', () => {
    expect(previewLink('/analysis#3')).toEqual({
      label: '/analysis#3',
      href: 'https://lichess.org/analysis#3',
    });
    expect(previewLink(' https://lichess.org/training/abc?x=1 ')).toEqual({
      label: '/training/abc?x=1',
      href: 'https://lichess.org/training/abc?x=1',
    });
  });

  it('takes the label given before the page', () => {
    expect(previewLink('Plateau retourné = /analysis?a=b')).toEqual({
      label: 'Plateau retourné',
      href: 'https://lichess.org/analysis?a=b',
    });
  });

  it("leaves a page's query whole", () => {
    expect(previewLink('/analysis?a=/b').href).toBe('https://lichess.org/analysis?a=/b');
    expect(previewLink('https://lichess.org/?x=/y').href).toBe('https://lichess.org/?x=/y');
  });

  it('refuses a page off lichess.org', () => {
    expect(() => previewLink('https://example.com/analysis')).toThrow('lichess.org');
    expect(() => previewLink('//example.com/')).toThrow('lichess.org');
    expect(() => previewLink('http://lichess.org/')).toThrow('lichess.org');
    expect(() => previewLink('javascript:alert(1)')).toThrow('lichess.org');
    expect(() => previewLink('Board=https://example.com/')).toThrow('lichess.org');
  });
});
