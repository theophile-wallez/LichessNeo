import { html, type SafeHtml } from '#shared/html.ts';

/** The player's coach on a dashboard's card, its still until the live one is drawn over it
 * (coach.ts); nothing with no coach, the card's words alone. */
export const mascotMarkup = (coachId: number | null): SafeHtml | null =>
  coachId === null
    ? null
    : html`<span class="ln-ext-pdash__mascot" data-ln-ext-avatar-coach="${coachId}"></span>`;
