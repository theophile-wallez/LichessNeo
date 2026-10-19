import { queryAll, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import {
  addPart,
  addScrim,
  aim,
  copyAvatar,
  playerName,
  ringAvatar,
  type GameSetup,
  type Intro,
  type Side,
  type Stage,
} from './stage.ts';

// The ticket: a ticket for the game lands on the board, the opponent on its top
// half with the time control, the player on its bottom one. It tears along its perforation, and each half flies into its player's avatar (styles/game/intro/ticket.css).

function who(side: Side): SafeHtml {
  const { title, rating } = side.player;
  return html`<span class="ln-ext-intro-ticket__avatar"></span>
    <span class="ln-ext-intro-ticket__who">
      <b>${title === undefined ? '' : html`<span class="ln-ext-intro-ticket__title">${title}</span>`}${playerName(side.player)}</b>
      ${rating === undefined ? '' : html`<small>${rating}</small>`}
    </span>`;
}

// The time control first, with the speed's glyph, then the rest: "Rated · Blitz".
function setupMarkup({ icon, parts: [first, ...rest] }: GameSetup): SafeHtml {
  if (first === undefined) return html``;
  return html`<span class="ln-ext-intro-ticket__setup">
    <span><span class="ln-ext-intro-ticket__speed"${icon === undefined ? '' : html` data-icon="${icon}"`}></span>${first}</span>
    ${rest.length > 0 ? html`<em>${rest.join(' · ')}</em>` : ''}
  </span>`;
}

function play(stage: Stage): void {
  addScrim(stage);
  const ticket = addPart(stage, 'ln-ext-intro-ticket');
  setHtml(
    ticket,
    html`<div class="ln-ext-intro-ticket__half ln-ext-intro-ticket__half--top">${who(stage.top)}${setupMarkup(stage.setup)}</div>
      <div class="ln-ext-intro-ticket__half ln-ext-intro-ticket__half--bottom">${who(stage.bottom)}</div>`,
  );
  const halves = queryAll(ticket, '.ln-ext-intro-ticket__half', HTMLElement);
  for (const [index, side] of [stage.top, stage.bottom].entries()) {
    const half = halves[index];
    if (!half) continue;
    const avatar = queryOne(half, '.ln-ext-intro-ticket__avatar', HTMLElement);
    if (avatar) copyAvatar(avatar, side);
    aim(stage, half, side.avatar);
  }
  ringAvatar(stage, stage.top, 'top');
  ringAvatar(stage, stage.bottom, 'bottom');
}

export const ticket: Intro = { ms: 2450, play };
