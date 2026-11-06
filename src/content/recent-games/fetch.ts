import { recentGames, type RecentGame } from './games.ts';

// A player's last games, asked of Lichess's game export, a few more than shown
// for the aborted ones left out. None if it fails: the section then stays out.

const SPARE = 5;

/** The player's `limit` newest games, none if the export can't be read. */
export async function fetchRecentGames(name: string, limit: number): Promise<RecentGame[]> {
  const query = `max=${limit + SPARE}&moves=false&tags=false&opening=false&lastFen=true`;
  try {
    const response = await fetch(`/api/games/user/${encodeURIComponent(name)}?${query}`, {
      headers: { Accept: 'application/x-ndjson' },
    });
    return response.ok ? recentGames(await response.text(), name, limit) : [];
  } catch {
    return [];
  }
}
