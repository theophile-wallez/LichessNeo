import { describe, expect, it } from 'vitest';
import { SETTINGS_PAGES, settingsHash, settingsPageOf, settingsUrl } from './address.ts';

describe('the settings’ address', () => {
  it('gives the first page the section’s own hash, the others theirs', () => {
    expect(settingsHash()).toBe('#ln-ext-extension');
    expect(settingsHash('personalization')).toBe('#ln-ext-extension');
    expect(settingsHash('board')).toBe('#ln-ext-extension/board');
    expect(settingsUrl()).toBe('/account/profile#ln-ext-extension');
    expect(settingsUrl('packs')).toBe('/account/profile#ln-ext-extension/packs');
  });

  it('reads back the page of every hash it makes', () => {
    for (const page of SETTINGS_PAGES) expect(settingsPageOf(settingsHash(page))).toBe(page);
  });

  it('opens the first page for a page it doesn’t know', () => {
    expect(settingsPageOf('#ln-ext-extension/gone')).toBe('personalization');
    expect(settingsPageOf('#ln-ext-extension/')).toBe('personalization');
  });

  it('leaves any other hash to Lichess', () => {
    expect(settingsPageOf('')).toBeNull();
    expect(settingsPageOf('#ln-ext-extensions')).toBeNull();
    expect(settingsPageOf('#board')).toBeNull();
  });
});
