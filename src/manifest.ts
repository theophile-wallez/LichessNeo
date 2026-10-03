import { z } from 'zod/mini';

// The extension's manifest, one per target. `build.ts` writes it into each
// build; nothing else defines what the extension loads.

export type Target = 'chrome' | 'chrome-store' | 'firefox';

/**
 * `<major>.<minor>`. A release appends the number of commits since this line
 * last changed (scripts/lib/version.ts): the commit that raises it is `.0`.
 */
export const BASE_VERSION = '0.2';

const GECKO_ID = 'lichessdotcom@theophile-wallez.github.io';
const LICHESS = ['https://lichess.org/*'];

const ContentScriptSchema = z.strictObject({
  matches: z.array(z.string()),
  js: z.array(z.string()),
  css: z.optional(z.array(z.string())),
  run_at: z.literal('document_start'),
  world: z.optional(z.enum(['ISOLATED', 'MAIN'])),
});

export const ManifestSchema = z.strictObject({
  manifest_version: z.literal(3),
  name: z.string(),
  version: z.string().check(z.regex(/^\d+\.\d+(\.\d+)?$/)),
  description: z.string(),
  default_locale: z.string(),
  icons: z.record(z.string(), z.string()),
  permissions: z.optional(z.array(z.string())),
  background: z.union([
    z.strictObject({ service_worker: z.string() }),
    z.strictObject({ scripts: z.array(z.string()) }),
  ]),
  content_scripts: z.array(ContentScriptSchema),
  web_accessible_resources: z.array(
    z.strictObject({ resources: z.array(z.string()), matches: z.array(z.string()) }),
  ),
  browser_specific_settings: z.optional(
    z.strictObject({
      gecko: z.strictObject({
        id: z.string(),
        strict_min_version: z.string(),
        data_collection_permissions: z.strictObject({ required: z.array(z.string()) }),
      }),
      gecko_android: z.strictObject({ strict_min_version: z.string() }),
    }),
  ),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/** The files the manifest makes the browser load, relative to the build's root. */
export const OUTPUT = {
  background: 'background.js',
  content: 'content.js',
  page: 'page.js',
  /** The coach's 3D mascots, loaded by the content script when a coach shows. */
  mascot: 'coach-mascot.js',
  styles: 'content.css',
} satisfies Record<string, string>;

export function createManifest(target: Target, version: string): Manifest {
  const manifest: Manifest = {
    manifest_version: 3,
    name: 'LichessDotCom',
    version,
    description: '__MSG_extDescription__',
    default_locale: 'en',
    icons: { '16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png' },
    // Storage serves a dev build's auto-reload and drops an old version's sound
    // cache (see the background worker). The Chrome Web Store's installs never
    // had that cache, and it turns down a permission they don't need.
    ...(target === 'chrome-store' ? {} : { permissions: ['storage'] }),
    // Firefox runs no extension service worker, only background scripts.
    background:
      target === 'firefox'
        ? { scripts: [OUTPUT.background] }
        : { service_worker: OUTPUT.background },
    content_scripts: [
      {
        matches: LICHESS,
        css: [OUTPUT.styles],
        js: [OUTPUT.content],
        run_at: 'document_start',
      },
      {
        matches: LICHESS,
        js: [OUTPUT.page],
        run_at: 'document_start',
        world: 'MAIN',
      },
    ],
    web_accessible_resources: [
      {
        resources: [OUTPUT.mascot, 'img/coaches/*', 'img/icons/*', 'img/sidebar/*'],
        matches: LICHESS,
      },
    ],
  };
  if (target !== 'firefox') return manifest;
  return {
    ...manifest,
    browser_specific_settings: {
      // Firefox keeps an extension's storage under its id, and AMO signs by
      // it. 140 is the first desktop version with the data collection field,
      // 142 on Android.
      gecko: {
        id: GECKO_ID,
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    },
  };
}
