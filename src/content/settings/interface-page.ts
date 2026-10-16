import { message } from '#content/platform/runtime.ts';
import { onRatingChange, ratingRowMarkup, showRatingRow } from './rating-row.ts';
import { currentSettings, onSettings } from './settings.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Interface page: a card per setting, each with a switch
// (switch-list.ts) or a menu.

/** The page's cards, kept in step with the settings. */
export function buildInterfacePage(): HTMLElement {
  const list = buildSwitchList(
    [{ key: 'uiSounds', title: message('settingUiSounds'), body: message('settingUiSoundsBody') }],
    ratingRowMarkup(),
  );
  list.addEventListener('change', onRatingChange);
  showRatingRow(list, currentSettings());
  onSettings(settings => showRatingRow(list, settings));
  return list;
}
