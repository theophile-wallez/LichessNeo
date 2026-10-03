import type { Page } from '@playwright/test';

// The content script's world. Playwright evaluates in the page's own world
// only; the extension's isolated world is reached over the DevTools protocol,
// where Chrome names it after the extension.

const WORLD_NAME = 'Lichess Reimagined';

/** Evaluates `expression` where the content script runs, and returns its (awaited) value. */
export async function evaluateInContentScript(page: Page, expression: string): Promise<unknown> {
  const session = await page.context().newCDPSession(page);
  try {
    const world = new Promise<number>(resolve => {
      session.on('Runtime.executionContextCreated', ({ context }) => {
        if (context.name === WORLD_NAME) resolve(context.id);
      });
    });
    // Enabling the runtime also reports the contexts that already exist.
    await session.send('Runtime.enable');
    const { result, exceptionDetails } = await session.send('Runtime.evaluate', {
      contextId: await world,
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails !== undefined) throw new Error(exceptionDetails.text);
    const value: unknown = result.value;
    return value;
  } finally {
    await session.detach();
  }
}
