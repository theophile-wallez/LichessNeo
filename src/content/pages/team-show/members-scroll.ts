import { queryOne } from '#shared/dom.ts';

// Lichess loads a team's next recent members once their list's pager comes into view, which
// it checks as the window scrolls, or the element its `data-scroll-selector` names, read at
// each page it loads. On a desktop the list scrolls in a box of its own (styles/team-show/):
// the box is named before Lichess's scripts run, while the page parses.

const BOX = 'main.team-show .team-show__members';

export function syncMembersScroll(): void {
  const list = queryOne(document, `${BOX} .userlist.infinite-scroll`, HTMLElement);
  if (list && list.dataset.scrollSelector !== BOX) list.dataset.scrollSelector = BOX;
}
