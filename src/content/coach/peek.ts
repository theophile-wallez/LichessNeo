import { CoachIdSchema, type CoachMood, CoachMoodSchema, shownCoach } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import { MascotSpot } from './spot.ts';

// The coach of the closed review's folded card (page/review/view/card-peek.ts),
// live over its still: the still smiles, whatever the result, and the strip
// shows while the card's own coach is folded away. It comes in neutral, as its
// still looks, then takes the card's face, sad for a defeat.

const HOLDER = 'html.ln-ext-review-folded #ln-ext-review .ln-ext-end__peek-coach';

const spot = new MascotSpot({
  className: 'ln-ext-end__peek-live',
  framing: 'bust',
  greets: false,
  whenIdle: true,
  onDrawn: () => syncPeekCoach(),
});

let synced: { holder: HTMLElement | null; state: string } = { holder: null, state: '' };

/** Plays the folded card's coach, or takes it away once the strip is gone. Cheap when nothing changed. */
export function syncPeekCoach(): void {
  const found = shownCoach() === null ? null : queryOne(document, HOLDER, HTMLElement);
  const coach = CoachIdSchema.safeParse(found?.dataset.lnExtAvatarCoach);
  const holder = found && coach.success ? found : null;
  const mood = CoachMoodSchema.safeParse(holder?.dataset.lnExtMood);
  const drawn = holder?.dataset.lnExtLive !== undefined;
  const face: CoachMood = drawn && mood.success ? mood.data : 'neutral';
  const id = coach.success ? coach.data : 0;
  const state = `${id}|${face}`;
  if (holder === synced.holder && state === synced.state) return;
  synced = { holder, state };
  spot.sync(holder, face, { coach: id });
}
