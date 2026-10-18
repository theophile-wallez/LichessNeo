import { type CoachMood, CoachMoodSchema } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { onCoachPicked, postCoachState } from '#shared/protocol.ts';
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
  /** The mood without a verdict, neutral by default. */
  readonly idle?: CoachMood;
}

export function avatarMarkup(input: AvatarInput): SafeHtml {
  const { coachId, moveClass, react, label, idle = 'neutral' } = input;
  const mood = moveClass ? classMood(moveClass) : null;
  const moodColor = mood && moveClass ? `--ln-ext-mood-c:${CLASS_COLORS[moveClass]}` : null;
  const style = moodColor === null ? '' : html` style="${moodColor}"`;
  return html`<button class="ln-ext-coach__avatar${react ? ' ln-ext-coach__avatar--react' : ''}" data-ln-ext="coach" data-ln-ext-coach-id="${coachId}" data-ln-ext-mood="${mood ?? idle}"${style} data-ln-ext-tip="${label}" aria-label="${label}"><span class="ln-ext-coach__face"></span></button>`;
}

/** Tells the content script which coach shows, how it looks, and whether it talks. */
export function tellCoach(session: Session): void {
  const { avatar } = session.coach;
  if (!avatar?.isConnected) return;
  const mood = CoachMoodSchema.safeParse(avatar.dataset.lnExtMood);
  postCoachState({
    coach: Number(avatar.dataset.lnExtCoachId),
    mood: mood.success ? mood.data : 'neutral',
    talking: session.stream.timer !== 0,
  });
}

const KEPT_ATTRIBUTES = ['data-ln-ext-coach-id', 'data-ln-ext-mood', 'style'];

// The panel is drawn again on every change, but the coach stays one element:
// a render hands it the new mood, so its animation carries on.
export function keepAvatar(session: Session): void {
  const fresh = queryOne(session.elements.panel, '.ln-ext-coach__avatar', HTMLElement);
  if (!fresh) return;
  const kept = session.coach.avatar;
  if (kept && kept !== fresh) {
    for (const name of KEPT_ATTRIBUTES) {
      const value = fresh.getAttribute(name);
      if (value === null) kept.removeAttribute(name);
      else kept.setAttribute(name, value);
    }
    kept.classList.remove('ln-ext-coach__avatar--react');
    if (fresh.classList.contains('ln-ext-coach__avatar--react')) {
      // Reading the layout restarts the marks' animation.
      void kept.offsetWidth;
      kept.classList.add('ln-ext-coach__avatar--react');
    }
    fresh.replaceWith(kept);
  } else session.coach.avatar = fresh;
  tellCoach(session);
}

/** The coach picked in the content script's coach picker, already kept, shown here. */
export function watchCoachPicks(session: Session): () => void {
  return onCoachPicked(coach => {
    if (coach === session.coach.id) return;
    session.coach.id = coach;
    const { avatar } = session.coach;
    if (avatar) avatar.dataset.lnExtCoachId = String(coach);
    tellCoach(session);
    // Each coach words the remarks their own way.
    const { mode } = session.view;
    if (mode === 'moves' || mode === 'live') session.redraw(true);
  });
}
