import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onSettings, type Settings } from '#content/settings/settings.ts';

// The rating the review says each side played at ("You played like a 1600 Elo"), off unless
// the settings say: `data-ln-ext-review-rating` on <html> shows it (styles/review/summary-players.css).

function show({ reviewRating }: Settings): void {
  setData(document.documentElement, 'lnExtReviewRating', reviewRating ? '' : null);
}

export const reviewRating: Feature = {
  name: 'review rating',
  start: () => onSettings(show),
};
