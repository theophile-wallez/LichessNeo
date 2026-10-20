import { describe, expect, it } from 'vitest';
import { parseSettings, settingsRead } from './settings.ts';

describe('the settings', () => {
  it('play the salute at a game’s start by default, or for an intro no longer offered', () => {
    expect(parseSettings({}).gameIntro).toBe('salute');
    expect(parseSettings({ gameIntro: 'coin' }).gameIntro).toBe('salute');
    expect(parseSettings({ gameIntro: 'off', uiSounds: false })).toMatchObject({
      gameIntro: 'off',
      uiSounds: false,
    });
  });

  it('have the coach draw on the board unless switched off', () => {
    expect(parseSettings({}).coachBoard).toBe(true);
    expect(parseSettings({ coachBoard: false }).coachBoard).toBe(false);
  });

  it('keep the quick pairing cards in their order, or the defaults if they can’t be read', () => {
    const defaults = [
      { speed: 'bullet' },
      { speed: 'blitz' },
      { speed: 'rapid' },
      { speed: 'classical' },
    ];
    expect(parseSettings({}).quickPairing).toEqual(defaults);
    expect(parseSettings({ quickPairing: [] }).quickPairing).toEqual(defaults);
    expect(parseSettings({ quickPairing: [{ speed: 'hyper' }] }).quickPairing).toEqual(defaults);
    const custom = { variant: 'chess960', rated: false, clocks: [{ minutes: 3, increment: 2 }] };
    expect(parseSettings({ quickPairing: [{ custom }, { speed: 'rapid' }] }).quickPairing).toEqual([
      { custom },
      { speed: 'rapid' },
    ]);
  });

  it('hide the sidebar’s rating if asked, and show the most played one for a pick unknown', () => {
    expect(parseSettings({ sidebarRating: 'hidden' }).sidebarRating).toBe('hidden');
    expect(parseSettings({ sidebarRating: 'puzzle' }).sidebarRating).toBe('mostPlayed');
  });

  it('count as read in a script the extension left behind, which can’t read them', () => {
    expect(settingsRead()).toBe(true);
  });
});
