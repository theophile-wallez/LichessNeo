// Which build this is. The build replaces LN_EXT_DEV_BUILD (scripts/lib/build-target.ts):
// true in a dev build (`pnpm build`, `pnpm dev`), false in a release one
// (`--release`, `pnpm package`), what users install: a plain constant, so the
// minifier drops the dev code from release bundles. The tests' setup sets it.
declare const LN_EXT_DEV_BUILD: boolean;

/** A dev build, which reloads itself when rebuilt. */
export const DEV_BUILD: boolean = LN_EXT_DEV_BUILD;
