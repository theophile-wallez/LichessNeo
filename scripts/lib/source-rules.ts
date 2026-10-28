// Rules the linters can't express, checked over every source file:
// - no comment that switches a check off,
// - no `#` alias into the file's own folder, where `./` is the way,
// - stylesheets short enough to read, and no asset loaded from another site,
// - a lockfile that pins pnpm the way pnpm's own version switch expects.

import path from 'node:path';

const MAX_CSS_LINES = 400;

// A URL where CSS loads it (`url()`, `@import`, `image-set()`), with a scheme
// in any case or protocol-relative. Lichess's own assets are the page's, and an
// inline SVG's namespace is a name, not a download.
const REMOTE_URL =
  /(?:url\(\s*['"]?|@import\s+['"]|image-set\([^;}]*?['"])(?:https?:)?\/\/(?!(?:lichess1?\.org|www\.w3\.org)\/)/i;

// package.json's `imports`, where each alias points (a test keeps the two in step).
export const ALIASES: Readonly<Record<string, string>> = {
  '#background/': 'src/background/',
  '#content/': 'src/content/',
  '#page/': 'src/page/',
  '#shared/': 'src/shared/',
  '#locales/': 'public/_locales/',
  '#scripts/': 'scripts/',
};

const IMPORT_SPECIFIER = /(?:from|import)\s*\(?\s*['"](#[a-z]+\/[^'"]+)['"]/g;

/** An import through a `#` alias of a file in the importer's own folder or below. */
function selfAlias(file: string, text: string): string | null {
  const folder = `${path.posix.dirname(file)}/`;
  for (const [, specifier = ''] of text.matchAll(IMPORT_SPECIFIER)) {
    const alias = Object.keys(ALIASES).find(prefix => specifier.startsWith(prefix));
    const target =
      alias === undefined ? '' : `${ALIASES[alias] ?? ''}${specifier.slice(alias.length)}`;
    if (target.startsWith(folder)) return `imports ${specifier} through an alias: use ./`;
  }
  return null;
}

// The version of `pnpm` and of `@pnpm/exe` in the lockfile's packageManagerDependencies.
const PINNED_PNPM = /^ {6}(pnpm|'@pnpm\/exe'):\n {8}specifier: .*\n {8}version: (.+)$/gm;

/**
 * A pnpm that isn't packageManager's version switches to it, and rewrites the
 * lockfile unless it pins both packages at that version. pnpm run at the
 * version itself (corepack, CI) never adds `@pnpm/exe` back.
 */
function unpinnedPnpm(text: string): string | null {
  const versions = new Map(
    [...text.matchAll(PINNED_PNPM)].map(([, name, version]) => [name, version]),
  );
  const pnpm = versions.get('pnpm');
  return pnpm !== undefined && versions.get("'@pnpm/exe'") === pnpm
    ? null
    : 'must pin pnpm and @pnpm/exe at the same version, or a pnpm switching versions rewrites it';
}

interface Rule {
  readonly files: RegExp;
  readonly check: (text: string, file: string) => string | null;
}

const RULES: readonly Rule[] = [
  {
    files: /\.ts$/,
    check: text =>
      /@ts-(ignore|expect-error|nocheck)|(oxlint|eslint)-disable/.test(text)
        ? 'switches a check off with a comment'
        : null,
  },
  { files: /\.ts$/, check: (text, file) => selfAlias(file, text) },
  {
    files: /\.css$/,
    check: text => {
      const lines = text.split('\n').length - 1;
      return lines > MAX_CSS_LINES ? `has ${lines} lines (at most ${MAX_CSS_LINES})` : null;
    },
  },
  {
    files: /\.css$/,
    check: text => (REMOTE_URL.test(text) ? 'loads an asset from another site: bundle it' : null),
  },
  { files: /^pnpm-lock\.yaml$/, check: unpinnedPnpm },
];

/** Whether any rule applies to the file, so the others needn't be read. */
export const isChecked = (file: string): boolean => RULES.some(rule => rule.files.test(file));

/** What the file breaks, one message per rule. */
export function findProblems(file: string, text: string): string[] {
  return RULES.filter(rule => rule.files.test(file)).flatMap(rule => {
    const problem = rule.check(text, file);
    return problem === null ? [] : [problem];
  });
}
