import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { packLibrary } from '#content/packs/index.ts';
import { PAGE_NAMES, SETTINGS_PAGES, type SettingsPage } from './address.ts';
import { buildAppearance, showScheme } from './appearance.ts';
import { buildAvatarCard } from './avatar-card.ts';
import { buildBackupPage } from './backup-page.ts';
import { buildNameCard } from './name-card.ts';
import { buildCoachCard, buildCoachSwitches } from './coach-card.ts';
import { buildHomeCoachCard } from './home-coach-card.ts';
import { buildExperimentalPage } from './experimental-page.ts';
import { buildIntroRow } from './intro-row.ts';
import { buildLooksPage } from './looks-page.ts';
import { buildNavigationRow } from './navigation-row.ts';
import { buildPairingPage } from './pairing-page.ts';
import { buildRatingRow } from './rating-row.ts';
import { buildRoundnessRow } from './roundness-row.ts';
import { onSettingsRead, settingsRead } from './settings.ts';
import { buildSwitchList } from './switch-list.ts';

// The account page's section for the extension: one of its pages
// (address.ts) at a time, the one the menu's link picked (menu.ts), under its
// name.

export interface SettingsSection {
  readonly element: HTMLElement;
  /** Shows `page`, or none while the section is closed. Cheap when nothing changed: it runs every tick. */
  readonly show: (page: SettingsPage | null) => void;
}

function showPage(section: HTMLElement, page: SettingsPage | null): void {
  // The title's tile is the page's link's (styles/pages/settings-menu.css).
  setData(section, 'lnExtPage', page);
  const title = queryOne(section, 'h1.box__top', HTMLElement);
  const name = page ? message(PAGE_NAMES[page]) : '';
  if (title && title.textContent !== name) title.textContent = name;
  for (const panel of queryAll(section, '.ln-ext-settings__page', HTMLElement)) {
    const hidden = panel.dataset.lnExtPage !== page;
    if (panel.hidden !== hidden) panel.hidden = hidden;
  }
}

/** The section, for the account page's content column, kept in step with the settings. */
export function buildSection(): SettingsSection {
  const element = createElement('div', { className: 'page-menu__content ln-ext-settings' });
  setHtml(
    element,
    html`<div class="box box-pad">
      <h1 class="box__top"></h1>
      ${SETTINGS_PAGES.map(page => html`<div class="ln-ext-settings__page" data-ln-ext-page="${page}" hidden></div>`)}
    </div>`,
  );
  const coach = buildCoachCard();
  const homeCoach = buildHomeCoachCard();
  const looks = buildLooksPage(packLibrary());
  const pairing = buildPairingPage();
  const pages: Readonly<Record<SettingsPage, readonly HTMLElement[]>> = {
    appearance: [buildAppearance(), buildRoundnessRow(), buildNavigationRow()],
    board: looks.elements,
    profile: [
      buildAvatarCard(),
      buildNameCard(),
      buildRatingRow(),
      coach.element,
      homeCoach.element,
      buildCoachSwitches(),
    ],
    play: [
      buildIntroRow(),
      buildSwitchList([
        {
          key: 'ratingStakes',
          title: message('settingRatingStakes'),
          body: message('settingRatingStakesBody'),
        },
      ]),
      pairing.element,
    ],
    experimental: [buildExperimentalPage()],
    backup: [buildBackupPage()],
  };
  for (const page of SETTINGS_PAGES)
    queryOne(element, `.ln-ext-settings__page[data-ln-ext-page='${page}']`, HTMLElement)?.append(
      ...pages[page],
    );
  // The controls wait for the stored settings, rather than flip from the defaults to them.
  const showPending = (): void => setData(element, 'lnExtPending', settingsRead() ? null : '');
  showPending();
  onSettingsRead(showPending);
  return {
    element,
    show: page => {
      showPage(element, page);
      coach.show(page === 'profile');
      homeCoach.show(page === 'profile');
      looks.show(page === 'board');
      pairing.show(page === 'play');
      if (page === 'appearance') showScheme(element);
    },
  };
}
