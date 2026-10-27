import { closestTo, queryAll } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import {
  currentSettings,
  NavigationSchema,
  onSettings,
  type Settings,
  updateSettings,
} from './settings.ts';
import { buildCardList } from './switch-list.ts';

// The setting of the nav's place from 1020px: a card like the rating's
// (rating-row.ts), with a tile per place, each a little window drawn with its
// nav (styles/pages/settings-navigation.css).

type Navigation = Settings['navigation'];

const NAMES: Readonly<Record<Navigation, string>> = {
  sidebar: 'navigationSidebar',
  unfolded: 'navigationUnfolded',
  rail: 'navigationRail',
  header: 'navigationHeader',
};

const PICK = '.ln-ext-nav-pick';

const pickMarkup = (navigation: Navigation): SafeHtml =>
  html`<button type="button" class="ln-ext-nav-pick" role="radio" aria-checked="false" data-ln-ext-navigation="${navigation}">
    <span class="ln-ext-nav-pick__mock" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="ln-ext-nav-pick__name">${message(NAMES[navigation])}</span>
  </button>`;

function navigationRowMarkup(): SafeHtml {
  const id = 'ln-ext-setting-navigation';
  return html`<div class="ln-ext-setting" data-ln-ext-setting="navigation" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingNavigation')}</h2>
      <p class="ln-ext-setting__body">${message('settingNavigationBody')}</p>
    </div>
    <div class="ln-ext-nav-picks" role="radiogroup" aria-labelledby="${id}">
      ${NavigationSchema.options.map(pickMarkup)}
    </div>
  </div>`;
}

function showNavigationRow(section: HTMLElement, settings: Settings): void {
  for (const pick of queryAll(section, PICK, HTMLButtonElement)) {
    const checked = String(pick.dataset.lnExtNavigation === settings.navigation);
    if (pick.getAttribute('aria-checked') !== checked) pick.setAttribute('aria-checked', checked);
  }
}

function onNavigationClick(event: Event): void {
  const pick = closestTo(event.target, PICK, HTMLButtonElement);
  const navigation = NavigationSchema.safeParse(pick?.dataset.lnExtNavigation);
  if (!navigation.success) return;
  void updateSettings(settings => ({
    ...settings,
    navigation: navigation.data,
    navigationPicked: true,
  }));
}

/** The card, kept in step with the settings. */
export function buildNavigationRow(): HTMLElement {
  const list = buildCardList(navigationRowMarkup());
  list.addEventListener('click', onNavigationClick);
  showNavigationRow(list, currentSettings());
  onSettings(settings => showNavigationRow(list, settings));
  return list;
}
