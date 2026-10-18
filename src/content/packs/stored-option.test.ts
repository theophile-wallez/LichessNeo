import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { storedNumber, storedOption } from './stored-option.ts';

const KEY = 'ln-ext-test-option';

afterEach(() => {
  localStorage.clear();
});

describe('storedNumber', () => {
  const setting = storedNumber(KEY, z.number().check(z.gte(0), z.lte(16)), 5.5);

  it('reads the number stored, and the default for a missing or a damaged one', () => {
    expect(setting.read()).toBe(5.5);
    localStorage.setItem(KEY, '12.5');
    expect(setting.read()).toBe(12.5);
    localStorage.setItem(KEY, '20');
    expect(setting.read()).toBe(5.5);
    localStorage.setItem(KEY, 'wide');
    expect(setting.read()).toBe(5.5);
  });

  it('keeps a number chosen and tells its listeners', () => {
    const changed = vi.fn<(value: number) => void>();
    setting.onChange(changed);
    setting.choose(0);
    expect(localStorage.getItem(KEY)).toBe('0');
    expect(setting.read()).toBe(0);
    expect(changed).toHaveBeenCalledWith(0);
  });
});

describe('storedOption', () => {
  it('reads a word stored as it is, and the default for any other', () => {
    const setting = storedOption(KEY, z.enum(['short', 'wide']), 'short');
    setting.choose('wide');
    expect(localStorage.getItem(KEY)).toBe('wide');
    expect(setting.read()).toBe('wide');
    localStorage.setItem(KEY, '"wide"');
    expect(setting.read()).toBe('short');
  });
});
