import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import CommentAdd01Icon from '@hugeicons/core-free-icons/CommentAdd01Icon';
import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import { coachOf, coachPick } from '#shared/coach.ts';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { isFirefox, message } from '#content/platform/runtime.ts';
import { type Cast, MascotSpot } from '#content/coach/spot.ts';
import { arcStars } from './support-stars.ts';

// The settings' Support page, for those who'd like to help the extension: the
// user's coach on a stage under an arc of stars, then a star on GitHub, the
// quickest, and a review on the store the extension came from, the other
// store's link quieter (styles/pages/settings-support.css).

const REPOSITORY_URL = 'https://github.com/theophile-wallez/LichessNeo';

interface Store {
  readonly name: string;
  readonly reviewUrl: string;
}

const CHROME_WEB_STORE: Store = {
  name: 'Chrome Web Store',
  reviewUrl: 'https://chromewebstore.google.com/detail/diklhheikbkkodchopfhidgjkdjdjpla/reviews',
};

// AMO takes a rating on the add-on's own page.
const FIREFOX_ADD_ONS: Store = {
  name: 'Firefox Add-ons',
  reviewUrl: 'https://addons.mozilla.org/firefox/addon/lichess-neo/',
};

/** Both stores, the one the extension came from first: Edge, Brave and the rest install from Chrome's. */
export const reviewStores = (firefox: boolean): readonly [Store, Store] =>
  firefox ? [FIREFOX_ADD_ONS, CHROME_WEB_STORE] : [CHROME_WEB_STORE, FIREFOX_ADD_ONS];

const STARS = arcStars({ count: 7, radius: 140, spread: 190, largest: 44, smallest: 20 });
const RINGS = 3;

// The stage's specks: x from its middle and y from its top, in px.
interface Speck {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly hue: 'yellow' | 'pink' | 'cyan' | 'purple';
}

const SPARKS: readonly Speck[] = [
  { x: -270, y: 40, size: 22, hue: 'yellow' },
  { x: 250, y: 50, size: 18, hue: 'pink' },
  { x: -215, y: 160, size: 14, hue: 'cyan' },
  { x: 285, y: 150, size: 20, hue: 'yellow' },
];

const DOTS: readonly Speck[] = [
  { x: -320, y: 100, size: 6, hue: 'pink' },
  { x: 330, y: 30, size: 5, hue: 'cyan' },
  { x: 205, y: 190, size: 7, hue: 'purple' },
  { x: -175, y: 200, size: 5, hue: 'yellow' },
  { x: -70, y: 14, size: 4, hue: 'cyan' },
  { x: 95, y: 10, size: 5, hue: 'pink' },
];

const speckMarkup = (kind: 'spark' | 'dot', { x, y, size, hue }: Speck): SafeHtml =>
  html`<span class="ln-ext-support__${kind}" style="--ln-ext-speck-x:${x};--ln-ext-speck-y:${y};--ln-ext-speck-size:${size};--ln-ext-speck-color:var(--ln-ext-${hue})">${kind === 'spark' ? hugeicon(SparklesIcon) : ''}</span>`;

const repeat = (count: number, markup: SafeHtml): SafeHtml[] =>
  Array.from({ length: count }, () => markup);

const stageMarkup = (): SafeHtml =>
  html`<div class="ln-ext-support__stage" aria-hidden="true">
    ${repeat(RINGS, html`<span class="ln-ext-support__ring"></span>`)}
    ${STARS.map(
      ({ x, y, size, tilt, order }) =>
        html`<span class="ln-ext-support__star" style="--ln-ext-star-x:${x};--ln-ext-star-y:${y};--ln-ext-star-size:${size};--ln-ext-star-tilt:${tilt}deg;--ln-ext-star-order:${order}">${hugeicon(StarIcon)}</span>`,
    )}
    ${SPARKS.map(spark => speckMarkup('spark', spark))}
    ${DOTS.map(dot => speckMarkup('dot', dot))}
    <span class="ln-ext-support__mascot"></span>
  </div>`;

interface Card {
  readonly kind: 'star' | 'review';
  readonly step: string;
  readonly logo: SafeHtml;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly action: string;
  /** Under the button: a quieter link. */
  readonly extras?: SafeHtml;
}

const cardMarkup = ({ kind, step, logo, title, body, href, action, extras }: Card): SafeHtml =>
  html`<div class="ln-ext-support__card" data-ln-ext-support="${kind}">
    <div class="ln-ext-support__head">
      <span class="ln-ext-support__logo" aria-hidden="true">${logo}</span>
      <span class="ln-ext-support__step">${step}</span>
    </div>
    <div>
      <h2 class="ln-ext-support__name">${title}</h2>
      <p class="ln-ext-support__body">${body}</p>
    </div>
    <a class="button" href="${href}" target="_blank" rel="noopener">${hugeicon(StarIcon)}<span>${action}</span></a>
    ${extras ?? ''}
  </div>`;

const otherStoreMarkup = (store: Store): SafeHtml =>
  html`<a class="ln-ext-support__other" href="${store.reviewUrl}" target="_blank" rel="noopener">
    <span>${message('supportReviewOther', store.name)}</span>${hugeicon(ArrowRight01Icon)}
  </a>`;

function pageMarkup(): SafeHtml {
  const [store, other] = reviewStores(isFirefox());
  return html`<div class="ln-ext-support__hero">
      ${stageMarkup()}
      <h2 class="ln-ext-support__title">${message('supportTitle')}</h2>
      <p class="ln-ext-support__lead">${message('supportLead')}</p>
    </div>
    <div class="ln-ext-support__cards">
      ${cardMarkup({
        kind: 'star',
        step: message('supportStarStep'),
        logo: hugeicon(GithubIcon),
        title: message('supportStarTitle'),
        body: message('supportStarBody'),
        href: REPOSITORY_URL,
        action: message('supportStar'),
      })}${cardMarkup({
        kind: 'review',
        step: message('supportReviewStep'),
        logo: hugeicon(CommentAdd01Icon),
        title: message('supportReviewTitle', store.name),
        body: message('supportReviewBody'),
        href: store.reviewUrl,
        action: message('supportReview'),
        extras: otherStoreMarkup(other),
      })}
    </div>`;
}

export interface SupportPage {
  readonly element: HTMLElement;
  /** Brings the coach in as the page shows, and takes it away as it hides. */
  readonly show: (visible: boolean) => void;
}

/** The page, its coach the one picked on the Profile page, live only while the page shows. */
export function buildSupportPage(): SupportPage {
  const element = createElement('div', { className: 'ln-ext-support' });
  setHtml(element, pageMarkup());
  const mascot = queryOne(element, '.ln-ext-support__mascot', HTMLElement);
  let cast: Cast = { coach: 1 };
  let visible = false;
  // It comes in neutral, as its still looks, and smiles once drawn: the swap never shows.
  const spot: MascotSpot = new MascotSpot({
    className: 'ln-ext-support__live',
    framing: 'bust',
    whenIdle: true,
    onDrawn: holder => spot.sync(holder, 'happy', cast),
  });
  const show = (next: boolean): void => {
    if (next === visible) return;
    visible = next;
    // Picked on the Profile page, maybe since this page was built.
    const coach = coachOf(coachPick());
    cast = { coach: coach ?? 1 };
    if (mascot) {
      setData(mascot, 'lnExtAvatarCoach', coach === null ? null : String(coach));
      mascot.hidden = coach === null;
    }
    spot.sync(visible && coach !== null ? mascot : null, 'neutral', cast);
  };
  return { element, show };
}
