import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { syncAttempts } from './attempts.ts';
import { syncPuzzleCoach } from './coach.ts';
import { syncEndResult } from './end-result.ts';
import { listenToMenu, syncPuzzleMenu } from './menu.ts';
import { createSessionSync } from './session.ts';

// The puzzle page: one panel right of the board, its header opening on the
// puzzle's details, the session's chips, the wrong tries, the coach and the
// verdict and rating's change on the end card.

export const puzzle: Feature = {
  name: 'puzzle',
  start: () => {
    onEveryTick('puzzle menu', syncPuzzleMenu);
    onEveryTick('puzzle session', createSessionSync());
    onEveryTick('puzzle attempts', syncAttempts);
    onEveryTick('puzzle coach', syncPuzzleCoach);
    onEveryTick('puzzle end result', syncEndResult);
    listenToMenu();
  },
};
