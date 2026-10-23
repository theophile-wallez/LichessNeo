// Which build this is. The build replaces LN_EXT_DEV_BUILD (scripts/lib/build-target.ts):
// true in a dev build (`pnpm build`, `pnpm dev`), false in a release one
// (`--release`, `pnpm package`), what users install: a plain constant, so the
// minifier drops the dev code from release bundles. The tests' setup sets it.
declare const LN_EXT_DEV_BUILD: boolean;
// What a preview shows and where (`pnpm preview --name --url`): empty in any other build.
declare const LN_EXT_PREVIEW: string;
declare const LN_EXT_PREVIEW_URL: string;

/** A dev build, which reloads itself when rebuilt. */
export const DEV_BUILD: boolean = LN_EXT_DEV_BUILD;

/** The name of the draft a preview build shows, or '' outside a preview. */
export const PREVIEW_NAME: string = LN_EXT_DEV_BUILD ? LN_EXT_PREVIEW : '';

/** The lichess.org page to review that draft on, or ''. */
export const PREVIEW_URL: string = LN_EXT_DEV_BUILD ? LN_EXT_PREVIEW_URL : '';
