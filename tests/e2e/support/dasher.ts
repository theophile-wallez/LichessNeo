import { expect, type Locator, type Page } from '@playwright/test';

// The settings menu (Lichess's "dasher", the cog at the bottom of the sidebar)
// and its Board, Piece set and Sound panels, to which the extension adds its tabs.

export type PickerKind = 'board' | 'piece' | 'sound';

// By name, in English: a signed-out visitor's menu has no other hook for them.
const ITEM_NAMES: Readonly<Record<PickerKind, RegExp>> = {
  board: /^Board$/,
  piece: /^Piece set$/,
  sound: /^Sound$/,
};

/**
 * Opens the menu on a part's panel, and returns that panel. The menu opens
 * again on the panel last shown: its title leads back to the list of panels.
 */
export async function openPicker(page: Page, kind: PickerKind): Promise<Locator> {
  await page.locator('#top .dasher > .toggle').click();
  // The list's items are `button.sub`, its panels `div.sub`.
  const panel = page.locator(`#dasher_app div.sub.${kind}`);
  const list = page.locator('#dasher_app .subs');
  await expect(list.or(page.locator('#dasher_app div.sub')).first()).toBeVisible();
  if (await panel.isVisible()) return panel;
  if (!(await list.isVisible())) await page.locator('#dasher_app div.sub > .head').click();
  await list.locator('> button.sub', { hasText: ITEM_NAMES[kind] }).click();
  await expect(panel).toBeVisible();
  return panel;
}

/** Closes the menu, as a click on its cog does. */
export async function closeMenu(page: Page): Promise<void> {
  await page.locator('#top .dasher > .toggle').click();
  await expect(page.locator('#dasher_app')).toBeHidden();
}

export const pickerTab = (panel: Locator, view: 'packs' | 'lichess'): Locator =>
  panel.locator(`.lr-ext-src-tabs > button[data-lr-ext-tab="${view}"]`);

/** An imported pack, in the panel's Imported tab. */
export const packChoice = (panel: Locator, id: string): Locator =>
  panel.locator(`.lr-ext-src-list .lr-ext-src-item[data-lr-ext-choice="${id}"]`);

/** Lichess's own choices, in its tab: boards and piece sets, or sound sets. */
export const lichessChoices = (panel: Locator): Locator =>
  panel.locator(':is(.list, .selector) > button');
