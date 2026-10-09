import { queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { translate } from '#page/lichess/globals.ts';
import { classImage } from '#page/review/classes/icon-svg.ts';
import { openingAt } from '#page/review/live/judging.ts';
import type { BookEntry, Session } from '#page/review/session.ts';

// The opening's name over the free board's move list, from the masters
// database (signed in only). Our element is appended to Lichess's panel and
// placed above the moves by review.css, so Lichess's own children never move.

/** "Ruy Lopez: Morphy Defense": the family in bold, then the variation. */
export function openingMarkup({ name, eco }: Pick<BookEntry, 'name' | 'eco'>): SafeHtml {
  const [family = '', ...rest] = name.split(': ');
  const code = eco ? html`<span class="lr-ext-opening__eco">${eco}</span>` : '';
  const variation = rest.length > 0 ? html`: ${rest.join(': ')}` : '';
  return html`<i class="lr-ext-opening__icon"></i>${code}<span class="lr-ext-opening__name"><b>${family}</b>${variation}</span>`;
}

function shownOpening(
  session: Session,
  analysis: Analysis,
): Pick<BookEntry, 'name' | 'eco'> | null {
  if (!analysis.explorerSignedIn() || session.live.noBook) return null;
  if (analysis.path) return openingAt(session.live, analysis, analysis.path);
  return { name: translate('startPosition', session.language.ui.startPosition), eco: '' };
}

export function renderOpening(session: Session, analysis: Analysis): void {
  const tools = queryOne(document, 'main.analyse .analyse__tools', HTMLElement);
  if (!tools) return;
  const { opening: element } = session.elements;
  if (element.parentNode !== tools) tools.append(element);
  const opening = shownOpening(session, analysis);
  const key = opening ? `${opening.eco}|${opening.name}` : '';
  if (element.dataset.lrExtOpening === key) return;
  setData(element, 'lrExtOpening', key);
  document.documentElement.classList.toggle('lr-ext-opening-on', opening !== null);
  if (!opening) {
    element.replaceChildren();
    return;
  }
  element.title = opening.name;
  setStyleProperty(element, '--lr-ext-class-icon', classImage('book'));
  setHtml(element, openingMarkup(opening));
}
