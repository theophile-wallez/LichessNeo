import { shownCoach } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess's word over the moves before the first one ("You play the white
// pieces. It's your turn!"), said by the coach in the Game Review's bubble
// (styles/game/coach-message.css), or by the computer's robot in a game against
// it. The stylesheet shows its still at once; the live one, built once the
// page is idle, takes its place when first drawn (`data-ln-ext-live`). The
// message goes with the first move, and the mascot with it. With no coach, the
// robot doesn't show either: the card holds Lichess's words alone.

const spot = new MascotSpot({
  className: 'ln-ext-message-coach',
  framing: 'bust',
  greets: false,
  whenIdle: true,
});
let coach: number | null | undefined;

function sync(): void {
  const message = queryOne(document, 'main.round .round__app .message', HTMLElement);
  if (coach === undefined && message) coach = shownCoach();
  if (!message || coach === null || coach === undefined) {
    spot.sync(null, 'neutral', { coach: 1 });
    return;
  }
  // Set by ai-players.ts in a game against the computer.
  const level = Number(document.documentElement.dataset.lnExtAiLevel ?? 0);
  // Neutral, as its still: a happy mascot hops.
  spot.sync(message, 'neutral', level > 0 ? { computer: level } : { coach });
}

export const coachMessage: Feature = {
  name: 'coach message',
  start: () => onEveryTick('coach message', sync),
};
