import { queryAll } from '#shared/dom.ts';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { storedProgress } from '#page/review/practice/progress.ts';
import { storedRepertoire } from '#page/review/practice/repertoire.ts';
import { syncShown } from '#page/review/practice/sync.ts';
import type { Session } from '#page/review/session.ts';
import { BACK_ICON } from './markup.ts';
import { copyBoardBackground } from './mini-board.ts';
import { gamesPage } from './openings-games.ts';
import { fillKeeping } from './openings-kept.ts';
import { lineMarkup } from './openings-line.ts';
import { quizMarkup } from './openings-quiz.ts';
import { repertoirePage, tabBar } from './openings-repertoire.ts';
import { searchField } from './openings-search.ts';
import {
  bookBar,
  goalBar,
  lengthBar,
  levelBar,
  linesBar,
  movesBar,
  settingsPanel,
} from './openings-settings.ts';
import { setupMarkup, sideBar } from './openings-setup.ts';
import { showSync } from './openings-sync.ts';
import { trapsPage } from './openings-traps.ts';
import { practiceCoach } from './practice-bubble.ts';
import { dueCount, practiceCard, practiceKey } from './practice-card.ts';
import { levelRating } from './practice-level.ts';

// The extension's page of opening practice, on the free board under a hash of
// ours (#shared/practice-page.ts): its home (the day's strip, the modes, the
// side, the book and the openings), its own pages (traps, the user's games,
// their repertoire), the quiz, and the line practiced, the coach speaking of
// each move. Lichess's own tools give way to it (review/openings.css).

/** The back button's action: out of a line, or the quiz, or a page of its own, to the home. */
function backAction(session: Session, practicing: boolean): string | null {
  const { openings } = session.view;
  if (practicing) return 'practice-stop';
  return openings.quiz || openings.view !== 'home' ? 'practice-home' : null;
}

function head(session: Session, practicing: boolean): SafeHtml {
  const { page } = session.language.ui.practice;
  const action = backAction(session, practicing);
  const label = practicing ? page.back : page.home.home;
  const back = action
    ? html`<button class="ln-ext-review__back" data-ln-ext="${action}" data-ln-ext-tip="${label}" aria-label="${label}">${BACK_ICON}</button>`
    : trustedHtml('<span></span>');
  return html`<div class="ln-ext-review__head ln-ext-openings__head">
      ${back}
      <div class="ln-ext-review__title ln-ext-openings__title">${page.title}</div>
      <span></span>
    </div>`;
}

/** The page's body, by what it shows. */
function bodyOf(session: Session, analysis: Analysis, practicing: boolean): SafeHtml {
  const { practice, openings } = session.view;
  const card = practiceCard(session, analysis);
  if (card && practice && practicing) {
    const open = openings.settingsOpen ? html` data-ln-ext-settings` : '';
    // A round's card hides the settings: they're the round's own.
    const settings = session.view.round
      ? ''
      : html`<div class="ln-ext-openings__choices">${settingsPanel(session, analysis)}</div>`;
    return html`${practiceCoach(session, analysis, card)}<div class="ln-ext-review__body ln-ext-openings"${open}>
        ${lineMarkup(practice, analysis, session.language.ui.practice)}${settings}
      </div>`;
  }
  if (openings.quiz) return quizMarkup(session);
  if (openings.view === 'traps') return trapsPage(session);
  if (openings.view === 'games') return gamesPage(session);
  if (openings.view === 'repertoire') return repertoirePage(session);
  return setupMarkup(session, analysis);
}

export function renderOpenings(session: Session, analysis: Analysis): void {
  showSync(session);
  // Asked once, for the level of the user's opponents and traps.
  levelRating(session);
  const practicing = practiceCard(session, analysis) !== null;
  fillKeeping(
    session.elements.panel,
    html`${head(session, practicing)}${bodyOf(session, analysis, practicing)}`,
    {
      search: searchField(session),
      side: sideBar(session),
      book: bookBar(session, analysis),
      level: levelBar(session),
      lines: linesBar(session),
      length: lengthBar(session),
      moves: movesBar(session),
      goal: goalBar(session),
      tab: tabBar(session),
    },
  );
  copyBoardBackground(queryAll(session.elements.panel, '.ln-ext-mini', HTMLElement));
}

/** The page's own state, as a key. */
function setupKey(session: Session): string {
  const { openings } = session.view;
  const { settings } = openings;
  return [
    openings.side,
    openings.query,
    openings.searching,
    openings.searchFailed,
    Object.values(settings).join(','),
    openings.settingsOpen,
    openings.view,
    openings.tab,
    [...openings.unfolded].join(','),
    openings.pruning,
    JSON.stringify(openings.traps),
    openings.games.state,
    openings.studies.state,
    openings.study ? `${openings.study.id}:${openings.study.chapters.state}` : '',
    openings.quiz
      ? [openings.quiz.index, openings.quiz.answered, openings.quiz.over].join(',')
      : '',
    openings.results?.map(each => each.name).join(',') ?? '',
  ].join('|');
}

/** What the page shows, to draw it again only when that changes. */
export function openingsKey(session: Session, analysis: Analysis): string {
  const { practice } = session.view;
  const { explorer } = analysis;
  return [
    'openings',
    analysis.path,
    analysis.orientation(),
    setupKey(session),
    dueCount(),
    storedRepertoire().length,
    JSON.stringify(storedProgress()),
    Object.values(syncShown()).join(','),
    levelRating(session),
    explorer?.signedIn,
    explorer?.source?.db,
    practice?.books.size ?? -1,
    practiceKey(session, analysis),
  ].join('|');
}
