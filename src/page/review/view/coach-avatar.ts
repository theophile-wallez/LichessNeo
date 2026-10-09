import { COACH_COUNT, CoachMoodSchema } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { postCoachState } from '#shared/protocol.ts';
import { StorageKey, writeStored } from '#shared/storage.ts';
import { CLASS_COLORS, classMood, type MoveClass } from '#page/review/classes/classes.ts';
import type { AvatarState, Session } from '#page/review/session.ts';

// The coach's face shows the verdict, played by the content script's rig
// (src/content/coach), which can reach the extension's files. Its marks over
// the head pop up once per move, not on every render of the same move.

/** Whether the marks pop for this verdict: the first time the coach reacts to it on this move. */
export function takeReaction(coach: AvatarState, moveClass: MoveClass | null, at: string): boolean {
  const key = moveClass && classMood(moveClass) ? `${at}|${moveClass}` : '';
  const react = key !== '' && key !== coach.reacted;
  coach.reacted = key;
  return react;
}

export interface AvatarInput {
  readonly coachId: number;
  /** The verdict the coach reacts to, if any. */
  readonly moveClass: MoveClass | null;
  /** The marks pop (see `takeReaction`). */
  readonly react: boolean;
  readonly label: string;
}

export function avatarMarkup({ coachId, moveClass, react, label }: AvatarInput): SafeHtml {
  const mood = moveClass ? classMood(moveClass) : null;
  const moodColor = mood && moveClass ? `--lr-ext-mood-c:${CLASS_COLORS[moveClass]}` : null;
  const style = moodColor === null ? '' : html` style="${moodColor}"`;
  return html`<button class="lr-ext-coach__avatar${react ? ' lr-ext-coach__avatar--react' : ''}" data-lr-ext="coach" data-lr-ext-coach-id="${coachId}" data-lr-ext-mood="${mood ?? 'neutral'}"${style} data-lr-ext-tip="${label}" aria-label="${label}"><span class="lr-ext-coach__face"></span></button>`;
}

/** Tells the content script which coach shows, how it looks, and whether it talks. */
export function tellCoach(session: Session): void {
  const { avatar } = session.coach;
  if (!avatar?.isConnected) return;
  const mood = CoachMoodSchema.safeParse(avatar.dataset.lrExtMood);
  postCoachState({
    coach: Number(avatar.dataset.lrExtCoachId),
    mood: mood.success ? mood.data : 'neutral',
    talking: session.stream.timer !== 0,
  });
}

const KEPT_ATTRIBUTES = ['data-lr-ext-coach-id', 'data-lr-ext-mood', 'style'];

// The panel is drawn again on every change, but the coach stays one element:
// a render hands it the new mood, so its animation carries on.
export function keepAvatar(session: Session): void {
  const fresh = queryOne(session.elements.panel, '.lr-ext-coach__avatar', HTMLElement);
  if (!fresh) return;
  const kept = session.coach.avatar;
  if (kept && kept !== fresh) {
    for (const name of KEPT_ATTRIBUTES) {
      const value = fresh.getAttribute(name);
      if (value === null) kept.removeAttribute(name);
      else kept.setAttribute(name, value);
    }
    kept.classList.remove('lr-ext-coach__avatar--react');
    if (fresh.classList.contains('lr-ext-coach__avatar--react')) {
      // Reading the layout restarts the marks' animation.
      void kept.offsetWidth;
      kept.classList.add('lr-ext-coach__avatar--react');
    }
    fresh.replaceWith(kept);
  } else session.coach.avatar = fresh;
  tellCoach(session);
}

/** The next coach, kept for the next review; each words the remarks their own way. */
export function nextCoach(session: Session, avatar: HTMLElement): void {
  const coach = (session.coach.id % COACH_COUNT) + 1;
  session.coach.id = coach;
  writeStored(StorageKey.coach, coach);
  avatar.dataset.lrExtCoachId = String(coach);
  tellCoach(session);
}
