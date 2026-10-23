import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { commentMarkup, streamFor } from '#page/review/comment/markup.ts';
import { OPENINGS } from '#page/review/practice/openings.ts';
import type { Session } from '#page/review/session.ts';
import { avatarMarkup } from './coach-avatar.ts';
import { bubbleTitle } from './markup.ts';
import { grid, heading, openingCard } from './openings-cards.ts';
import { favorites, modeTiles, todayStrip } from './openings-home.ts';
import { choiceBar, slot } from './openings-kept.ts';
import { choiceRow, settingsPanel } from './openings-settings.ts';
import { dueCount, navButton } from './practice-card.ts';

// The practice page before a line starts: the coach on what to do, the day's
// strip and the modes' tiles, the side to play and how lines go, then the
// openings to start from: the lines starred, the side's best known, or those
// Lichess's search finds. The traps' page offers the same openings, for traps.

const KINGS: Readonly<Record<Color, string>> = { white: 'wk', black: 'bk' };

const SIDES: readonly Color[] = ['white', 'black'];

/** The side the user plays, picked before a line starts. */
export function sideBar(session: Session): HTMLElement {
  const { page } = session.language.ui.practice;
  const options = SIDES.map(value => ({
    value,
    label: html`<i class="ln-ext-pc ln-ext-pc-${KINGS[value]}"></i>${page.sides[value]}`,
  }));
  return choiceBar(session, 'practice-color', { options, picked: session.view.openings.side });
}

/** The side's best known openings, or what the search found: a line, or traps, from each. */
export function openingsList(session: Session, action = 'practice-line'): SafeHtml {
  const { side, query, results, searching, searchFailed, view } = session.view.openings;
  const { page } = session.language.ui.practice;
  if (!query) {
    const popular = OPENINGS.filter(opening => opening.side === side);
    const cards = popular.map(each => openingCard(session, each, { eco: each.eco, action }));
    return html`${view === 'home' ? favorites(session) : ''}${heading(page.popular(side))}${grid(cards)}`;
  }
  if (searchFailed) return html`<p class="ln-ext-openings__note">${page.searchFailed}</p>`;
  if (searching || !results) return html`<p class="ln-ext-openings__note">…</p>`;
  if (results.length === 0) return html`<p class="ln-ext-openings__note">${page.noResult}</p>`;
  return html`${heading(page.found)}${grid(results.map(each => openingCard(session, each, { action })))}`;
}

/** The coach's card at the head of a page, with the button under it if it has one. */
export function pageCoach(
  session: Session,
  { title, words, button }: { title: string; words: string; button?: SafeHtml },
): SafeHtml {
  const { language } = session;
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass: null,
    react: false,
    label: language.ui.coach,
    idle: 'neutral',
  });
  const parts = [{ text: words, droppable: false }];
  session.stream.state = streamFor(session.stream.state, parts);
  const said = commentMarkup(parts, { stream: session.stream.state, language });
  const nav = button
    ? html`<div class="ln-ext-review__nav ln-ext-review__nav--practice ln-ext-review__nav--start">${button}</div>`
    : '';
  return html`<div class="ln-ext-coach">${avatar}<div class="ln-ext-bubble">${bubbleTitle(title)}<div class="ln-ext-bubble__body"><p class="ln-ext-bubble__sub">${said}</p></div></div></div>${nav}`;
}

/** The coach over the home: what to do, or the review waiting. */
function homeCoach(session: Session, signedIn: boolean): SafeHtml {
  const { page } = session.language.ui.practice;
  if (!signedIn) return pageCoach(session, { title: page.title, words: page.signedOut });
  const due = dueCount();
  const button = navButton('practice-start', 'arrow', page.fromHere, true);
  if (due > 0)
    return pageCoach(session, {
      title: page.home.dueTitle,
      words: page.home.dueWords(due),
      button: html`${navButton('practice-mode-review', 'review', page.home.modes.review, true)}${navButton('practice-start', 'arrow', page.fromHere)}`,
    });
  return pageCoach(session, { title: page.pick, words: page.pickWhy, button });
}

export function setupMarkup(session: Session, analysis: Analysis): SafeHtml {
  const signedIn = Boolean(analysis.explorer?.signedIn);
  const coach = homeCoach(session, signedIn);
  if (!signedIn) return coach;
  const { page } = session.language.ui.practice;
  const open = session.view.openings.settingsOpen ? html` data-ln-ext-settings` : '';
  return html`${coach}<div class="ln-ext-review__body ln-ext-openings"${open}>
      ${todayStrip(session)}${modeTiles(session)}
      <div class="ln-ext-openings__choices">${choiceRow(page.youPlay, 'side', true)}${settingsPanel(session, analysis)}</div>
      ${slot('search')}
      <div class="ln-ext-openings__list">${openingsList(session)}</div>
    </div>`;
}
