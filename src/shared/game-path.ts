// Lichess serves every game page under `/game/`: `/game/<id>` for a watcher,
// the side it's seen from after it (`/game/<id>/black`, or `?pov=<user>`), and
// `/game/<fullId>` for a player, whose id carries four more letters. It
// redirects the older `/<id>/<color>`, so no page stays there.

/** A game's page, played or watched (`/game/abcd1234/black`). */
export const GAME_PAGE = /^\/game\/[a-zA-Z0-9]{8}(?:[a-zA-Z0-9]{4})?(?:\/(?:white|black))?\/?$/;

/** The game id a game's path or link starts with, without a player's four letters. */
export const gameIdFrom = (path: string): string | null =>
  /^\/game\/([a-zA-Z0-9]{8})/.exec(path)?.[1] ?? null;
