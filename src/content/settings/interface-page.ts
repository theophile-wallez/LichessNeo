import { html } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { onRatingChange, ratingRowMarkup, showRatingRow } from './rating-row.ts';
import { currentSettings, onSettings } from './settings.ts';
import { buildSwitchList } from './switch-list.ts';
import { introRowMarkup, wireIntroRow } from './intro-row.ts';

// The settings' Interface page: a card per setting, each with a switch
// (switch-list.ts) or a menu.

/** The page's cards, kept in step with the settings. */
export function buildInterfacePage(): HTMLElement {
  const list = buildSwitchList(
    [{ key: 'uiSounds', title: message('settingUiSounds'), body: message('settingUiSoundsBody') }],
    html`${introRowMarkup()}${ratingRowMarkup()}`,
  );
  list.addEventListener('change', onRatingChange);
  wireIntroRow(list);
  showRatingRow(list, currentSettings());
  onSettings(settings => showRatingRow(list, settings));
  return list;
}
