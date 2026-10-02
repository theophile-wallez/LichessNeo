import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createManifest } from '#manifest';
import { bundleCss } from './css-bundle.ts';
import { assertExtensionUrls, extensionFiles, isWebAccessible } from './extension-urls.ts';
import { fromRoot } from './paths.ts';

const BASE = 'chrome-extension://__MSG_@@extension_id__/';

describe('extensionFiles', () => {
  it('lists each file named by extension URL once, whatever the quotes', () => {
    const css = [
      `.a { background: url('${BASE}img/icons/b.svg') center / contain; }`,
      `.b { --cdc-icon: url("${BASE}img/sidebar/a.webp"); }`,
      `.c { mask: url(${BASE}img/icons/b.svg); }`,
      ".d { background: url('https://lichess1.org/assets/flair/img/x.webp'); }",
    ].join('\n');
    expect(extensionFiles(css)).toEqual(['img/icons/b.svg', 'img/sidebar/a.webp']);
  });
});

describe('isWebAccessible', () => {
  it('matches folder patterns and exact files', () => {
    const resources = ['img/icons/*', 'page.js'];
    expect(isWebAccessible('img/icons/trophy.svg', resources)).toBe(true);
    expect(isWebAccessible('page.js', resources)).toBe(true);
    expect(isWebAccessible('img/sidebar/play.webp', resources)).toBe(false);
    expect(isWebAccessible('img/iconsx/trophy.svg', ['img/icons/*'])).toBe(false);
  });
});

describe('assertExtensionUrls', () => {
  const css = `.a { background: url('${BASE}img/icons/a.svg'); }
.b { background: url('${BASE}img/sidebar/b.webp'); }
.c { background: url('${BASE}img/icons/c.svg'); }`;

  it('passes when every file is built and web-accessible', () => {
    const build = { exists: () => true, resources: ['img/icons/*', 'img/sidebar/*'] };
    expect(() => assertExtensionUrls(css, build)).not.toThrow();
  });

  it('names the files missing or not web-accessible', () => {
    const build = {
      exists: (file: string) => file !== 'img/icons/c.svg',
      resources: ['img/icons/*'],
    };
    expect(() => assertExtensionUrls(css, build)).toThrow(
      /: img\/icons\/c\.svg, img\/sidebar\/b\.webp$/,
    );
  });

  it('holds for the real stylesheet, public/ and the manifest', async () => {
    const styles = await bundleCss(fromRoot('src/styles/index.css'));
    const manifest = createManifest('chrome', '1.0.0');
    const build = {
      exists: (file: string) => existsSync(fromRoot('public', file)),
      resources: manifest.web_accessible_resources.flatMap(entry => entry.resources),
    };
    expect(extensionFiles(styles)).toContain('img/sidebar/play.webp');
    expect(() => assertExtensionUrls(styles, build)).not.toThrow();
  });
});
