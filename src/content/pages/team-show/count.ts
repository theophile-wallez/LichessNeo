import { createElement, queryOne } from '#shared/dom.ts';

// A team's member count stands at its title's end, where the join button goes instead
// (styles/team-show/): a copy of it heads the recent members, under their title. Lichess's
// own stays where it is, hidden.

const COPY = 'ln-ext-team-count';

export function syncTeamCount(): void {
  const count = queryOne(document, 'main.team-show > .box__top > div > a', HTMLAnchorElement);
  const title = queryOne(document, 'main.team-show .recent-members h2 > a', HTMLAnchorElement);
  if (!count || !title) return;
  let copy = queryOne(title, `.${COPY}`, HTMLElement);
  if (copy?.textContent === count.textContent) return;
  if (!copy) {
    copy = createElement('span', { className: COPY });
    title.append(copy);
  }
  copy.replaceChildren(...Array.from(count.childNodes, node => node.cloneNode(true)));
}
