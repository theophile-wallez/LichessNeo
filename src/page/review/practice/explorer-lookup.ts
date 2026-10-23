import type { Explorer, ExplorerData } from '#page/lichess/explorer.ts';
import { ExplorerDataSchema } from '#page/lichess/explorer.ts';
import { parseJson } from '#shared/json.ts';
import { START_FEN } from '#shared/chess/fen.ts';

// A position looked up in the explorer's masters database away from the board,
// as Lichess's explorer asks it (ui/analyse/src/explorer/explorerXhr.ts): the
// start and the moves from it, the session's cookies with it.

/** What the masters played after `play` (UCI moves from the start); null when it can't tell. */
export async function mastersAfter(
  explorer: Explorer,
  play: readonly string[],
): Promise<ExplorerData | null> {
  const { endpoint } = explorer;
  if (!endpoint) return null;
  const url = new URL('./masters', endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
  url.searchParams.set('fen', START_FEN);
  url.searchParams.set('play', play.join(','));
  url.searchParams.set('topGames', '0');
  url.searchParams.set('source', 'analysis');
  const response = await fetch(url.href, { cache: 'default', credentials: 'include' });
  if (!response.ok) return null;
  const [last] = (await response.text()).trim().split('\n').slice(-1);
  return parseJson(last, ExplorerDataSchema);
}
