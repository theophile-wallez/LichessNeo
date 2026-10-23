import { html, type SafeHtml } from '#shared/html.ts';
import { bestOf, dayCount, dayStreak, storedProgress } from '#page/review/practice/progress.ts';
import { KNOWN_LEVEL, nameAlong, storedRepertoire } from '#page/review/practice/repertoire.ts';
import type { Session } from '#page/review/session.ts';
import { type IconName, svgIcon } from './markup.ts';
import { grid, heading, lineOf, openingCard } from './openings-cards.ts';
import { dueCount } from './practice-card.ts';

// The practice page's home, over its openings: the day's strip (the days in a
// row, the goal, the positions known), the modes' tiles, and the lines the
// user starred.

function stat(
  { icon, value, tip, name }: { icon: IconName; value: string; tip: string; name: string },
  ring?: number,
): SafeHtml {
  const style = ring === undefined ? '' : html` style="--ln-ext-progress:${ring.toFixed(2)}"`;
  return html`<span class="ln-ext-today__stat" data-ln-ext-today="${name}" data-ln-ext-tip="${tip}"${style}><span class="ln-ext-today__tile">${svgIcon(icon)}</span><b>${value}</b></span>`;
}

/** The day's strip: days in a row with the goal met, today's moves of it, positions known. */
export function todayStrip(session: Session): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const now = Date.now();
  const { goal } = session.view.openings.settings;
  const today = dayCount(now);
  const known = storedRepertoire().filter(entry => entry.level >= KNOWN_LEVEL).length;
  return html`<div class="ln-ext-today">
      ${stat({ icon: 'fire', value: home.streakDays(dayStreak(goal, now)), tip: home.streakTip, name: 'streak' })}
      ${stat({ icon: 'target', value: home.today(today, goal), tip: home.todayTip, name: 'goal' }, Math.min(today / goal, 1))}
      ${stat({ icon: 'crown', value: home.known(known), tip: home.knownTip, name: 'known' })}
    </div>`;
}

interface Tile {
  readonly mode: string;
  readonly icon: IconName;
  readonly name: string;
  readonly sub: string;
  readonly badge?: number;
  readonly off?: boolean;
}

const tileMarkup = ({ mode, icon, name, sub, badge, off }: Tile): SafeHtml =>
  html`<button class="ln-ext-mode" data-ln-ext="practice-mode-${mode}" data-ln-ext-mode="${mode}"${off ? html` disabled` : ''}>
      <span class="ln-ext-mode__tile">${svgIcon(icon)}</span>
      <span class="ln-ext-mode__text"><b>${name}</b><small>${sub}</small></span>
      ${badge ? html`<span class="ln-ext-mode__badge">${badge}</span>` : ''}
    </button>`;

/** The modes' tiles. */
export function modeTiles(session: Session): SafeHtml {
  const { modes } = session.language.ui.practice.page.home;
  const due = dueCount();
  const positions = storedRepertoire().length;
  const tiles: Tile[] = [
    {
      mode: 'review',
      icon: 'review',
      name: modes.review,
      sub: due > 0 ? modes.reviewDue(due) : modes.reviewNone,
      badge: due,
      off: due === 0,
    },
    { mode: 'traps', icon: 'trap', name: modes.traps, sub: modes.trapsSub },
    { mode: 'blitz', icon: 'blitz', name: modes.blitz, sub: modes.blitzSub(bestOf('blitz')) },
    { mode: 'quiz', icon: 'quiz', name: modes.quiz, sub: modes.quizSub(bestOf('quiz')) },
    { mode: 'games', icon: 'games', name: modes.games, sub: modes.gamesSub },
    {
      mode: 'repertoire',
      icon: 'branch',
      name: modes.repertoire,
      sub: modes.repertoireSub(positions),
    },
  ];
  return html`<div class="ln-ext-modes">${tiles.map(tileMarkup)}</div>`;
}

/** The side's starred lines, as cards. */
export function favorites(session: Session): SafeHtml | '' {
  const { side } = session.view.openings;
  const cards = storedProgress()
    .favorites.flatMap(key => {
      const [of, line = ''] = key.split('|');
      if (of !== side) return [];
      const moves = line.split(' ').filter(Boolean);
      return lineOf(nameAlong(side, moves), moves) ?? [];
    })
    .map(line => openingCard(session, line));
  if (cards.length === 0) return '';
  return html`${heading(session.language.ui.practice.page.home.favorites)}${grid(cards)}`;
}
