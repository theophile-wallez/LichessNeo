import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertLicensed, LICENSES, packageOf } from './licenses.ts';
import { fromRoot } from './paths.ts';

describe('packageOf', () => {
  it('names the package a module is bundled from', () => {
    expect(packageOf('/repo/node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/util.js')).toBe(
      'zod',
    );
    expect(packageOf('/repo/node_modules/three/build/three.module.js')).toBe('three');
    expect(packageOf('/repo/node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/x.js')).toBe(
      '@scope/pkg',
    );
    expect(packageOf('C:\\repo\\node_modules\\zod\\index.js')).toBe('zod');
  });

  it('leaves out our own code and the bundler runtime', () => {
    expect(packageOf('/repo/src/content/index.ts')).toBeNull();
    expect(packageOf('\0rolldown/runtime.js')).toBeNull();
  });
});

describe('assertLicensed', () => {
  it('passes bundles made of listed packages and our own code', () => {
    expect(() =>
      assertLicensed([
        '/repo/src/page/index.ts',
        '/repo/node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/mini/schemas.js',
        '/repo/node_modules/three/build/three.module.js',
      ]),
    ).not.toThrow();
  });

  it('refuses a bundled package with no license listed, naming each once', () => {
    expect(() =>
      assertLicensed([
        '/repo/node_modules/.pnpm/zod@4.6.5/node_modules/zod/index.js',
        '/repo/node_modules/left-pad/index.js',
        '/repo/node_modules/@scope/pkg/a.js',
        '/repo/node_modules/@scope/pkg/b.js',
      ]),
    ).toThrow(/: @scope\/pkg, left-pad$/);
  });
});

describe('LICENSES', () => {
  it.each(LICENSES)('points at an installed license: $name', ({ from }) => {
    expect(existsSync(fromRoot(from))).toBe(true);
  });
});
