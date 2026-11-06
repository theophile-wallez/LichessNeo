// How a pack is shared on GitHub so others find it: a repository of its own,
// named with the prefix and tagged with the topic, which a search of GitHub
// lists (docs/packs.md, "Sharing a pack").

export const PACK_REPO_PREFIX = 'LichessNeoPack_';
export const PACK_TOPIC = 'lichess-neo-pack';

const MAX_REPO = 100;

/** "Bois d'été" is `LichessNeoPack_BoisDEte`: GitHub takes only ASCII letters, digits, `.`, `-` and `_`. */
export function packRepoName(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^A-Za-z\d]+/)
    .filter(word => word !== '');
  const joined = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return `${PACK_REPO_PREFIX}${joined || 'Pack'}`.slice(0, MAX_REPO);
}
