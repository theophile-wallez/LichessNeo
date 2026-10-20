import type { CustomSeek, Variant } from '#shared/custom-seek.ts';

// The lobby seeks a lobby socket asks for, posted for its sri as Lichess's own
// lobby posts them: like a game (lila's controllers.Setup.like) or from the
// game setup's form (Setup.hook, its fields as ui/lobby/src/setupCtrl.ts sends them).

// scalachess's variant ids.
const VARIANT_IDS: Readonly<Record<Variant, number>> = {
  standard: 1,
  chess960: 2,
  kingOfTheHill: 4,
  threeCheck: 5,
  antichess: 6,
  atomic: 7,
  horde: 8,
  racingKings: 9,
  crazyhouse: 10,
};

// lila's TimeMode.RealTime.
const REAL_TIME = '1';

async function post(path: string, body?: URLSearchParams): Promise<boolean> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      ...(body && { body }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** The setup form's fields for `seek`; Lichess makes a rated seek casual where it can't be. */
export const hookForm = ({ variant, minutes, increment, rated }: CustomSeek): URLSearchParams =>
  new URLSearchParams({
    variant: String(VARIANT_IDS[variant]),
    timeMode: REAL_TIME,
    time: String(minutes),
    increment: String(increment),
    days: '2',
    mode: rated ? '1' : '0',
    color: 'random',
  });

export const postHookLike = (sri: string, gameId: string): Promise<boolean> =>
  post(`/setup/hook/${encodeURIComponent(sri)}/like/${encodeURIComponent(gameId)}`);

export const postHook = (sri: string, seek: CustomSeek): Promise<boolean> =>
  post(`/setup/hook/${encodeURIComponent(sri)}`, hookForm(seek));

/** Lichess's game setup with `seek` filled in, to fall back on (lila's ui/lobby/src/ctrl.ts). */
export function setupUrl({ variant, minutes, increment, rated }: CustomSeek): string {
  const params = new URLSearchParams({
    variant,
    time: 'realTime',
    minutesPerSide: String(minutes),
    increment: String(increment),
    gameMode: rated ? 'rated' : 'casual',
  });
  return `/?${params}#hook`;
}
