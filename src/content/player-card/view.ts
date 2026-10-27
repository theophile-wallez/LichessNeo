import { gameRatingColor } from '#shared/charts/colors.ts';
import { curvePaths } from '#shared/charts/sparkline.ts';
import { chesscomRating, chesscomRatingChange } from '#shared/chesscom-rating/convert.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { nonEmpty } from '#shared/text.ts';
import { timeSince } from '#shared/time-since.ts';
import { message } from '#content/platform/runtime.ts';
import type { Speed } from '#content/sidebar/top-rating.ts';
import {
  formOf,
  FORM_GAMES,
  headlineOf,
  playedTime,
  shareOf,
  tallyOf,
  type Headline,
  type Tally,
} from './facts.ts';
import { bestWinBone, curveBone, formBone, standingBone } from './skeleton.ts';
import type { CardData } from './sources.ts';

// The rows the hover card gets of its own (styles/powertip/stats.css), under
// Lichess's rating chips: who the player is, the rating they play most with its
// last month, their record, their form and their best win. A row whose data is
// on its way holds its room with a bone (skeleton.ts).

// Below that, a streak isn't worth saying.
const LEAST_STREAK = 3;

const SPEED_NAMES: Readonly<Record<Speed, string>> = {
  ultraBullet: 'speedUltraBullet',
  bullet: 'speedBullet',
  blitz: 'speedBlitz',
  rapid: 'speedRapid',
  classical: 'speedClassical',
  correspondence: 'speedCorrespondence',
};

const locale = pageLocale();
const NUMBER = new Intl.NumberFormat(locale);
// A rating is written out in full, as Lichess writes it: no thousands separator.
const RATING = new Intl.NumberFormat(locale, { useGrouping: false });
const SIGNED = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
const TENTH = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const SINCE = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });

const CURVE_FILL = 'ln-ext-upt-curve';

/** A row's items, those Lichess said nothing about left out. */
const listed = <T>(items: readonly (T | false | null | undefined)[]): T[] =>
  items.filter((item): item is T => item !== false && item !== null && item !== undefined);

/** A rating as the card writes it: its Chess.com equivalent with the setting on. */
function shownRating(speed: string, rating: number, chesscom: boolean): string {
  const equivalent = chesscom ? chesscomRating(speed, rating) : null;
  return RATING.format(equivalent ? equivalent.rating : Math.round(rating));
}

/** Who they are and when they last played: a dim line of what Lichess knows. */
function metaRow({ user, online, now }: CardData): SafeHtml | null {
  const played = user.playTime ? playedTime(user.playTime.total) : null;
  // The green dot on their avatar already says they're here.
  const since = user.seenAt === undefined || online ? null : timeSince(user.seenAt, now);
  const items = listed([
    user.streaming === true && html`<span class="ln-ext-upt__live">${message('cardLive')}</span>`,
    user.profile?.fideRating !== undefined &&
      message('cardFide', RATING.format(user.profile.fideRating)),
    nonEmpty(user.profile?.location),
    since && SINCE.format(since.value, since.unit),
    played &&
      message(
        played.unit === 'hour' ? 'cardPlayedHours' : 'cardPlayedMinutes',
        NUMBER.format(played.value),
      ),
  ]);
  if (items.length === 0) return null;
  return html`<div class="ln-ext-upt__meta">${items.map(item => html`<span>${item}</span>`)}</div>`;
}

function sparkline(curve: readonly number[], pending: boolean): SafeHtml {
  if (pending) return curveBone();
  const paths = curvePaths(curve);
  if (!paths) return html`<span class="ln-ext-upt__curve ln-ext-upt__curve--empty"></span>`;
  return html`<svg class="ln-ext-upt__curve" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${CURVE_FILL}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" class="ln-ext-upt__stop" />
        <stop offset="1" class="ln-ext-upt__stop ln-ext-upt__stop--end" />
      </linearGradient>
    </defs>
    <path class="ln-ext-upt__area" d="${paths.area}" fill="url(#${CURVE_FILL})" />
    <path class="ln-ext-upt__line" d="${paths.line}" />
  </svg>`;
}

// As on the home's cards, the Chess.com rating stands in for the Lichess one
// with the setting on, which its tooltip gives (content/ui/tooltip.ts).
function headlineRating({ speed, rating, provisional }: Headline, chesscom: boolean): SafeHtml {
  const lichess = RATING.format(Math.round(rating));
  const equivalent = chesscom ? chesscomRating(speed, rating) : null;
  const tip = equivalent
    ? html` data-ln-ext-lichess-rating="${lichess}" data-ln-ext-tip="${message('lichessRatingTip', lichess)}"`
    : '';
  return html`<span class="ln-ext-upt__rating"${tip}>${
    equivalent ? RATING.format(equivalent.rating) : lichess
  }${provisional && html`<small>?</small>`}</span>`;
}

const trendOf = (progress: number | undefined): 'up' | 'down' | null => {
  if (progress === undefined) return null;
  return progress > 0 ? 'up' : 'down';
};

// The progress beside the rating, flat ones left out. With the setting on it
// spans the two converted ratings, today's and the one a dozen games back,
// and gives Lichess's own in its tooltip, as the rating does.
function headlineProgress({ speed, rating, progress }: Headline, chesscom: boolean): SafeHtml | '' {
  const trend = trendOf(progress);
  if (trend === null || progress === undefined) return '';
  const lichess = SIGNED.format(progress);
  const today = Math.round(rating);
  const equivalent = chesscom
    ? chesscomRatingChange(speed, { before: today - progress, after: today })
    : null;
  const tip =
    equivalent === null ? '' : html` data-ln-ext-tip="${message('lichessRatingTip', lichess)}"`;
  return html`<span class="ln-ext-upt__prog" data-ln-ext-trend="${trend}"${tip}>${
    equivalent === null ? lichess : SIGNED.format(equivalent)
  }</span>`;
}

/** The rating they play most, its progress and its last month, a link to its stats. */
function headlineRow(headline: Headline, data: CardData): SafeHtml {
  const { speed, curve } = headline;
  const stats = `/@/${encodeURIComponent(data.name)}/perf/${speed}`;
  return html`<a class="ln-ext-upt__headline" href="${stats}" data-ln-ext-speed="${speed}" style="--ln-ext-speed-color: ${gameRatingColor(speed)}">
    <span class="ln-ext-upt__speed">${message(SPEED_NAMES[speed])}</span>
    ${headlineRating(headline, data.chesscom)}
    ${headlineProgress(headline, data.chesscom)}
    ${sparkline(curve, data.pending.includes('history'))}
  </a>`;
}

/** Where that rating stands: its rank, its best, and the opponents it was played against. */
function standingRow(data: CardData, speed: Speed): SafeHtml | null {
  if (data.pending.includes('stat')) return standingBone();
  const { rank, percentile, stat } = data.stat ?? {};
  const highest = stat?.highest?.int;
  const opponents = stat?.count?.opAvg;
  const items = listed([
    rank === null || rank === undefined ? null : `#${NUMBER.format(rank)}`,
    percentile === null || percentile === undefined
      ? null
      : message('cardTop', TENTH.format(Math.max(0.1, 100 - percentile))),
    highest !== undefined && message('cardHighest', shownRating(speed, highest, data.chesscom)),
    opponents !== undefined &&
      message('cardOpponents', shownRating(speed, opponents, data.chesscom)),
  ]);
  if (items.length === 0) return null;
  return html`<div class="ln-ext-upt__facts">${items.map(item => html`<span>${item}</span>`)}</div>`;
}

const SHARES = [
  { result: 'win', label: 'cardWinShare' },
  { result: 'draw', label: 'cardDrawShare' },
  { result: 'loss', label: 'cardLossShare' },
] as const;

/** Their games won, drawn and lost: one bar, then the three shares. */
function tallyRows(tally: Tally): SafeHtml {
  const parts = SHARES.map(share => ({
    result: share.result,
    label: share.label,
    count: tally[share.result],
  }));
  return html`<div class="ln-ext-upt__bar" aria-hidden="true">
      ${parts
        .filter(part => part.count > 0)
        .map(
          part =>
            html`<span data-ln-ext-result="${part.result}" style="flex-grow: ${part.count}"></span>`,
        )}
    </div>
    <div class="ln-ext-upt__legend">
      ${parts.map(
        part =>
          html`<span data-ln-ext-result="${part.result}">${message(part.label, NUMBER.format(shareOf(part.count, tally.total)))}</span>`,
      )}
    </div>`;
}

/** Their last games, the newest first, each a link to its own, and a streak running. */
function formRow(data: CardData): SafeHtml | null {
  if (data.pending.includes('games')) return formBone();
  const form = data.games ? formOf(data.games, data.name, FORM_GAMES) : [];
  const streak = data.stat?.stat.resultStreak?.win.cur.v;
  if (form.length === 0) return null;
  const running = streak !== undefined && streak >= LEAST_STREAK ? streak : null;
  return html`<div class="ln-ext-upt__form">
    ${form.map(
      game =>
        html`<a class="ln-ext-upt__dot" data-ln-ext-result="${game.result}" href="/${game.gameId}"></a>`,
    )}
    ${
      running !== null &&
      html`<span class="ln-ext-upt__streak">${message('cardStreak', NUMBER.format(running))}</span>`
    }
  </div>`;
}

/** The best win Lichess has on record for that rating. */
function bestWinRow(data: CardData, speed: Speed): SafeHtml | null {
  if (data.pending.includes('stat')) return bestWinBone();
  const best = data.stat?.stat.bestWins?.results[0];
  if (!best) return null;
  const rating = shownRating(speed, best.opRating, data.chesscom);
  return html`<a class="ln-ext-upt__best" href="/${best.gameId}">${message('cardBeat', best.opId.name, rating)}</a>`;
}

/** The rows as the data stands, or null while there's nothing to show. */
export function cardMarkup(data: CardData): SafeHtml | null {
  const headline = headlineOf(data.user, data.history);
  const tally = tallyOf(data.user);
  const rows = listed([
    metaRow(data),
    headline && headlineRow(headline, data),
    headline && standingRow(data, headline.speed),
    tally && tallyRows(tally),
    formRow(data),
    headline && bestWinRow(data, headline.speed),
  ]);
  return rows.length === 0 ? null : html`${rows}`;
}
