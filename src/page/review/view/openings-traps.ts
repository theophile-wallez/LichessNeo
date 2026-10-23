import { html, type SafeHtml } from '#shared/html.ts';
import type { Session } from '#page/review/session.ts';
import { choiceRow } from './openings-settings.ts';
import { slot } from './openings-kept.ts';
import { openingsList, pageCoach } from './openings-setup.ts';

// The traps' page: the coach on what traps are, the side, and the openings to
// set them in, each card starting its traps.

export function trapsPage(session: Session): SafeHtml {
  const { page } = session.language.ui.practice;
  const { modes } = session.language.ui.practice;
  const { traps } = session.view.openings;
  const words = !traps
    ? page.home.trapsWhy
    : { loading: modes.trapsLoading, failed: modes.trapsFailed, none: modes.noTraps }[traps.state];
  const title = traps ? traps.opening : page.home.trapsTitle;
  return html`${pageCoach(session, { title, words })}<div class="ln-ext-review__body ln-ext-openings">
      <div class="ln-ext-openings__choices">${choiceRow(page.youPlay, 'side', true)}</div>
      ${slot('search')}
      <div class="ln-ext-openings__list">${openingsList(session, 'practice-trap')}</div>
    </div>`;
}
