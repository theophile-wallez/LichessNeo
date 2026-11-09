import { beforeEach, describe, expect, it } from 'vitest';
import { blockStorage } from '#shared/testing/storage.ts';
import { expectFlash, takeExpectedFlash } from './expected-flash.ts';

beforeEach(() => {
  sessionStorage.clear();
});

describe('takeExpectedFlash', () => {
  it('gives the next page what the form expected, once', () => {
    expectFlash('You joined the team');
    expect(takeExpectedFlash()).toBe('You joined the team');
    expect(takeExpectedFlash()).toBeNull();
  });

  it('expects nothing when no form said so, or the storage is blocked', () => {
    expect(takeExpectedFlash()).toBeNull();
    blockStorage();
    expectFlash('You joined the team');
    expect(takeExpectedFlash()).toBeNull();
  });
});
