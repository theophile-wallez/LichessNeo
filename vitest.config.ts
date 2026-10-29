import { defineConfig } from 'vitest/config';

// The extension's and the site's live review's tests run in happy-dom; the build and
// release scripts' in Node.
export default defineConfig({
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'extension',
          include: ['src/**/*.test.ts', 'site/**/*.test.ts'],
          environment: 'happy-dom',
          // happy-dom's gaps, filled once for every test file.
          setupFiles: ['src/shared/testing/setup.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'scripts', include: ['scripts/**/*.test.ts'], environment: 'node' },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'scripts/**/*.ts', 'site/**/*.ts'],
      exclude: ['**/*.test.ts', '**/fixtures/**', 'src/shared/testing/**'],
      reporter: ['text-summary', 'html', 'lcov'],
    },
  },
});
