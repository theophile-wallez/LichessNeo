import { describe, expect, it } from 'vitest';
import { parseSettings } from './settings.ts';

describe('the settings', () => {
  it('play the salute at a game’s start by default, or for an intro no longer offered', () => {
    expect(parseSettings({}).gameIntro).toBe('salute');
    expect(parseSettings({ gameIntro: 'coin' }).gameIntro).toBe('salute');
    expect(parseSettings({ gameIntro: 'off', uiSounds: false })).toMatchObject({
      gameIntro: 'off',
      uiSounds: false,
    });
  });
});
