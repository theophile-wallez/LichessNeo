import { html } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { onRatingChange, ratingRowMarkup, showRatingRow } from './rating-row.ts';
import { currentSettings, onSettings, type Settings } from './settings.ts';
import { buildSwitchList } from './switch-list.ts';
import { introRowMarkup, wireIntroRow } from './intro-row.ts';
import { navigationRowMarkup, onNavigationClick, showNavigationRow } from './navigation-row.ts';

// The settings' Interface page: a card per setting, each with a switch
// (switch-list.ts) or a menu.

/** The page's cards, kept in step with the settings. */
export function buildInterfacePage(): HTMLElement {
  const list = buildSwitchList(
    [{ key: 'uiSounds', title: message('settingUiSounds'), body: message('settingUiSoundsBody') }],
    html`${navigationRowMarkup()}${introRowMarkup()}${ratingRowMarkup()}`,
  );
  list.addEventListener('change', onRatingChange);
  list.addEventListener('click', onNavigationClick);
  wireIntroRow(list);
  const show = (settings: Settings): void => {
    showNavigationRow(list, settings);
    showRatingRow(list, settings);
  };
  show(currentSettings());
  onSettings(show);
  return list;
}
