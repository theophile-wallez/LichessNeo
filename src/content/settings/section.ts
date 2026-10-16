import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { packLibrary } from '#content/packs/index.ts';
import { importSection } from '#content/packs/import-section.ts';
import { PAGE_NAMES, SETTINGS_PAGES, type SettingsPage } from './address.ts';
import { buildAppearance, showScheme } from './appearance.ts';
import { buildAvatarCard } from './avatar-card.ts';
import { buildNameCard } from './name-card.ts';
import { buildCoachCard, buildCoachSwitches } from './coach-card.ts';
import { buildInterfacePage } from './interface-page.ts';
import { buildLooksPage } from './looks-page.ts';
import { onSettings, settingsRead } from './settings.ts';

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
  setData(section, 'lrExtPage', page);
  const title = queryOne(section, 'h1.box__top', HTMLElement);
  const name = page ? message(PAGE_NAMES[page]) : '';
  if (title && title.textContent !== name) title.textContent = name;
  for (const panel of queryAll(section, '.lr-ext-settings__page', HTMLElement)) {
    const hidden = panel.dataset.lrExtPage !== page;
    if (panel.hidden !== hidden) panel.hidden = hidden;
  }
}

/** The section, for the account page's content column, kept in step with the settings. */
export function buildSection(): SettingsSection {
  const element = createElement('div', { className: 'page-menu__content lr-ext-settings' });
  setHtml(
    element,
    html`<div class="box box-pad">
      <h1 class="box__top"></h1>
      ${SETTINGS_PAGES.map(page => html`<div class="lr-ext-settings__page" data-lr-ext-page="${page}" hidden></div>`)}
    </div>`,
  );
  const coach = buildCoachCard();
  const looks = buildLooksPage(packLibrary());
  const pages: Readonly<Record<SettingsPage, readonly HTMLElement[]>> = {
    personalization: [buildAppearance(), coach.element, buildCoachSwitches()],
    profile: [buildAvatarCard(), buildNameCard()],
    board: looks.elements,
    packs: [importSection(packLibrary())],
    interface: [buildInterfacePage()],
  };
  for (const page of SETTINGS_PAGES)
    queryOne(element, `.lr-ext-settings__page[data-lr-ext-page='${page}']`, HTMLElement)?.append(
      ...pages[page],
    );
  // The switches wait for the stored settings, rather than flip from the defaults to them.
  const showPending = (): void => setData(element, 'lrExtPending', settingsRead() ? null : '');
  showPending();
  onSettings(showPending);
  return {
    element,
    show: page => {
      showPage(element, page);
      coach.show(page === 'personalization');
      looks.show(page === 'board');
      if (page === 'personalization') showScheme(element);
    },
  };
}
