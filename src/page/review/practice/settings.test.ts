import { beforeEach, describe, expect, it } from 'vitest';
import { blockStorage } from '#shared/testing/storage.ts';
import {
  AUTO_LENGTH,
  isGoal,
  isLength,
  keepSettings,
  type PracticeSettings,
  readSettings,
} from './settings.ts';

const KEY = 'ln-ext-practice-settings';

const DEFAULTS: PracticeSettings = {
  length: AUTO_LENGTH,
  lines: 'main',
  moves: 'mine',
  level: 'mine',
  goal: 20,
};

beforeEach(() => {
  localStorage.clear();
});

describe('the practice settings', () => {
  it('start with the main lines, growing, the user’s own moves asked for', () => {
    expect(readSettings()).toEqual(DEFAULTS);
  });

  it('read back what was kept', () => {
    const settings: PracticeSettings = {
      length: 10,
      lines: 'all',
      moves: 'any',
      level: 'all',
      goal: 40,
    };
    keepSettings(settings);
    expect(readSettings()).toEqual(settings);
  });

  it('go back to the defaults on a length or a goal no longer offered', () => {
    keepSettings({ ...DEFAULTS, length: 7 });
    expect(readSettings()).toEqual(DEFAULTS);
    keepSettings({ ...DEFAULTS, goal: 15 });
    expect(readSettings()).toEqual(DEFAULTS);
    localStorage.setItem(KEY, '{"length":5,"lines":"some"}');
    expect(readSettings()).toEqual(DEFAULTS);
  });

  it('are the defaults when the storage is blocked', () => {
    blockStorage();
    expect(readSettings()).toEqual(DEFAULTS);
    expect(() => keepSettings(DEFAULTS)).not.toThrow();
  });

  it('give a fresh copy of the defaults each time', () => {
    const first = readSettings();
    first.goal = 40;
    expect(readSettings().goal).toBe(20);
  });

  it('offer the lengths and goals of the page', () => {
    expect([AUTO_LENGTH, 0, 5, 10, 15].every(isLength)).toBe(true);
    expect(isLength(7)).toBe(false);
    expect([10, 20, 40].every(isGoal)).toBe(true);
    expect(isGoal(0)).toBe(false);
  });
});
