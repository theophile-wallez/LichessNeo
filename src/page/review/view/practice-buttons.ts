import { type SafeHtml } from '#shared/html.ts';
import { opposite } from '#shared/chess/types.ts';
import type { Card } from './practice-card.ts';
import { dueCount, navButton } from './practice-card.ts';
import { practiceHints } from './practice.ts';
import { HINTS } from './retry-hint.ts';

// The buttons under practice's card: the way on at a line's end, the hints,
// the answer and taking back on the user's turn, and the choice a move that
// isn't theirs asks for.

function endButtons(card: Card): SafeHtml[] {
  const { session } = card.spoken;
  const { practice: strings } = session.language.ui;
  const { round } = session.view;
  if (round && !round.over) {
    // The review and the challenge go on by themselves.
    if (round.kind === 'review' || round.kind === 'blitz') return [];
    const next = round.kind === 'trap' ? strings.modes.nextTrap : strings.modes.nextDrill;
    return [
      navButton('practice-next', 'arrow', next, true),
      navButton('practice-stop', 'back', strings.modes.finish),
    ];
  }
  const due = dueCount();
  return [
    navButton('practice-again', 'retry', strings.again, true),
    ...(due > 0 ? [navButton('practice-mode-review', 'book', strings.review(due))] : []),
    navButton('practice-computer', 'robot', strings.computer),
  ];
}

export function buttons(card: Card): SafeHtml[] {
  const { status, spoken, hint } = card;
  const { session, analysis } = spoken;
  const { practice: strings, retry } = session.language.ui;
  if (status.kind === 'end') return endButtons(card);
  if (status.kind === 'deviated')
    return [
      navButton('practice-adopt', 'tick', strings.modes.adopt, true),
      navButton('practice-back', 'back', strings.takeBack),
    ];
  if (status.kind !== 'yours' || session.view.round?.kind === 'blitz') return [];
  const hints = practiceHints(session, analysis);
  const canHint = status.book.moves.length > 0 && hints < HINTS;
  // The answer, once the user has missed it or used up the hints.
  const canReveal = status.book.moves.length > 0 && (status.miss !== null || hints >= HINTS);
  const way = wayBack(card, status.played === null);
  return [
    ...(canHint ? [navButton('hint', 'hint', hint ? retry.another : retry.hint)] : []),
    ...(canReveal ? [navButton('practice-reveal', 'bulb', strings.reveal)] : []),
    ...(way ? [way] : []),
  ];
}

/**
 * Taking back, or before the user's first move changing sides: not in a round's
 * card nor on a book of the line's own, whose side is its own.
 */
function wayBack(card: Card, unplayed: boolean): SafeHtml | null {
  const { session, practice } = card.spoken;
  const { practice: strings } = session.language.ui;
  if (!unplayed) return navButton('practice-back', 'back', strings.takeBack);
  const fixed = session.view.round !== null || practice.own !== null;
  return fixed
    ? null
    : navButton('practice-side', 'swap', strings.switchSide(opposite(practice.side)));
}
