import { html, type SafeHtml } from '#shared/html.ts';
import type { Session } from '#page/review/session.ts';
import { choiceBar, slot } from './openings-kept.ts';
import { choiceRow } from './openings-settings.ts';
import { pageCoach } from './openings-setup.ts';
import { studiesList } from './openings-studies.ts';
import { repertoireTree } from './openings-tree.ts';

// The repertoire's page: the user's own lines as a tree, or their studies to
// train on, a tab each.

/** The page's tabs: the user's lines, their studies. */
export function tabBar(session: Session): HTMLElement {
  const { tabs } = session.language.ui.practice.page.home;
  const options = (['mine', 'studies'] as const).map(value => ({
    value,
    label: html`${tabs[value]}`,
  }));
  return choiceBar(session, 'practice-tab', { options, picked: session.view.openings.tab });
}

export function repertoirePage(session: Session): SafeHtml {
  const { page } = session.language.ui.practice;
  const { tab } = session.view.openings;
  const words = tab === 'mine' ? page.home.treeWhy : page.home.studiesWhy;
  const body = tab === 'mine' ? repertoireTree(session) : studiesList(session);
  return html`${pageCoach(session, { title: page.home.repertoireTitle, words })}<div class="ln-ext-review__body ln-ext-openings">
      ${slot('tab')}
      ${tab === 'mine' ? html`<div class="ln-ext-openings__choices">${choiceRow(page.youPlay, 'side', true)}</div>` : ''}
      <div class="ln-ext-openings__list">${body}</div>
    </div>`;
}
