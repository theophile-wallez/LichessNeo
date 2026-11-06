import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { packLibrary } from '#content/packs/index.ts';
import { PAGE_NAMES, SETTINGS_PAGES, type SettingsPage } from './address.ts';
import { buildAnalysisPage } from './analysis-page.ts';
import { buildAppearance, showScheme } from './appearance.ts';
import { buildAvatarCard } from './avatar-card.ts';
import { buildBackupPage } from './backup-page.ts';
import { buildChesscomCards } from './chesscom-card.ts';
import { buildCoachCard, buildCoachSwitches } from './coach-card.ts';
import { groupTitle } from './group-title.ts';
import { buildHomeCoachCard } from './home-coach-card.ts';
import { buildIntroRow } from './intro-row.ts';
import { buildLooksPage } from './looks-page.ts';
import { buildNameCard } from './name-card.ts';
import { buildNavigationRow } from './navigation-row.ts';
import { buildPairingPage } from './pairing-page.ts';
import { buildRatingRow } from './rating-row.ts';
import { buildRepliesCard } from './replies-card.ts';
import { buildRoundnessRow } from './roundness-row.ts';
import { onSettingsRead, settingsRead } from './settings.ts';
import { buildSupportPage } from './support-page.ts';
import { buildSwitchList, type SwitchRow } from './switch-list.ts';

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

/** The section's frame: the title, and an empty panel for each page. */
function buildFrame(): HTMLElement {
  const element = createElement('div', { className: 'page-menu__content ln-ext-settings' });
  setHtml(
    element,
    html`<div class="box box-pad">
      <h1 class="box__top"></h1>
      ${SETTINGS_PAGES.map(page => html`<div class="ln-ext-settings__page" data-ln-ext-page="${page}" hidden></div>`)}
    </div>`,
  );
  return element;
}

const switchCard = (key: SwitchRow['key'], title: string, body: string): HTMLElement =>
  buildSwitchList([{ key, title: message(title), body: message(body) }]);

/** The section, for the account page's content column, kept in step with the settings. */
export function buildSection(): SettingsSection {
  const element = buildFrame();
  const coach = buildCoachCard();
  const homeCoach = buildHomeCoachCard();
  const looks = buildLooksPage(packLibrary());
  const pairing = buildPairingPage();
  const support = buildSupportPage();
  const pages: Readonly<Record<SettingsPage, readonly HTMLElement[]>> = {
    appearance: [
      buildNavigationRow(),
      buildAppearance(),
      buildRoundnessRow(),
      switchCard('uiSounds', 'settingUiSounds', 'settingUiSoundsBody'),
    ],
    board: looks.elements,
    coach: [coach.element, homeCoach.element, buildCoachSwitches()],
    analysis: buildAnalysisPage(),
    play: [buildIntroRow(), buildRepliesCard(), pairing.element],
    profile: [
      groupTitle(message('settingsGroupYou')),
      buildAvatarCard(),
      buildNameCard(),
      groupTitle(message('settingsGroupRatings')),
      buildRatingRow(),
      buildChesscomCards(),
      switchCard('ratingStakes', 'settingRatingStakes', 'settingRatingStakesBody'),
    ],
    backup: [buildBackupPage()],
    support: [support.element],
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
      coach.show(page === 'coach');
      homeCoach.show(page === 'coach');
      looks.show(page === 'board');
      pairing.show(page === 'play');
      support.show(page === 'support');
      if (page === 'appearance') showScheme(element);
    },
  };
}
