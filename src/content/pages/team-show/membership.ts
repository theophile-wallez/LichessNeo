import { expectFlash } from '#content/notices/expected-flash.ts';
import { message } from '#content/platform/runtime.ts';

// Joining or leaving a team says so, where Lichess's flash says "Success": the toast it
// becomes is told as the form is sent (expected-flash.ts). Leaving asks first, and Lichess's
// dialog clicks the button again once confirmed, which sends the form then.

const ACTIONS = 'main.team-show .team-show__actions > form';

/** What the team's join or leave form does, or null for another (a request's cancel). */
export function membershipAction(form: HTMLFormElement): 'join' | 'leave' | null {
  if (!form.matches(ACTIONS)) return null;
  if (form.classList.contains('quit')) return 'leave';
  return form.getAttribute('action')?.endsWith('/join') ? 'join' : null;
}

function onSubmit(event: SubmitEvent): void {
  if (!(event.target instanceof HTMLFormElement)) return;
  const action = membershipAction(event.target);
  if (action) expectFlash(message(action === 'join' ? 'teamJoined' : 'teamLeft'));
}

export function watchMembership(): void {
  document.addEventListener('submit', onSubmit, true);
}
