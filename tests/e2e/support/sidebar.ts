import { expect, type Page } from '@playwright/test';
import { boxOf } from './layout.ts';

// Lichess's top header, drawn as a fixed left sidebar from 1020px wide.

// `--ln-ext-sidebar-w` in styles/sidebar/layout.css.
const SIDEBAR_WIDTH = 168;

export async function expectSidebar(page: Page): Promise<void> {
  const sidebar = page.locator('#top');
  await expect(sidebar).toHaveCSS('position', 'fixed');
  const box = await boxOf(sidebar);
  const viewport = page.viewportSize();
  expect(box.left).toBe(0);
  expect(box.right).toBe(SIDEBAR_WIDTH);
  expect(box.bottom - box.top).toBe(viewport?.height);
  // The page makes room for it.
  await expect(page.locator('#main-wrap')).toHaveCSS('margin-left', `${SIDEBAR_WIDTH}px`);
  // Our Donate item, copied from Lichess's menu once the page is parsed.
  await expect(page.locator('#top #ln-ext-donate')).toBeVisible();
  await expectIconsLoad(page);
}

/** Every link's icon, flyouts' included, comes from the extension and decodes. */
async function expectIconsLoad(page: Page): Promise<void> {
  const icons = await page.evaluate(async () => {
    const links = document.querySelectorAll('#topnav section a, #ln-ext-donate');
    const urls = new Set<string>();
    for (const link of links) {
      const image = getComputedStyle(link, '::before').backgroundImage;
      const url = /^url\("(.+)"\)$/.exec(image)?.[1];
      if (url !== undefined) urls.add(url);
    }
    return Promise.all(
      Array.from(urls, async (url): Promise<[string, boolean]> => {
        const image = new Image();
        image.src = url;
        return [
          url,
          await image.decode().then(
            () => image.naturalWidth > 0,
            () => false,
          ),
        ];
      }),
    );
  });
  expect(icons.length).toBeGreaterThan(20);
  for (const [url, loaded] of icons) {
    expect(url).toMatch(/^chrome-extension:\/\/[a-p]{32}\/img\//);
    expect(loaded, url).toBe(true);
  }
}
