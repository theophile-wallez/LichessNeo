import { z } from 'zod/mini';
import { queryOne } from '#shared/dom.ts';
import { parseJson } from '#shared/json.ts';
import { flowTo } from './motion/flow.ts';

// The bar's GitHub link asks for a star, with the repository's count, read
// from GitHub's API once the page is up. Without it (offline, rate-limited),
// the star shows alone.

const REPOSITORY = 'https://api.github.com/repos/theophile-wallez/LichessNeo';

const Repository = z.object({ stargazers_count: z.number() });

async function starCount(): Promise<number | null> {
  const response = await fetch(REPOSITORY, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) return null;
  return parseJson(await response.text(), Repository)?.stargazers_count ?? null;
}

async function showCount(figure: HTMLElement): Promise<void> {
  const stars = await starCount();
  if (stars === null) return;
  flowTo(figure, 0, { continuous: true });
  requestAnimationFrame(() => flowTo(figure, stars, { continuous: true }));
}

export function showStars(): void {
  const figure = queryOne(document, '.star-link__count b', HTMLElement);
  if (figure) showCount(figure).catch(() => undefined);
}
