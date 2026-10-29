import type { Color } from '#shared/chess/types.ts';
import { closestTo, queryAll } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Player } from '#page/lichess/analysis.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Review } from '#page/review/session.ts';
import { movesMarkup } from '#page/review/view/summary-moves.ts';
import { playerProfile } from '#page/review/judge/profile.ts';
import { phasesMarkup } from '#page/review/view/summary-phases.ts';
import { playerName, playersMarkup, watchPlayerFocus } from '#page/review/view/summary-players.ts';
import { radarMarkup } from '#page/review/view/summary-radar.ts';
import { PLAYER_NAMES } from './players.ts';
import { rating, SPEED } from './rating.ts';
import { moves, review } from './review.ts';

// The review's summary of the demo's game, drawn by the extension's own
// code (page/review/view/summary-*.ts): the players' cards, the moves per
// class and the phases. A count goes to its first move on the demo's board.

const ORDER: readonly Color[] = ['white', 'black'];

const summarized: Review = review(rating);

// As a user's: the avatar is picked from the name, as on the bars.
const players: Readonly<Record<Color, Player>> = {
  white: { color: 'white', user: { username: PLAYER_NAMES.white } },
  black: { color: 'black', user: { username: PLAYER_NAMES.black } },
};

// A URL in a custom property resolves against the sheet that reads it: an absolute one.
function paintAvatars(root: HTMLElement): void {
  for (const avatar of queryAll(root, '[data-ln-ext-avatar-coach]', HTMLElement)) {
    const still = `img/coaches/mascot-${avatar.dataset.lnExtAvatarCoach ?? '1'}.webp`;
    avatar.style.setProperty('--avatar-coach', `url(${new URL(still, document.baseURI).href})`);
  }
}

export interface SummaryOptions {
  readonly language: ReviewLanguage;
  /** Shows the move of `ply` on the demo's board. */
  readonly go: (ply: number) => void;
  /** The players' profiles too, as the review's panel has them under the phases. */
  readonly radar?: boolean;
}

const profiles = { white: playerProfile(moves, 'white'), black: playerProfile(moves, 'black') };

const radar = (language: ReviewLanguage): SafeHtml =>
  radarMarkup({
    profiles,
    names: {
      white: playerName(players.white, language),
      black: playerName(players.black, language),
    },
    language,
    order: ORDER,
  });

export class Summary {
  readonly #root: HTMLElement;
  readonly #options: SummaryOptions;
  #allRows = false;

  constructor(root: HTMLElement, options: SummaryOptions) {
    this.#root = root;
    this.#options = options;
    root.addEventListener('click', event => this.#click(event.target));
  }

  /** Drawn again when a row is opened or the ratings switch to Chess.com's. */
  draw(): void {
    const { language } = this.#options;
    setHtml(
      this.#root,
      html`${playersMarkup({ review: summarized, players, winner: 'white', language, order: ORDER, speed: SPEED })}
        <div class="summary__lists">
          <div>${movesMarkup({ review: summarized, allRows: this.#allRows, language, order: ORDER })}</div>
          <div>${phasesMarkup({ rating, language, order: ORDER })}</div>
        </div>
        ${this.#options.radar ? radar(language) : ''}`,
    );
    paintAvatars(this.#root);
    watchPlayerFocus(this.#root);
  }

  #click(target: EventTarget | null): void {
    if (closestTo(target, '[data-ln-ext=rows]', HTMLElement)) {
      this.#allRows = !this.#allRows;
      this.draw();
      return;
    }
    const jump = closestTo(target, '[data-ln-ext=jump]', HTMLElement);
    if (!jump) return;
    const { lnExtColor: color, lnExtClass: moveClass } = jump.dataset;
    const move = moves.find(found => found.color === color && found.moveClass === moveClass);
    if (move) this.#options.go(move.ply);
  }
}
