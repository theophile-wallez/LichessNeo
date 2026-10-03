import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { fromRoot } from './paths.ts';
import { ALIASES, findProblems, isChecked } from './source-rules.ts';

// The broken code below is spelled in pieces, or this file would break the
// rules it tests.
const TS = '@ts-';
const DISABLE = 'disable';

describe('isChecked', () => {
  it('reads TypeScript, CSS and the lockfile only', () => {
    expect(isChecked('vitest.config.ts')).toBe(true);
    expect(isChecked('src/styles/game/index.css')).toBe(true);
    expect(isChecked('pnpm-lock.yaml')).toBe(true);
    expect(isChecked('src/content/boards/catalog.json')).toBe(false);
    expect(isChecked('README.md')).toBe(false);
  });
});

describe('the alias rule', () => {
  it("refuses an alias into the importer's own folder or below", () => {
    expect(
      findProblems('src/page/review/start.ts', "import { x } from '#page/review/view/x.ts';"),
    ).toEqual(['imports #page/review/view/x.ts through an alias: use ./']);
    expect(
      findProblems('src/shared/a.ts', "import type { T } from '#shared/chess/types.ts';"),
    ).toHaveLength(1);
  });

  it('accepts an alias to another folder, and ./ for its own', () => {
    expect(
      findProblems('src/page/review/start.ts', "import { x } from '#page/lichess/tree.ts';"),
    ).toEqual([]);
    expect(findProblems('src/page/review/start.ts', "import { x } from './view/x.ts';")).toEqual(
      [],
    );
    expect(
      findProblems('src/page/review/view/x.ts', "import { y } from '#page/review/game/y.ts';"),
    ).toEqual([]);
  });

  it('knows the aliases package.json declares', async () => {
    const manifest: unknown = JSON.parse(await readFile(fromRoot('package.json'), 'utf8'));
    const imports =
      typeof manifest === 'object' && manifest !== null && 'imports' in manifest
        ? manifest.imports
        : {};
    const declared = Object.entries(imports ?? {})
      .filter(([alias]) => alias.endsWith('/*'))
      .map(([alias, target]) => [
        alias.slice(0, -1),
        String(target).replace(/^\.\//, '').slice(0, -1),
      ]);
    expect(Object.fromEntries(declared)).toEqual(ALIASES);
  });
});

describe('the TypeScript rules', () => {
  it.each([
    `// ${TS}ignore`,
    `// ${TS}expect-error`,
    `// ${TS}nocheck`,
    `// oxlint-${DISABLE}-next-line no-console`,
    `/* eslint-${DISABLE} */`,
  ])('refuse a comment that switches a check off: %s', comment => {
    expect(findProblems('a.ts', `${comment}\nlet x = 1;\n`)).toEqual([
      'switches a check off with a comment',
    ]);
  });

  it('pass typed code, const assertions and const type parameters', () => {
    const code = `export const TARGETS = ['chrome'] as const;\nexport function first<const T>(items: readonly T[]): T | undefined {\n  return items[0];\n}\n`;
    expect(findProblems('a.ts', code)).toEqual([]);
  });

  it('leave other files alone', () => {
    expect(findProblems('a.css', `/* ${TS}ignore */`)).toEqual([]);
  });
});

describe('the stylesheet length', () => {
  it('allows 400 lines and refuses 401', () => {
    expect(findProblems('a.css', '.a {}\n'.repeat(400))).toEqual([]);
    expect(findProblems('a.css', '.a {}\n'.repeat(401))).toEqual(['has 401 lines (at most 400)']);
  });
});

describe('the remote assets rule', () => {
  const REMOTE = 'loads an asset from another site: bundle it';

  it.each([
    '.a { background: url(https://images.example.com/x.png); }',
    ".a { background: url('http://example.com/x.png'); }",
    '.a { background: url( "https://example.com/x.png" ); }',
    '.a { background: url(//images.example.com/x.png); }',
    '.a { background: URL(HTTPS://example.com/x.png); }',
    '.a { background: image-set("https://example.com/x.png" 1x, "x2.png" 2x); }',
    ".a { background: -webkit-image-set(url(x.png) 1x, '//example.com/x2.png' 2x); }",
    "@import 'https://fonts.googleapis.com/css2?family=Inter';",
    '@import url(//fonts.googleapis.com/css);',
    '@font-face { src: url(https://example.com/f.woff2) format("woff2"); }',
    '.a { background: url(https://lichess1.org.example.com/x.png); }',
  ])('refuses %s', css => {
    expect(findProblems('a.css', css)).toEqual([REMOTE]);
  });

  it.each([
    ".a { background: url('chrome-extension://__MSG_@@extension_id__/img/icons/x.svg'); }",
    '.a { background: url(https://lichess1.org/assets/x.png); }',
    '.a { background: url(//lichess.org/assets/x.png); }',
    ".a { mask: url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><path d='M0 0'/></svg>\"); }",
    '.a { background: image-set(url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>\') 1x); }',
    "a[href^='https://discord.gg'] { color: red; }",
    '/* from https://github.com/lichess-org/lila */ .a {}',
    '.a { background: url(img/x.png); }',
  ])('passes %s', css => {
    expect(findProblems('a.css', css)).toEqual([]);
  });
});

// A lockfile's packageManagerDependencies, as pnpm writes them.
const pin = (name: string, version: string): string =>
  `      ${name}:\n        specifier: ${version}\n        version: ${version}\n`;
const lockfile = (...pins: string[]): string =>
  `importers:\n\n  .:\n    packageManagerDependencies:\n${pins.join('')}\npackages:\n`;

describe('the lockfile rule', () => {
  it('accepts pnpm and @pnpm/exe pinned at the same version', () => {
    expect(
      findProblems('pnpm-lock.yaml', lockfile(pin("'@pnpm/exe'", '12.6.0'), pin('pnpm', '12.6.0'))),
    ).toEqual([]);
  });

  it('refuses a lockfile without @pnpm/exe, or with another version of it', () => {
    expect(findProblems('pnpm-lock.yaml', lockfile(pin('pnpm', '12.6.0')))).toHaveLength(1);
    expect(
      findProblems('pnpm-lock.yaml', lockfile(pin("'@pnpm/exe'", '12.5.0'), pin('pnpm', '12.6.0'))),
    ).toHaveLength(1);
  });

  it('holds for the repository’s lockfile', async () => {
    expect(
      findProblems('pnpm-lock.yaml', await readFile(fromRoot('pnpm-lock.yaml'), 'utf8')),
    ).toEqual([]);
  });
});
