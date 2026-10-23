import { describe, expect, it } from 'vitest';
import { packsUrl, SETTINGS_PAGES, settingsHash, settingsPageOf, settingsUrl } from './address.ts';

describe('the settings’ address', () => {
  it('gives the first page the section’s own hash, the others theirs', () => {
    expect(settingsHash()).toBe('#ln-ext-extension');
    expect(settingsHash('appearance')).toBe('#ln-ext-extension');
    expect(settingsHash('board')).toBe('#ln-ext-extension/board');
    expect(settingsUrl()).toBe('/account/profile#ln-ext-extension');
    expect(settingsUrl('play')).toBe('/account/profile#ln-ext-extension/play');
  });

  it('reads back the page of every hash it makes', () => {
    for (const page of SETTINGS_PAGES) expect(settingsPageOf(settingsHash(page))).toBe(page);
  });

  it('leads to the Packs card on the board’s page', () => {
    expect(packsUrl()).toBe('/account/profile#ln-ext-extension/packs');
    expect(settingsPageOf('#ln-ext-extension/packs')).toBe('board');
  });

  it('opens a page since merged where its cards went', () => {
    expect(settingsPageOf('#ln-ext-extension/personalization')).toBe('appearance');
    expect(settingsPageOf('#ln-ext-extension/interface')).toBe('appearance');
    expect(settingsPageOf('#ln-ext-extension/pairing')).toBe('play');
  });

  it('opens the first page for a page it doesn’t know', () => {
    expect(settingsPageOf('#ln-ext-extension/gone')).toBe('appearance');
    expect(settingsPageOf('#ln-ext-extension/')).toBe('appearance');
  });

  it('leaves any other hash to Lichess', () => {
    expect(settingsPageOf('')).toBeNull();
    expect(settingsPageOf('#ln-ext-extensions')).toBeNull();
    expect(settingsPageOf('#board')).toBeNull();
  });
});
